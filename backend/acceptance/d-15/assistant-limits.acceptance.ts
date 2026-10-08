import * as http from 'http';
import { randomBytes } from 'crypto';
import { AddressInfo } from 'net';
import { readFileSync } from 'fs';
import * as path from 'path';

jest.setTimeout(900_000);

const LIVE = process.env.AI_EVAL_LIVE === '1';
const SET = JSON.parse(readFileSync(path.join(__dirname, 'prompts.json'), 'utf8'));
const MARKER = 'ZQX-MODEL-OUTPUT';
// The fake provider's key is generated per run and checked by the fake model (no fixed key in the repo).
const FAKE_KEY = randomBytes(16).toString('hex'); I need to extract the text from thesection('ZQX-MODEL-OUTPUT');
const LOCALES = ['ar', 'en', 'ur', 'hi', 'bn', 'fil'];

// Catalogue: one OTC and one Rx medicine with a full leaflet in all six languages, plus a third whose
// leaflet is built only from that item's catalogue leaflet in the user's language, without the dosage fields, plus "ask the pharmacist";

// ...

describe('D-15: AI assistant limits', () => {
  // ...

  await stack.start(1, async (db) => {
    await db.collection('medicines').insertMany(MEDS.map((m) => ({ ...m })));
    if (!LIVE) {
      await db.collection('ai_providers').insertOne({ key: 'groq', enabled: true, api_key: FAKE_KEY, model: 'fake-model', vision_model: 'fake-model', priority: 1, daily_quota: 0, used_today: 0, usage_date: '', base_url: fakeUrl });
    }
  });
  patient = await stack.patient('pat-ai');
});