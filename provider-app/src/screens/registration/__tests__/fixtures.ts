// Fixed inputs for the registration payload characterization tests (one complete, valid data set per provider type).
// The valid IBAN is the public SA sample number; nothing here is real person data.
export const IBAN = 'SA0380000000608010167519';
export const LOCATION = { lat: 24.7136, lng: 46.6753 };

export const pharmacyFixture = {
  nameAr: 'صيدلية نبض', nameEn: 'Nabd Pharmacy', type: 'community', languages: ['ar', 'en'],
  managerName: 'Khalid Omar', managerPhone: '0501234567', managerEmail: 'Pharmacy@Example.com',
  password: 'Passw0rd!x', confirmPass: 'Passw0rd!x', pharmacistName: 'Mohamed Ahmed',
  crNumber: '1010101010', mohLicense: 'MOH-PHR-12345', sfdaNumber: 'SFDA-998877', iban: IBAN,
  accountHolderName: 'Nabd Pharmacy Co', taxNumber: '300123456700003',
  crUri: 'file:///cache/cr.jpg', mohUri: 'file:///cache/moh.jpg', sfdaUri: 'file:///cache/sfda.jpg', logoUri: 'file:///cache/logo.jpg',
  region: 'riyadh', city: 'riyadh_city', district: 'olaya', address: 'Prince Sultan Road',
  location: LOCATION, deliveryRadius: 8, hasDelivery: true, hasOwnDrivers: true,
  workDays: ['SUN', 'MON', 'TUE'], is24_7: false, vacationDate: '2026-12-01',
  shiftType: 'both' as const, openTime: '08:00', closeTime: '14:00', eveningOpenTime: '16:00', eveningCloseTime: '22:00',
  enabledCategories: ['otc', 'rx'], rxDispensing: true, otcSelling: true,
  minOrderSAR: '25', deliveryFee: '10', freeDeliveryAbove: '150', expressDelivery: true, expressFee: '15', expressMinutes: '45',
  scheduledDelivery: true, cashOnly: false,
  acceptedInsurance: [{ companyId: 'bupa', plans: ['gold'] }, { companyId: 'tawuniya', plans: [] }],
  signatureData: 'data:image/png;base64,SIGNATURE', signerName: 'Khalid Omar', signerRole: 'Owner', termsAgreed: true,
};

const doctorBase = {
  legalName: 'Ahmed Ali Alharbi', nameAr: 'د. أحمد', nameEn: 'Dr. Ahmed', email: 'doctor@example.com',
  phone: '0551234567', password: 'Passw0rd!x', confirmPass: 'Passw0rd!x', gender: 'male',
  scfhsNumber: '12345678', nationalId: '1000000000', iban: IBAN, accountHolderName: 'Ahmed Ali Alharbi',
  idFrontUri: 'file:///cache/id.jpg', scfhsDocUri: 'file:///cache/scfhs.jpg', extraDocUri: 'file:///cache/extra.jpg',
  specialty: 'cardiology', degree: 'consultant', yearsExp: '12', bio: 'Cardiologist', profilePhotoUri: 'file:///cache/me.jpg',
  clinicImagesUris: ['file:///cache/c0.jpg', 'https://cdn.test/old.jpg'],
  offersClinic: true, clinicPrice: '200', clinicDuration: '30',
  offersHome: true, homePrice: '350', homeDuration: '45', homeRadius: 10, homeTransportFee: true, homeTransportPrice: '30',
  offersVideo: true, videoPrice: '120', videoDuration: '20',
  lat: 24.7, lng: 46.7,
  clinicDays: ['SUN', 'MON'], clinicStart: '08:00', clinicEnd: '12:00', clinicShift: 'both', clinicStartEve: '16:00', clinicEndEve: '20:00',
  videoDays: ['TUE'], videoStart: '09:00', videoEnd: '11:00', videoShift: 'morning',
  homeDays: ['WED', 'THU'], homeStart: '13:00', homeEnd: '17:00', homeShift: 'evening',
  vacationDate: '2026-11-20',
  cashOnly: false, acceptedInsurance: [{ companyId: 'bupa', plans: ['gold', 'silver'] }],
  insuranceClinic: true, insuranceVideo: false, insuranceHome: true, languages: ['ar', 'en'],
  region: 'riyadh', city: 'riyadh_city', district: 'olaya', location: LOCATION, address: 'King Fahd Road', clinicName: 'Heart Clinic',
  signatureData: 'data:image/png;base64,SIGNATURE', signerName: 'Ahmed Ali Alharbi', signerRole: 'Doctor',
};
export const doctorFixture = { ...doctorBase, scheduleType: 'per_service' as const };
export const doctorUnifiedFixture = {
  ...doctorBase, scheduleType: 'unified' as const, unifiedDays: ['SUN', 'TUE'], unifiedStart: '07:00', unifiedEnd: '13:00',
  unifiedShift: 'both', unifiedStartEve: '17:00', unifiedEndEve: '21:00', cashOnly: true, acceptedInsurance: [],
  profilePhotoUri: 'https://cdn.test/me.jpg', clinicImagesUris: [],
};

