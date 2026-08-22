import { TourStatus, TourDefinition } from '../types';

export class TourEngine {
  private status: TourStatus = 'idle';
  private currentTour: TourDefinition | null = null;
  private currentStepIndex: number = -1;

  async startTour(tour: TourDefinition, force?: boolean): Promise<void> {
    this.status = 'starting';
    this.currentTour = tour;
    this.currentStepIndex = 0;
    this.status = 'active';
  }

  nextStep(): void {
    if (this.currentTour && this.currentStepIndex < this.currentTour.steps.length - 1) {
      this.currentStepIndex++;
    } else {
      this.completeTour();
    }
  }

  prevStep(): void {
    if (this.currentStepIndex > 0) {
      this.currentStepIndex--;
    }
  }

  skipTour(): void {
    this.status = 'skipped';
    this.cleanup();
  }

  async completeTour(): Promise<void> {
    this.status = 'celebrating';
    setTimeout(() => {
      this.status = 'completed';
      this.cleanup();
    }, 3000);
  }

  private cleanup() {
    this.currentTour = null;
    this.currentStepIndex = -1;
  }
  
  getStatus(): TourStatus { return this.status; }
  getCurrentStep() { return this.currentTour?.steps[this.currentStepIndex] || null; }
}
