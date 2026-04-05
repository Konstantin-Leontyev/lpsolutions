import { ApplicationError } from 'n8n-workflow';

import { parseJsonResponse, parseJsonStreamResponse } from './jsonParse';
import { waitForOperation } from './operations';
import { POLL_TIMEOUT_MS, STT_GET_RECOGNITION_URL, STT_RECOGNIZE_ASYNC_URL } from './yandexConstants';

export type AudioContainerType = 'WAV' | 'OGG_OPUS' | 'MP3';

export function detectAudioFormat(buffer: Buffer): AudioContainerType | null {
	if (buffer.length < 4) return null;
	const sig = buffer.toString('utf8', 0, 4);
	if (sig === 'RIFF') return 'WAV';
	if (sig === 'OggS') return 'OGG_OPUS';
	if (sig === 'ID3\u0000') return 'MP3';
	if (buffer.length >= 2 && buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) return 'MP3';
	return null;
}

interface Alternative {
	text?: string;
}

function collectAlternatives(alt: Alternative[] | undefined): string[] {
	const parts: string[] = [];
	if (!alt) return parts;
	for (const a of alt) {
		if (a.text) parts.push(a.text);
	}
	return parts;
}

export async function recognizeFileV3(
	apiKey: string,
	folderId: string,
	audioBuffer: Buffer,
	containerType: AudioContainerType,
	languageCode: string,
): Promise<string> {
	const containerTypeValue = containerType === 'WAV' ? 1 : containerType === 'OGG_OPUS' ? 2 : 3;
	const recognitionModel: Record<string, unknown> = {
		model: 'general',
		audio_format: {
			container_audio: {
				container_audio_type: containerTypeValue,
			},
		},
	};
	if (languageCode) {
		recognitionModel.language_restriction = {
			restriction_type: 1,
			language_code: [languageCode],
		};
	}
	const body = {
		content: audioBuffer.toString('base64'),
		recognition_model: recognitionModel,
	};
	const initRes = await fetch(STT_RECOGNIZE_ASYNC_URL, {
		method: 'POST',
		headers: {
			Authorization: `Api-Key ${apiKey}`,
			'x-folder-id': folderId,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(body),
	});
	if (!initRes.ok) {
		const errText = await initRes.text();
		throw new ApplicationError(`recognizeFileAsync failed (${initRes.status}): ${errText}`);
	}
	const op = await parseJsonResponse(initRes);
	const operationId = op.id as string | undefined;
	if (!operationId) {
		throw new ApplicationError('No operation id in recognizeFileAsync response');
	}
	await waitForOperation(apiKey, operationId, POLL_TIMEOUT_MS);
	const getRes = await fetch(`${STT_GET_RECOGNITION_URL}?operation_id=${encodeURIComponent(operationId)}`, {
		headers: {
			Authorization: `Api-Key ${apiKey}`,
			'x-folder-id': folderId,
		},
	});
	if (!getRes.ok) {
		const errText = await getRes.text();
		throw new ApplicationError(`getRecognition failed (${getRes.status}): ${errText}`);
	}
	const payloads = await parseJsonStreamResponse(getRes);
	const parts: string[] = [];
	for (const p of payloads) {
		const list = p.streaming_responses as
			| {
					final?: { alternatives?: Alternative[] };
					partial?: { alternatives?: Alternative[] };
			  }[]
			| undefined;
		if (list?.length) {
			for (const msg of list) {
				const alt = msg.final?.alternatives ?? msg.partial?.alternatives;
				parts.push(...collectAlternatives(alt));
			}
			continue;
		}
		const result = p.result as
			| {
					final?: { alternatives?: Alternative[] };
					finalRefinement?: { normalizedText?: { alternatives?: Alternative[] } };
			  }
			| undefined;
		const alt1 = collectAlternatives(result?.final?.alternatives);
		const alt2 = collectAlternatives(result?.finalRefinement?.normalizedText?.alternatives);
		parts.push(...alt2, ...alt1);
	}
	const last = parts.filter(Boolean).slice(-1)[0]?.trim();
	return last || parts.join(' ').trim() || '';
}
