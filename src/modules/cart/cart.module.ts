import { Module, Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel, MongooseModule } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { JwtAuthGuard, CurrentUser } from '../../common/auth.guard';
import { Prescription, PrescriptionSchema } from '../../schemas/prescription.schema';
import { PrescriptionState } from '../../common/enums';

export type CartLineKind = 'lab' | 'radiology' | 'pharmacy' | 'doctor' | 'home_care';

@Schema({ timestamps: true, collection: 'unified_carts' })
export class UnifiedCart extends Document {
  @Prop({ required: true, unique: true, default: () => uuidv4() }) id: string;
  @Prop({ required: true, unique: true, index: true }) patient_id: string;
  @Prop({ type: [Object], default: [] }) lines: Array<{
    line_id: string;
    kind: CartLineKind;
    service_id: string;
    name_ar: string;
    name_en?: string;
    price: number;
    qty: number;
    payment_method?: 'cash' | 'insurance';
    insurance_provider?: string;
    home_visit?: boolean;
    notes?: string;
    meta?: any;
  }>;
  @Prop({ default: 0 }) home_visit_fee: number;
  @Prop() last_action?: string;
}
export const UnifiedCartSchema = SchemaFactory.createForClass(UnifiedCart);

@Injectable()
export class CartService {
  constructor(@InjectModel('UnifiedCart') private model: Model<UnifiedCart>) {}

  private async ensureCart(patient_id: string) {
    let c = await this.model.findOne({ patient_id });
    if (!c) c = await this.model.create({ patient_id, lines: [] });
    return c;
  }

  async get(user: any) {
    const c = await this.ensureCart(user.id);
    return this.summarize(c);
  }

  summarize(c: any) {
    const obj = c.toObject ? c.toObject() : c;
    const groups: Record<string, any> = {};
    for (const l of obj.lines || []) {
      groups[l.kind] = groups[l.kind] || { kind: l.kind, items: [], subtotal: 0, count: 0 };
      groups[l.kind].items.push(l);
      groups[l.kind].subtotal += (l.price || 0) * (l.qty || 1);
      groups[l.kind].count += l.qty || 1;
    }
    const subtotal = Object.values(groups).reduce((s: number, g: any) => s + g.subtotal, 0);
    const home_visit_fee = (obj.lines || []).some((l: any) => l.home_visit) ? 50 : 0;
    const total = subtotal + home_visit_fee;
    return { ...obj, groups: Object.values(groups), subtotal, home_visit_fee, total };
  }

  async addLine(user: any, line: any) {
    if (!line.service_id || !line.name_ar || !line.kind) throw new BadRequestException('invalid_line');
    const c = await this.ensureCart(user.id);
    const existing = c.lines.find((l: any) => l.service_id === line.service_id && l.kind === line.kind);
    if (existing) {
      existing.qty = (existing.qty || 1) + (line.qty || 1);
    } else {
      c.lines.push({
        line_id: uuidv4(),
        kind: line.kind,
        service_id: line.service_id,
        name_ar: line.name_ar,
        name_en: line.name_en,
        price: Number(line.price) || 0,
        qty: line.qty || 1,
        payment_method: line.payment_method || 'cash',
        insurance_provider: line.insurance_provider,
        home_visit: !!line.home_visit,
        notes: line.notes,
        meta: line.meta,
      });
    }
    c.last_action = 'add';
    await c.save();
    return this.summarize(c);
  }

  async updateLine(user: any, line_id: string, patch: any) {
    const c = await this.ensureCart(user.id);
    const idx = c.lines.findIndex((l: any) => l.line_id === line_id);
    if (idx < 0) throw new NotFoundException();
    const allowed = ['qty', 'payment_method', 'insurance_provider', 'home_visit', 'notes'];
    for (const k of allowed) if (patch[k] !== undefined) (c.lines[idx] as any)[k] = patch[k];
    if (patch.qty !== undefined && patch.qty <= 0) c.lines.splice(idx, 1);
    c.markModified('lines');
    c.last_action = 'update';
    await c.save();
    return this.summarize(c);
  }

  async removeLine(user: any, line_id: string) {
    const c = await this.ensureCart(user.id);
    c.lines = c.lines.filter((l: any) => l.line_id !== line_id);
    c.last_action = 'remove';
    await c.save();
    return this.summarize(c);
  }

  async clear(user: any, kind?: string) {
    const c = await this.ensureCart(user.id);
    c.lines = kind ? c.lines.filter((l: any) => l.kind !== kind) : [];
    c.last_action = 'clear';
    await c.save();
    return this.summarize(c);
  }

  /** Returns lines grouped by kind so caller can dispatch to each domain checkout endpoint. */
  async prepareCheckout(user: any) {
    const c = await this.ensureCart(user.id);
    return this.summarize(c);
  }
}

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(
    private svc: CartService,
    @InjectModel(Prescription.name) private prescriptions: Model<any>,
  ) {}
  @Get('') get(@CurrentUser() u: any) { return this.svc.get(u); }
  @Post('lines') add(@Body() b: any, @CurrentUser() u: any) { return this.svc.addLine(u, b); }
  @Patch('lines/:lineId') upd(@Param('lineId') id: string, @Body() b: any, @CurrentUser() u: any) { return this.svc.updateLine(u, id, b); }
  @Delete('lines/:lineId') rm(@Param('lineId') id: string, @CurrentUser() u: any) { return this.svc.removeLine(u, id); }
  @Post('clear') clr(@Body() b: any, @CurrentUser() u: any) { return this.svc.clear(u, b?.kind); }
  @Get('checkout') chk(@CurrentUser() u: any) { return this.svc.prepareCheckout(u); }
  @Get('prescription')
  async prescription(@CurrentUser() u: any) {
    const prescription: any = await this.prescriptions.findOne({
      patient_id: u.id,
      state: { $nin: [PrescriptionState.DISPENSED, PrescriptionState.ARCHIVED] },
    }).sort({ createdAt: -1 }).lean();
    if (!prescription) return { prescription_id: null, medications: [] };
    return {
      prescription_id: prescription.id,
      date: prescription.createdAt || null,
      medications: (prescription.items || []).map((item: any) => ({
        id: item.substituted_to_medicine_id || item.medicine_id || null,
        name: item.medicine_name_ar || item.medicine_name_en || '',
        dose: item.dose || null,
        qty: item.quantity || 1,
        requiresRx: true,
        is_manual_entry: Boolean(item.is_manual_entry),
      })).filter((item: any) => item.name),
    };
  }
}

@Module({
  imports: [MongooseModule.forFeature([
    { name: 'UnifiedCart', schema: UnifiedCartSchema },
    { name: Prescription.name, schema: PrescriptionSchema },
  ])],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
