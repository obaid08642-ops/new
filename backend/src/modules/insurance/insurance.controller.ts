import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard, NoGuestsGuard } from '../../common/auth.guard';
import { NABDAH_ACCESS_TOKEN_SECURITY_SCHEME } from '../../config/openapi.config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { InsuranceService } from './insurance.module';

@ApiTags('Insurance')
@UseGuards(JwtAuthGuard, NoGuestsGuard)
@Controller('insurance')
export class InsuranceController {
  constructor(
    @InjectModel('PatientProfile') private profileModel: Model<any>,
    private readonly insuranceService: InsuranceService,
  ) {}

  @Get('active')
  @ApiBearerAuth(NABDAH_ACCESS_TOKEN_SECURITY_SCHEME)
  @ApiOperation({
    summary: 'Get the authenticated patient’s active insurance projection',
    description: 'Returns `insurance_details` as a zero-or-one `policies` collection for active-policy consumers. It is not interchangeable with the editable `insurance` object from `GET /users/me/insurance` or the deprecated legacy `insurance_policies` collection.',
  })
  @ApiOkResponse({
    description: 'Zero or one active `insurance_details` record for the authenticated patient.',
    schema: {
      type: 'object',
      required: ['policies'],
      properties: {
        policies: {
          type: 'array',
          maxItems: 1,
          description: 'Active-policy projection populated from `insurance_details` when present.',
          items: { type: 'object', additionalProperties: true },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Missing, malformed, or expired bearer token.' })
  @ApiForbiddenResponse({ description: 'Guest accounts cannot access insurance operations.' })
  async getActivePolicies(@Req() req) {
    const profile = await this.profileModel.findOne({ user_id: req.user.id });
    return { policies: profile?.insurance_details ? [profile.insurance_details] : [] };
  }

  /** EPIC4/S21: active insurance companies catalog (replaces a hardcoded
   * constant list in the patient app's insurance-upload flow).
   * SINGLE SOURCE OF TRUTH — every app (patient, provider onboarding, provider
   * dashboard, admin) reads companies + their plan tiers from here. Plans are
   * embedded from insurance_networks so clients never hardcode a second list. */
  @Get('companies')
  @ApiBearerAuth(NABDAH_ACCESS_TOKEN_SECURITY_SCHEME)
  @ApiOperation({
    summary: 'List active insurance companies and their plan tiers',
    description: 'Single source of truth for active company catalog entries and embedded plan tiers. This route delegates to the central insurance catalogue service; legacy/inactive records remain administratively retrievable and are never deleted.',
  })
  @ApiOkResponse({
    description: 'Active insurance companies with sorted plan tiers.',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name_ar: { type: 'string' },
          name_en: { type: 'string' },
          plans: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                code: { type: 'string' },
                name_ar: { type: 'string' },
                name_en: { type: 'string' },
                tier_level: { type: 'number' },
              },
              additionalProperties: true,
            },
          },
        },
        additionalProperties: true,
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Missing, malformed, or expired bearer token.' })
  @ApiForbiddenResponse({ description: 'Guest accounts cannot access insurance operations.' })
  async listCompanies(): Promise<any[]> {
    return this.insuranceService.listCompanies();
  }
}
