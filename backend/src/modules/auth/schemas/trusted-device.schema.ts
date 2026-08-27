import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { randomUUID } from 'crypto';

export type TrustedDeviceDocument = TrustedDevice & Document;

/**
 * Trusted admin device ("اعتمد هذا الجهاز").
 * A device that completed full 2FA (OTP or Passkey) once can be trusted:
 * subsequent logins from it skip the second factor (password still required).
 * The raw token is NEVER stored — only its SHA-256 hash — so a DB leak does
 * not leak usable device tokens.
 */
@Schema({ timestamps: true, collection: 'trusted_devices' })
export class TrustedDevice {
  @Prop({ default: () => randomUUID() }) id: string;
  @Prop({ required: true, index: true }) user_id: string;
  @Prop({ required: true, unique: true }) token_hash: string;
  @Prop() name?: string;            // e.g. "iPhone 15 — Face ID" / "MacBook — Safari"
  @Prop() user_agent?: string;
  @Prop() ip?: string;              // IP at enrollment time
  @Prop() last_ip?: string;
  @Prop({ default: Date.now }) last_seen_at: Date;
  @Prop({ default: false }) revoked: boolean;
  @Prop() created_at?: Date;
}

export const TrustedDeviceSchema = SchemaFactory.createForClass(TrustedDevice);