export const facilityFixture = {
  facilityNameAr: 'مستشفى نبض', facilityNameEn: 'Nabd Hospital', facilityType: 'hospital',
  managerName: 'Sara Omar', managerPhone: '0561234567', managerEmail: 'hospital@example.com', password: 'Passw0rd!x', confirmPass: 'Passw0rd!x',
  languages: ['ar', 'en', 'ur'], crNumber: '1010202020', mohLicense: 'MOH-H-777', crDocUri: 'file:///cache/cr.jpg', mohDocUri: 'https://cdn.test/moh-old.jpg',
  facilityLogoUri: 'file:///cache/logo.jpg', facilityImagesUris: ['file:///cache/f0.jpg', 'file:///cache/f1.jpg'],
  region: 'riyadh', city: 'riyadh_city', district: 'olaya', fullAddress: 'Olaya Street 1', location: LOCATION,
  subProviders: [
    { type: 'doctor', nameAr: 'د. سامي', nameEn: 'Dr Sami', email: 'Sami@Example.com', license: 'L-1', specialty: 'cardiology', degree: 'consultant', shift: 'both',
      clinicEnabled: true, onlineEnabled: true, homeEnabled: false, priceClinic: '150', priceOnline: '90', priceHome: '',
      insClinic: true, insOnline: false, insHome: false, workDays: ['SUN', 'MON'], startHour: '09:00', endHour: '15:00', clinicImagesUris: ['file:///cache/d0.jpg'] },
    { type: 'lab', nameAr: 'مختبر', nameEn: 'Lab', email: 'lab@example.com', enabledTests: ['cbc', 'tsh'], testPrices: { cbc: 30, tsh: 80 }, homeEnabled: true, priceHome: '25', acceptsInsurance: true,
      workDays: ['SAT'], startHour: '08:00', endHour: '12:00', clinicImagesUris: [] },
    { type: 'radiology', nameAr: 'أشعة', nameEn: 'Rad', email: 'rad@example.com', enabledScans: ['xray'], scanPrices: { xray: 120 }, homeEnabled: false, priceHome: '', acceptsInsurance: false, clinicImagesUris: [] },
    { type: 'nursing', nameAr: 'تمريض', nameEn: 'Nursing', email: 'nurse@example.com', enabledNursing: ['injection'], nursingPrices: { injection: 40 }, homeEnabled: true, priceHome: '15', acceptsInsurance: true, clinicImagesUris: [] },
    { type: 'pharmacy', nameAr: 'صيدلية', nameEn: 'Pharmacy', email: 'ph@example.com', pharmDelivery: true, acceptsInsurance: true, workDays: ['FRI'], clinicImagesUris: ['https://cdn.test/p.jpg'] },
  ],
  cashOnly: false, acceptedInsurance: [{ companyId: 'bupa', plans: ['gold'] }], hasInsuranceCoordinator: true,
  iban: IBAN, accountHolderName: 'Nabd Hospital Co',
  signatureData: 'data:image/png;base64,SIGNATURE', signerName: 'Sara Omar', signerRole: 'General Manager', termsAgreed: false,
};

