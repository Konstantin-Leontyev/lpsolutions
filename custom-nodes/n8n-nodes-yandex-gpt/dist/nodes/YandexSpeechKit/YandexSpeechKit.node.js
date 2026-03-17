"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.YandexSpeechKit = void 0;
const n8n_workflow_1 = require("n8n-workflow");
const YANDEX_TTS_URL = 'https://tts.api.cloud.yandex.net:443/tts/v3/utteranceSynthesis';
const STT_RECOGNIZE_ASYNC_URL = 'https://stt.api.cloud.yandex.net:443/stt/v3/recognizeFileAsync';
const STT_GET_RECOGNITION_URL = 'https://stt.api.cloud.yandex.net:443/stt/v3/getRecognition';
const OPERATIONS_URL = 'https://operation.api.cloud.yandex.net';
const POLL_INTERVAL_MS = 1000;
const POLL_TIMEOUT_MS = 10 * 60 * 1000;
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
async function recognizeFileV3(apiKey, folderId, audioBuffer, containerType, languageCode) {
    var _a, _b, _c, _d, _e;
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
        throw new Error(`recognizeFileAsync failed (${initRes.status}): ${errText}`);
    }
    const op = (await initRes.json());
    const operationId = op === null || op === void 0 ? void 0 : op.id;
    if (!operationId) {
        throw new Error('No operation id in recognizeFileAsync response');
    }
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    while (Date.now() < deadline) {
        const pollRes = await fetch(`${OPERATIONS_URL}/operations/${operationId}`, {
            headers: { Authorization: `Api-Key ${apiKey}` },
        });
        if (!pollRes.ok) {
            await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
            continue;
        }
        const poll = (await pollRes.json());
        if ((_a = poll.error) === null || _a === void 0 ? void 0 : _a.message) {
            throw new Error(`Recognition failed: ${poll.error.message}`);
        }
        if (poll.done) {
            break;
        }
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }
    const getRes = await fetch(`${STT_GET_RECOGNITION_URL}?operation_id=${encodeURIComponent(operationId)}`, {
        headers: {
            Authorization: `Api-Key ${apiKey}`,
            'x-folder-id': folderId,
        },
    });
    if (!getRes.ok) {
        const errText = await getRes.text();
        throw new Error(`getRecognition failed (${getRes.status}): ${errText}`);
    }
    const getData = (await getRes.json());
    const parts = [];
    const list = (_b = getData === null || getData === void 0 ? void 0 : getData.streaming_responses) !== null && _b !== void 0 ? _b : [];
    for (const msg of list) {
        const alt = (_d = (_c = msg.final) === null || _c === void 0 ? void 0 : _c.alternatives) !== null && _d !== void 0 ? _d : (_e = msg.partial) === null || _e === void 0 ? void 0 : _e.alternatives;
        if (alt) {
            for (const a of alt) {
                if (a.text)
                    parts.push(a.text);
            }
        }
    }
    return parts.join(' ').trim() || '';
}
class YandexSpeechKit {
    constructor() {
        this.description = {
            displayName: 'YandexGPT',
            name: 'yandexSpeechKit',
            icon: { light: 'file:yandexGpt.svg', dark: 'file:yandexGpt.svg' },
            group: ['transform'],
            version: [1],
            description: 'Transcribe audio or generate speech via Yandex SpeechKit (YandexGPT). Uses API v3 for both STT and TTS. STT: WAV, OggOpus, MP3; no 1 MB/30 s limit.',
            defaults: {
                name: 'YandexGPT',
            },
            inputs: [n8n_workflow_1.NodeConnectionTypes.Main],
            outputs: [n8n_workflow_1.NodeConnectionTypes.Main],
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
                        { name: 'Transcribe a recording', value: 'stt' },
                        { name: 'Generate audio', value: 'tts' },
                    ],
                    default: 'stt',
                    description: 'What to do with the input',
                },
                {
                    displayName: 'Binary Property',
                    name: 'binaryPropertyName',
                    type: 'string',
                    default: 'data',
                    description: 'Name of the binary property with audio. SpeechKit API v3. Formats: WAV, OggOpus, MP3. No 1 MB/30 s limit.',
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
        var _a, _b, _c, _d;
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
                    const format = detectAudioFormat(buffer);
                    if (!format) {
                        throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Unsupported audio format. Use WAV, OggOpus, or MP3.', { itemIndex });
                    }
                    const transcription = await recognizeFileV3(credentials.apiKey, credentials.folderId, buffer, format, lang);
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
                        msg = (_b = (_a = err === null || err === void 0 ? void 0 : err.error) === null || _a === void 0 ? void 0 : _a.message) !== null && _b !== void 0 ? _b : msg;
                    }
                    catch {
                    }
                    throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Ошибка API (${response.status}): ${msg}`, { itemIndex });
                }
                const data = (await response.json());
                const result = (_c = data === null || data === void 0 ? void 0 : data.result) !== null && _c !== void 0 ? _c : {};
                const chunk = (_d = result === null || result === void 0 ? void 0 : result.audioChunk) !== null && _d !== void 0 ? _d : {};
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