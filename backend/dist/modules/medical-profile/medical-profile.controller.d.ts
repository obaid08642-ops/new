import { MedicalProfileService } from './medical-profile.service';
import { JwtService } from '@nestjs/jwt';
export declare class MedicalProfileController {
    private readonly svc;
    private readonly jwt;
    constructor(svc: MedicalProfileService, jwt: JwtService);
    get(u: any): Promise<any>;
    passportToken(u: any): Promise<{
        format: string;
        version: number;
        token: string;
        expires_at: string;
    }>;
    update(u: any, b: any): Promise<any>;
    addCd(u: any, b: any): Promise<any>;
    delCd(u: any, id: string): Promise<any>;
    addAl(u: any, b: any): Promise<any>;
    delAl(u: any, id: string): Promise<any>;
    addS(u: any, b: any): Promise<any>;
    delS(u: any, id: string): Promise<any>;
    addLm(u: any, b: any): Promise<any>;
    delLm(u: any, id: string): Promise<any>;
    byPatient(u: any, pid: string): Promise<void>;
}
