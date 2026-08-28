import { Connection } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FamilyGroupRepository } from "./repositories/familygroup.repository";
import { SharedCalendarEventRepository } from "./repositories/sharedcalendarevent.repository";
import { FamilyPermissionRequestRepository } from "./repositories/familypermissionrequest.repository";
export declare class FamilyService {
    private connection;
    private groupM;
    private calendarM;
    private permReqM;
    private notificationSvc?;
    private eventEmitter?;
    constructor(connection: Connection, groupM: FamilyGroupRepository, calendarM: SharedCalendarEventRepository, permReqM: FamilyPermissionRequestRepository, notificationSvc?: any, eventEmitter?: EventEmitter2);
    private generateInviteCode;
    private findGroupByOwnerOrMember;
    private hasPermission;
    createGroup(userId: string, name: string): Promise<{
        ok: boolean;
        group_id: any;
        name: string;
    }>;
    getMyGroup(userId: string): Promise<any>;
    generateInvite(userId: string): Promise<{
        invite_code: string;
        expires_at: Date;
    }>;
    sendInvite(userId: string, channel: string, target: string): Promise<{
        invite_sent: boolean;
        expires_in: number;
    }>;
    listMembersContract(userId: string): Promise<{
        members: any;
    }>;
    joinGroup(userId: string, inviteCode: string, displayName?: string, relation?: string): Promise<{
        ok: boolean;
        group_id: any;
    }>;
    removeMember(ownerId: string, targetUserId: string): Promise<{
        ok: boolean;
    }>;
    listMembers(userId: string): Promise<any>;
    getMemberHealth(requesterId: string, targetMemberId: string): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[] | (import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })>;
    getMemberRecords(requesterId: string, targetMemberId: string): Promise<any>;
    updateMemberRelation(ownerId: string, targetUserId: string, relation: string): Promise<{
        ok: boolean;
    }>;
    setMemberPermissions(ownerId: string, targetUserId: string, permissions: string[]): Promise<{
        ok: boolean;
        permissions: string[];
    }>;
    leaveGroup(userId: string): Promise<{
        ok: boolean;
    }>;
    getEmergencyContacts(userId: string): Promise<any>;
    addCalendarEvent(userId: string, body: {
        title: string;
        description?: string;
        type?: string;
        ref_id?: string;
        event_date?: Date;
        member_user_id?: string;
        member?: string;
        time?: string;
        color?: string;
    }): Promise<{
        ok: boolean;
        event_id: any;
    }>;
    getCalendarEvents(userId: string): Promise<any>;
    deleteCalendarEvent(userId: string, eventId: string): Promise<{
        ok: boolean;
    }>;
    requestPermissions(requesterId: string, targetMemberId: string, permissions: string[]): Promise<{
        ok: boolean;
        request_id: any;
    }>;
    respondPermission(ownerId: string, requestId: string, decision: 'approved' | 'rejected', note?: string, permissions?: string[]): Promise<{
        ok: boolean;
        decision: "approved" | "rejected";
    }>;
    getPendingPermissionRequests(ownerId: string): Promise<any>;
    private emitEvent;
}
