import { HomeService } from './home.service';
export declare class HomeController {
    private readonly homeService;
    constructor(homeService: HomeService);
    getOffers(): Promise<{
        id: any;
        t: string;
        price: number;
        old: number;
        disc: string;
        rating: any;
        prov: any;
        c: string;
        ic: string;
        sponsored: any;
    }[]>;
    getUpcomingAppointment(): Promise<{
        id: any;
        date: string;
        doctorName: string;
        type: string;
        time: string;
    }>;
    globalSearch(query: string): Promise<any[]>;
}
