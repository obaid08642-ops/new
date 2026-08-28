import { Connection } from 'mongoose';
import { Response } from 'express';
export declare class SeoSearchService {
    private readonly conn;
    constructor(conn: Connection);
    metadata(type: string, id: string): Promise<any>;
    private loadEntity;
    private cdn;
    private crumbs;
    private baseFields;
    sitemapXml(): Promise<string>;
    globalSearch(q: string, limit?: number): Promise<any>;
    medicineRecommendations(id: string, limit?: number): Promise<any>;
    doctorRecommendations(id: string, limit?: number): Promise<any>;
}
export declare class SeoSearchController {
    private readonly svc;
    constructor(svc: SeoSearchService);
    sitemap(res: Response): Promise<void>;
    robots(res: Response): void;
    organization(): any;
    localBusiness(): any;
    faqSchema(): any;
    seo(type: string, id: string): Promise<any>;
    hreflang(type: string, id: string): any;
    llmsTxt(res: Response): void;
    imageSitemap(res: Response): Promise<void>;
    globalSearch(q: string, limit?: string): Promise<any>;
    medicineRecommendations(id: string, limit?: string): Promise<any>;
    doctorRecommendations(id: string, limit?: string): Promise<any>;
}
export declare class SeoSearchModule {
}
