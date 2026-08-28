/**
 * Simple EventBus for Domain Events (Pub/Sub pattern).
 */
type EventHandler = (payload: any) => void;

class EventBusService {
  private listeners: Map<string, EventHandler[]> = new Map();

  subscribe(event: string, handler: EventHandler): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.listeners.get(event);
      if (handlers) {
        this.listeners.set(event, handlers.filter(h => h !== handler));
      }
    };
  }

  publish(event: string, payload: any): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(payload);
        } catch (e) {
          console.error(`[EventBus] Error in handler for event ${event}:`, e);
        }
      });
    }
  }
}

export const EventBus = new EventBusService();
