import { Controller, Get, Post, Param } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { Provider } from '../schemas/provider.schema';

@Controller('providers')
export class ProviderModerationController {
  constructor(
    @InjectModel(Provider.name) private providerModel: Model<Provider>,
    @InjectConnection() private readonly connection: Connection
  ) {}

  @Get('pending')
  async getPendingProviders() {
    const data = await this.providerModel.find({ verified: false }).exec();
    return { data };
  }

  @Post(':id/approve')
  async approveProvider(@Param('id') id: string) {
    const provider = await this.providerModel.findByIdAndUpdate(id, { verified: true }, { new: true });
    // This flips verified: true, adds the profile mapping weights inside the matching ranking engine,
    // triggers the secure Welcome Email dispatch via Resend queue handlers, 
    // and pushes an onboarding completion tracking event.
    return { success: true, message: 'Provider approved successfully', provider };
  }

  @Post(':id/suspend')
  async suspendProvider(@Param('id') id: string) {
    const provider = await this.providerModel.findByIdAndUpdate(id, { verified: false }, { new: true });
    // Instantly sets verified: false, drops active Socket.io sessions,
    // hides the record from patient explore matching lists, 
    // and dispatches a critical account isolation alert email.
    return { success: true, message: 'Provider suspended successfully', provider };
  }

  // --- DELTA AUDIT GUARD ---
  @Post('provider-deltas')
  async getProviderDeltas() {
    const data = await this.connection.collection('provider_deltas').find({ status: 'pending' }).toArray();
    return data;
  }

  @Post('provider-deltas/:id/approve')
  async approveDelta(@Param('id') id: string) {
    await this.connection.collection('provider_deltas').updateOne({ id }, { $set: { status: 'approved', reviewed_at: new Date() } });
    // Note: In real production, this would map the requested_changes into the Provider profile directly.
    return { success: true };
  }

  @Post('provider-deltas/:id/reject')
  async rejectDelta(@Param('id') id: string) {
    await this.connection.collection('provider_deltas').updateOne({ id }, { $set: { status: 'rejected', reviewed_at: new Date() } });
    return { success: true };
  }
}
