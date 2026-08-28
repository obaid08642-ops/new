import { OnModuleInit } from '@nestjs/common';
import { Model } from 'mongoose';
import { Doctor, DoctorAppointment, DoctorChatMessage, ConsultationNote, NotificationItem, AppointmentState } from './doctors.schemas';
import { EventBusService } from '../events/event-bus.service';
export declare class DoctorsService implements OnModuleInit {
    private doctors;
    private appts;
    private msgs;
    private notes;
    private notifs;
    private bus;
    constructor(doctors: Model<Doctor>, appts: Model<DoctorAppointment>, msgs: Model<DoctorChatMessage>, notes: Model<ConsultationNote>, notifs: Model<NotificationItem>, bus: EventBusService);
    onModuleInit(): Promise<void>;
    pushNotification(recipient_account_id: string, recipient_role: string, type: string, title: string, body?: string, entity_type?: string, entity_id?: string, deep_link?: string): Promise<void>;
    listDoctors(filter: any): Promise<(import("mongoose").FlattenMaps<Doctor> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    doctorDetail(id: string): Promise<import("mongoose").FlattenMaps<Doctor> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    specialties(): Promise<any[]>;
    availableSlots(doctorId: string, date: string): Promise<{
        available: boolean;
        time: string;
    }[]>;
    book(user: any, data: any): Promise<DoctorAppointment & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    myAppointments(user: any): Promise<(import("mongoose").FlattenMaps<DoctorAppointment> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    doctorInbox(user: any, status?: string): Promise<(import("mongoose").FlattenMaps<DoctorAppointment> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    transition(user: any, id: string, to: AppointmentState): Promise<DoctorAppointment & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    appointmentDetail(user: any, id: string): Promise<any>;
    listMessages(user: any, appointment_id: string): Promise<(import("mongoose").FlattenMaps<DoctorChatMessage> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    postMessage(user: any, appointment_id: string, text: string): Promise<import("mongoose").Document<unknown, {}, DoctorChatMessage, {}, {}> & DoctorChatMessage & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    upsertNote(user: any, appointment_id: string, body: any): Promise<import("mongoose").FlattenMaps<ConsultationNote> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    listNotifications(user: any): Promise<(import("mongoose").FlattenMaps<NotificationItem> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    unreadCount(user: any): Promise<{
        count: number;
    }>;
    markRead(user: any, id: string): Promise<{
        ok: boolean;
    }>;
    markAllRead(user: any): Promise<{
        ok: boolean;
    }>;
    setAvailability(user: any, data: {
        is_online?: boolean;
        is_accepting?: boolean;
    }): Promise<{
        ok: boolean;
        updated: number;
    }>;
}
export declare class DoctorsController {
    private svc;
    constructor(svc: DoctorsService);
    list(q: any): Promise<(import("mongoose").FlattenMaps<Doctor> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    specs(): Promise<any[]>;
    detail(id: string): Promise<import("mongoose").FlattenMaps<Doctor> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    slots(id: string, date: string): Promise<{
        available: boolean;
        time: string;
    }[]>;
    book(body: any, user: any): Promise<DoctorAppointment & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    mine(user: any): Promise<(import("mongoose").FlattenMaps<DoctorAppointment> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    inbox(s: string | undefined, user: any): Promise<(import("mongoose").FlattenMaps<DoctorAppointment> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    ap(id: string, user: any): Promise<any>;
    tr(id: string, body: any, user: any): Promise<DoctorAppointment & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    msgs(id: string, user: any): Promise<(import("mongoose").FlattenMaps<DoctorChatMessage> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    postMsg(id: string, body: any, user: any): Promise<import("mongoose").Document<unknown, {}, DoctorChatMessage, {}, {}> & DoctorChatMessage & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    note(id: string, body: any, user: any): Promise<import("mongoose").FlattenMaps<ConsultationNote> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    avail(body: any, user: any): Promise<{
        ok: boolean;
        updated: number;
    }>;
}
export declare class NotificationsController {
    private svc;
    constructor(svc: DoctorsService);
    list(user: any): Promise<(import("mongoose").FlattenMaps<NotificationItem> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    unread(user: any): Promise<{
        count: number;
    }>;
    mr(id: string, user: any): Promise<{
        ok: boolean;
    }>;
    mar(user: any): Promise<{
        ok: boolean;
    }>;
}
export declare class DoctorsModule {
}
