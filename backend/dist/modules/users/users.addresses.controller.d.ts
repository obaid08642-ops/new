import { UsersService } from './users.service';
export declare class UsersAddressesController {
    private users;
    constructor(users: UsersService);
    getAddresses(id: string): Promise<any>;
    addAddress(id: string, body: any): Promise<any>;
    updateAddress(id: string, addressId: string, body: any): Promise<any>;
    removeAddress(id: string, addressId: string): Promise<{
        ok: boolean;
    }>;
}
