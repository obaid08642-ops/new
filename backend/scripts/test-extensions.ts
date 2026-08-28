// @ts-nocheck
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { NabdExtensionsService } from '../src/modules/nabd-extensions/nabd-extensions.service';
import { AiService } from '../src/modules/ai/ai.service';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';

// Import schemas to seed/clean
import { User } from '../src/schemas/user.schema';
import { ProviderProfile } from '../src/schemas/provider-profile.schema';
import { Order } from '../src/schemas/order.schema';
import { Appointment } from '../src/schemas/appointment.schema';
import { Prescription } from '../src/schemas/prescription.schema';
import { LabResult } from '../src/schemas/lab-result.schema';
import { VitalReading } from '../src/schemas/health.schema';
import { Wallet } from '../src/schemas/wallet.schema';
import { ReferralCode } from '../src/schemas/referral.schema';
import { FeatureFlag } from '../src/schemas/feature-flag.schema';
import { TreatmentProgram } from '../src/schemas/treatment-program.schema';

async function bootstrap() {
  console.log('--- Starting Integration Test Suite for Nabd Extensions ---');
  
  // Set test environment variables
  process.env.JWT_SECRET = 'test-jwt-secret-key-12345';
  process.env.DB_NAME = 'nabd_test_db';

  const app = await NestFactory.createApplicationContext(AppModule);
  const svc = app.get(NabdExtensionsService);
  const aiSvc = app.get(AiService);

  // Retrieve Mongoose models to seed test database
  const userModel: Model<any> = app.get(getModelToken(User.name));
  const providerModel: Model<any> = app.get(getModelToken(ProviderProfile.name));
  const orderModel: Model<any> = app.get(getModelToken(Order.name));
  const appointmentModel: Model<any> = app.get(getModelToken(Appointment.name));
  const prescriptionModel: Model<any> = app.get(getModelToken(Prescription.name));
  const labResultModel: Model<any> = app.get(getModelToken(LabResult.name));
  const vitalModel: Model<any> = app.get(getModelToken(VitalReading.name));
  const walletModel: Model<any> = app.get(getModelToken(Wallet.name));
  const referralModel: Model<any> = app.get(getModelToken(ReferralCode.name));
  const flagModel: Model<any> = app.get(getModelToken(FeatureFlag.name));
  const programModel: Model<any> = app.get(getModelToken(TreatmentProgram.name));

  // Access dynamic models registered in connection but not statically exported
  const inventoryModel = userModel.db.model('InventoryItem');
  const homeCareModel = userModel.db.model('HomeCareBooking');
  const labSampleModel = userModel.db.model('LabSample');
  const corporateModel = userModel.db.model('CorporateAccount');

  console.log('Cleaning test collections...');
  await userModel.deleteMany({});
  await providerModel.deleteMany({});
  await orderModel.deleteMany({});
  await appointmentModel.deleteMany({});
  await prescriptionModel.deleteMany({});
  await labResultModel.deleteMany({});
  await vitalModel.deleteMany({});
  await walletModel.deleteMany({});
  await referralModel.deleteMany({});
  await flagModel.deleteMany({});
  await programModel.deleteMany({});
  await inventoryModel.deleteMany({});
  await homeCareModel.deleteMany({});
  await labSampleModel.deleteMany({});
  await corporateModel.deleteMany({});

  console.log('Seeding test data...');
  // Seed Patient User
  const patient = await userModel.create({
    id: 'pat1',
    full_name: 'أحمد عبيد',
    phone: '+966501234567',
    email: 'ahmed@nabd.com',
    role: 'patient',
    active: true,
  });

  // Seed MedicalProfile details
  await userModel.db.model('MedicalProfile').create({
    patient_id: 'pat1',
    blood_type: 'A+',
    chronic_diseases: [{ name_ar: 'السكري من النوع الثاني', severity: 'mild' }],
    allergies: [{ name_ar: 'البنسلين', severity: 'severe' }],
  });

  // Seed Pharmacy Provider
  const pharmacy = await providerModel.create({
    id: 'pharmacy1',
    user_id: 'prov_user_1',
    type: 'pharmacy',
    status: 'verified',
    name_ar: 'صيدلية النبض المركزية',
    location: { lat: 24.7136, lng: 46.6753 }, // Riyadh Centroid
  });

  // Seed Nurse Provider
  const nurse = await providerModel.create({
    id: 'nurse1',
    user_id: 'prov_user_2',
    type: 'nurse',
    status: 'verified',
    name_ar: 'الممرضة فاطمة',
    location: { lat: 24.7150, lng: 46.6760 }, // Close to centroid
  });

  // Seed Inventory
  await inventoryModel.create({
    providerId: 'pharmacy1',
    drugName: 'Panadol',
    sku: 'PAN-10',
    quantity: 100,
    expiryDate: new Date('2026-12-01'),
  });

  // Seed HomeCare visit
  await homeCareModel.create({
    id: 'visit1',
    patient_id: 'pat1',
    provider_id: 'nurse1',
    location: { lat: 24.7136, lng: 46.6753 }, // Patient is at Riyadh Centroid
  });

  // Seed Lab Sample
  await labSampleModel.create({
    sampleId: 'sample1',
    barcodeId: 'BAR-999',
    patientId: 'pat1',
    testName: 'نسبة البوتاسيوم بالدم',
    status: 'pending',
    minValue: 3.5,
    maxValue: 5.1,
    criticalMin: 2.8,
    criticalMax: 6.0,
  });

  // Seed Corporate Account
  await corporateModel.create({
    companyName: 'Aramco',
    employeeLimit: 1000,
    individualCreditLimit: 5000,
    usedCredit: 100,
    billingCycleEnd: new Date('2026-12-31'),
  });

  let testsPassed = 0;
  let testsFailed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`[PASS] ${msg}`);
      testsPassed++;
    } else {
      console.error(`[FAIL] ${msg}`);
      testsFailed++;
    }
  }

  try {
    // 1. Wallet Ledger Credit test
    console.log('\n--- Test 1: Wallet Transactions & Balance ---');
    const tx = await svc.processWalletTransaction({
      ownerId: 'pat1',
      ownerType: 'patient',
      amount: 150,
      type: 'credit',
      referenceType: 'booking',
      referenceId: 'book1',
      description: 'Cashback reward',
    });
    assert(tx !== null, 'Wallet transaction row created');
    const balance = await svc.getWalletBalance('pat1', 'patient');
    assert(balance === 150, `Wallet balance is correct: ${balance} SAR`);

    // 2. Wallet Ledger Debit test (with insufficient validation check)
    let debitFailed = false;
    try {
      await svc.processWalletTransaction({
        ownerId: 'pat1',
        ownerType: 'patient',
        amount: 200,
        type: 'debit',
        referenceType: 'booking',
        referenceId: 'book2',
        description: 'Payment debit',
      });
    } catch (err) {
      debitFailed = true;
    }
    assert(debitFailed, 'Insufficient balance debit failed as expected');

    // 3. Referral Codes & Reward Engine
    console.log('\n--- Test 2: Referral Rewards ---');
    const refCode = await svc.generateReferralCode('pat1');
    assert(refCode.startsWith('NABD-PAT1-'), `Referral code generated: ${refCode}`);
    
    // Claim referral welcome bonus
    const claimRes = await svc.claimReferral('referee_user_1', refCode);
    assert(claimRes.success && claimRes.rewardAmount === 50, 'Referral claimed and reward credited');
    
    const referrerBalance = await svc.getWalletBalance('pat1', 'patient');
    const refereeBalance = await svc.getWalletBalance('referee_user_1', 'patient');
    assert(referrerBalance === 200, 'Referrer wallet credited +50 SAR');
    assert(refereeBalance === 50, 'Referee wallet credited +50 SAR');

    // 4. Feature Flags
    console.log('\n--- Test 3: Feature Flags ---');
    await svc.updateFlag('enable_telemedicine', true, 'admin1');
    const flags = await svc.getFlags();
    const flag = flags.find(f => f.flagName === 'enable_telemedicine');
    assert(flag !== undefined && flag.isEnabled === true, 'Feature flag updated and retrieved successfully');

    // 5. Medical Timeline & Passport Signing
    console.log('\n--- Test 4: Medical Timeline & Passport ---');
    // Add mock clinical data
    await vitalModel.create({
      patient_id: 'pat1',
      type: 'bp',
      value: '120/80',
      unit: 'mmHg',
      measured_at: new Date(),
    });
    const timeline = await svc.getTimeline('pat1');
    assert(timeline.length === 1 && timeline[0].kind === 'vital', `Timeline aggregates vitals. Feed count: ${timeline.length}`);

    const passport = await svc.getHealthPassport('pat1');
    assert(passport.passport.bloodType === 'A+', 'Health passport compiled patient blood type');
    assert(passport.passport.chronicDiseases[0].name_ar === 'السكري من النوع الثاني', 'Chronic disease bound to passport');
    
    // Verify secure QR token
    const decoded: any = await app.get(JwtService).verifyAsync(passport.verificationToken);
    assert(decoded.patientId === 'pat1', 'QR Verification JWT contains valid signature');

    // 6. Care Programs Enrollment
    console.log('\n--- Test 5: Care Programs enrollment ---');
    const prog = await svc.enrollProgram('pat1', 'diabetes');
    assert(prog.programType === 'diabetes' && prog.status === 'active', 'Diabetes program enrolled');

    // 7. Spatial Pharmacy Matching
    console.log('\n--- Test 6: Smart Matching ---');
    const pharmacyMatches = await svc.matchPharmacy(24.7136, 46.6753, 'Panadol');
    assert(pharmacyMatches.length === 1 && pharmacyMatches[0].provider.id === 'pharmacy1', 'Pharmacy matched based on Geo proximity and stock');

    // 8. Nurse matching
    const nurseMatches = await svc.matchNurse(24.7136, 46.6753);
    assert(nurseMatches.length === 1 && nurseMatches[0].provider.id === 'nurse1', 'Nurse matched based on coordinate proximity');

    // 9. Provider rankings quality score
    const ranked = await svc.rankProviders(24.7136, 46.6753, 'pharmacy');
    assert(ranked.length > 0 && ranked[0].score !== undefined, 'Provider rankings scored successfully');

    // 10. Fraud detection aggregation
    console.log('\n--- Test 7: Fraud Detection ---');
    const frauds = await svc.detectFraud();
    assert(frauds.length === 2 && frauds[0].flagType === 'duplicate_reviews_same_ip', 'Fraud alerts aggregation triggered');

    // 11. Nursing GPS distance check-in (Haversine < 50m)
    console.log('\n--- Test 8: GPS Check-in verification ---');
    // Centroid check-in (distance should be close to 0m)
    const checkinOk = await svc.verifyNurseAttendance('nurse1', 'visit1', 24.7136, 46.6753);
    assert(checkinOk.success && checkinOk.distanceM < 5, `Check-in succeeded at patient location (distance: ${checkinOk.distanceM.toFixed(1)}m)`);

    // Far check-in (distance should be > 10km)
    const checkinFail = await svc.verifyNurseAttendance('nurse1', 'visit1', 24.8136, 46.7753);
    assert(!checkinFail.success, `Check-in rejected at far distance (distance: ${checkinFail.distanceM.toFixed(1)}m)`);

    // 12. Laboratory critical range alert
    console.log('\n--- Test 9: Laboratory range limits ---');
    // Normal potassium value: 4.0
    const normalLab = await svc.verifyLabResultRanges('sample1', 4.0);
    assert(!normalLab.isCritical, 'Normal value (4.0 mmol/L) did not trigger critical alarm');

    // Critical low potassium value: 2.5
    const criticalLab = await svc.verifyLabResultRanges('sample1', 2.5);
    assert(criticalLab.isCritical, 'Critical low value (2.5 mmol/L) triggered high-priority alarm');

    // 13. Corporate Credit Limit Checking
    console.log('\n--- Test 10: Corporate Limits ---');
    const corpOk = await svc.verifyCorporateCredit('Aramco', 'emp1', 300);
    assert(corpOk.approved === true, 'Corporate credit approved within bounds');

    const corpFail = await svc.verifyCorporateCredit('Aramco', 'emp1', 10000);
    assert(corpFail.approved === false, 'Corporate credit rejected over limit');

    // 14. AI Copilot Suggestions Fallback
    console.log('\n--- Test 11: AI Copilot & Triage ---');
    const suggest = await aiSvc.copilotSuggest('Patient reports severe headache and high fever.');
    assert(suggest.icd10.some(i => i.code === 'R51.9') && suggest.drugs.some(d => d.name === 'Paracetamol'), 'AI Copilot suggestion returns correct codes and drugs');

    // 15. AI Triage chat chatbot fallback
    const chat = await aiSvc.triageChat([
      { role: 'user', content: 'أعاني من ألم شديد في الصدر وضيق تنفس' }
    ]);
    assert(chat.urgency === 'emergency', 'AI Triage chat flags chest pain as emergency');

    console.log(`\nTests Completed: ${testsPassed} passed, ${testsFailed} failed.`);

  } catch (err: any) {
    console.error('Test execution failed with error:', err);
    testsFailed++;
  } finally {
    await app.close();
    process.exit(testsFailed > 0 ? 1 : 0);
  }
}

bootstrap().catch(console.error);
