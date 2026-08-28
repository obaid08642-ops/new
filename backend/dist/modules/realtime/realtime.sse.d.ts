import { MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import { EventEmitter2 } from '@nestjs/event-emitter';
export declare class RealtimeSseController {
    private readonly em;
    constructor(em: EventEmitter2);
    stream(user: any): Observable<MessageEvent>;
    bookingStream(type: string, id: string): Observable<MessageEvent>;
}
export declare class RealtimeSseModule {
}
