import { IsIn } from 'class-validator';
import { ALERT_RULE_IDS, AlertRuleId } from './slo-alerts.service';

export class DrillAlertDto {
  @IsIn(ALERT_RULE_IDS)
  rule: AlertRuleId;
}
