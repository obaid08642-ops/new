export interface LatLng {
    lat: number;
    lng: number;
}
export declare class GeoEngineService {
    distanceKm(a: LatLng, b: LatLng): number;
    withinRadius(center: LatLng, point: LatLng, radius_km: number): boolean;
    pointInPolygon(point: LatLng, polygon: LatLng[]): boolean;
    matchZone(point: LatLng, zones: any[]): any | null;
}
