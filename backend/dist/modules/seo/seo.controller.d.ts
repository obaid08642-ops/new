import { Response } from 'express';
import { SeoService } from './seo.service';
export declare class SeoController {
    private readonly svc;
    constructor(svc: SeoService);
    resolve(type: string, slug: string): Promise<any>;
    meta(type: string, slug: string): Promise<{
        found: boolean;
        title: string;
        description: string;
        type?: undefined;
        id?: undefined;
        slug?: undefined;
        image?: undefined;
        canonical?: undefined;
        og?: undefined;
        twitter?: undefined;
        structured?: undefined;
        entity?: undefined;
    } | {
        found: boolean;
        type: string;
        id: any;
        slug: string;
        title: string;
        description: string;
        image: any;
        canonical: string;
        og: {
            type: string;
            title: any;
            description: string;
            url: string;
            image: any;
            locale: string;
            site_name: string;
        };
        twitter: {
            card: string;
            title: any;
            description: string;
            image: any;
        };
        structured: any;
        entity: any;
    }>;
    build(type: string, id: string): Promise<{
        ok: boolean;
        reason: string;
        url?: undefined;
        slug?: undefined;
        deep_link?: undefined;
    } | {
        ok: boolean;
        url: string;
        slug: string;
        deep_link: string;
        reason?: undefined;
    }>;
    sitemap(res: Response): Promise<void>;
    llmsTxt(res: Response): Promise<void>;
    robots(res: Response): Promise<void>;
}
