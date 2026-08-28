import { NursingBookingState, NursingVisitReport, CarePlan, MedicalSupplyRequest } from '../../schemas/home-care.schema';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WorkflowEngineService } from '../workflow-engine/workflow-engine.module';
import { HomeCareServiceRepository } from "./repositories/homecareservice.repository";
import { HomeCareBookingRepository } from "./repositories/homecarebooking.repository";
import { NursingVisitReportRepository } from "./repositories/nursingvisitreport.repository";
import { CarePlanRepository } from "./repositories/careplan.repository";
import { MedicalSupplyRequestRepository } from "./repositories/medicalsupplyrequest.repository";
export declare class HomeCareSvc {
    private readonly svcModel;
    private readonly bkgModel;
    private readonly reportModel;
    private readonly carePlanModel;
    private readonly supplyModel;
    private readonly events;
    private readonly engine;
    constructor(svcModel: HomeCareServiceRepository, bkgModel: HomeCareBookingRepository, reportModel: NursingVisitReportRepository, carePlanModel: CarePlanRepository, supplyModel: MedicalSupplyRequestRepository, events: EventEmitter2, engine: WorkflowEngineService);
    list(opts: {
        category?: string;
        search?: string;
        duration?: string;
    }): Promise<any>;
    categoryCounts(): Promise<any>;
    getById(id: string): Promise<any>;
    book(user: any, data: any): Promise<any>;
    mineFor(user: any): Promise<any>;
    getBooking(id: string, user: any): Promise<any>;
    cancel(id: string, user: any): Promise<any>;
    transition(id: string, to: NursingBookingState, user: any, note?: string): Promise<any>;
    checkIn(user: any, bookingId: string, lat?: number, lng?: number): Promise<NursingVisitReport>;
    submitReport(user: any, reportId: string, body: {
        completed_tasks: string[];
        vitals_logged?: any;
        notes?: string;
    }): Promise<{
        ok: boolean;
    }>;
    createCarePlan(user: any, patientId: string, body: {
        title: string;
        description?: string;
        tasks: string[];
    }): Promise<CarePlan>;
    getCarePlans(patientId: string): Promise<any>;
    requestSupplies(user: any, visitReportId: string, items: Array<{
        name: string;
        qty: number;
        unit: string;
    }>): Promise<MedicalSupplyRequest>;
}
