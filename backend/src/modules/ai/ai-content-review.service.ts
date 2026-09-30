import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AiContentReviewItem, AiContentReviewDocument, AiContentKind } from '../../schemas/ai-content-review.schema';

/**
 * Phase 10 medical safety — the AI content review queue.
 *
 * Care levels that mean "this patient may be in danger now" (emergency, and
 * anything the triage engine marks as needing immediate human attention) are
 * published to the patient straight away and *also* recorded, because making a
 * patient wait for a moderator before they learn they may be in an emergency is
 * a worse failure than an unreviewed sentence.
 *
 * What this queue is today, precisely: an audit and sign-off trail, not a
 * pre-publish gate. The medical surfaces that feed it (triage, skin assessment)
 * publish no model prose by construction — they return a deterministic care
 * level, the red flags the patient ticked, `diagnosis: null`, `treatment: null`
 * and a fixed disclaimer. So for a non-urgent item there is no AI-authored
 * sentence being withheld; `published_to_patient: false` records the *moderation
 * policy* (this one was not auto-published as an emergency), not a suppression
 * that happened. The invariant that keeps it true lives in
 * ai-content-review.service.spec.ts — if someone later starts returning model
 * text from a medical surface, that test is what must change first, and it has
 * to change deliberately rather than by accident.
 *
 * The surfaces that DO return model output to a patient today are the nutrition
 * ones (`analyzeMeal`, `generateDietPlan`, `generateExercisePlan`). They are
 * deliberately not gated here: gating them is a product decision about the
 * patient experience, not a safety fix, and it was not taken unilaterally.
 *
 * Recording is deliberately best-effort and never blocks or fails the clinical
 * response: if Mongo is unavailable the patient still gets their triage answer.
 * What is not acceptable is silently losing the audit trail, so the failure is
 * logged loudly.
 */
@Injectable()
export class AiContentReviewService {
  private readonly logger = new Logger(AiContentReviewService.name);

  constructor(
    @InjectModel(AiContentReviewItem.name)
    private readonly model: Model<AiContentReviewDocument>,
  ) {}

  /** Care levels that must never wait for moderation. */
  private static readonly URGENT = new Set(['emergency', 'urgent']);

  async record(input: {
    kind: AiContentKind;
    content: string;
    patientId?: string;
    careLevel?: string;
    requestSummary?: string;
    model?: string;
  }): Promise<{ id: string; published: boolean; status: string }> {
    const urgent = !!input.careLevel && AiContentReviewService.URGENT.has(String(input.careLevel).toLowerCase());
    try {
      const doc = await this.model.create({
        kind: input.kind,
        content: input.content,
        patient_id: input.patientId,
        care_level: input.careLevel,
        request_summary: input.requestSummary,
        model: input.model,
        status: urgent ? 'auto_published' : 'pending',
        // Moderation policy, not a suppression: see the class comment. Nothing is
        // withheld here because the medical payloads carry no model prose.
        published_to_patient: urgent,
      });
      return { id: doc.id, published: urgent, status: doc.status };
    } catch (error: any) {
      // Never fail the clinical response, but make the gap visible.
      this.logger.error(
        `AI content could not be queued for review (kind=${input.kind}): ${error?.message}`,
        error?.stack,
      );
      return { id: '', published: !!urgent, status: 'unrecorded' };
    }
  }

  async list(status?: string, limit = 50) {
    const query = status && status !== 'all' ? { status: { $eq: String(status) } } : {};
    return this.model.find(query).sort({ createdAt: -1 }).limit(Math.min(Number(limit) || 50, 200)).lean();
  }

  async review(id: string, by: string, decision: 'approved' | 'rejected', note?: string) {
    const doc = await this.model.findOneAndUpdate(
      { id: { $eq: String(id) } },
      { $set: { status: decision, reviewed_by: String(by), reviewed_at: new Date(), review_note: (note || '').slice(0, 500) } },
      { new: true },
    );
    if (!doc) throw new NotFoundException('review_item_not_found');
    return doc.toObject();
  }
}
