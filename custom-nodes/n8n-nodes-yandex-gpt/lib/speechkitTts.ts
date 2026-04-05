import { ApplicationError } from 'n8n-workflow';

import { parseJsonResponse } from './jsonParse';
import { YANDEX_TTS_URL } from './yandexConstants';

export interface TtsPayload {
	text: string;
	hints: Array<{ voice: string } | { role: string }>;
}

export async function synthesizeUtterance(
	apiKey: string,
	folderId: string,
	payload: TtsPayload,
): Promise<Buffer> {
	const response = await fetch(YANDEX_TTS_URL, {
		method: 'POST',
		headers: {
			Authorization: `Api-Key ${apiKey}`,
			'x-folder-id': folderId,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(payload),
	});
	if (!response.ok) {
		let msg = response.statusText;
		try {
			const err = await parseJsonResponse(response);
			const e = err.error as { message?: string } | undefined;
			msg = e?.message ?? msg;
		} catch {
			// keep statusText
		}
		throw new ApplicationError(`Ошибка API (${response.status}): ${msg}`);
	}
	const data = await parseJsonResponse(response);
	const result = data.result as { audioChunk?: { data?: string } } | undefined;
	const chunk = result?.audioChunk;
	const b64 = chunk?.data;
	if (!b64) {
		throw new ApplicationError('В ответе API нет аудиоданных (result.audioChunk.data)');
	}
	return Buffer.from(b64, 'base64');
}
