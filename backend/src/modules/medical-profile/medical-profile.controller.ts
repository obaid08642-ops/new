import { JwtAuthGuard } from '../../common/auth.guard';
import { UseGuards } from '@nestjs/common';
import { Controller, Get, Patch, Post, Delete, Body, Param } from '@nestjs/common';
import { MedicalProfileService } from './medical-profile.service';
import { CurrentUser } from '../../common/auth.guard';
import { JwtService } from '@nestjs/jwt';

@UseGuards(JwtAuthGuard)
@Controller('medical-profile')
export class MedicalProfileController {
  constructor(private readonly svc: MedicalProfileService, private readonly jwt: JwtService) {}

  @Get() get(@CurrentUser() u: any) { return this.svc.getOrCreate(u); }
  @Get('passport-token')
  async passportToken(@CurrentUser() u: any) {
    const expiresInSeconds = 5 * 60;
    const token = await this.jwt.signAsync({ sub: u.id, scope: 'health_passport', type: 'qr' }, { expiresIn: expiresInSeconds });
    return { format: 'nabd_health_passport', version: 2, token, expires_at: new Date(Date.now() + expiresInSeconds * 1000).toISOString() };
  }
  @Patch() update(@CurrentUser() u: any, @Body() b: any) { return this.svc.update(u, b); }

  @Post('chronic-diseases') addCd(@CurrentUser() u: any, @Body() b: any) { return this.svc.addItem(u, 'chronic_diseases', b); }
  @Delete('chronic-diseases/:id') delCd(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.removeItem(u, 'chronic_diseases', id); }

  @Post('allergies') addAl(@CurrentUser() u: any, @Body() b: any) { return this.svc.addItem(u, 'allergies', b); }
  @Delete('allergies/:id') delAl(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.removeItem(u, 'allergies', id); }

  @Post('surgeries') addS(@CurrentUser() u: any, @Body() b: any) { return this.svc.addItem(u, 'surgeries', b); }
  @Delete('surgeries/:id') delS(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.removeItem(u, 'surgeries', id); }

  @Post('long-term-medications') addLm(@CurrentUser() u: any, @Body() b: any) { return this.svc.addItem(u, 'long_term_medications', b); }
  @Delete('long-term-medications/:id') delLm(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.removeItem(u, 'long_term_medications', id); }

  // Provider view of a specific patient — same endpoint pattern, deeper authz comes later
  @Get('provider/:patientId') byPatient(@CurrentUser() u: any, @Param('patientId') pid: string) { return this.svc.getForPatient(u, pid); }
}
