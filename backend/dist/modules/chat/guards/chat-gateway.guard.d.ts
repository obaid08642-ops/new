import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Model } from 'mongoose';
import { ChatSessionDocument } from '../../../schemas/chat-session.schema';
import { UserDocument } from '../../../schemas/user.schema';
export declare class ChatGatewayGuard implements CanActivate {
    private chatSessionModel;
    private userModel;
    constructor(chatSessionModel: Model<ChatSessionDocument>, userModel: Model<UserDocument>);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
