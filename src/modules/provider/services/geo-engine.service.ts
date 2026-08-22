/**
 * Geographic helpers — distance, radius, polygon-inside checks.
 * Pure math; no external service. Uses haversine formula.
 */
import { Injectable } from '@nestjs/common';

export interface LatLng { lat: number; lng: number; }

@Injectable()
export class GeoEngineService {
  /** Haversine distance in km between two coords. */
  distanceKm(a: LatLng, b: LatLng): number {
    if (!a || !b || typeof a.lat !== 'number' || typeof b.lat !== 'number') return Number.POSITIVE_INFINITY;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const R = 6371; // km
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const sa = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(sa)));
  }

  withinRadius(center: LatLng, point: LatLng, radius_km: number): boolean {
    return this.distanceKm(center, point) <= radius_km;
  }

  /** Ray-casting point-in-polygon. polygon is closed ring of {lat,lng}. */
  pointInPolygon(point: LatLng, polygon: LatLng[]): boolean {
    if (!polygon || polygon.length < 3) return false;
    let inside = false;
    const x = point.lng, y = point.lat;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].lng, yi = polygon[i].lat;
      const xj = polygon[j].lng, yj = polygon[j].lat;
      const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi || 1e-12) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  /**
   * Check if a point falls inside ANY of the provider's delivery zones.
   * Returns the matching zone or null.
   */
  matchZone(point: LatLng, zones: any[]): any | null {
    for (const z of zones || []) {
      if (!z.active) continue;
      if (z.shape === 'circle' && z.center && this.withinRadius(z.center, point, z.radius_km || 0)) return z;
      if (z.shape === 'polygon' && z.polygon && this.pointInPolygon(point, z.polygon)) return z;
    }
    return null;
  }
}
