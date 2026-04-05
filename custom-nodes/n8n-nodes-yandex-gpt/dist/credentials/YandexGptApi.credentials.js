"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.YandexGptApi = void 0;
class YandexGptApi {
    constructor() {
        this.name = 'yandexGptApi';
        this.displayName = 'YandexGPT API';
        this.documentationUrl = 'https://yandex.cloud/docs/speechkit';
        this.icon = { light: 'file:yandexGpt.svg', dark: 'file:yandexGpt.dark.svg' };
        this.properties = [
            {
                displayName: 'Folder ID',
                name: 'folderId',
                type: 'string',
                default: '',
                description: 'Yandex Cloud folder ID (from the console or CLI)',
                required: true,
            },
            {
                displayName: 'API Key',
                name: 'apiKey',
                type: 'string',
                typeOptions: { password: true },
                default: '',
                description: 'API key for a service account that can call the APIs used by this node (SpeechKit TTS/STT and/or Foundation Models image generation — see package README)',
                required: true,
            },
        ];
        this.test = {
            request: {
                url: 'https://tts.api.cloud.yandex.net:443/tts/v3/utteranceSynthesis',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-folder-id': '={{$credentials.folderId}}',
                    Authorization: '=Api-Key {{$credentials.apiKey}}',
                },
                body: JSON.stringify({
                    text: ' ',
                    hints: [{ voice: 'marina' }, { role: 'friendly' }],
                }),
            },
        };
    }
}
exports.YandexGptApi = YandexGptApi;
//# sourceMappingURL=YandexGptApi.credentials.js.map