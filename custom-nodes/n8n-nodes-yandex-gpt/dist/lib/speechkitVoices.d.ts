import type { INodePropertyOptions } from 'n8n-workflow';
export declare const LOCALE_OPTIONS: INodePropertyOptions[];
export declare const VOICES_BY_LOCALE: Record<string, string[]>;
export declare const ROLES_BY_VOICE: Record<string, string[]>;
export declare const VOICES_WITHOUT_ROLES: string[];
export declare function formatVoiceLabel(voiceValue: string, locale: string): string;
export declare function formatRoleLabel(roleValue: string): string;
