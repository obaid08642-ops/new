import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards, Delete, Put } from '@nestjs/common';
import { MedicinesService } from './medicines.service';
import { CurrentUser, JwtAuthGuard, Public, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';

@Controller('medicines')
@UseGuards(JwtAuthGuard)
export class MedicinesController {
  constructor(private svc: MedicinesService) {}

  @Public()
  @Get()
  list(@Query('search') search: string, @Query('category') category: string) {
    return this.svc.list(search, category);
  }

  @Public()
  @Get('autocomplete')
  autocomplete(@Query('q') q: string) {
    return this.svc.autocomplete(q);
  }

  @Public()
  @Post('lookup-barcode')
  lookupBarcode(@Body() body: { code: string }) {
    return this.svc.byBarcode(body?.code || '');
  }

  @Public()
  @Get('by-barcode/:code')
  byBarcode(@Param('code') code: string) {
    return this.svc.byBarcode(code);
  }

  @Public()
  @Get('categories')
  categoriesList() {
    return this.svc.categories();
  }

  @Public()
  @Get('filters')
  filters() {
    return this.svc.filters();
  }

  @Public()
  @Post('compare')
  compare(@Body() body: { ids: string[] }) {
    return this.svc.compare(body?.ids || []);
  }

  @Public()
  @Get(':id')
  one(@Param('id') id: string) {
    return this.svc.getById(id);
  }

  @Public()
  @Get(':id/details')
  details(@Param('id') id: string) {
    return this.svc.details(id);
  }

  @Public()
  @Get(':id/alternatives')
  alts(@Param('id') id: string) {
    return this.svc.alternatives(id);
  }

  @Post('manual-entry')
  createManual(@Body() body: any, @CurrentUser() user: any) {
    return this.svc.createManualEntry(body, user.id, user.role);
  }

  @Get('admin/pending-review')
  @Roles(UserRole.ADMIN)
  pending() {
    return this.svc.pendingReview();
  }

  @Post('admin/catalog')
  @Roles(UserRole.ADMIN)
  createCatalog(@Body() body: any, @CurrentUser('id') by: string) {
    return this.svc.createCatalog(body, by);
  }

  @Delete('admin/catalog/:id')
  @Roles(UserRole.ADMIN)
  deleteCatalog(@Param('id') id: string) {
    return this.svc.deleteCatalog(id);
  }

  @Post(':id/approve')
  @Roles(UserRole.ADMIN)
  approve(@Param('id') id: string, @CurrentUser('id') by: string) {
    return this.svc.approve(id, by);
  }

  @Post(':id/reject')
  @Roles(UserRole.ADMIN)
  reject(@Param('id') id: string, @CurrentUser('id') by: string, @Body() body: { reason?: string }) {
    return this.svc.reject(id, by, body.reason || '');
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() body: any) {
    return this.svc.update(id, body);
  }

  // ============ BULK IMPORT (CSV / JSON) ============
  @Post('admin/import-json')
  @Roles(UserRole.ADMIN)
  importJson(@Body() body: { rows: any[]; auto_approve?: boolean }, @CurrentUser('id') by: string) {
    return this.svc.bulkImport(body.rows || [], by, 'admin', !!body.auto_approve);
  }

  @Post('admin/import-csv')
  @Roles(UserRole.ADMIN)
  importCsv(@Body() body: { csv: string; auto_approve?: boolean }, @CurrentUser('id') by: string) {
    const rows = this.svc.parseCsv(body.csv || '');
    return this.svc.bulkImport(rows, by, 'admin', !!body.auto_approve);
  }
}
