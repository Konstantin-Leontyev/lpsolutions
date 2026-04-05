"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildYandexGptDescription = buildYandexGptDescription;
const n8n_workflow_1 = require("n8n-workflow");
const imageAspect_1 = require("./imageAspect");
const speechkitVoices_1 = require("./speechkitVoices");
const audioOperations = [
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
                name: 'Generate Audio',
                value: 'generate',
                action: 'Generate audio',
                description: 'Text-to-speech (TTS)',
            },
            {
                name: 'Transcribe A Recording',
                value: 'transcribe',
                action: 'Transcribe a recording',
                description: 'Speech-to-text (STT)',
            },
        ],
        default: 'generate',
    },
];
const imageOperations = [
    {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
            show: {
                resource: ['image'],
            },
        },
        options: [
            {
                name: 'Generate An Image',
                value: 'generateImage',
                action: 'Generate an image',
                description: 'YandexART text-to-image (Foundation Models)',
            },
        ],
        default: 'generateImage',
    },
];
function buildYandexGptDescription() {
    return {
        displayName: 'YandexGPT',
        name: 'yandexGpt',
        icon: { light: 'file:yandexGpt.svg', dark: 'file:yandexGpt.dark.svg' },
        group: ['transform'],
        version: [1],
        subtitle: '={{$parameter.resource === "image" ? "Generate an image" : ($parameter.operation === "transcribe" ? "Transcribe a recording" : "Generate audio")}}',
        description: '',
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
                options: [
                    { name: 'Audio', value: 'audio' },
                    { name: 'Image', value: 'image' },
                ],
                default: 'audio',
            },
            ...audioOperations,
            ...imageOperations,
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
                options: speechkitVoices_1.LOCALE_OPTIONS,
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
                displayName: 'Voice Name or ID',
                name: 'voice',
                type: 'options',
                default: '',
                noDataExpression: true,
                description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
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
                displayName: 'Role Name or ID',
                name: 'role',
                type: 'options',
                default: '',
                noDataExpression: true,
                description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
                disabledOptions: {
                    show: {
                        voice: speechkitVoices_1.VOICES_WITHOUT_ROLES,
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
            {
                displayName: 'Prompt',
                name: 'imagePrompt',
                type: 'string',
                default: '',
                description: 'Text description for YandexART (maps to API messages[].text)',
                required: true,
                displayOptions: {
                    show: {
                        resource: ['image'],
                        operation: ['generateImage'],
                    },
                },
            },
            {
                displayName: 'Model URI Override',
                name: 'modelUriOverride',
                type: 'string',
                default: '',
                placeholder: 'e.g. art://<folderId>/yandex-art/latest',
                description: 'If set, used as modelUri as-is. Otherwise URI is built as art://{folderId}/{model}/{version} (see Yandex Cloud docs).',
                displayOptions: {
                    show: {
                        resource: ['image'],
                        operation: ['generateImage'],
                    },
                },
            },
            {
                displayName: 'Model',
                name: 'imageModel',
                type: 'options',
                noDataExpression: true,
                default: 'yandex-art',
                description: 'Foundation Models image model name (ignored if Model URI Override is set)',
                options: [{ name: 'YandexART', value: 'yandex-art' }],
                displayOptions: {
                    show: {
                        resource: ['image'],
                        operation: ['generateImage'],
                    },
                },
            },
            {
                displayName: 'Model Version',
                name: 'imageModelVersion',
                type: 'string',
                default: 'latest',
                description: 'Model version segment in art://…/{model}/{version}',
                displayOptions: {
                    show: {
                        resource: ['image'],
                        operation: ['generateImage'],
                    },
                },
            },
            {
                displayName: 'Aspect Ratio',
                name: 'imageAspectPreset',
                type: 'options',
                noDataExpression: true,
                default: '',
                description: 'Maps to generationOptions.aspectRatio (widthRatio:heightRatio). Omit to let the API use defaults.',
                options: imageAspect_1.ASPECT_RATIO_PRESETS,
                displayOptions: {
                    show: {
                        resource: ['image'],
                        operation: ['generateImage'],
                    },
                },
            },
            {
                displayName: 'Width Ratio',
                name: 'imageWidthRatio',
                type: 'number',
                default: 1,
                description: 'Used when aspect ratio is custom',
                displayOptions: {
                    show: {
                        resource: ['image'],
                        operation: ['generateImage'],
                        imageAspectPreset: ['custom'],
                    },
                },
            },
            {
                displayName: 'Height Ratio',
                name: 'imageHeightRatio',
                type: 'number',
                default: 1,
                description: 'Used when aspect ratio is custom',
                displayOptions: {
                    show: {
                        resource: ['image'],
                        operation: ['generateImage'],
                        imageAspectPreset: ['custom'],
                    },
                },
            },
            {
                displayName: 'Seed',
                name: 'imageSeed',
                type: 'number',
                default: 0,
                description: '0 = random (field omitted). Non-zero fixes the noise seed (see API docs).',
                displayOptions: {
                    show: {
                        resource: ['image'],
                        operation: ['generateImage'],
                    },
                },
            },
            {
                displayName: 'MIME Type',
                name: 'imageMimeType',
                type: 'options',
                noDataExpression: true,
                default: '',
                description: 'GenerationOptions.mimeType. Empty = omit (API default).',
                options: [
                    { name: 'Default (omit)', value: '' },
                    { name: 'image/jpeg', value: 'image/jpeg' },
                    { name: 'image/png', value: 'image/png' },
                ],
                displayOptions: {
                    show: {
                        resource: ['image'],
                        operation: ['generateImage'],
                    },
                },
            },
        ],
    };
}
//# sourceMappingURL=yandexGptDescription.js.map