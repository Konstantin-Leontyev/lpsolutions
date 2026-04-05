import { ApplicationError } from 'n8n-workflow';

function extractFirstJsonPayload(text: string): string | null {
	const start = text.search(/[{[]/);
	if (start < 0) return null;
	let depth = 0;
	let inString = false;
	let escaped = false;
	for (let i = start; i < text.length; i++) {
		const ch = text[i];
		if (inString) {
			if (escaped) {
				escaped = false;
				continue;
			}
			if (ch === '\\') {
				escaped = true;
				continue;
			}
			if (ch === '"') {
				inString = false;
			}
			continue;
		}
		if (ch === '"') {
			inString = true;
			continue;
		}
		if (ch === '{' || ch === '[') depth++;
		if (ch === '}' || ch === ']') depth--;
		if (depth === 0) {
			return text.slice(start, i + 1);
		}
	}
	return null;
}

function extractAllJsonPayloads(text: string): string[] {
	const payloads: string[] = [];
	let i = 0;
	while (i < text.length) {
		const start = text.slice(i).search(/[{[]/);
		if (start < 0) break;
		const absoluteStart = i + start;
		let depth = 0;
		let inString = false;
		let escaped = false;
		let closed = false;
		for (let j = absoluteStart; j < text.length; j++) {
			const ch = text[j];
			if (inString) {
				if (escaped) {
					escaped = false;
					continue;
				}
				if (ch === '\\') {
					escaped = true;
					continue;
				}
				if (ch === '"') {
					inString = false;
				}
				continue;
			}
			if (ch === '"') {
				inString = true;
				continue;
			}
			if (ch === '{' || ch === '[') depth++;
			if (ch === '}' || ch === ']') depth--;
			if (depth === 0) {
				payloads.push(text.slice(absoluteStart, j + 1));
				i = j + 1;
				closed = true;
				break;
			}
		}
		if (!closed) break;
	}
	return payloads;
}

export async function parseJsonResponse(res: Response): Promise<Record<string, unknown>> {
	const raw = await res.text();
	try {
		return JSON.parse(raw) as Record<string, unknown>;
	} catch {
		const extracted = extractFirstJsonPayload(raw);
		if (extracted) {
			return JSON.parse(extracted) as Record<string, unknown>;
		}
		throw new ApplicationError(`Failed to parse JSON response: ${raw.slice(0, 500)}`);
	}
}

export async function parseJsonStreamResponse(res: Response): Promise<Record<string, unknown>[]> {
	const raw = await res.text();
	try {
		const one = JSON.parse(raw) as Record<string, unknown>;
		return [one];
	} catch {
		// continue
	}
	const lines = raw
		.split(/\r?\n/)
		.map((l) => l.trim())
		.filter((l) => l.startsWith('{') || l.startsWith('['));
	const parsed: Record<string, unknown>[] = [];
	for (const line of lines) {
		try {
			parsed.push(JSON.parse(line) as Record<string, unknown>);
		} catch {
			// skip
		}
	}
	if (parsed.length > 0) return parsed;
	const payloads = extractAllJsonPayloads(raw);
	for (const p of payloads) {
		parsed.push(JSON.parse(p) as Record<string, unknown>);
	}
	if (parsed.length > 0) return parsed;
	throw new ApplicationError(`Failed to parse JSON stream response: ${raw.slice(0, 500)}`);
}
