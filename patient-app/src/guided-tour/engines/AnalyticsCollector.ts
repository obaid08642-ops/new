export class AnalyticsCollector {
  private queue: any[] = [];
  
  trackEvent(eventType: string, tourId: string, stepId?: string, metadata?: any) {
    this.queue.push({
      eventId: Math.random().toString(36).substr(2, 9),
      eventType,
      tourId,
      stepId,
      metadata,
      timestamp: new Date().toISOString()
    });
    
    if (this.queue.length >= 20) {
      this.flush();
    }
  }
  
  async flush() {
    if (this.queue.length === 0) return;
    const eventsToSend = [...this.queue];
    this.queue = [];
    // No tour-analytics endpoint exists yet (a future POST
    // /api/v1/tours/analytics/events would receive these). Events are
    // dropped — never faked as sent. Dev builds log the drop count.
    if (__DEV__) console.log(`Dropping ${eventsToSend.length} tour events (no backend endpoint yet)...`);
  }
}
