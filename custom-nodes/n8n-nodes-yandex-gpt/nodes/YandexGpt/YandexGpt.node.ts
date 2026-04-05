import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { IMAGE_POLL_TIMEOUT_MS } from '../../lib/yandexConstants';
import {
	type ImageGenerationRequestBody,
	detectImageMimeFromBuffer,
	generateImageYandexArt,
} from '../../lib/imageGeneration';
import { parseAspectPreset } from '../../lib/imageAspect';
import { detectAudioFormat, recognizeFileV3 } from '../../lib/speechkitStt';
import {
	formatRoleLabel,
	formatVoiceLabel,
	ROLES_BY_VOICE,
	VOICES_BY_LOCALE,
} from '../../lib/speechkitVoices';
import { buildYandexGptDescription } from '../../lib/yandexGptDescription';
import { synthesizeUtterance } from '../../lib/speechkitTts';

type YandexCredentials = { apiKey: string; folderId: string };

/* The icon-validation rule expects `description` to be an inline ObjectExpression; we build it in lib/yandexGptDescription.ts for maintainability. */
/* eslint-disable @n8n/community-nodes/icon-validation */
export class YandexGpt implements INodeType {
	description: INodeTypeDescription = buildYandexGptDescription();

	methods = {
		loadOptions: {
			async getVoices(this: import('n8n-workflow').ILoadOptionsFunctions) {
				const languageRaw = this.getCurrentNodeParameter('language') as string | undefined;
				const locale =
					languageRaw && languageRaw in VOICES_BY_LOCALE ? languageRaw : 'ru-RU';
				const voices = VOICES_BY_LOCALE[locale] ?? [];
				return voices.map((v) => ({
					name: formatVoiceLabel(v, locale),
					value: v,
				}));
			},
			async getRoles(this: import('n8n-workflow').ILoadOptionsFunctions) {
				const voice = this.getCurrentNodeParameter('voice') as string | undefined;
				const roles = voice ? ROLES_BY_VOICE[voice] : [];
				if (!roles || roles.length === 0) {
					return [
						{
							name: 'No Roles Available for the Selected Voice',
							value: '',
						},
					];
				}
				return roles.map((r) => ({
					name: formatRoleLabel(r),
					value: r,
				}));
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const credentials = (await this.getCredentials('yandexGptApi')) as YandexCredentials;
		const resource = this.getNodeParameter('resource', 0, 'audio') as string;
		const operation = this.getNodeParameter('operation', 0, 'generate') as string;

		if (resource === 'image') {
			if (operation !== 'generateImage') {
				throw new NodeOperationError(
					this.getNode(),
					'For Resource "Image", select operation "Generate an image".',
				);
			}
			const results: INodeExecutionData[] = [];
			for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
				try {
					const prompt = this.getNodeParameter('imagePrompt', itemIndex, '') as string;
					if (!prompt || String(prompt).trim() === '') {
						throw new NodeOperationError(this.getNode(), 'Prompt is required for image generation', {
							itemIndex,
						});
					}
					const override = String(
						this.getNodeParameter('modelUriOverride', itemIndex, '') || '',
					).trim();
					const model = String(
						this.getNodeParameter('imageModel', itemIndex, 'yandex-art') || 'yandex-art',
					).trim();
					const version = String(
						this.getNodeParameter('imageModelVersion', itemIndex, 'latest') || 'latest',
					).trim();
					const modelUri =
						override || `art://${credentials.folderId}/${model}/${version}`;
					const preset = this.getNodeParameter('imageAspectPreset', itemIndex, '') as string;
					let aspect: { widthRatio: number; heightRatio: number } | null = null;
					if (preset === 'custom') {
						const wr = Number(this.getNodeParameter('imageWidthRatio', itemIndex, 1));
						const hr = Number(this.getNodeParameter('imageHeightRatio', itemIndex, 1));
						if (Number.isFinite(wr) && Number.isFinite(hr) && wr > 0 && hr > 0) {
							aspect = { widthRatio: Math.trunc(wr), heightRatio: Math.trunc(hr) };
						}
					} else {
						aspect = parseAspectPreset(preset);
					}
					const seedRaw = Number(this.getNodeParameter('imageSeed', itemIndex, 0));
					const mimeRaw = String(
						this.getNodeParameter('imageMimeType', itemIndex, '') || '',
					).trim();
					const generationOptions: {
						mimeType?: string;
						seed?: number;
						aspectRatio?: { widthRatio: number; heightRatio: number };
					} = {};
					if (mimeRaw) generationOptions.mimeType = mimeRaw;
					if (Number.isFinite(seedRaw) && seedRaw > 0) {
						generationOptions.seed = Math.trunc(seedRaw);
					}
					if (aspect) {
						generationOptions.aspectRatio = {
							widthRatio: aspect.widthRatio,
							heightRatio: aspect.heightRatio,
						};
					}
					const body: ImageGenerationRequestBody = {
						modelUri,
						messages: [{ text: String(prompt).trim() }],
					};
					if (Object.keys(generationOptions).length > 0) {
						body.generationOptions = generationOptions;
					}
					const { imageBuffer, modelVersion } = await generateImageYandexArt(
						credentials.apiKey,
						credentials.folderId,
						body,
						IMAGE_POLL_TIMEOUT_MS,
					);
					const { mime, ext } = detectImageMimeFromBuffer(imageBuffer);
					const fileName = `yandex-art.${ext}`;
					const binaryData = await this.helpers.prepareBinaryData(imageBuffer, fileName, mime);
					results.push({
						json: {
							...items[itemIndex].json,
							modelUri,
							modelVersion: modelVersion ?? null,
						},
						binary: { data: binaryData },
						pairedItem: { item: itemIndex },
					});
				} catch (error) {
					if (this.continueOnFail()) {
						results.push({
							json: {
								...items[itemIndex].json,
								modelVersion: null,
								error: error instanceof Error ? error.message : String(error),
							},
							pairedItem: { item: itemIndex },
						});
					} else {
						if (error instanceof NodeOperationError) throw error;
						throw new NodeOperationError(this.getNode(), error as Error, { itemIndex });
					}
				}
			}
			return [results];
		}

		if (resource !== 'audio') {
			throw new NodeOperationError(this.getNode(), `Unsupported resource: ${String(resource)}`);
		}
		if (operation !== 'transcribe' && operation !== 'generate') {
			throw new NodeOperationError(
				this.getNode(),
				'For Resource "Audio", select "Generate audio" or "Transcribe a recording".',
			);
		}

		if (operation === 'transcribe') {
			const binaryPropertyName = this.getNodeParameter('binaryPropertyName', 0, 'data') as string;
			const language = this.getNodeParameter('language', 0, 'ru-RU') as string;
			const results: INodeExecutionData[] = [];
			for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
				try {
					const buffer = await this.helpers.getBinaryDataBuffer(itemIndex, binaryPropertyName);
					if (!buffer || buffer.length === 0) {
						throw new NodeOperationError(
							this.getNode(),
							`No binary data in property "${binaryPropertyName}"`,
							{ itemIndex },
						);
					}
					const format = detectAudioFormat(buffer);
					if (!format) {
						throw new NodeOperationError(
							this.getNode(),
							'Unsupported audio format. Use WAV, OggOpus, or MP3.',
							{ itemIndex },
						);
					}
					const transcription = await recognizeFileV3(
						credentials.apiKey,
						credentials.folderId,
						buffer,
						format,
						language,
					);
					results.push({
						json: { ...items[itemIndex].json, transcription },
						pairedItem: { item: itemIndex },
					});
				} catch (error) {
					if (this.continueOnFail()) {
						results.push({
							json: {
								...items[itemIndex].json,
								transcription: null,
								error: error instanceof Error ? error.message : String(error),
							},
							pairedItem: { item: itemIndex },
						});
					} else {
						if (error instanceof NodeOperationError) throw error;
						throw new NodeOperationError(this.getNode(), error as Error, { itemIndex });
					}
				}
			}
			return [results];
		}

		const results: INodeExecutionData[] = [];
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const language = this.getNodeParameter('language', itemIndex, 'ru-RU') as string;
				const allowedVoices = VOICES_BY_LOCALE[language] ?? VOICES_BY_LOCALE['ru-RU'];
				const text = this.getNodeParameter('text', itemIndex, '') as string;
				const voiceParam = this.getNodeParameter('voice', itemIndex, allowedVoices[0]) as string;
				const voice = allowedVoices.includes(voiceParam) ? voiceParam : allowedVoices[0];
				const roleParam = this.getNodeParameter('role', itemIndex, '') as string;
				const allowedRoles = ROLES_BY_VOICE[voice] ?? [];
				const roleToUse = allowedRoles.includes(roleParam) ? roleParam : allowedRoles[0];
				if (!text || String(text).trim() === '') {
					throw new NodeOperationError(this.getNode(), 'Text is required for synthesis', {
						itemIndex,
					});
				}
				const payload = {
					text: String(text).trim(),
					hints: roleToUse
						? ([{ voice }, { role: roleToUse }] as Array<{ voice: string } | { role: string }>)
						: ([{ voice }] as Array<{ voice: string }>),
				};
				const audioBuffer = await synthesizeUtterance(
					credentials.apiKey,
					credentials.folderId,
					payload,
				);
				const binaryData = await this.helpers.prepareBinaryData(audioBuffer, 'speech.wav', 'audio/wav');
				results.push({
					json: { ...items[itemIndex].json },
					binary: { data: binaryData },
					pairedItem: { item: itemIndex },
				});
			} catch (error) {
				if (this.continueOnFail()) {
					results.push({
						json: {
							...items[itemIndex].json,
							error: error instanceof Error ? error.message : String(error),
						},
						pairedItem: { item: itemIndex },
					});
				} else {
					if (error instanceof NodeOperationError) throw error;
					throw new NodeOperationError(this.getNode(), error as Error, { itemIndex });
				}
			}
		}
		return [results];
	}
}
/* eslint-enable @n8n/community-nodes/icon-validation */
