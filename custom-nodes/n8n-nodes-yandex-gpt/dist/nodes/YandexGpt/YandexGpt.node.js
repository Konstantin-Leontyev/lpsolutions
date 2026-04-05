"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.YandexGpt = void 0;
const n8n_workflow_1 = require("n8n-workflow");
const yandexConstants_1 = require("../../lib/yandexConstants");
const imageGeneration_1 = require("../../lib/imageGeneration");
const imageAspect_1 = require("../../lib/imageAspect");
const speechkitStt_1 = require("../../lib/speechkitStt");
const speechkitVoices_1 = require("../../lib/speechkitVoices");
const yandexGptDescription_1 = require("../../lib/yandexGptDescription");
const speechkitTts_1 = require("../../lib/speechkitTts");
class YandexGpt {
    constructor() {
        this.description = (0, yandexGptDescription_1.buildYandexGptDescription)();
        this.methods = {
            loadOptions: {
                async getVoices() {
                    var _a;
                    const languageRaw = this.getCurrentNodeParameter('language');
                    const locale = languageRaw && languageRaw in speechkitVoices_1.VOICES_BY_LOCALE ? languageRaw : 'ru-RU';
                    const voices = (_a = speechkitVoices_1.VOICES_BY_LOCALE[locale]) !== null && _a !== void 0 ? _a : [];
                    return voices.map((v) => ({
                        name: (0, speechkitVoices_1.formatVoiceLabel)(v, locale),
                        value: v,
                    }));
                },
                async getRoles() {
                    const voice = this.getCurrentNodeParameter('voice');
                    const roles = voice ? speechkitVoices_1.ROLES_BY_VOICE[voice] : [];
                    if (!roles || roles.length === 0) {
                        return [
                            {
                                name: 'No Roles Available for the Selected Voice',
                                value: '',
                            },
                        ];
                    }
                    return roles.map((r) => ({
                        name: (0, speechkitVoices_1.formatRoleLabel)(r),
                        value: r,
                    }));
                },
            },
        };
    }
    async execute() {
        var _a, _b;
        const items = this.getInputData();
        const credentials = (await this.getCredentials('yandexGptApi'));
        const resource = this.getNodeParameter('resource', 0, 'audio');
        const operation = this.getNodeParameter('operation', 0, 'generate');
        if (resource === 'image') {
            if (operation !== 'generateImage') {
                throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'For Resource "Image", select operation "Generate an image".');
            }
            const results = [];
            for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
                try {
                    const prompt = this.getNodeParameter('imagePrompt', itemIndex, '');
                    if (!prompt || String(prompt).trim() === '') {
                        throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Prompt is required for image generation', {
                            itemIndex,
                        });
                    }
                    const override = String(this.getNodeParameter('modelUriOverride', itemIndex, '') || '').trim();
                    const model = String(this.getNodeParameter('imageModel', itemIndex, 'yandex-art') || 'yandex-art').trim();
                    const version = String(this.getNodeParameter('imageModelVersion', itemIndex, 'latest') || 'latest').trim();
                    const modelUri = override || `art://${credentials.folderId}/${model}/${version}`;
                    const preset = this.getNodeParameter('imageAspectPreset', itemIndex, '');
                    let aspect = null;
                    if (preset === 'custom') {
                        const wr = Number(this.getNodeParameter('imageWidthRatio', itemIndex, 1));
                        const hr = Number(this.getNodeParameter('imageHeightRatio', itemIndex, 1));
                        if (Number.isFinite(wr) && Number.isFinite(hr) && wr > 0 && hr > 0) {
                            aspect = { widthRatio: Math.trunc(wr), heightRatio: Math.trunc(hr) };
                        }
                    }
                    else {
                        aspect = (0, imageAspect_1.parseAspectPreset)(preset);
                    }
                    const seedRaw = Number(this.getNodeParameter('imageSeed', itemIndex, 0));
                    const mimeRaw = String(this.getNodeParameter('imageMimeType', itemIndex, '') || '').trim();
                    const generationOptions = {};
                    if (mimeRaw)
                        generationOptions.mimeType = mimeRaw;
                    if (Number.isFinite(seedRaw) && seedRaw > 0) {
                        generationOptions.seed = Math.trunc(seedRaw);
                    }
                    if (aspect) {
                        generationOptions.aspectRatio = {
                            widthRatio: aspect.widthRatio,
                            heightRatio: aspect.heightRatio,
                        };
                    }
                    const body = {
                        modelUri,
                        messages: [{ text: String(prompt).trim() }],
                    };
                    if (Object.keys(generationOptions).length > 0) {
                        body.generationOptions = generationOptions;
                    }
                    const { imageBuffer, modelVersion } = await (0, imageGeneration_1.generateImageYandexArt)(credentials.apiKey, credentials.folderId, body, yandexConstants_1.IMAGE_POLL_TIMEOUT_MS);
                    const { mime, ext } = (0, imageGeneration_1.detectImageMimeFromBuffer)(imageBuffer);
                    const fileName = `yandex-art.${ext}`;
                    const binaryData = await this.helpers.prepareBinaryData(imageBuffer, fileName, mime);
                    results.push({
                        json: {
                            ...items[itemIndex].json,
                            modelUri,
                            modelVersion: modelVersion !== null && modelVersion !== void 0 ? modelVersion : null,
                        },
                        binary: { data: binaryData },
                        pairedItem: { item: itemIndex },
                    });
                }
                catch (error) {
                    if (this.continueOnFail()) {
                        results.push({
                            json: {
                                ...items[itemIndex].json,
                                modelVersion: null,
                                error: error instanceof Error ? error.message : String(error),
                            },
                            pairedItem: { item: itemIndex },
                        });
                    }
                    else {
                        if (error instanceof n8n_workflow_1.NodeOperationError)
                            throw error;
                        throw new n8n_workflow_1.NodeOperationError(this.getNode(), error, { itemIndex });
                    }
                }
            }
            return [results];
        }
        if (resource !== 'audio') {
            throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Unsupported resource: ${String(resource)}`);
        }
        if (operation !== 'transcribe' && operation !== 'generate') {
            throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'For Resource "Audio", select "Generate audio" or "Transcribe a recording".');
        }
        if (operation === 'transcribe') {
            const binaryPropertyName = this.getNodeParameter('binaryPropertyName', 0, 'data');
            const language = this.getNodeParameter('language', 0, 'ru-RU');
            const results = [];
            for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
                try {
                    const buffer = await this.helpers.getBinaryDataBuffer(itemIndex, binaryPropertyName);
                    if (!buffer || buffer.length === 0) {
                        throw new n8n_workflow_1.NodeOperationError(this.getNode(), `No binary data in property "${binaryPropertyName}"`, { itemIndex });
                    }
                    const format = (0, speechkitStt_1.detectAudioFormat)(buffer);
                    if (!format) {
                        throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Unsupported audio format. Use WAV, OggOpus, or MP3.', { itemIndex });
                    }
                    const transcription = await (0, speechkitStt_1.recognizeFileV3)(credentials.apiKey, credentials.folderId, buffer, format, language);
                    results.push({
                        json: { ...items[itemIndex].json, transcription },
                        pairedItem: { item: itemIndex },
                    });
                }
                catch (error) {
                    if (this.continueOnFail()) {
                        results.push({
                            json: {
                                ...items[itemIndex].json,
                                transcription: null,
                                error: error instanceof Error ? error.message : String(error),
                            },
                            pairedItem: { item: itemIndex },
                        });
                    }
                    else {
                        if (error instanceof n8n_workflow_1.NodeOperationError)
                            throw error;
                        throw new n8n_workflow_1.NodeOperationError(this.getNode(), error, { itemIndex });
                    }
                }
            }
            return [results];
        }
        const results = [];
        for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
            try {
                const language = this.getNodeParameter('language', itemIndex, 'ru-RU');
                const allowedVoices = (_a = speechkitVoices_1.VOICES_BY_LOCALE[language]) !== null && _a !== void 0 ? _a : speechkitVoices_1.VOICES_BY_LOCALE['ru-RU'];
                const text = this.getNodeParameter('text', itemIndex, '');
                const voiceParam = this.getNodeParameter('voice', itemIndex, allowedVoices[0]);
                const voice = allowedVoices.includes(voiceParam) ? voiceParam : allowedVoices[0];
                const roleParam = this.getNodeParameter('role', itemIndex, '');
                const allowedRoles = (_b = speechkitVoices_1.ROLES_BY_VOICE[voice]) !== null && _b !== void 0 ? _b : [];
                const roleToUse = allowedRoles.includes(roleParam) ? roleParam : allowedRoles[0];
                if (!text || String(text).trim() === '') {
                    throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Text is required for synthesis', {
                        itemIndex,
                    });
                }
                const payload = {
                    text: String(text).trim(),
                    hints: roleToUse
                        ? [{ voice }, { role: roleToUse }]
                        : [{ voice }],
                };
                const audioBuffer = await (0, speechkitTts_1.synthesizeUtterance)(credentials.apiKey, credentials.folderId, payload);
                const binaryData = await this.helpers.prepareBinaryData(audioBuffer, 'speech.wav', 'audio/wav');
                results.push({
                    json: { ...items[itemIndex].json },
                    binary: { data: binaryData },
                    pairedItem: { item: itemIndex },
                });
            }
            catch (error) {
                if (this.continueOnFail()) {
                    results.push({
                        json: {
                            ...items[itemIndex].json,
                            error: error instanceof Error ? error.message : String(error),
                        },
                        pairedItem: { item: itemIndex },
                    });
                }
                else {
                    if (error instanceof n8n_workflow_1.NodeOperationError)
                        throw error;
                    throw new n8n_workflow_1.NodeOperationError(this.getNode(), error, { itemIndex });
                }
            }
        }
        return [results];
    }
}
exports.YandexGpt = YandexGpt;
//# sourceMappingURL=YandexGpt.node.js.map