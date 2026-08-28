import { TimelineService } from './timeline.service';
export declare class TimelineController {
    private readonly svc;
    constructor(svc: TimelineService);
    feed(u: any, kinds?: string, limit?: string, since?: string, until?: string): Promise<{
        events: import("./timeline.service").TimelineEvent[];
        total: number;
    }>;
    summary(u: any): Promise<Record<string, number>>;
}
