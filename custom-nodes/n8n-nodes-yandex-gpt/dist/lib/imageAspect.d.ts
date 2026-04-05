import type { INodePropertyOptions } from 'n8n-workflow';
export declare const ASPECT_RATIO_PRESETS: INodePropertyOptions[];
export declare function parseAspectPreset(value: string | number | boolean | object | null | undefined): {
    widthRatio: number;
    heightRatio: number;
} | null;
