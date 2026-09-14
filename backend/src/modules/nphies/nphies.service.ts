import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface NphiesEligibilityRequest {
  national_id: string;
  member_id?: string;
  provider_code: string;
  service_type: string;
  service_code?: string;
}

interface NphiesEligibilityResponse {
  eligible: boolean;
  approval_code?: string;
  copay_percent?: number;
  copay_flat?: number;
  requires_preauth?: boolean;
  policy_details?: {
    network: string;
    class: string;
    expiry_date: string;
    benefits: Array<{
      service_type: string;
      service_code: string;
      covered: boolean;
      copay_percent: number;
      copay_flat: number;
    }>;
  };
  error?: string;
}

interface NphiesApprovalRequest {
  national_id: string;
  member_id: string;
  provider_code: string;
  service_type: string;
  service_code: string;
  amount: number;
  diagnosis_code?: string;
}

interface NphiesApprovalResponse {
  approved: boolean;
  approval_code?: string;
  reference_number?: string;
  copay_amount?: number;
  error?: string;
}

@Injectable()
export class NphiesService {
  private readonly logger = new Logger(NphiesService.name);
  private readonly baseUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.get<string>('NPHIES_SANDBOX_URL') || 'https://sandbox.nphies.sa/api/v1';
    this.clientId = this.config.get<string>('NPHIES_CLIENT_ID') || '';
    this.clientSecret = this.config.get<string>('NPHIES_CLIENT_SECRET') || '';
  }

  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.accessToken && now < this.tokenExpiry - 60000) {
      return this.accessToken;
    }

    if (!this.clientId || !this.clientSecret) {
      throw new HttpException('NPHIES credentials not configured', HttpStatus.SERVICE_UNAVAILABLE);
    }

    try {
      const response = await fetch(`${this.baseUrl}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret,
          scope: 'eligibility approval',
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        this.logger.error(`NPHIES token error: ${response.status} ${error}`);
        throw new HttpException('NPHIES authentication failed', HttpStatus.SERVICE_UNAVAILABLE);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiry = now + (data.expires_in || 3600) * 1000;
      return this.accessToken;
    } catch (e: any) {
      this.logger.error(`NPHIES token request failed: ${e.message}`);
      throw new HttpException('NPHIES service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  async checkEligibility(request: NphiesEligibilityRequest): Promise<NphiesEligibilityResponse> {
    const token = await this.getAccessToken();

    try {
      const response = await fetch(`${this.baseUrl}/eligibility/check`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          national_id: request.national_id,
          member_id: request.member_id,
          provider_code: request.provider_code,
          service_type: request.service_type,
          service_code: request.service_code,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        this.logger.warn(`NPHIES eligibility check failed: ${response.status} ${error}`);
        if (response.status === 401) {
          this.accessToken = null;
          return this.checkEligibility(request);
        }
        throw new HttpException('NPHIES eligibility service error', HttpStatus.SERVICE_UNAVAILABLE);
      }

      const data = await response.json();
      return {
        eligible: data.eligible === true,
        approval_code: data.approval_code,
        copay_percent: data.copay_percent,
        copay_flat: data.copay_flat,
        requires_preauth: data.requires_preauth === true,
        policy_details: data.policy_details,
      };
    } catch (e: any) {
      if (e instanceof HttpException) throw e;
      this.logger.error(`NPHIES eligibility request failed: ${e.message}`);
      throw new HttpException('NPHIES service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  async requestApproval(request: NphiesApprovalRequest): Promise<NphiesApprovalResponse> {
    const token = await this.getAccessToken();

    try {
      const response = await fetch(`${this.baseUrl}/approval/request`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          national_id: request.national_id,
          member_id: request.member_id,
          provider_code: request.provider_code,
          service_type: request.service_type,
          service_code: request.service_code,
          amount: request.amount,
          diagnosis_code: request.diagnosis_code,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        this.logger.warn(`NPHIES approval request failed: ${response.status} ${error}`);
        if (response.status === 401) {
          this.accessToken = null;
          return this.requestApproval(request);
        }
        throw new HttpException('NPHIES approval service error', HttpStatus.SERVICE_UNAVAILABLE);
      }

      const data = await response.json();
      return {
        approved: data.approved === true,
        approval_code: data.approval_code,
        reference_number: data.reference_number,
        copay_amount: data.copay_amount,
      };
    } catch (e: any) {
      if (e instanceof HttpException) throw e;
      this.logger.error(`NPHIES approval request failed: ${e.message}`);
      throw new HttpException('NPHIES service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  async validateApprovalCode(approvalCode: string, nationalId: string): Promise<boolean> {
    const token = await this.getAccessToken();

    try {
      const response = await fetch(`${this.baseUrl}/approval/validate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          approval_code: approvalCode,
          national_id: nationalId,
        }),
      });

      if (!response.ok) return false;
      const data = await response.json();
      return data.valid === true;
    } catch {
      return false;
    }
  }
}
