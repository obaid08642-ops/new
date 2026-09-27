import { Module } from '@nestjs/common';

/**
 * CompatModule — retired (P5.3): all gap-fill controllers were relocated
 * into their owning modules (the dead provider/dashboard duplicate was
 * dropped — no client calls it; canonical dashboard lives in provider).
 * The shared DTO files (compat.dto.ts, compat.generated.dto.ts) stay:
 * relocated controllers import them from here.
 */
@Module({ imports: [], controllers: [], providers: [], exports: [] })
export class CompatModule {}
