export interface TtsPayload {
    text: string;
    hints: Array<{
        voice: string;
    } | {
        role: string;
    }>;
}
export declare function synthesizeUtterance(apiKey: string, folderId: string, payload: TtsPayload): Promise<Buffer>;
