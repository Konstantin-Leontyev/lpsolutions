"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.YandexGpt = void 0;
const n8n_workflow_1 = require("n8n-workflow");
const YANDEX_TTS_URL = 'https://tts.api.cloud.yandex.net:443/tts/v3/utteranceSynthesis';
const STT_RECOGNIZE_ASYNC_URL = 'https://stt.api.cloud.yandex.net:443/stt/v3/recognizeFileAsync';
const STT_GET_RECOGNITION_URL = 'https://stt.api.cloud.yandex.net:443/stt/v3/getRecognition';
const OPERATIONS_URL = 'https://operation.api.cloud.yandex.net';
const POLL_INTERVAL_MS = 1000;
const POLL_TIMEOUT_MS = 10 * 60 * 1000;
const LOCALE_OPTIONS = [
    { name: 'Ru-RU (Русский)', value: 'ru-RU' },
    { name: 'En-US (Английский)', value: 'en-US' },
    { name: 'De-DE (Немецкий)', value: 'de-DE' },
    { name: 'He-IL (Иврит)', value: 'he-IL' },
    { name: 'Kk-KZ (Казахский)', value: 'kk-KZ' },
    { name: 'Uz-UZ (Узбекский)', value: 'uz-UZ' },
];
const VOICES_BY_LOCALE = {
    'ru-RU': [
        'marina',
        'alena',
        'dasha',
        'julia',
        'lera',
        'masha',
        'saule_ru',
        'zamira_ru',
        'zhanar_ru',
        'yulduz_ru',
        'jane',
        'omazh',
        'alexander',
        'kirill',
        'anton',
        'filipp',
        'ermil',
        'zahar',
        'madi_ru',
    ],
    'en-US': ['john'],
    'de-DE': ['lea'],
    'he-IL': ['naomi'],
    'kk-KZ': ['amira', 'madi', 'saule', 'zhanar'],
    'uz-UZ': ['nigora', 'zamira', 'yulduz'],
};
const ROLES_BY_VOICE = {
    lea: [],
    john: [],
    naomi: ['modern', 'classic'],
    amira: [],
    madi: [],
    saule: ['neutral', 'strict'],
    zhanar: ['neutral', 'friendly'],
    alena: ['neutral', 'good'],
    filipp: [],
    ermil: ['neutral', 'good'],
    jane: ['neutral', 'good', 'evil'],
    omazh: ['neutral', 'evil'],
    zahar: ['neutral', 'good'],
    dasha: ['neutral', 'good', 'friendly'],
    julia: ['neutral', 'strict'],
    lera: ['neutral', 'friendly'],
    masha: ['good', 'strict', 'friendly'],
    marina: ['neutral', 'whisper', 'friendly'],
    alexander: ['neutral', 'good'],
    kirill: ['neutral', 'strict', 'good'],
    anton: ['neutral', 'good'],
    madi_ru: [],
    saule_ru: ['neutral', 'strict', 'whisper'],
    zamira_ru: ['neutral', 'strict', 'friendly'],
    zhanar_ru: ['neutral', 'strict', 'friendly'],
    yulduz_ru: ['neutral', 'strict', 'friendly', 'whisper'],
    nigora: [],
    zamira: ['neutral', 'strict', 'friendly'],
    yulduz: ['neutral', 'strict', 'friendly', 'whisper'],
};
const VOICES_WITHOUT_ROLES = Object.entries(ROLES_BY_VOICE)
    .filter(([, roles]) => roles.length === 0)
    .map(([voice]) => voice);
