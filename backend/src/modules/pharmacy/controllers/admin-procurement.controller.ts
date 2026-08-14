import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard, Roles } from '../../../common/auth.guard';
import { ProcurementService } from '../services/procurement.service';
import { AdminCreateQuotationDto } from '../dto/admin-create-quotation.dto';
import { ProcurementStatus } from '../enums/procurement-status.enum';

@Controller('admin/procurement')
@UseGuards(JwtAuthGuard)
@Roles('admin' as any)
export class AdminProcurementController {
  constructor(private readonly procurementService: ProcurementService) {}

  /** GET /admin/procurement - List all requests, optional filter by status */
  @Get()
  async listAll(@Query('status') status?: ProcurementStatus) {
    return this.procurementService.adminListRequests(status);
  }

  /** GET /admin/procurement/:id - Get single request details */
  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.procurementService.adminGetRequest(id);
  }

  /** PATCH /admin/procurement/:id/review - Move to UNDER_ADMIN_REVIEW */
  @Patch(':id/review')
  async startReview(@Param('id') id: string) {
    return this.procurementService.adminStartReview(id);
  }

  /** POST /admin/procurement/:id/quotation - Create & send quotation to pharmacy */
  @Post(':id/quotation')
  async createQuotation(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: AdminCreateQuotationDto,
  ) {
    const adminId = req.user.sub;
    return this.procurementService.adminCreateQuotation(adminId, id, dto);
  }

  /** GET /admin/procurement/:id/quotation - Get quotation for a request */
  @Get(':id/quotation')
  async getQuotation(@Param('id') id: string) {
    return this.procurementService.adminGetQuotation(id);
  }

  /** PATCH /admin/procurement/:id/cancel - Cancel a request */
  @Patch(':id/cancel')
  async cancelRequest(@Param('id') id: string) {
    return this.procurementService.adminCancelRequest(id);
  }

  /** PATCH /admin/procurement/:id/complete - Mark as COMPLETED after delivery */
  @Patch(':id/complete')
  async completeRequest(@Param('id') id: string) {
    return this.procurementService.adminCompleteRequest(id);
  }
}