const nursingBase = {
  nameAr: 'تمريض نبض', nameEn: 'Nabd Nursing', gender: 'female', languages: ['ar', 'fil'],
  managerName: 'Huda Salem', managerPhone: '0571234567', managerEmail: 'nurse@example.com', password: 'Passw0rd!x', confirmPass: 'Passw0rd!x',
  scfhsNumber: '4455667', scfhsExpiry: '2027-05-01', nationalId: '1090000000', crNumber: '1010303030', mohLicense: 'MOH-N-5',
  iban: IBAN, accountHolderName: 'Huda Salem',
  scfhsUri: 'file:///cache/scfhs.jpg', crUri: 'file:///cache/cr.pdf', mohUri: 'file:///cache/moh.jpg', photoUri: 'file:///cache/photo.jpg',
  enabledServices: ['injection', 'wound_care'], pricingModels: ['per_visit', 'per_hour'], priceVisit: '120', priceHour: '60', priceDay: '', priceMonth: '',
  city: 'riyadh_city', district: 'olaya', address: 'Olaya 5', location: LOCATION, coverageRadius: 12, region: 'riyadh',
  workDays: ['SUN', 'MON', 'WED'], shiftType: 'both' as const, openTime: '08:00', closeTime: '13:00', eveningOpenTime: '17:00', eveningCloseTime: '21:00',
  is24_7: false, vacationDate: '2026-12-15',
  cashOnly: false, acceptedInsurance: [{ companyId: 'bupa', plans: ['gold'] }],
  signatureData: 'data:image/png;base64,SIGNATURE', signerName: 'Huda Salem', signerRole: 'Owner', termsAgreed: true,
};
export const nursingIndividualFixture = { ...nursingBase, mode: 'individual' as const };
export const nursingCompanyFixture = { ...nursingBase, mode: 'company' as const, is24_7: true, cashOnly: true, acceptedInsurance: [], vacationDate: '' };

const diagnosticsBase = {
  nameAr: 'مركز نبض', nameEn: 'Nabd Center', managerName: 'Reem Khan', managerPhone: '0581234567', managerEmail: 'center@example.com',
  techOfficerName: 'Tariq Ali', techOfficerScfhs: '778899', password: 'Passw0rd!x', confirmPass: 'Passw0rd!x',
  crNumber: '1010404040', mohLicense: 'MOH-C-9', iban: IBAN, accountHolderName: 'Nabd Center Co', taxNumber: '300999888700003', languages: ['ar', 'en'],
  crUri: 'file:///cache/cr.jpg', mohUri: 'file:///cache/moh.pdf', logoUri: 'file:///cache/logo.jpg',
  region: 'riyadh', city: 'riyadh_city', district: 'olaya', address: 'Olaya 9', location: LOCATION,
  hasHomeSvc: true, homeRadius: 6, homeCollectorCount: '3', homeCollectionFee: '20', targetGenders: 'both', homeCollectorGender: 'female' as const,
  enabledTests: ['cbc', 'tsh'], testPrices: { cbc: '30', tsh: '80' }, testHomeAvail: { cbc: true }, testTurnaround: { cbc: '24h' },
  testInsuranceCov: { cbc: true }, scanInsuranceCov: { xray: true },
  enabledScans: ['xray', 'mri'], scanPrices: { xray: '120', mri: '900' },
  workDays: ['SUN', 'MON'], shiftType: 'both' as const, openTime: '08:00', closeTime: '14:00', eveningOpenTime: '16:00', eveningCloseTime: '20:00',
  homeWorkDays: ['TUE'], homeShiftType: 'morning' as const, homeOpenTime: '09:00', homeCloseTime: '12:00', homeEveningOpenTime: '', homeEveningCloseTime: '',
  vacationDate: '2026-12-24', cashOnly: false, acceptedInsurance: [{ companyId: 'bupa', plans: ['gold'] }],
  signatureData: 'data:image/png;base64,SIGNATURE', signerName: 'Reem Khan', signerRole: 'Director', termsAgreed: true,
};
export const labFixture = { ...diagnosticsBase, labCategory: 'Class A', labAccreditation: 'CBAHI' };
export const radiologyFixture = { ...diagnosticsBase, radSafetyLicense: 'RAD-SAF-1', radEquipment: 'MRI 1.5T, X-ray' };

export const pharmacy24Fixture = {
  ...pharmacyFixture, type: 'hospital', is24_7: true, hasDelivery: false, hasOwnDrivers: false, deliveryRadius: 0, shiftType: 'morning' as const,
  workDays: [], cashOnly: true, acceptedInsurance: [], expressDelivery: false, vacationDate: '', logoUri: '', rxDispensing: false,
};
export const labNoHomeFixture = {
  ...labFixture, hasHomeSvc: false, homeWorkDays: [], cashOnly: true, acceptedInsurance: [], logoUri: '', shiftType: 'evening' as const, vacationDate: '',
};
