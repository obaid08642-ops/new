import { Body, Controller, Get, HttpCode, Param, Post, Put } from '@nestjs/common';
import { CurrentUser, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { ItemDecisionsDto, MemberInsuranceDto, PartialChoiceDto } from './ordering.dto';
import { OrderingApprovalService } from './ordering-approval.service';
import { OrderingService } from './ordering.service';

// M5, the patient's side: the approval of an insured booking and the answer to a partial one. Own bookings only (404 otherwise).
@Controller('ordering/bookings')
@Roles(UserRole.PATIENT)
export class OrderingApprovalController {
  constructor(private readonly svc: OrderingApprovalService) {}

  @Get(':id/approval')
  approval(@CurrentUser() u: { id: string }, @Param('id') id: string) { return this.svc.view(u, id); }

  @Post(':id/partial-choice') @HttpCode(200)
  choose(@CurrentUser() u: any, @Param('id') id: string, @Body() body: PartialChoiceDto) { return this.svc.choose(u, id, body); }
}

// M5, the provider's side: only the booking's own provider decides its items.
@Controller('provider/ordering/bookings')
@Roles(UserRole.LAB, UserRole.RADIOLOGY, UserRole.NURSING, UserRole.NURSE)
export class ProviderApprovalController {
  constructor(private readonly svc: OrderingApprovalService) {}

  @Post(':id/item-decisions') @HttpCode(200)
  decide(@CurrentUser() u: { id: string }, @Param('id') id: string, @Body() body: ItemDecisionsDto) { return this.svc.decide(u, id, body); }
}

// M5: a family member carries their own saved insurance (class required, as D-30). Own members only.
@Controller('family/members')
@Roles(UserRole.PATIENT)
export class FamilyInsuranceController {
  constructor(private readonly svc: OrderingService) {}

  @Put(':memberId/insurance')
  put(@CurrentUser() u: { id: string }, @Param('memberId') memberId: string, @Body() body: MemberInsuranceDto) { return this.svc.setMemberInsurance(u.id, memberId, body); }
}
