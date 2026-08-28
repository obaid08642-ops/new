import { Model } from 'mongoose';
import { ChatSessionDocument } from '../../../schemas/chat-session.schema';
export declare class ChatLifecycleScheduler {
    private chatSessionModel;
    constructor(chatSessionModel: Model<ChatSessionDocument>);
    enforceFollowUpExpirations(): Promise<void>;
}
