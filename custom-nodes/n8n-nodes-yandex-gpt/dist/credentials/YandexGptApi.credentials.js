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
                description: 'API key of the service account with access to Yandex Cloud APIs used by this node (e.g. SpeechKit)',
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