import type { IExecuteFunctions, INodeExecutionData, ILoadOptionsFunctions, INodePropertyOptions, INodeType, INodeTypeDescription } from 'n8n-workflow';
export declare class YandexGpt implements INodeType {
    description: INodeTypeDescription;
    methods: {
        loadOptions: {
            getVoices(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]>;
            getRoles(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]>;
        };
    };
    execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]>;
}
