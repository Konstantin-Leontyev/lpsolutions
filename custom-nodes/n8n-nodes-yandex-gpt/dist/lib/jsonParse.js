"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseJsonResponse = parseJsonResponse;
exports.parseJsonStreamResponse = parseJsonStreamResponse;
const n8n_workflow_1 = require("n8n-workflow");
function extractFirstJsonPayload(text) {
    const start = text.search(/[{[]/);
    if (start < 0)
        return null;
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
        if (ch === '{' || ch === '[')
            depth++;
        if (ch === '}' || ch === ']')
            depth--;
        if (depth === 0) {
            return text.slice(start, i + 1);
        }
    }
    return null;
}
function extractAllJsonPayloads(text) {
    const payloads = [];
    let i = 0;
    while (i < text.length) {
        const start = text.slice(i).search(/[{[]/);
        if (start < 0)
            break;
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
            if (ch === '{' || ch === '[')
                depth++;
            if (ch === '}' || ch === ']')
                depth--;
            if (depth === 0) {
                payloads.push(text.slice(absoluteStart, j + 1));
                i = j + 1;
                closed = true;
                break;
            }
        }
        if (!closed)
            break;
    }
    return payloads;
}
async function parseJsonResponse(res) {
    const raw = await res.text();
    try {
        return JSON.parse(raw);
    }
    catch {
        const extracted = extractFirstJsonPayload(raw);
        if (extracted) {
            return JSON.parse(extracted);
        }
        throw new n8n_workflow_1.ApplicationError(`Failed to parse JSON response: ${raw.slice(0, 500)}`);
    }
}
async function parseJsonStreamResponse(res) {
    const raw = await res.text();
    try {
        const one = JSON.parse(raw);
        return [one];
    }
    catch {
    }
    const lines = raw
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.startsWith('{') || l.startsWith('['));
    const parsed = [];
    for (const line of lines) {
        try {
            parsed.push(JSON.parse(line));
        }
        catch {
        }
    }
    if (parsed.length > 0)
        return parsed;
    const payloads = extractAllJsonPayloads(raw);
    for (const p of payloads) {
        parsed.push(JSON.parse(p));
    }
    if (parsed.length > 0)
        return parsed;
    throw new n8n_workflow_1.ApplicationError(`Failed to parse JSON stream response: ${raw.slice(0, 500)}`);
}
//# sourceMappingURL=jsonParse.js.map