import type { ICredentialType, ICredentialTestRequest, INodeProperties, Icon } from 'n8n-workflow';

export class YandexGptApi implements ICredentialType {
	name = 'yandexGptApi';

	displayName = 'YandexGPT API';

	documentationUrl = 'https://yandex.cloud/docs/speechkit';

	icon: Icon = { light: 'file:yandexGpt.svg', dark: 'file:yandexGpt.dark.svg' };

	properties: INodeProperties[] = [
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
			description:
				'API key for a service account that can call the APIs used by this node (SpeechKit TTS/STT and/or Foundation Models image generation — see package README)',
			required: true,
		},
	];

	test: ICredentialTestRequest = {
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
