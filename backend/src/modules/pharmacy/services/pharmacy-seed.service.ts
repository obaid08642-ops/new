// @ts-nocheck
import { Injectable, ForbiddenException, Inject } from '@nestjs/common';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcryptjs';
import { PharmacyOrder, PharmacyOrderState, OrderItemMatchStatus } from '../schemas/pharmacy.schema';
import { PharmacyInventoryItem } from '../../provider/schemas/capabilities.schema';
import { ProviderProfile, ProviderAccount } from '../../provider/schemas';
import { ProviderAvailability, ProviderAvailabilityStatus } from '../../provider/schemas/requests.schema';
import { PharmacyOrderRepository } from "./repositories/pharmacyorder.repository";
import { PharmacyInventoryItemRepository } from "./repositories/pharmacyinventoryitem.repository";
import { ProviderAccountRepository } from "./repositories/provideraccount.repository";
import { ProviderAccountProfileRepository } from "./repositories/provideraccountprofile.repository";
import { ProviderAvailabilityRepository } from "./repositories/provideravailability.repository";

function assertAdmin(u: any) { if (!u || u.role !== 'admin') throw new ForbiddenException('admin_required'); }

@Injectable()
export class PharmacySeedService {
  constructor(
    @Inject('PharmacyOrderRepository') private orders: PharmacyOrderRepository,
    @Inject('PharmacyInventoryItemRepository') private inv: PharmacyInventoryItemRepository,
    @Inject('ProviderAccountRepository') private accounts: ProviderAccountRepository,
    @Inject('ProviderAccountProfileRepository') private profiles: ProviderAccountProfileRepository,
    @Inject('ProviderAvailabilityRepository') private avails: ProviderAvailabilityRepository,
  ) {}

  /** Idempotent seed: 2 extra approved pharmacy providers with overlapping inventory so split engine has work to do. */
  async seed(user: any) {
    assertAdmin(user);
    const created: any[] = [];
    const pharmacies = [
      {
        email: 'pharma-north+phase2@test.com',
        business_name: 'صيدلية الشمال',
        district: 'الملقا',
        geo: { lat: 24.8200, lng: 46.6300 },
        inventory: [
          { sku: 'PAN-EXT-500', stock: 50, price: 18, name_ar: 'بانادول إكسترا 500 ملغ', generic_name: 'Paracetamol+Caffeine', dosage: '500mg', form: 'tablet' },
          { sku: 'AMOXIL-500', stock: 0, price: 26, name_ar: 'أموكسيل 500 ملغ', generic_name: 'Amoxicillin', dosage: '500mg', form: 'capsule' },
          { sku: 'VITC-1000', stock: 200, price: 30, name_ar: 'فيتامين سي 1000', generic_name: 'Ascorbic Acid', dosage: '1000mg', form: 'tablet' },
          { sku: 'AUGMENTIN-625', stock: 30, price: 45, name_ar: 'أوجمنتين 625 ملغ', generic_name: 'Amoxicillin+Clavulanate', dosage: '625mg', form: 'tablet', substitute_skus: ['AMOXIL-500'] },
        ],
      },
      {
        email: 'pharma-east+phase2@test.com',
        business_name: 'صيدلية الشرق',
        district: 'النخيل',
        geo: { lat: 24.7000, lng: 46.7500 },
        inventory: [
          { sku: 'AMOXIL-500', stock: 80, price: 24, name_ar: 'أموكسيل 500 ملغ', generic_name: 'Amoxicillin', dosage: '500mg', form: 'capsule' },
          { sku: 'OMEPRA-20', stock: 60, price: 22, name_ar: 'أوميبرازول 20 ملغ', generic_name: 'Omeprazole', dosage: '20mg', form: 'capsule' },
          { sku: 'VITC-1000', stock: 20, price: 28, name_ar: 'فيتامين سي 1000', generic_name: 'Ascorbic Acid', dosage: '1000mg', form: 'tablet' },
        ],
      },
    ];

    for (const p of pharmacies) {
      let acc = await this.accounts.findOne({ email: p.email });
      if (!acc) {
        const hash = await bcrypt.hash('Pharm@123456', 8);
        acc = await this.accounts.create({
          id: uuidv4(),
          email: p.email,
          phone_e164: `+9665${Math.floor(10000000 + Math.random() * 89999999)}`,
          password_hash: hash,
          role: 'provider',
          provider_type: 'pharmacy',
          email_verified: true,
          status: 'approved',
        });
      }
      let prof = await this.profiles.findOne({ account_id: acc.id });
      if (!prof) {
        prof = await this.profiles.create({
          id: uuidv4(),
          account_id: acc.id,
          provider_type: 'pharmacy',
          business_name: p.business_name,
          legal_name: p.business_name,
          status: 'approved',
          address: { country: 'SA', city: 'الرياض', district: p.district },
          geo: { ...p.geo, service_radius_km: 15 },
        });
      } else {
        (prof as any).business_name = p.business_name;
        (prof as any).geo = { ...p.geo, service_radius_km: 15 };
        (prof as any).status = 'approved';
        await prof.save();
      }
      await this.avails.findOneAndUpdate(
        { provider_account_id: acc.id },
        { provider_account_id: acc.id, status: ProviderAvailabilityStatus.ACCEPTING_ORDERS, last_online_at: new Date() },
        { upsert: true, setDefaultsOnInsert: true },
      );
      for (const item of p.inventory) {
        await this.inv.findOneAndUpdate(
          { provider_account_id: acc.id, sku: item.sku },
          { ...item, provider_account_id: acc.id, available: true, currency: 'SAR', min_stock_alert: 10 },
          { upsert: true, setDefaultsOnInsert: true },
        );
      }
      created.push({ email: p.email, account_id: acc.id, business_name: p.business_name, items: p.inventory.length });
    }

    return { ok: true, pharmacies: created };
  }

  /** Create a realistic sample patient order for split-engine testing. */
  async seedSampleOrder(patient_account_id: string) {
    const sample = await this.orders.create({
      id: uuidv4(),
      patient_account_id,
      status: PharmacyOrderState.DRAFT,
      items: [
        { id: uuidv4(), raw_name: 'بانادول إكسترا', name_ar: 'بانادول إكسترا', matched_sku: 'PAN-EXT-500', generic_name: 'Paracetamol+Caffeine', qty: 2, match_status: OrderItemMatchStatus.MANUAL, intake_source: 'manual' },
        { id: uuidv4(), raw_name: 'أموكسيل 500', name_ar: 'أموكسيل 500 ملغ', matched_sku: 'AMOXIL-500', generic_name: 'Amoxicillin', qty: 1, match_status: OrderItemMatchStatus.MANUAL, intake_source: 'manual' },
        { id: uuidv4(), raw_name: 'فيتامين سي', name_ar: 'فيتامين سي 1000', matched_sku: 'VITC-1000', generic_name: 'Ascorbic Acid', qty: 1, match_status: OrderItemMatchStatus.MANUAL, intake_source: 'manual' },
      ],
      delivery_address: { city: 'الرياض', district: 'العليا', geo: { lat: 24.7136, lng: 46.6753 } },
      timeline: [{ ts: new Date(), event: 'created_by_seed' }],
    });
    return sample.toObject();
  }
}
