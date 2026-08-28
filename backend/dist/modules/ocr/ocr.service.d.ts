export declare class OcrService {
    private readonly logger;
    private client;
    constructor();
    extractTextFromImage(imageUrl: string): Promise<string>;
}
