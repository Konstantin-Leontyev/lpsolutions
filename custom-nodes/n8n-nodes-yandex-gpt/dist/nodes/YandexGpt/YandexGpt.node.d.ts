import type { IExecuteFunctions, INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow';
export declare class YandexGpt implements INodeType {
    description: INodeTypeDescription;
    methods: {
        loadOptions: {
            getVoices(this: import("n8n-workflow").ILoadOptionsFunctions): Promise<{
                name: string;
                value: string;
            }[]>;
            getRoles(this: import("n8n-workflow").ILoadOptionsFunctions): Promise<{
                name: string;
                value: string;
            }[]>;
        };
    };
    execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]>;
}
