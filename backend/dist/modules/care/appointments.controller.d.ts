import { AppointmentsService } from './appointments.service';
import { ApptState } from '../../schemas/appointment.schema';
import { CreateAppointmentDto, CancelAppointmentDto, RescheduleAppointmentDto } from './appointments.dto';
export declare class AppointmentsController {
    private svc;
    constructor(svc: AppointmentsService);
    create(body: CreateAppointmentDto, user: any): Promise<any>;
    mine(user: any, status?: ApptState): Promise<any>;
    one(id: string, user: any): Promise<any>;
    joinWaitlist(body: {
        doctorId: string;
        date: string;
    }, user: any): Promise<{
        success: boolean;
        message: string;
    }>;
    cancel(id: string, user: any, body: CancelAppointmentDto): Promise<any>;
    reschedule(id: string, user: any, body: RescheduleAppointmentDto): Promise<any>;
    confirm(id: string, user: any): Promise<any>;
    checkIn(id: string, user: any): Promise<any>;
    start(id: string, user: any): Promise<any>;
    complete(id: string, user: any): Promise<any>;
    finishAppointment(id: string, body: any, user: any): Promise<{
        success: boolean;
        appointment: any;
    }>;
    summary(id: string, user: any): Promise<any>;
}
