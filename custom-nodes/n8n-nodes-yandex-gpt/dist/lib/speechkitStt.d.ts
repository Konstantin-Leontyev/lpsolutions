export type AudioContainerType = 'WAV' | 'OGG_OPUS' | 'MP3';
export declare function detectAudioFormat(buffer: Buffer): AudioContainerType | null;
export declare function recognizeFileV3(apiKey: string, folderId: string, audioBuffer: Buffer, containerType: AudioContainerType, languageCode: string): Promise<string>;
