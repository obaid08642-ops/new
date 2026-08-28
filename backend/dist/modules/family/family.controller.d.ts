import { FamilyService } from './family.service';
export declare class FamilyController {
    private readonly familyService;
    constructor(familyService: FamilyService);
    private authenticatedUserId;
    create(req: any, body: {
        name: string;
    }): Promise<{
        ok: boolean;
        group_id: any;
        name: string;
    }>;
    myGroup(req: any): Promise<any>;
    invite(req: any, body: {
        channel: 'sms' | 'email';
        target: string;
    }): Promise<{
        invite_sent: boolean;
        expires_in: number;
    }>;
    join(req: any, body: {
        invite_code: string;
        display_name?: string;
        relation?: string;
    }): Promise<{
        ok: boolean;
        group_id: any;
    }>;
    leave(req: any): Promise<{
        ok: boolean;
    }>;
    setRelation(req: any, targetUserId: string, body: {
        relation: string;
    }): Promise<{
        ok: boolean;
    }>;
    setContractPermissions(req: any, targetUserId: string, body: {
        scopes: string[];
    }): Promise<{
        ok: boolean;
        permissions: string[];
    }>;
    setPermissions(req: any, targetUserId: string, body: {
        permissions: string[];
    }): Promise<{
        ok: boolean;
        permissions: string[];
    }>;
    getMemberRecords(req: any, targetUserId: string): Promise<any>;
    removeContractMember(req: any, targetUserId: string): Promise<{
        ok: boolean;
    }>;
    removeMember(req: any, targetUserId: string): Promise<{
        ok: boolean;
    }>;
    contractMembers(req: any): Promise<{
        members: any;
    }>;
    listMembers(req: any): Promise<any>;
    getMemberHealth(req: any, targetUserId: string): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[] | (import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })>;
    emergencyContacts(req: any): Promise<any>;
    addEvent(req: any, body: any): Promise<{
        ok: boolean;
        event_id: any;
    }>;
    getCalendar(req: any): Promise<any>;
    deleteEvent(req: any, eventId: string): Promise<{
        ok: boolean;
    }>;
    requestPermissions(req: any, body: {
        target_member_id: string;
        permissions: string[];
    }): Promise<{
        ok: boolean;
        request_id: any;
    }>;
    pendingRequests(req: any): Promise<any>;
    respondPermission(req: any, requestId: string, body: {
        decision: 'approved' | 'rejected';
        note?: string;
        permissions?: string[];
    }): Promise<{
        ok: boolean;
        decision: "approved" | "rejected";
    }>;
}
