import { Connection, Model } from 'mongoose';
export declare class ArticlesService {
    private model;
    constructor(model: Model<any>);
    list(query: any): import("mongoose").Query<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[], any, {}, any, "find", {}>;
    categories(): import("mongoose").Query<any[], any, {}, any, "distinct", {}>;
    bySlug(slug: string): Promise<any>;
    publishedById(id: string): Promise<any>;
    create(body: any): Promise<any>;
    update(id: string, body: any): import("mongoose").Query<any, any, {}, any, "findOneAndUpdate", {}>;
    publish(id: string): import("mongoose").Query<any, any, {}, any, "findOneAndUpdate", {}>;
    unpublish(id: string): import("mongoose").Query<any, any, {}, any, "findOneAndUpdate", {}>;
    remove(id: string): import("mongoose").Query<any, any, {}, any, "findOneAndUpdate", {}>;
    adminList(): import("mongoose").Query<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[], any, {}, any, "find", {}>;
}
export declare class ArticlesPublicController {
    private svc;
    constructor(svc: ArticlesService);
    list(q: any): import("mongoose").Query<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[], any, {}, any, "find", {}>;
    cats(): import("mongoose").Query<any[], any, {}, any, "distinct", {}>;
    one(slug: string): Promise<any>;
}
export declare class ArticlesAdminController {
    private svc;
    constructor(svc: ArticlesService);
    list(): import("mongoose").Query<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[], any, {}, any, "find", {}>;
    create(body: any): Promise<any>;
    update(id: string, body: any): import("mongoose").Query<any, any, {}, any, "findOneAndUpdate", {}>;
    publish(id: string): import("mongoose").Query<any, any, {}, any, "findOneAndUpdate", {}>;
    unpublish(id: string): import("mongoose").Query<any, any, {}, any, "findOneAndUpdate", {}>;
    remove(id: string): import("mongoose").Query<any, any, {}, any, "findOneAndUpdate", {}>;
}
export declare class ArticleBookmarkContractController {
    private conn;
    private svc;
    constructor(conn: Connection, svc: ArticlesService);
    private get col();
    add(user: any, id: string): Promise<{
        bookmarked: boolean;
    }>;
    remove(user: any, id: string): Promise<{
        bookmarked: boolean;
    }>;
}
export declare class ArticleBookmarksController {
    private conn;
    private svc;
    constructor(conn: Connection, svc: ArticlesService);
    private get col();
    mine(req: any): Promise<any>;
    status(req: any, slug: string): Promise<{
        bookmarked: boolean;
    }>;
    toggle(req: any, slug: string): Promise<{
        bookmarked: boolean;
    }>;
}
export declare class ArticlesModule {
}
