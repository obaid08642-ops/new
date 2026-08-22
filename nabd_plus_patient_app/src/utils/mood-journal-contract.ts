export type MoodValue = 'great' | 'good' | 'okay' | 'bad' | 'terrible';

export type MoodEntry = {
  id?: string;
  mood: MoodValue;
  energy_level?: number;
  stress_level?: number;
  sleep_hours?: number;
  notes?: string;
  tags?: string[];
  logged_at: string;
};

export type MoodJournalDraft = {
  mood: MoodValue | null;
  energy?: number;
  stress?: number;
  sleep: string;
  note: string;
  tags: string[];
};

export type MoodJournalPayload = Pick<MoodEntry, 'mood'> & Partial<Pick<MoodEntry, 'energy_level' | 'stress_level' | 'sleep_hours' | 'notes' | 'tags'>>;

const MOODS: ReadonlySet<string> = new Set(['great', 'good', 'okay', 'bad', 'terrible']);

function objectValue(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function optionalScale(value: unknown, label: string): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 5) {
    throw new Error(`${label} must be an integer from 1 to 5`);
  }
  return value;
}

function optionalSleep(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 24) {
    throw new Error('sleep_hours must be a finite number from 0 to 24');
  }
  return value;
}

function dateValue(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || Number.isNaN(new Date(value).getTime())) {
    throw new Error('Mood history entry is missing a valid logged_at date');
  }
  return value;
}

function optionalTags(value: unknown): string[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value) || value.some((tag) => typeof tag !== 'string' || !tag.trim()) || new Set(value).size !== value.length) {
    throw new Error('Mood history tags must be a unique non-empty string list');
  }
  return value;
}

/**
 * The API returns a raw patient-owned array. Refuse an unexpected payload rather
 * than replacing a failed history request with a clinically misleading empty list.
 */
export function parseMoodHistory(value: unknown): MoodEntry[] {
  if (!Array.isArray(value)) throw new Error('Mood history response must be an array');

  return value.map((item) => {
    const entry = objectValue(item, 'Mood history entry');
    if (typeof entry.mood !== 'string' || !MOODS.has(entry.mood)) {
      throw new Error('Mood history entry has an invalid mood');
    }
    if (entry.notes !== undefined && typeof entry.notes !== 'string') {
      throw new Error('Mood history entry has invalid notes');
    }

    const result: MoodEntry = {
      mood: entry.mood as MoodValue,
      logged_at: dateValue(entry.logged_at ?? entry.createdAt),
    };
    if (typeof entry.id === 'string') result.id = entry.id;
    const energy = optionalScale(entry.energy_level, 'energy_level');
    const stress = optionalScale(entry.stress_level, 'stress_level');
    const sleep = optionalSleep(entry.sleep_hours);
    const tags = optionalTags(entry.tags);
    if (energy !== undefined) result.energy_level = energy;
    if (stress !== undefined) result.stress_level = stress;
    if (sleep !== undefined) result.sleep_hours = sleep;
    if (typeof entry.notes === 'string' && entry.notes.trim()) result.notes = entry.notes.trim();
    if (tags?.length) result.tags = tags;
    return result;
  });
}

/** Build only values deliberately selected by the patient; there are no defaults. */
export function buildMoodJournalPayload(draft: MoodJournalDraft): MoodJournalPayload {
  if (!draft.mood || !MOODS.has(draft.mood)) throw new Error('A mood selection is required');
  const payload: MoodJournalPayload = { mood: draft.mood };
  const energy = optionalScale(draft.energy, 'energy_level');
  const stress = optionalScale(draft.stress, 'stress_level');
  if (energy !== undefined) payload.energy_level = energy;
  if (stress !== undefined) payload.stress_level = stress;

  if (draft.sleep.trim()) {
    const sleep = Number(draft.sleep);
    if (!Number.isFinite(sleep) || sleep < 0 || sleep > 24) throw new Error('sleep_hours must be a finite number from 0 to 24');
    payload.sleep_hours = sleep;
  }
  if (draft.note.trim()) payload.notes = draft.note.trim();
  const tags = optionalTags(draft.tags);
  if (tags?.length) payload.tags = tags;
  return payload;
}
