export interface ImageGenerationRequestBody {
    modelUri: string;
    messages: {
        text: string;
    }[];
    generationOptions?: {
        mimeType?: string;
        seed?: number;
        aspectRatio?: {
            widthRatio: number;
            heightRatio: number;
        };
    };
}
export declare function detectImageMimeFromBuffer(buf: Buffer): {
    mime: string;
    ext: string;
};
export declare function generateImageYandexArt(apiKey: string, folderId: string, body: ImageGenerationRequestBody, timeoutMs: number): Promise<{
    imageBuffer: Buffer;
    modelVersion?: string;
}>;
