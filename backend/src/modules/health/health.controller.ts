import { JwtAuthGuard } from '../../common/auth.guard';
import { UseGuards } from '@nestjs/common';
import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { HealthService } from './health.service';
import { CurrentUser } from '../../common/auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('health')
export class HealthModuleController {
  constructor(private readonly svc: HealthService) {}

  @Get('vitals')
  list(@CurrentUser() user: any, @Query('type') t?: string, @Query('limit') l?: string) {
    return this.svc.listVitals(user, t, l ? parseInt(l, 10) : 100);
  }
  @Get('vitals/latest')
  latest(@CurrentUser() user: any) { return this.svc.latestVitals(user); }

  @Get('vitals/summary')
  summary(@CurrentUser() user: any) { return this.svc.vitalsSummary(user); }
  @Post('vitals')
  add(@CurrentUser() user: any, @Body() body: any) { return this.svc.addVital(user, body); }
  @Patch('vitals/:id')
  edit(@CurrentUser() user: any, @Param('id') id: string, @Body() body: any) { return this.svc.updateVital(user, id, body); }
  @Delete('vitals/:id')
  del(@CurrentUser() user: any, @Param('id') id: string) { return this.svc.deleteVital(user, id); }

  @Get('reminders')
  rl(@CurrentUser() user: any, @Query('active') a?: string) { return this.svc.listReminders(user, a !== '0'); }
  @Post('reminders')
  rc(@CurrentUser() user: any, @Body() body: any) { return this.svc.createReminder(user, body); }
  @Post('reminders/:id/log')
  rlg(@CurrentUser() user: any, @Param('id') id: string, @Body() body: any) {
    return this.svc.logReminder(user, id, body.status, body.time_key || '');
  }
  @Patch('reminders/:id')
  rt(@CurrentUser() user: any, @Param('id') id: string, @Body() body: any) {
    return this.svc.updateReminder(user, id, body);
  }
  @Delete('reminders/:id')
  rd(@CurrentUser() user: any, @Param('id') id: string) { return this.svc.deleteReminder(user, id); }

  @Get('sleep')
  listSleep(@CurrentUser() user: any, @Query('limit') l?: string) {
    return this.svc.listSleep(user, l ? parseInt(l, 10) : 100);
  }
  @Post('sleep')
  addSleep(@CurrentUser() user: any, @Body() body: any) {
    return this.svc.addSleep(user, body);
  }

  // --- WP 1.5 Additional Health/Medical Profile Endpoints ---
  @Get('reports')
  listReports(@CurrentUser() user: any) {
    return this.svc.listReports(user);
  }

  @Get('medications/reminders')
  listMedicationReminders(@CurrentUser() user: any) {
    return this.svc.listMedicationReminders(user);
  }

  @Get('prescriptions')
  listPrescriptions(@CurrentUser() user: any) {
    return this.svc.listPrescriptions(user);
  }

  @Get('emergency-contacts')
  listEmergencyContacts(@CurrentUser() user: any) {
    return this.svc.listEmergencyContacts(user);
  }

  @Get('chronic-diseases')
  listChronicDiseases(@CurrentUser() user: any) {
    return this.svc.listChronicDiseases(user);
  }

  @Get('chronic-meds')
  listChronicMeds(@CurrentUser() user: any) {
    return this.svc.listChronicMeds(user);
  }

  @Get('trends')
  listTrends(@CurrentUser() user: any) {
    return this.svc.listTrends(user);
  }
}
