import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

const DEFAULT_INDEXNOW_KEY = 'nabdplusindexnowkey';
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';

export interface IndexNowSubmissionResult {
  success: boolean;
  urls_submitted: number;
  statusCode?: number;
  message?: string;
  timestamp: Date;
}

@Injectable()
export class IndexNowService {
  private readonly logger = new Logger(IndexNowService.name);

  constructor(@InjectConnection() private readonly conn: Connection) {}

  getKey(): string {
    return process.env.INDEXNOW_KEY || DEFAULT_INDEXNOW_KEY;
  }

  getHost(): string {
    const pub = process.env.NABD_PUBLIC_URL || 'https://nabd.plus';
    return pub.replace(/^https?:\/\//, '').split('/')[0];
  }

  async submitUrls(urls: string[]): Promise<IndexNowSubmissionResult> {
    if (!Array.isArray(urls) || urls.length === 0) {
      return {
        success: false,
        urls_submitted: 0,
        message: 'no_urls_provided',
        timestamp: new Date(),
      };
    }

    const host = this.getHost();
    const key = this.getKey();
    const keyLocation = `https://${host}/${key}.txt`;

    // Deduplicate and filter valid URLs
    const cleanUrls = Array.from(
      new Set(
        urls
          .filter((u) => typeof u === 'string' && u.startsWith('http'))
          .map((u) => u.trim()),
      ),
    );

    if (cleanUrls.length === 0) {
      return {
        success: false,
        urls_submitted: 0,
        message: 'no_valid_urls_to_submit',
        timestamp: new Date(),
      };
    }

    const payload = {
      host,
      key,
      keyLocation,
      urlList: cleanUrls.slice(0, 10000), // IndexNow limit per request
    };

    let statusCode = 0;
    let success = false;
    let message = '';

    try {
      const response = await fetch(INDEXNOW_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'User-Agent': 'NabdPlus-IndexNow-Agent/1.0',
        },
        body: JSON.stringify(payload),
      });

      statusCode = response.status;
      // 200: OK, 202: Accepted (valid key and URLs queued)
      success = response.status === 200 || response.status === 202;
      message = success ? 'submitted_successfully' : `indexnow_rejected_${response.status}`;
    } catch (err: any) {
      this.logger.warn(`IndexNow submission network error: ${err?.message}`);
      statusCode = 500;
      message = err?.message || 'network_error';
      success = false;
    }

    // Record submission log in database
    try {
      await this.conn.collection('indexnow_submissions').insertOne({
        host,
        key,
        urls_count: cleanUrls.length,
        urls: cleanUrls.slice(0, 100), // keep sample of first 100
        statusCode,
        success,
        message,
        createdAt: new Date(),
      });
    } catch (dbErr: any) {
      this.logger.error(`Failed to record indexnow_submissions: ${dbErr?.message}`);
    }

    return {
      success,
      urls_submitted: cleanUrls.length,
      statusCode,
      message,
      timestamp: new Date(),
    };
  }

  async getRecentSubmissions(limit = 20) {
    return this.conn
      .collection('indexnow_submissions')
      .find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .project({ _id: 0 })
      .toArray();
  }
}
