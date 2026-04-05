import { ApplicationError } from 'n8n-workflow';

import { parseJsonResponse } from './jsonParse';
import { waitForOperation } from './operations';
import { IMAGE_GENERATION_URL } from './yandexConstants';

export interface ImageGenerationRequestBody {
	modelUri: string;
	messages: { text: string }[];
	generationOptions?: {
		mimeType?: string;
		seed?: number;
		aspectRatio?: { widthRatio: number; heightRatio: number };
	};
}

function tryDecodeImageBase64(b64: string): Buffer | null {
	if (!b64.length) return null;
	const buf = Buffer.from(b64, 'base64');
	return buf.length > 0 ? buf : null;
}

function extractImageBufferFromOperation(poll: Record<string, unknown>, depth = 0): Buffer | null {
	if (!poll || depth > 10) return null;
	const img = poll.image;
	if (typeof img === 'string') {
		const direct = tryDecodeImageBase64(img);
		if (direct) return direct;
	}
	const keys = Object.keys(poll);
	for (const k of keys) {
		if (k === 'error') continue;
		const v = poll[k];
		if (v && typeof v === 'object') {
			const got = extractImageBufferFromOperation(v as Record<string, unknown>, depth + 1);
			if (got) return got;
		}
	}
	return null;
}

function extractModelVersionFromOperation(poll: Record<string, unknown>): string | undefined {
	const response = poll.response as Record<string, unknown> | undefined;
	const mv =
		(response?.modelVersion as string | undefined) ??
		(poll.modelVersion as string | undefined) ??
		(poll.model_version as string | undefined);
	return typeof mv === 'string' ? mv : undefined;
}

export function detectImageMimeFromBuffer(buf: Buffer): { mime: string; ext: string } {
	if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
		return { mime: 'image/jpeg', ext: 'jpg' };
	}
	if (
		buf.length >= 8 &&
		buf[0] === 0x89 &&
		buf[1] === 0x50 &&
		buf[2] === 0x4e &&
		buf[3] === 0x47 &&
		buf[4] === 0x0d &&
		buf[5] === 0x0a &&
		buf[6] === 0x1a &&
		buf[7] === 0x0a
	) {
		return { mime: 'image/png', ext: 'png' };
	}
	return { mime: 'image/jpeg', ext: 'jpg' };
}

export async function generateImageYandexArt(
	apiKey: string,
	folderId: string,
	body: ImageGenerationRequestBody,
	timeoutMs: number,
): Promise<{ imageBuffer: Buffer; modelVersion?: string }> {
	const initRes = await fetch(IMAGE_GENERATION_URL, {
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
		throw new ApplicationError(`imageGenerationAsync failed (${initRes.status}): ${errText}`);
	}
	const op = await parseJsonResponse(initRes);
	const operationId = op.id as string | undefined;
	if (!operationId) {
		throw new ApplicationError('No operation id in imageGenerationAsync response');
	}
	const done = await waitForOperation(apiKey, operationId, timeoutMs);
	const doneErr = done.error as { message?: string } | undefined;
	if (doneErr) {
		const msg = doneErr.message ?? JSON.stringify(doneErr);
		throw new ApplicationError(`Image generation failed: ${msg}`);
	}
	const buf = extractImageBufferFromOperation(done);
	if (!buf) {
		throw new ApplicationError('No image bytes in completed operation response');
	}
	return { imageBuffer: buf, modelVersion: extractModelVersionFromOperation(done) };
}
