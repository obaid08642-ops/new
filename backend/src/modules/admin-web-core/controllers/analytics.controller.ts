import { Controller, Get } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { HeatmapData } from '../schemas/heatmap-data.schema';

const GRID = 0.05; // ~5 km grid cells

/**
 * Live demand heatmap — computed from REAL platform data, never fixtures:
 * clusters of SOS emergency requests and home-visit appointments, aggregated
 * into ~5 km grid cells. Intensity = number of real requests in the cell.
 */
@Controller('nabd-extensions/admin/analytics')
export class AnalyticsController {
  constructor(
    @InjectModel(HeatmapData.name) private heatmapModel: Model<HeatmapData>,
    @InjectModel('EmergencyRequest') private emergencyModel: Model<any>,
    @InjectModel('Appointment') private appointmentModel: Model<any>,
  ) {}

  private addPoint(cells: Map<string, any>, lat: any, lng: any, type: string) {
    const la = Number(lat), ln = Number(lng);
    if (!isFinite(la) || !isFinite(ln) || (la === 0 && ln === 0)) return;
    const key = `${Math.round(la / GRID)}:${Math.round(ln / GRID)}:${type}`;
    const cell = cells.get(key) || {
      clusterId: key,
      latitude: Math.round(la / GRID) * GRID,
      longitude: Math.round(ln / GRID) * GRID,
      intensity: 0,
      type,
    };
    cell.intensity += 1;
    cells.set(key, cell);
  }

  @Get('heatmaps')
  async getHeatmaps() {
    const cells = new Map<string, any>();

    // Real SOS demand (last 30 days)
    try {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const sos = await this.emergencyModel
        .find({ createdAt: { $gte: since }, 'location.lat': { $exists: true } }, { location: 1 })
        .lean();
      for (const s of sos as any[]) this.addPoint(cells, s.location?.lat, s.location?.lng, 'home_care');
    } catch {}

    // Real home-visit appointment demand (last 30 days)
    try {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const appts = await this.appointmentModel
        .find({ createdAt: { $gte: since }, 'visit_location.lat': { $exists: true } }, { visit_location: 1 })
        .lean();
      for (const a of appts as any[]) this.addPoint(cells, a.visit_location?.lat, a.visit_location?.lng, 'home_care');
    } catch {}

    const data = [...cells.values()].sort((a, b) => b.intensity - a.intensity).slice(0, 200);
    return { data, source: 'live', generated_at: new Date().toISOString() };
  }
}
