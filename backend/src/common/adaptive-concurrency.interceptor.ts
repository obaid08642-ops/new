import {
  Injectable, NestInterceptor, ExecutionContext, CallHandler,
  HttpException, HttpStatus, Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';

@Injectable()
export class AdaptiveConcurrencyInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AdaptiveConcurrencyInterceptor.name);
  private active = 0;
  private limit = 300;
  private avgLatency = 200;
  private readonly minLimit = 50;
  private readonly maxLimit = 2000;

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    if (req?.url?.includes('/health')) {
      return next.handle();
    }
    if (this.active >= this.limit) {
      this.logger.warn(
        `Concurrency limit reached: active=${this.active}, limit=${this.limit}, avgLatency=${this.avgLatency.toFixed(0)}ms`,
      );
      throw new HttpException(
        { message: 'Server at capacity, please retry', retry_after: 1 },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    this.active++;
    const start = Date.now();
    return next.handle().pipe(
      finalize(() => {
        const latency = Date.now() - start;
        this.active--;
        if (latency > this.avgLatency * 2) {
          this.limit = Math.max(this.minLimit, this.limit - 10);
        } else if (latency < this.avgLatency * 0.8) {
          this.limit = Math.min(this.maxLimit, this.limit + 5);
        }
        this.avgLatency = this.avgLatency * 0.9 + latency * 0.1;
      }),
    );
  }

  getStats() {
    return { active: this.active, limit: this.limit, avgLatency: this.avgLatency };
  }
}
