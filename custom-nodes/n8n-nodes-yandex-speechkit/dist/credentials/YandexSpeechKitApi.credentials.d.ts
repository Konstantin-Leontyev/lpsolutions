import type { ICredentialTestRequest, ICredentialType, Icon, INodeProperties } from 'n8n-workflow';
export declare class YandexSpeechKitApi implements ICredentialType {
    name: string;
    displayName: string;
    documentationUrl: string;
    icon: Icon;
    properties: INodeProperties[];
    test: ICredentialTestRequest;
}
