import { Injectable, Logger } from '@nestjs/common';
import * as vision from '@google-cloud/vision';

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);
  private client: vision.ImageAnnotatorClient;

  constructor() {
    // If credentials are in env, client will pick them up automatically
    try {
      this.client = new vision.ImageAnnotatorClient();
    } catch (e) {
      this.logger.warn('Failed to initialize Vision client. Ensure GOOGLE_APPLICATION_CREDENTIALS is set.');
    }
  }

  async extractTextFromImage(imageUrl: string): Promise<string> {
    if (!this.client) {
      throw new Error('VISION_API_NOT_CONFIGURED');
    }

    this.logger.log(`Sending to Cloud Vision OCR: ${imageUrl}`);
    
    try {
      const [result] = await this.client.documentTextDetection(imageUrl);
      const fullTextAnnotation = result.fullTextAnnotation;
      
      return fullTextAnnotation ? fullTextAnnotation.text : '';
    } catch (error) {
      this.logger.error('Failed to extract text using Vision API', error);
      throw new Error('OCR_EXTRACTION_FAILED');
    }
  }
}
