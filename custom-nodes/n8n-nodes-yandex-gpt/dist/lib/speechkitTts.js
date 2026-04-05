"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.synthesizeUtterance = synthesizeUtterance;
const n8n_workflow_1 = require("n8n-workflow");
const jsonParse_1 = require("./jsonParse");
const yandexConstants_1 = require("./yandexConstants");
async function synthesizeUtterance(apiKey, folderId, payload) {
    var _a;
    const response = await fetch(yandexConstants_1.YANDEX_TTS_URL, {
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
            const err = await (0, jsonParse_1.parseJsonResponse)(response);
            const e = err.error;
            msg = (_a = e === null || e === void 0 ? void 0 : e.message) !== null && _a !== void 0 ? _a : msg;
        }
        catch {
        }
        throw new n8n_workflow_1.ApplicationError(`Ошибка API (${response.status}): ${msg}`);
    }
    const data = await (0, jsonParse_1.parseJsonResponse)(response);
    const result = data.result;
    const chunk = result === null || result === void 0 ? void 0 : result.audioChunk;
    const b64 = chunk === null || chunk === void 0 ? void 0 : chunk.data;
    if (!b64) {
        throw new n8n_workflow_1.ApplicationError('В ответе API нет аудиоданных (result.audioChunk.data)');
    }
    return Buffer.from(b64, 'base64');
}
//# sourceMappingURL=speechkitTts.js.map