import type { ICredentialType, ICredentialTestRequest, INodeProperties, Icon } from 'n8n-workflow';
export declare class YandexGptApi implements ICredentialType {
    name: string;
    displayName: string;
    documentationUrl: string;
    icon: Icon;
    properties: INodeProperties[];
    test: ICredentialTestRequest;
}
