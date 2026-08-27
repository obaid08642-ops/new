import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/**
 * Registered WebAuthn/Passkey credential for an admin account.
 * Stores ONLY the public key + metadata — secrets never leave the authenticator.
 */
@Schema({ timestamps: true, collection: 'passkey_credentials' })
export class PasskeyCredential extends Document {
  @Prop({ required: true, index: true })
  user_id: string;

  /** base64url credential ID (as used by the WebAuthn JSON API) */
  @Prop({ required: true, unique: true, index: true })
  credential_id: string;

  /** COSE public key bytes */
  @Prop({ type: Buffer, required: true })
  public_key: Buffer;

  /** signature counter — cloned-authenticator detection */
  @Prop({ default: 0 })
  counter: number;

  @Prop({ type: [String], default: [] })
  transports: string[];

  @Prop({ default: '' })
  device_name: string;

  @Prop({ default: null })
  last_used_at: Date;
}

export const PasskeyCredentialSchema = SchemaFactory.createForClass(PasskeyCredential);
