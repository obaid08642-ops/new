import { Model } from 'mongoose';
import { Document } from 'mongoose';
import { Medicine } from '../../schemas/medicine.schema';
import { OrdersService } from '../orders/orders.service';
import { UsersService } from '../users/users.service';
export type CartLineKind = 'lab' | 'radiology' | 'pharmacy' | 'doctor' | 'home_care';
export declare class UnifiedCart extends Document {
    id: string;
    patient_id: string;
    lines: Array<{
        line_id: string;
        kind: CartLineKind;
        service_id: string;
        name_ar: string;
        name_en?: string;
        price: number;
        qty: number;
        payment_method?: 'cash' | 'insurance';
        insurance_provider?: string;
        home_visit?: boolean;
        notes?: string;
        meta?: any;
    }>;
    home_visit_fee: number;
    last_action?: string;
}
export declare const UnifiedCartSchema: import("mongoose").Schema<UnifiedCart, Model<UnifiedCart, any, any, any, Document<unknown, any, UnifiedCart, any, {}> & UnifiedCart & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, UnifiedCart, Document<unknown, {}, import("mongoose").FlatRecord<UnifiedCart>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<UnifiedCart> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export declare class CartService {
    private model;
    private medicines;
    private readonly orders;
    private readonly users;
    constructor(model: Model<UnifiedCart>, medicines: Model<Medicine>, orders: OrdersService, users: UsersService);
    private ensureCart;
    get(user: any): Promise<any>;
    summarize(c: any): any;
    addLine(user: any, line: any): Promise<any>;
    addContractItem(user: any, body: {
        medicine_id?: string;
        manual_name?: string;
        quantity?: number;
    }): Promise<any>;
    updateLine(user: any, line_id: string, patch: any): Promise<any>;
    removeLine(user: any, line_id: string): Promise<any>;
    clear(user: any, kind?: string): Promise<any>;
    prepareCheckout(user: any): Promise<any>;
    checkoutContract(user: any, body: {
        address_id?: string;
        payment_method_id?: string;
        coupon_code?: string;
        prescription_media_ids?: string[];
    }): Promise<{
        order_id: any;
        status: any;
        total: any;
    }>;
}
export declare class CartController {
    private svc;
    private prescriptions;
    constructor(svc: CartService, prescriptions: Model<any>);
    get(u: any): Promise<any>;
    addContractItem(b: any, u: any): Promise<any>;
    updateContractItem(id: string, b: any, u: any): Promise<any>;
    removeContractItem(id: string, u: any): Promise<any>;
    add(b: any, u: any): Promise<any>;
    upd(id: string, b: any, u: any): Promise<any>;
    rm(id: string, u: any): Promise<any>;
    clr(b: any, u: any): Promise<any>;
    checkout(b: any, u: any): Promise<{
        order_id: any;
        status: any;
        total: any;
    }>;
    chk(u: any): Promise<any>;
    prescription(u: any): Promise<{
        prescription_id: any;
        medications: any[];
        date?: undefined;
    } | {
        prescription_id: any;
        date: any;
        medications: any;
    }>;
}
export declare class CartModule {
}
