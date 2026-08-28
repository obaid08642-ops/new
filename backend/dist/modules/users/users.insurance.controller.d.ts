import { UsersService } from './users.service';
export declare class UsersInsuranceController {
    private users;
    constructor(users: UsersService);
    getInsurance(id: string): Promise<any>;
    updateInsurance(id: string, body: any): Promise<any>;
}
