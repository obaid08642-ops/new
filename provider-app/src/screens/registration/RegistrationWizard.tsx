// The one provider registration wizard (M9): merged pages of steps, then the review/sign/OTP/submit page.
// A provider type is a WizardConfig: its initial data, its pages (each a list of step components) and its review config.
import React, { useCallback, useRef, useState } from 'react';
import { createUploader } from './kit';
import { MergedPage } from './WizardParts';
import type { WizardPage } from './WizardParts';
import { ReviewStep } from './ReviewStep';
import type { ReviewConfig, ReviewData } from './ReviewStep';

export interface WizardConfig<T extends ReviewData> {
  init: T;
  pages: WizardPage<T>[];
  review: ReviewConfig<T>;
  /** Drawn over every page (a type's own "processing" overlay driven by its data). */
  overlay?: (data: T) => React.ReactNode;
}

export interface RegistrationProps<T> {
  onBack: () => void;
  onDone: () => void;
  /** Starts the wizard with these values (used by the payload tests and to resume a draft). */
  initialData?: Partial<T>;
}

export function RegistrationWizard<T extends ReviewData>({ config, onBack, onDone, initialData }: RegistrationProps<T> & { config: WizardConfig<T> }) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<T>({ ...config.init, ...initialData });
  const uploads = useRef(createUploader()).current;
  const update = useCallback((patch: Partial<T>) => setData((prev) => ({ ...prev, ...patch })), []);
  const total = config.pages.length + 1;
  const next = () => setStep((s) => Math.min(s + 1, total));
  const back = () => { if (step === 1) onBack(); else setStep((s) => s - 1); };

  const page = step > config.pages.length
    ? <ReviewStep config={config.review} data={data} update={update} uploads={uploads} step={step} total={total} onBack={back} onDone={onDone} />
    : <MergedPage page={config.pages[step - 1]} step={step} total={total} onBack={back} onNext={next} data={data} update={update} uploads={uploads} />;
  return <>{page}{config.overlay?.(data)}</>;
}
