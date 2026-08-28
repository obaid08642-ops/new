import { Model } from 'mongoose';
import { EventBusService } from '../events/event-bus.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ChatThread, ChatThreadDocument, ChatMessage, ChatMessageDocument } from './chat.schemas';
export declare class ChatService {
    readonly threads: Model<ChatThreadDocument>;
    private readonly msgs;
    private readonly bus;
    private readonly events;
    private readonly logger;
    constructor(threads: Model<ChatThreadDocument>, msgs: Model<ChatMessageDocument>, bus: EventBusService, events: EventEmitter2);
    getOrCreateDirectThread(userA: string, userB: string): Promise<ChatThread>;
    createGroupThread(creatorId: string, name: string, participantIds: string[]): Promise<ChatThread>;
    private resolveBookingParties;
    getOrCreateBookingThread(bookingKind: string, bookingId: string, patientId: string, providerId?: string): Promise<ChatThread>;
    myThreads(userId: string, page?: number, limit?: number): Promise<{
        threads: ChatThread[];
        total: number;
    }>;
    private assertParticipant;
    getModel(name: string): Model<any>;
    issueRealtimeToken(threadId: string, user: any): Promise<{
        token: string;
        expires_in: number;
    }>;
    private validateChatMediaIds;
    checkIfFamily(participantIds: string[]): Promise<boolean>;
    verifyCommunicationAllowed(threadId: string, senderId: string): Promise<{
        allowed: boolean;
        message?: string;
    }>;
    sendMessage(threadId: string, senderId: string, senderRole: string, body: {
        body?: string;
        type?: string;
        attachment_url?: string;
        attachment_mime?: string;
        attachment_name?: string;
        attachment_size?: number;
        duration_seconds?: number;
        reply_to_id?: string;
        forwarded_from_id?: string;
        client_message_id?: string;
        media_ids?: string[];
    }): Promise<ChatMessage>;
    getMessages(threadId: string, userId: string, options: {
        before?: string;
        limit?: number;
        search?: string;
    }): Promise<{
        messages: ChatMessage[];
        has_more: boolean;
    }>;
    markRead(threadId: string, userId: string, upToMessageId?: string): Promise<void>;
    markDelivered(threadId: string, userId: string): Promise<void>;
    editMessage(msgId: string, userId: string, newBody: string): Promise<ChatMessage>;
    deleteMessage(msgId: string, userId: string): Promise<void>;
    addReaction(msgId: string, userId: string, emoji: string): Promise<ChatMessage>;
    removeReaction(msgId: string, userId: string, emoji: string): Promise<ChatMessage>;
    pinMessage(msgId: string, userId: string): Promise<void>;
    getThread(threadId: string, userId: string): Promise<ChatThread>;
    addParticipant(threadId: string, actorId: string, userId: string): Promise<void>;
    removeParticipant(threadId: string, actorId: string, userId: string): Promise<void>;
}
