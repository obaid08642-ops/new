import { CanActivate, ExecutionContext } from '@nestjs/common';
export declare class LiveKitWebhookGuard implements CanActivate {
    private receiver;
    constructor();
    canActivate(context: ExecutionContext): Promise<boolean>;
}
