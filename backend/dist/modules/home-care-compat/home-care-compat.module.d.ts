import { Model } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ChatService } from '../chat/chat.service';
export declare class HomeCareCompatController {
    private bookings;
    private services;
    private profiles;
    private carePlans;
    private readonly emitter?;
    constructor(bookings: Model<any>, services: Model<any>, profiles: Model<any>, carePlans: Model<any>, emitter?: EventEmitter2);
    servicesList(q: any): import("mongoose").Query<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[], any, {}, any, "find", {}>;
    serviceOne(id: string): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[] | (import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })>;
    providers(q: any): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    provider(id: string): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[] | (import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })>;
    private isAdmin;
    private isNursingProvider;
    private getBookingForAccess;
    createBooking(u: any, body: any): Promise<any>;
    myBookings(u: any, q: any): import("mongoose").Query<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[], any, {}, any, "find", {}>;
    nursingQueue(u: any, q: any): import("mongoose").Query<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[], any, {}, any, "find", {}>;
    private transition;
    respond(u: any, id: string, body: any): Promise<{
        ok: boolean;
        id: string;
        state: string;
    }>;
    assign(u: any, id: string, body: any): Promise<{
        ok: boolean;
        id: string;
        state: string;
    }>;
    checkIn(u: any, id: string, body: any): Promise<{
        ok: boolean;
        id: string;
        state: string;
    }>;
    gps(u: any, id: string, body: any): Promise<{
        ok: boolean;
    }>;
    visitReport(u: any, id: string, body: any): Promise<{
        ok: boolean;
        id: string;
        state: string;
    }>;
    listCarePlans(u: any, patientId: string): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    createCarePlan(u: any, patientId: string, body: any): Promise<any>;
    setAvailability(u: any, body: any): Promise<{
        ok: boolean;
    }>;
    inventoryRequest(u: any, body: any): Promise<{
        ok: boolean;
        state: string;
    }>;
}
export declare class NursingOpsController {
    checklist(category?: string): {
        category: string;
        items: any[];
    };
    supplies(): {
        items: any[];
    };
}
export declare class ChatAliasController {
    private readonly chat;
    constructor(chat: ChatService);
    providerThreads(u: any, q: any): Promise<{
        threads: import("../chat/chat.schemas").ChatThread[];
        total: number;
    }>;
    channels(u: any, q: any): Promise<{
        threads: import("../chat/chat.schemas").ChatThread[];
        total: number;
    }>;
    getMessages(u: any, id: string, q: any): Promise<{
        messages: import("../chat/chat.schemas").ChatMessage[];
        has_more: boolean;
    }>;
    postMessage(u: any, id: string, body: any): Promise<import("../chat/chat.schemas").ChatMessage>;
    postLegacy(u: any, threadId: string, body: any): Promise<import("../chat/chat.schemas").ChatMessage>;
    providerSend(u: any, body: any): Promise<import("../chat/chat.schemas").ChatMessage>;
}
export declare class HomeCareCompatModule {
}
