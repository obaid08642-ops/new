import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MailModule } from '../../mail/mail.module';
import { SeoSearchModule } from '../../seo-search/seo-search.module';
import { WalletModule } from '../../wallet/wallet.module';
import { PresenceModule } from '../../presence/presence.module';
import { AdminAuditService } from './audit.service';
import { AdminSecurityController } from './admin-security.controller';
import { AdminDisputesController } from './admin-disputes.controller';
import { AdminOrdersConsoleController } from './admin-orders.controller';
import { OrdersConsoleService } from './orders-console.service';
import { AdminFinanceSuiteController } from './admin-finance.controller';
import { FinanceSuiteService } from './finance-suite.service';
import { AnalyticsSuiteService } from './analytics-suite.service';
import { AdminAnalyticsSuiteController, AdminScheduledReportsController } from './admin-analytics.controller';
import { AdminCrmController, AdminGdprController } from './admin-crm.controller';
import { PatientGdprController } from './patient-gdpr.controller';
import { AdminSegmentsController } from './admin-segments.controller';
import { AdminCouponsController } from './admin-coupons.controller';
import { AdminCmsController } from './admin-cms.controller';
import { AdminOpsController } from './admin-ops.controller';
import { ScheduledReportsRunner } from './scheduled-reports.runner';
import { AdminCommandCenterV2Controller } from './command-center-v2.controller';
import { AdminGovernanceControlsController } from './admin-governance-controls.controller';
import { AdminImpersonationController } from './admin-impersonation.controller';
import { ImpersonationSecurityModule } from '../../../common/impersonation-security.module';

/**
 * Enterprise Control Center (ADMIN_ENTERPRISE_PLAN batches A1→A7).
 */
