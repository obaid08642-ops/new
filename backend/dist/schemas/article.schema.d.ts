export declare class Article {
    id: string;
    slug: string;
    title_ar: string;
    title_en?: string;
    excerpt_ar?: string;
    excerpt_en?: string;
    body_ar?: string;
    body_en?: string;
    category?: string;
    tags: string[];
    cover_image?: string;
    author_name?: string;
    author_title?: string;
    status: string;
    published_at?: Date;
    seo_description_ar?: string;
    seo_description_en?: string;
    views: number;
    is_deleted: boolean;
}
export declare const ArticleSchema: import("mongoose").Schema<Article, import("mongoose").Model<Article, any, any, any, import("mongoose").Document<unknown, any, Article, any, {}> & Article & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Article, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<Article>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<Article> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
