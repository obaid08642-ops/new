import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ExportService } from './export.service';
import { JwtAuthGuard } from '../../common/auth.guard';
import { RequirePermissions, Permission } from '../../common/permissions';

@Controller('export')
@UseGuards(JwtAuthGuard)
@RequirePermissions(Permission.DATA_EXPORT)
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  private sendCsvResponse(res: Response, filename: string, csvContent: string) {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.status(200).send(csvContent);
  }

  @Get('patients')
  async exportPatients(@Res() res: Response) {
    const csv = await this.exportService.exportPatients();
    this.sendCsvResponse(res, 'patients.csv', csv);
  }

  @Get('appointments')
  async exportAppointments(@Res() res: Response) {
    const csv = await this.exportService.exportAppointments();
    this.sendCsvResponse(res, 'appointments.csv', csv);
  }

  @Get('orders')
  async exportOrders(@Res() res: Response) {
    const csv = await this.exportService.exportOrders();
    this.sendCsvResponse(res, 'orders.csv', csv);
  }

  @Get('transactions')
  async exportTransactions(@Res() res: Response) {
    const csv = await this.exportService.exportTransactions();
    this.sendCsvResponse(res, 'transactions.csv', csv);
  }

  @Get('audit-logs')
  async exportAuditLogs(@Res() res: Response) {
    const csv = await this.exportService.exportAuditLogs();
    this.sendCsvResponse(res, 'audit-logs.csv', csv);
  }
}
