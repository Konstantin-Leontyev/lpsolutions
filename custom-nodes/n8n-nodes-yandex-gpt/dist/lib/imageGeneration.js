"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectImageMimeFromBuffer = detectImageMimeFromBuffer;
exports.generateImageYandexArt = generateImageYandexArt;
const n8n_workflow_1 = require("n8n-workflow");
const jsonParse_1 = require("./jsonParse");
const operations_1 = require("./operations");
const yandexConstants_1 = require("./yandexConstants");
function tryDecodeImageBase64(b64) {
    if (!b64.length)
        return null;
    const buf = Buffer.from(b64, 'base64');
    return buf.length > 0 ? buf : null;
}
function extractImageBufferFromOperation(poll, depth = 0) {
    if (!poll || depth > 10)
        return null;
    const img = poll.image;
    if (typeof img === 'string') {
        const direct = tryDecodeImageBase64(img);
        if (direct)
            return direct;
    }
    const keys = Object.keys(poll);
    for (const k of keys) {
        if (k === 'error')
            continue;
        const v = poll[k];
        if (v && typeof v === 'object') {
            const got = extractImageBufferFromOperation(v, depth + 1);
            if (got)
                return got;
        }
    }
    return null;
}
function extractModelVersionFromOperation(poll) {
    var _a, _b;
    const response = poll.response;
    const mv = (_b = (_a = response === null || response === void 0 ? void 0 : response.modelVersion) !== null && _a !== void 0 ? _a : poll.modelVersion) !== null && _b !== void 0 ? _b : poll.model_version;
    return typeof mv === 'string' ? mv : undefined;
}
function detectImageMimeFromBuffer(buf) {
    if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
        return { mime: 'image/jpeg', ext: 'jpg' };
    }
    if (buf.length >= 8 &&
        buf[0] === 0x89 &&
        buf[1] === 0x50 &&
        buf[2] === 0x4e &&
        buf[3] === 0x47 &&
        buf[4] === 0x0d &&
        buf[5] === 0x0a &&
        buf[6] === 0x1a &&
        buf[7] === 0x0a) {
        return { mime: 'image/png', ext: 'png' };
    }
    return { mime: 'image/jpeg', ext: 'jpg' };
}
async function generateImageYandexArt(apiKey, folderId, body, timeoutMs) {
    var _a;
    const initRes = await fetch(yandexConstants_1.IMAGE_GENERATION_URL, {
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
        throw new n8n_workflow_1.ApplicationError(`imageGenerationAsync failed (${initRes.status}): ${errText}`);
    }
    const op = await (0, jsonParse_1.parseJsonResponse)(initRes);
    const operationId = op.id;
    if (!operationId) {
        throw new n8n_workflow_1.ApplicationError('No operation id in imageGenerationAsync response');
    }
    const done = await (0, operations_1.waitForOperation)(apiKey, operationId, timeoutMs);
    const doneErr = done.error;
    if (doneErr) {
        const msg = (_a = doneErr.message) !== null && _a !== void 0 ? _a : JSON.stringify(doneErr);
        throw new n8n_workflow_1.ApplicationError(`Image generation failed: ${msg}`);
    }
    const buf = extractImageBufferFromOperation(done);
    if (!buf) {
        throw new n8n_workflow_1.ApplicationError('No image bytes in completed operation response');
    }
    return { imageBuffer: buf, modelVersion: extractModelVersionFromOperation(done) };
}
//# sourceMappingURL=imageGeneration.js.map