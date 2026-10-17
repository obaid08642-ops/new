import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser, JwtAuthGuard, SelfService } from '../../common/auth.guard';
import { ScanImageDto } from './scanner.dto';
import { ScannerService } from './scanner.service';

/** Decision 36: the AI scanner beside search (pack, barcode, QR or prescription photo). */
@Controller('ai')
@SelfService()
@UseGuards(JwtAuthGuard)
export class ScannerController {
  constructor(private readonly svc: ScannerService) {}

  @Throttle({ default: { limit: 15, ttl: 60000 } }) // paid vision call, same ceiling as the prescription OCR
  @Post('scan')
  scan(@Body() body: ScanImageDto, @CurrentUser() user: { id?: string; role?: string }) {
    return this.svc.scan(user, body.image_base64, body.mime_type);
  }
}
