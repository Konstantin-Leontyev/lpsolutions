"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.YandexSpeechKit = void 0;
const n8n_workflow_1 = require("n8n-workflow");
const YANDEX_STT_URL = 'https://stt.api.cloud.yandex.net/speech/v1/stt:recognize';
const YANDEX_TTS_URL = 'https://tts.api.cloud.yandex.net:443/tts/v3/utteranceSynthesis';
const SUPPORTED_HZ = [8000, 16000, 48000];
const MAX_PCM_BYTES = 1000000;
function readWavHeader(buffer) {
    if (buffer.length < 44) {
        return { ok: false, message: 'Слишком маленький WAV.' };
    }
    if (buffer.toString('utf8', 0, 4) !== 'RIFF') {
        return { ok: false, message: 'Не похоже на WAV (RIFF).' };
    }
    if (buffer.toString('utf8', 12, 16) !== 'fmt ') {
        return { ok: false, message: 'Не найден fmt в WAV.' };
    }
    const numChannels = buffer.readUInt16LE(22);
    const sampleRate = buffer.readUInt32LE(24);
    const bitsPerSample = buffer.readUInt16LE(34);
    if (numChannels !== 1) {
        return { ok: false, message: 'Поддерживается только моно (1 канал).' };
    }
    if (bitsPerSample !== 16) {
        return { ok: false, message: 'Поддерживается только 16-bit PCM.' };
    }
    const dataChunkOffset = buffer.indexOf(Buffer.from('data', 'utf8'), 12);
    const dataOffset = dataChunkOffset >= 0 ? dataChunkOffset + 8 : 44;
    return { ok: true, pcmBytes: buffer.subarray(dataOffset), sampleRate };
}
function resamplePcmTo16k(pcmBytes, fromRate) {
    const view = new DataView(pcmBytes.buffer, pcmBytes.byteOffset, pcmBytes.length);
    const nOld = pcmBytes.length / 2;
    const nNew = Math.floor((nOld * 16000) / fromRate);
    const out = new ArrayBuffer(nNew * 2);
    const outView = new DataView(out);
    for (let i = 0; i < nNew; i++) {
        const pos = (i * fromRate) / 16000;
        const idx = Math.floor(pos);
        const frac = pos - idx;
        let v;
        if (idx >= nOld - 1) {
            v = view.getInt16(idx * 2, true);
        }
        else {
            v = Math.round(view.getInt16(idx * 2, true) * (1 - frac) +
                view.getInt16((idx + 1) * 2, true) * frac);
        }
        outView.setInt16(i * 2, Math.max(-32768, Math.min(32767, v)), true);
    }
    return Buffer.from(out);
}
function ensureSupportedRate(pcmBytes, sampleRate) {
    if (SUPPORTED_HZ.includes(sampleRate)) {
        return { pcmBytes, sampleRate };
    }
    return {
        pcmBytes: resamplePcmTo16k(pcmBytes, sampleRate),
        sampleRate: 16000,
    };
}
class YandexSpeechKit {
    constructor() {
        this.description = {
            displayName: 'Yandex SpeechKit',
            name: 'yandexSpeechKit',
            icon: { light: 'file:yandexSpeechKit.svg', dark: 'file:yandexSpeechKit.dark.svg' },
            group: ['transform'],
            version: [1],
            description: 'Speech-to-text and text-to-speech via Yandex SpeechKit',
            defaults: {
                name: 'Yandex SpeechKit',
            },
            inputs: [n8n_workflow_1.NodeConnectionTypes.Main],
            outputs: [n8n_workflow_1.NodeConnectionTypes.Main],
            usableAsTool: true,
            credentials: [
                {
                    name: 'yandexSpeechKitApi',
                    required: true,
                    testedBy: 'yandexSpeechKit',
                },
            ],
            properties: [
                {
                    displayName: 'Operation',
                    name: 'resource',
                    type: 'options',
                    noDataExpression: true,
                    options: [
                        { name: 'Speech to Text', value: 'stt' },
                        { name: 'Text to Speech', value: 'tts' },
                    ],
                    default: 'stt',
                    description: 'What to do with the input',
                },
                {
                    displayName: 'Binary Property',
                    name: 'binaryPropertyName',
                    type: 'string',
                    default: 'data',
                    description: 'Name of the binary property containing the WAV audio',
                    displayOptions: { show: { resource: ['stt'] } },
                },
                {
                    displayName: 'Language',
                    name: 'lang',
                    type: 'string',
                    default: 'ru-RU',
                    description: 'Recognition language code',
                    displayOptions: { show: { resource: ['stt'] } },
                },
                {
                    displayName: 'Text',
                    name: 'text',
                    type: 'string',
                    default: '',
                    description: 'Text to synthesize to speech',
                    required: true,
                    displayOptions: { show: { resource: ['tts'] } },
                },
                {
                    displayName: 'Voice',
                    name: 'voice',
                    type: 'string',
                    default: 'marina',
                    description: 'SpeechKit voice (e.g. marina, alena)',
                    displayOptions: { show: { resource: ['tts'] } },
                },
                {
                    displayName: 'Role',
                    name: 'role',
                    type: 'string',
                    default: 'friendly',
                    description: 'Voice role/character (e.g. friendly)',
                    displayOptions: { show: { resource: ['tts'] } },
                },
            ],
        };
    }
    async execute() {
        var _a, _b, _c, _d, _e, _f, _g;
        const items = this.getInputData();
        const credentials = await this.getCredentials('yandexSpeechKitApi');
        const resource = this.getNodeParameter('resource', 0);
        if (resource === 'stt') {
            const binaryPropertyName = this.getNodeParameter('binaryPropertyName', 0, 'data');
            const lang = this.getNodeParameter('lang', 0, 'ru-RU');
            const results = [];
            for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
                try {
                    const buffer = await this.helpers.getBinaryDataBuffer(itemIndex, binaryPropertyName);
                    if (!buffer || buffer.length === 0) {
                        throw new n8n_workflow_1.NodeOperationError(this.getNode(), `No binary data in property "${binaryPropertyName}"`, { itemIndex });
                    }
                    const parsed = readWavHeader(buffer);
                    if (!parsed.ok) {
                        throw new n8n_workflow_1.NodeOperationError(this.getNode(), parsed.message, {
                            itemIndex,
                        });
                    }
                    const { pcmBytes: finalPcm, sampleRate: finalRate } = ensureSupportedRate(parsed.pcmBytes, parsed.sampleRate);
                    if (finalPcm.length > MAX_PCM_BYTES) {
                        throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Файл больше 1 МБ. SpeechKit v1 поддерживает до 1 МБ.', { itemIndex });
                    }
                    const params = new URLSearchParams({
                        folderId: credentials.folderId,
                        lang,
                        format: 'lpcm',
                        sampleRateHertz: String(finalRate),
                    });
                    const url = `${YANDEX_STT_URL}?${params.toString()}`;
                    const response = await fetch(url, {
                        method: 'POST',
                        headers: {
                            Authorization: `Api-Key ${credentials.apiKey}`,
                            'Content-Type': 'application/octet-stream',
                        },
                        body: finalPcm,
                    });
                    if (!response.ok) {
                        let msg = response.statusText;
                        try {
                            const err = (await response.json());
                            msg = (_b = (_a = err === null || err === void 0 ? void 0 : err.error) === null || _a === void 0 ? void 0 : _a.message) !== null && _b !== void 0 ? _b : msg;
                        }
                        catch {
                        }
                        throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Ошибка API (${response.status}): ${msg}`, { itemIndex });
                    }
                    const data = (await response.json());
                    const transcription = ((_c = data.result) !== null && _c !== void 0 ? _c : '').trim();
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
                                error: error.message,
                            },
                            pairedItem: { item: itemIndex },
                        });
                    }
                    else {
                        if (error instanceof n8n_workflow_1.NodeOperationError)
                            throw error;
                        throw new n8n_workflow_1.NodeOperationError(this.getNode(), error, {
                            itemIndex,
                        });
                    }
                }
            }
            return [results];
        }
        const results = [];
        for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
            try {
                const text = this.getNodeParameter('text', itemIndex, '');
                const voice = this.getNodeParameter('voice', itemIndex, 'marina');
                const role = this.getNodeParameter('role', itemIndex, 'friendly');
                if (!text || String(text).trim() === '') {
                    throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Text is required for synthesis', { itemIndex });
                }
                const payload = {
                    text: String(text).trim(),
                    hints: [{ voice }, { role }],
                };
                const response = await fetch(YANDEX_TTS_URL, {
                    method: 'POST',
                    headers: {
                        Authorization: `Api-Key ${credentials.apiKey}`,
                        'x-folder-id': credentials.folderId,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                });
                if (!response.ok) {
                    let msg = response.statusText;
                    try {
                        const err = (await response.json());
                        msg = (_e = (_d = err === null || err === void 0 ? void 0 : err.error) === null || _d === void 0 ? void 0 : _d.message) !== null && _e !== void 0 ? _e : msg;
                    }
                    catch {
                    }
                    throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Ошибка API (${response.status}): ${msg}`, { itemIndex });
                }
                const data = (await response.json());
                const result = (_f = data === null || data === void 0 ? void 0 : data.result) !== null && _f !== void 0 ? _f : {};
                const chunk = (_g = result === null || result === void 0 ? void 0 : result.audioChunk) !== null && _g !== void 0 ? _g : {};
                const b64 = chunk === null || chunk === void 0 ? void 0 : chunk.data;
                if (!b64) {
                    throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'В ответе API нет аудиоданных (result.audioChunk.data)', { itemIndex });
                }
                const audioBuffer = Buffer.from(b64, 'base64');
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
                            error: error.message,
                        },
                        pairedItem: { item: itemIndex },
                    });
                }
                else {
                    if (error instanceof n8n_workflow_1.NodeOperationError)
                        throw error;
                    throw new n8n_workflow_1.NodeOperationError(this.getNode(), error, {
                        itemIndex,
                    });
                }
            }
        }
        return [results];
    }
}
exports.YandexSpeechKit = YandexSpeechKit;
//# sourceMappingURL=YandexSpeechKit.node.js.map