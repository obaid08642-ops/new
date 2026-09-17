import { Controller, Sse, UseGuards, MessageEvent } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import { JwtAuthGuard, CurrentUser } from '../../common/auth.guard';

@Controller('notifications')
export class NotificationSseController {
  private readonly subjects = new Map<string, Subject<any>>();

  @Sse('stream')
  @UseGuards(JwtAuthGuard)
  stream(@CurrentUser() user: any): Observable<MessageEvent> {
    const subject = this.getOrCreateSubject(user.id);
    return subject.asObservable().pipe(
      map(event => ({
        type: event.type,
        data: JSON.stringify(event.data),
        id: event.id,
        retry: 3000,
      })),
    );
  }

  emit(userId: string, event: { type: string; data: any; id?: string }) {
    this.subjects.get(userId)?.next(event);
  }

  private getOrCreateSubject(userId: string): Subject<any> {
    if (!this.subjects.has(userId)) {
      this.subjects.set(userId, new Subject());
    }
    return this.subjects.get(userId)!;
  }
}
