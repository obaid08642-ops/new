import { Model } from 'mongoose';
import { AmbulanceVehicle, AmbulanceVehicleDocument } from '../../schemas/ambulance-vehicle.schema';
export declare class AmbulanceFleetService {
    private model;
    constructor(model: Model<AmbulanceVehicleDocument>);
    list(accountId: string): import("mongoose").Query<(import("mongoose").FlattenMaps<AmbulanceVehicleDocument> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[], import("mongoose").Document<unknown, {}, AmbulanceVehicleDocument, {}, {}> & AmbulanceVehicle & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, {}, AmbulanceVehicleDocument, "find", {}>;
    create(accountId: string, body: any): Promise<import("mongoose").FlattenMaps<AmbulanceVehicleDocument> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    update(accountId: string, id: string, body: any): Promise<import("mongoose").FlattenMaps<AmbulanceVehicleDocument> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    remove(accountId: string, id: string): Promise<{
        ok: boolean;
    }>;
    adminList(status?: string): import("mongoose").Query<(import("mongoose").FlattenMaps<AmbulanceVehicleDocument> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[], import("mongoose").Document<unknown, {}, AmbulanceVehicleDocument, {}, {}> & AmbulanceVehicle & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, {}, AmbulanceVehicleDocument, "find", {}>;
    review(id: string, adminId: string, approve: boolean, notes?: string): Promise<import("mongoose").FlattenMaps<AmbulanceVehicleDocument> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
}
export declare class ProviderAmbulanceFleetController {
    private svc;
    constructor(svc: AmbulanceFleetService);
    private assertFleetRole;
    list(user: any): import("mongoose").Query<(import("mongoose").FlattenMaps<AmbulanceVehicleDocument> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[], import("mongoose").Document<unknown, {}, AmbulanceVehicleDocument, {}, {}> & AmbulanceVehicle & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, {}, AmbulanceVehicleDocument, "find", {}>;
    create(user: any, body: any): Promise<import("mongoose").FlattenMaps<AmbulanceVehicleDocument> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    update(user: any, id: string, body: any): Promise<import("mongoose").FlattenMaps<AmbulanceVehicleDocument> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    remove(user: any, id: string): Promise<{
        ok: boolean;
    }>;
}
export declare class AdminAmbulanceFleetController {
    private svc;
    constructor(svc: AmbulanceFleetService);
    list(status?: string): import("mongoose").Query<(import("mongoose").FlattenMaps<AmbulanceVehicleDocument> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[], import("mongoose").Document<unknown, {}, AmbulanceVehicleDocument, {}, {}> & AmbulanceVehicle & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, {}, AmbulanceVehicleDocument, "find", {}>;
    approve(id: string, admin: any): Promise<import("mongoose").FlattenMaps<AmbulanceVehicleDocument> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    reject(id: string, admin: any, body: any): Promise<import("mongoose").FlattenMaps<AmbulanceVehicleDocument> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
}
