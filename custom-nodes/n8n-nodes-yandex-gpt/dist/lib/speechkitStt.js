"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectAudioFormat = detectAudioFormat;
exports.recognizeFileV3 = recognizeFileV3;
const n8n_workflow_1 = require("n8n-workflow");
const jsonParse_1 = require("./jsonParse");
const operations_1 = require("./operations");
const yandexConstants_1 = require("./yandexConstants");
function detectAudioFormat(buffer) {
    if (buffer.length < 4)
        return null;
    const sig = buffer.toString('utf8', 0, 4);
    if (sig === 'RIFF')
        return 'WAV';
    if (sig === 'OggS')
        return 'OGG_OPUS';
    if (sig === 'ID3\u0000')
        return 'MP3';
    if (buffer.length >= 2 && buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0)
        return 'MP3';
    return null;
}
function collectAlternatives(alt) {
    const parts = [];
    if (!alt)
        return parts;
    for (const a of alt) {
        if (a.text)
            parts.push(a.text);
    }
    return parts;
}
async function recognizeFileV3(apiKey, folderId, audioBuffer, containerType, languageCode) {
    var _a, _b, _c, _d, _e, _f, _g;
    const containerTypeValue = containerType === 'WAV' ? 1 : containerType === 'OGG_OPUS' ? 2 : 3;
    const recognitionModel = {
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
    const initRes = await fetch(yandexConstants_1.STT_RECOGNIZE_ASYNC_URL, {
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
        throw new n8n_workflow_1.ApplicationError(`recognizeFileAsync failed (${initRes.status}): ${errText}`);
    }
    const op = await (0, jsonParse_1.parseJsonResponse)(initRes);
    const operationId = op.id;
    if (!operationId) {
        throw new n8n_workflow_1.ApplicationError('No operation id in recognizeFileAsync response');
    }
    await (0, operations_1.waitForOperation)(apiKey, operationId, yandexConstants_1.POLL_TIMEOUT_MS);
    const getRes = await fetch(`${yandexConstants_1.STT_GET_RECOGNITION_URL}?operation_id=${encodeURIComponent(operationId)}`, {
        headers: {
            Authorization: `Api-Key ${apiKey}`,
            'x-folder-id': folderId,
        },
    });
    if (!getRes.ok) {
        const errText = await getRes.text();
        throw new n8n_workflow_1.ApplicationError(`getRecognition failed (${getRes.status}): ${errText}`);
    }
    const payloads = await (0, jsonParse_1.parseJsonStreamResponse)(getRes);
    const parts = [];
    for (const p of payloads) {
        const list = p.streaming_responses;
        if (list === null || list === void 0 ? void 0 : list.length) {
            for (const msg of list) {
                const alt = (_b = (_a = msg.final) === null || _a === void 0 ? void 0 : _a.alternatives) !== null && _b !== void 0 ? _b : (_c = msg.partial) === null || _c === void 0 ? void 0 : _c.alternatives;
                parts.push(...collectAlternatives(alt));
            }
            continue;
        }
        const result = p.result;
        const alt1 = collectAlternatives((_d = result === null || result === void 0 ? void 0 : result.final) === null || _d === void 0 ? void 0 : _d.alternatives);
        const alt2 = collectAlternatives((_f = (_e = result === null || result === void 0 ? void 0 : result.finalRefinement) === null || _e === void 0 ? void 0 : _e.normalizedText) === null || _f === void 0 ? void 0 : _f.alternatives);
        parts.push(...alt2, ...alt1);
    }
    const last = (_g = parts.filter(Boolean).slice(-1)[0]) === null || _g === void 0 ? void 0 : _g.trim();
    return last || parts.join(' ').trim() || '';
}
//# sourceMappingURL=speechkitStt.js.map