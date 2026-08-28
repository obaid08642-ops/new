import { ChatService } from './chat.service';
export declare class ChatController {
    private readonly svc;
    constructor(svc: ChatService);
    getThreadPermissions(u: any, threadId: string): Promise<{
        status_code: string;
        status_text_ar: string;
        status_text_en: string;
        can_chat: boolean;
        can_call: boolean;
        can_upload: boolean;
        message_ar: string;
        message_en: string;
        booking_id?: undefined;
        remaining_hours?: undefined;
    } | {
        status_code: string;
        status_text_ar: string;
        status_text_en: string;
        can_chat: boolean;
        can_call: boolean;
        can_upload: boolean;
        message_ar: string;
        message_en: string;
        booking_id: string;
        remaining_hours?: undefined;
    } | {
        status_code: string;
        status_text_ar: string;
        status_text_en: string;
        can_chat: boolean;
        can_call: boolean;
        can_upload: boolean;
        message_ar: string;
        message_en: string;
        remaining_hours: number;
        booking_id: string;
    }>;
    myThreads(u: any, page?: number, limit?: number): Promise<{
        threads: import("./chat.schemas").ChatThread[];
        total: number;
    }>;
    createDirect(u: any, body: {
        other_user_id: string;
    }): Promise<import("./chat.schemas").ChatThread>;
    createGroup(u: any, body: {
        name: string;
        participant_ids: string[];
    }): Promise<import("./chat.schemas").ChatThread>;
    createBooking(u: any, body: {
        booking_kind: string;
        booking_id: string;
        provider_id?: string;
    }): Promise<import("./chat.schemas").ChatThread>;
    getThread(u: any, threadId: string): Promise<import("./chat.schemas").ChatThread>;
    getMessages(u: any, threadId: string, before?: string, limit?: number, search?: string): Promise<{
        messages: import("./chat.schemas").ChatMessage[];
        has_more: boolean;
    }>;
    sendMessage(u: any, threadId: string, body: any): Promise<import("./chat.schemas").ChatMessage>;
    markRead(u: any, threadId: string, body: {
        up_to_message_id?: string;
    }): Promise<void>;
    rtToken(u: any, threadId: string): Promise<{
        token: string;
        expires_in: number;
    }>;
    markDelivered(u: any, threadId: string): Promise<void>;
    editMessage(u: any, msgId: string, body: {
        body: string;
    }): Promise<import("./chat.schemas").ChatMessage>;
    deleteMessage(u: any, msgId: string): Promise<void>;
    addReaction(u: any, msgId: string, body: {
        emoji: string;
    }): Promise<import("./chat.schemas").ChatMessage>;
    removeReaction(u: any, msgId: string, emoji: string): Promise<import("./chat.schemas").ChatMessage>;
    pinMessage(u: any, msgId: string): Promise<void>;
    addParticipant(u: any, threadId: string, body: {
        user_id: string;
    }): Promise<void>;
    removeParticipant(u: any, threadId: string, userId: string): Promise<void>;
}
export declare class ChatModule {
}