function formatVoiceLabel(voiceValue, locale) {
    let base = voiceValue;
    if (locale === 'ru-RU') {
        base = base.replace(/_ru$/, '');
    }
    return base
        .split(/_/g)
        .filter(Boolean)
        .map((w) => w[0].toUpperCase() + w.slice(1))
        .join('');
}
function formatRoleLabel(roleValue) {
    return roleValue
        .split(/_/g)
        .filter(Boolean)
        .map((w) => w[0].toUpperCase() + w.slice(1))
        .join('');
}
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
                break;
            }
        }
        if (payloads.length === 0 || i <= absoluteStart)
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
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
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
        throw new n8n_workflow_1.ApplicationError(`recognizeFileAsync failed (${initRes.status}): ${errText}`);
    }
    const op = await parseJsonResponse(initRes);
    const operationId = op === null || op === void 0 ? void 0 : op.id;
    if (!operationId) {
        throw new n8n_workflow_1.ApplicationError('No operation id in recognizeFileAsync response');
    }
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    while (Date.now() < deadline) {
        const pollRes = await fetch(`${OPERATIONS_URL}/operations/${operationId}`, {
            headers: { Authorization: `Api-Key ${apiKey}` },
        });
        if (!pollRes.ok) {
            await (0, n8n_workflow_1.sleep)(POLL_INTERVAL_MS);
            continue;
        }
        const poll = await parseJsonResponse(pollRes);
        if ((_a = poll.error) === null || _a === void 0 ? void 0 : _a.message) {
            throw new n8n_workflow_1.ApplicationError(`Recognition failed: ${poll.error.message}`);
        }
        if (poll.done) {
            break;
        }
        await (0, n8n_workflow_1.sleep)(POLL_INTERVAL_MS);
    }
    const getRes = await fetch(`${STT_GET_RECOGNITION_URL}?operation_id=${encodeURIComponent(operationId)}`, {
        headers: {
            Authorization: `Api-Key ${apiKey}`,
            'x-folder-id': folderId,
        },
    });
    if (!getRes.ok) {
        const errText = await getRes.text();
        throw new n8n_workflow_1.ApplicationError(`getRecognition failed (${getRes.status}): ${errText}`);
    }
    const payloads = await parseJsonStreamResponse(getRes);
    const parts = [];
    for (const p of payloads) {
        const list = p === null || p === void 0 ? void 0 : p.streaming_responses;
        if (list === null || list === void 0 ? void 0 : list.length) {
            for (const msg of list) {
                const alt = (_c = (_b = msg.final) === null || _b === void 0 ? void 0 : _b.alternatives) !== null && _c !== void 0 ? _c : (_d = msg.partial) === null || _d === void 0 ? void 0 : _d.alternatives;
                if (alt) {
                    for (const a of alt)
                        if (a.text)
                            parts.push(a.text);
                }
            }
            continue;
        }
        const result = p === null || p === void 0 ? void 0 : p.result;
        const alt1 = (_f = (_e = result === null || result === void 0 ? void 0 : result.final) === null || _e === void 0 ? void 0 : _e.alternatives) !== null && _f !== void 0 ? _f : [];
        const alt2 = (_j = (_h = (_g = result === null || result === void 0 ? void 0 : result.finalRefinement) === null || _g === void 0 ? void 0 : _g.normalizedText) === null || _h === void 0 ? void 0 : _h.alternatives) !== null && _j !== void 0 ? _j : [];
        for (const a of [...alt2, ...alt1]) {
            if (a === null || a === void 0 ? void 0 : a.text)
                parts.push(a.text);
        }
    }
    return ((_k = parts.filter(Boolean).slice(-1)[0]) === null || _k === void 0 ? void 0 : _k.trim()) || parts.join(' ').trim() || '';
}
class YandexGpt {
    constructor() {
        this.description = {
            displayName: 'YandexGPT',
            name: 'yandexGpt',
            icon: { light: 'file:yandexGpt.svg', dark: 'file:yandexGpt.dark.svg' },
            group: ['transform'],
            version: [1],
            subtitle: '={{$parameter.operation === "transcribe" ? "Transcribe a recording" : "Generate audio"}}',
            description: ' ',
            defaults: {
                name: 'YandexGPT',
            },
            inputs: [n8n_workflow_1.NodeConnectionTypes.Main],
            outputs: [n8n_workflow_1.NodeConnectionTypes.Main],
            credentials: [
                {
                    name: 'yandexGptApi',
                    required: true,
                },
            ],
            properties: [
                {
                    displayName: 'Resource',
                    name: 'resource',
                    type: 'options',
                    noDataExpression: true,
                    options: [{ name: 'Audio', value: 'audio' }],
                    default: 'audio',
                },
                {
                    displayName: 'Operation',
                    name: 'operation',
                    type: 'options',
                    noDataExpression: true,
                    displayOptions: {
                        show: {
                            resource: ['audio'],
                        },
                    },
                    options: [
                        {
                            name: 'Generate audio',
                            value: 'generate',
                            action: 'Generate audio',
                            description: 'Text-to-speech (TTS)',
                        },
                        {
                            name: 'Transcribe a recording',
                            value: 'transcribe',
                            action: 'Transcribe a recording',
                            description: 'Speech-to-text (STT)',
                        },
                    ],
                    default: 'transcribe',
                },
                {
                    displayName: 'Binary Property',
                    name: 'binaryPropertyName',
                    type: 'string',
                    default: 'data',
                    description: 'Name of the binary property with audio. SpeechKit API v3. Formats: WAV, OggOpus, MP3. No 1 MB/30 s limit.',
                    displayOptions: {
                        show: {
                            resource: ['audio'],
                            operation: ['transcribe'],
                        },
                    },
                },
                {
                    displayName: 'Language',
                    name: 'language',
                    type: 'options',
                    noDataExpression: true,
                    default: 'ru-RU',
                    description: 'SpeechKit language',
                    displayOptions: {
                        show: {
                            resource: ['audio'],
                            operation: ['transcribe', 'generate'],
                        },
                    },
                    options: LOCALE_OPTIONS,
                },
                {
                    displayName: 'Text',
                    name: 'text',
                    type: 'string',
                    default: '',
                    description: 'Text to synthesize to speech',
                    required: true,
                    displayOptions: {
                        show: {
                            resource: ['audio'],
                            operation: ['generate'],
                        },
                    },
                },
                {
                    displayName: 'Voice',
                    name: 'voice',
                    type: 'options',
                    default: 'marina',
                    noDataExpression: true,
                    description: 'Choose voice from the list',
                    typeOptions: {
                        loadOptionsMethod: 'getVoices',
                        loadOptionsDependsOn: ['language'],
                    },
                    displayOptions: {
                        show: {
                            resource: ['audio'],
                            operation: ['generate'],
                        },
                    },
                },
                {
                    displayName: 'Role',
                    name: 'role',
                    type: 'options',
                    default: '',
                    description: 'Intonation / speech style',
                    noDataExpression: true,
                    disabledOptions: {
                        show: {
                            voice: VOICES_WITHOUT_ROLES,
                        },
                    },
                    typeOptions: {
                        loadOptionsMethod: 'getRoles',
                        loadOptionsDependsOn: ['voice'],
                    },
                    displayOptions: {
                        show: {
                            resource: ['audio'],
                            operation: ['generate'],
                        },
                    },
                },
            ],
        };
        this.methods = {
            loadOptions: {
                async getVoices() {
                    const languageRaw = this.getCurrentNodeParameter('language');
                    const locale = languageRaw && languageRaw in VOICES_BY_LOCALE ? languageRaw : 'ru-RU';
                    const voices = VOICES_BY_LOCALE[locale];
                    return voices.map((v) => ({
                        name: formatVoiceLabel(v, locale),
                        value: v,
                    }));
                },
                async getRoles() {
                    const voice = this.getCurrentNodeParameter('voice');
                    const roles = voice ? ROLES_BY_VOICE[voice] : [];
                    if (!roles || roles.length === 0)
                        return [{ name: '', value: '' }];
                    return roles.map((r) => ({
                        name: formatRoleLabel(r),
                        value: r,
                    }));
                },
            },
        };
    }
    async execute() {
        var _a, _b, _c, _d, _e, _f;
        const items = this.getInputData();
        const credentials = await this.getCredentials('yandexGptApi');
        const operation = this.getNodeParameter('operation', 0);
        if (operation === 'transcribe') {
            const binaryPropertyName = this.getNodeParameter('binaryPropertyName', 0, 'data');
            const language = this.getNodeParameter('language', 0, 'ru-RU');
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
                    const transcription = await recognizeFileV3(credentials.apiKey, credentials.folderId, buffer, format, language);
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
                const language = this.getNodeParameter('language', itemIndex, 'ru-RU');
                const allowedVoices = (_a = VOICES_BY_LOCALE[language]) !== null && _a !== void 0 ? _a : VOICES_BY_LOCALE['ru-RU'];
                const text = this.getNodeParameter('text', itemIndex, '');
                const voiceParam = this.getNodeParameter('voice', itemIndex, allowedVoices[0]);
                const voice = allowedVoices.includes(voiceParam) ? voiceParam : allowedVoices[0];
                const roleParam = this.getNodeParameter('role', itemIndex, '');
                const allowedRoles = (_b = ROLES_BY_VOICE[voice]) !== null && _b !== void 0 ? _b : [];
                const roleToUse = allowedRoles.includes(roleParam) ? roleParam : allowedRoles[0];
                if (!text || String(text).trim() === '') {
                    throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Text is required for synthesis', { itemIndex });
                }
                const payload = {
                    text: String(text).trim(),
                    hints: roleToUse ? [{ voice }, { role: roleToUse }] : [{ voice }],
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
                        const err = await parseJsonResponse(response);
                        msg = (_d = (_c = err === null || err === void 0 ? void 0 : err.error) === null || _c === void 0 ? void 0 : _c.message) !== null && _d !== void 0 ? _d : msg;
                    }
                    catch {
                    }
                    throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Ошибка API (${response.status}): ${msg}`, { itemIndex });
                }
                const data = await parseJsonResponse(response);
                const result = (_e = data === null || data === void 0 ? void 0 : data.result) !== null && _e !== void 0 ? _e : {};
                const chunk = (_f = result === null || result === void 0 ? void 0 : result.audioChunk) !== null && _f !== void 0 ? _f : {};
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
exports.YandexGpt = YandexGpt;
//# sourceMappingURL=YandexGpt.node.js.map