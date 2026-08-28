import { PaymobService } from './paymob.service';
export declare class PaymobController {
    private readonly paymobService;
    constructor(paymobService: PaymobService);
    getMethods(): Promise<{
        id: string;
        icon: string;
        label: string;
        sub: string;
        color: string;
    }[]>;
    initiatePayment(payload: any): Promise<any>;
    verifyPayment(payload: any): Promise<any>;
}
