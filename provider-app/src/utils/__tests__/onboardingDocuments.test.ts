import { REQUIRED_DOCUMENTS, fileIdOf, typedDocuments, missingDocuments } from '../onboardingDocuments';
// The app tsconfig has no Node types; jest runs under Node.
declare const require: (m: string) => any;
declare const __dirname: string;
const fs = require('fs');
const path = require('path');

describe('onboarding KYC documents (Q79)', () => {
  it('reads the storage id from an id or a /storage/<id> url', () => {
    expect(fileIdOf('3f2a9c1e-aaaa-4bbb-8ccc-123456789abc')).toBe('3f2a9c1e-aaaa-4bbb-8ccc-123456789abc');
    expect(fileIdOf('/api/v1/storage/abc123def')).toBe('abc123def');
    expect(fileIdOf('https://cdn.example/x.jpg')).toBeNull();
    expect(fileIdOf(undefined)).toBeNull();
  });

  it('builds typed documents and skips missing files', () => {
    expect(typedDocuments([['commercial_registration', 'file-cr-1'], ['iban_letter', null]])).toEqual([{ doc_type: 'commercial_registration', file_id: 'file-cr-1' }]);
  });

  it('reports the required types still missing', () => {
    expect(missingDocuments('ambulance', [{ doc_type: 'commercial_registration' }])).toEqual(['facility_license', 'iban_letter']);
  });

  it('matches the backend list for every type the app registers', () => {
    const src = fs.readFileSync(path.join(__dirname, '../../../../backend/src/modules/provider/provider.enums.ts'), 'utf8');
    const block = src.slice(src.indexOf('REQUIRED_DOCS_BY_PROVIDER_TYPE'));
    const backend: Record<string, string[]> = {};
    for (const m of block.matchAll(/\[ProviderType\.(\w+)\]:\s*\[([^\]]*)\]/g)) {
      backend[m[1].toLowerCase()] = [...m[2].matchAll(/ProviderDocumentType\.(\w+)/g)].map((x: RegExpMatchArray) => x[1].toLowerCase());
    }
    for (const t of ['pharmacy', 'hospital', 'doctor', 'laboratory', 'radiology', 'home_care', 'nursing', 'ambulance']) {
      expect(REQUIRED_DOCUMENTS[t]).toEqual(backend[t]);
    }
  });
});
