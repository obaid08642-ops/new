import { Model } from 'mongoose';
import { HeatmapData } from '../schemas/heatmap-data.schema';
export declare class AnalyticsController {
    private heatmapModel;
    private emergencyModel;
    private appointmentModel;
    constructor(heatmapModel: Model<HeatmapData>, emergencyModel: Model<any>, appointmentModel: Model<any>);
    private addPoint;
    getHeatmaps(): Promise<{
        data: any[];
        source: string;
        generated_at: string;
    }>;
}
