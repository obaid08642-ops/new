import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { NABDAH_ACCESS_TOKEN_SECURITY_SCHEME } from '../../config/openapi.config';
import { UsersService } from './users.service';
import { CurrentUser, JwtAuthGuard } from '../../common/auth.guard';

const canonicalInsuranceSchema = {
  type: 'object',
  description: 'Canonical editable `PatientProfile.insurance` object. Verification is server-controlled and is reset to `false` on patient update.',
  properties: {
    provider: { type: 'string', example: 'bupa' },
    policy_number: { type: 'string', example: 'POL-123456' },
    network: { type: 'string', example: 'gold' },
    class: { type: 'string', example: 'A' },
    expiry_date: { type: 'string', example: '2027-12-31' },
    member_name: { type: 'string' },
    national_id: { type: 'string', description: 'Sensitive identity data; clients must not log this value.' },
    verified: { type: 'boolean', readOnly: true, example: false },
    pdf_url: { type: 'string', format: 'uri' },
    ocr_extracted: { type: 'boolean' },
    nphies_eligible: { type: 'boolean' },
  },
  additionalProperties: true,
};

@ApiTags('Insurance')
@Controller('users/me/insurance')
@UseGuards(JwtAuthGuard)
export class UsersInsuranceController {
  constructor(private users: UsersService) {}

  @Get()
  @ApiBearerAuth(NABDAH_ACCESS_TOKEN_SECURITY_SCHEME)
  @ApiOperation({
    summary: 'Get the authenticated patient’s canonical insurance record',
    description: 'Returns the editable `insurance` object, or `null` when none is recorded. This differs from the deprecated `GET /user/insurance` legacy array and from `GET /insurance/active`, which returns the active-policy projection.',
  })
  @ApiOkResponse({
    description: 'Canonical insurance object, or `null` if the patient has not recorded insurance.',
    schema: { ...canonicalInsuranceSchema, nullable: true },
  })
  @ApiUnauthorizedResponse({ description: 'Missing, malformed, or expired bearer token.' })
  async getInsurance(@CurrentUser('id') id: string) {
    const profile = await this.users.getPatientProfile(id);
    return profile.insurance || null;
  }

  @Post()
  @ApiBearerAuth(NABDAH_ACCESS_TOKEN_SECURITY_SCHEME)
  @ApiOperation({
    summary: 'Create or update the authenticated patient’s insurance record',
    description: 'Upserts fields into the authenticated patient’s canonical `insurance` object. The backend always sets `verified: false`; only an authorized administrative verification workflow may later verify the record.',
  })
  @ApiBody({
    description: 'Partial canonical insurance fields. Supplying `verified` does not verify coverage because the server overwrites it with `false`.',
    schema: canonicalInsuranceSchema,
  })
  @ApiCreatedResponse({
    description: 'Updated canonical insurance object with `verified: false`.',
    schema: canonicalInsuranceSchema,
  })
  @ApiUnauthorizedResponse({ description: 'Missing, malformed, or expired bearer token.' })
  async updateInsurance(@CurrentUser('id') id: string, @Body() body: any) {
    const profile = await this.users.getPatientProfile(id);
    const updatedInsurance = {
      ...profile.insurance,
      ...body,
      verified: false, // Must be verified by admin
    };
    await this.users.updatePatientProfile(id, { insurance: updatedInsurance });
    return updatedInsurance;
  }
}
