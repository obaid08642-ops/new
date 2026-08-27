import { logger } from '../../services/Logger';

export interface DomainEvent<T = any> {
  id: string;
  eventName: string;
  timestamp: Date;
  payload: T;
  sourceModule: string;
}

type EventHandler = (event: DomainEvent) => void | Promise<void>;

export class EventBus {
  private log = logger.scope('EventBus');
  private listeners: Map<string, Set<EventHandler>> = new Map();

  /**
   * Subscribe to a domain event
   */
  public subscribe(eventName: string, handler: EventHandler): () => void {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }
    this.listeners.get(eventName)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.listeners.get(eventName)?.delete(handler);
    };
  }

  /**
   * Publish a domain event asynchronously to decouple modules
   */
  public publish<T>(eventName: string, payload: T, sourceModule: string): void {
    const event: DomainEvent<T> = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      eventName,
      timestamp: new Date(),
      payload,
      sourceModule,
    };

    this.log.debug(`[EventBus] Publishing ${eventName} from ${sourceModule}`);

    const handlers = this.listeners.get(eventName) || new Set();
    
    // Execute handlers asynchronously so publish doesn't block the caller
    handlers.forEach(handler => {
      setTimeout(async () => {
        try {
          await handler(event);
        } catch (error) {
          this.log.error(`Error in event handler for ${eventName}`, error);
        }
      }, 0);
    });
  }
}
