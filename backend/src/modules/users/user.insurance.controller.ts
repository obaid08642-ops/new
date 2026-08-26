import { Controller, Get, UseGuards, Inject } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard, CurrentUser } from '../../common/auth.guard';
import { NABDAH_ACCESS_TOKEN_SECURITY_SCHEME } from '../../config/openapi.config';
import { PatientProfileRepository } from './repositories/patient-profile.repository';

@ApiTags('Insurance')
@Controller('user')
@UseGuards(JwtAuthGuard)
export class UserInsuranceController {
  constructor(
    @Inject('PatientProfileRepository') private readonly patientProfileRepo: PatientProfileRepository
  ) {}

  @Get('insurance')
  @ApiBearerAuth(NABDAH_ACCESS_TOKEN_SECURITY_SCHEME)
  @ApiOperation({
    summary: 'Get patient insurance policies (legacy compatibility)',
    description: 'Deprecated compatibility route. Use `GET /users/me/insurance` for the canonical editable patient insurance object, or `GET /insurance/active` for the normalized active-policy projection. The authenticated patient can only read their own profile.',
    deprecated: true,
  })
  @ApiOkResponse({
    description: 'Legacy insurance-policy collection. An empty collection means no legacy policies were recorded.',
    schema: {
      type: 'object',
      required: ['policies'],
      properties: {
        policies: {
          type: 'array',
          description: 'Legacy `insurance_policies` records retained verbatim for client compatibility.',
          items: { type: 'object', additionalProperties: true },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Missing, malformed, or expired bearer token.' })
  async getInsurance(@CurrentUser() user: any) {
    const profile = await this.patientProfileRepo.findOne({ user_id: user.id });
    return { policies: profile?.insurance_policies || [] };
  }
}
