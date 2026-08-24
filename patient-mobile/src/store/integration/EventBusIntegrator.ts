import { Store } from '@reduxjs/toolkit';
import { EventBus } from '../../core/events/EventBus';
import { logger } from '../../services/Logger';
import { baseApi } from '../api/baseApi';

/**
 * Connects the Domain EventBus (used by local SQLite repositories and sync)
 * to the Redux Store, so that offline database changes trigger UI updates.
 */
export function integrateEventBusWithRedux(store: Store, eventBus: EventBus) {
  const log = logger.scope('EventBusIntegrator');

  log.info('Connecting EventBus to Redux store');

  // Listen to entity insertions
  eventBus.subscribe('ENTITY_INSERTED', (event) => {
    log.debug(`ENTITY_INSERTED triggered for module: ${event.sourceModule}`, event.payload);
    // Invalidate RTK query caches or dispatch explicit slice actions
    store.dispatch(baseApi.util.invalidateTags([{ type: event.sourceModule as any, id: 'LIST' }]));
  });

  // Listen to entity updates
  eventBus.subscribe('ENTITY_UPDATED', (event) => {
    log.debug(`ENTITY_UPDATED triggered for module: ${event.sourceModule}`, event.payload);
    // Invalidate RTK query caches for the specific item
    store.dispatch(baseApi.util.invalidateTags([{ type: event.sourceModule as any, id: event.payload.id }]));
    store.dispatch(baseApi.util.invalidateTags([{ type: event.sourceModule as any, id: 'LIST' }]));
  });

  // Listen to entity deletions
  eventBus.subscribe('ENTITY_DELETED', (event) => {
    log.debug(`ENTITY_DELETED triggered for module: ${event.sourceModule}`, event.payload);
    store.dispatch(baseApi.util.invalidateTags([{ type: event.sourceModule as any, id: event.payload.id }]));
    store.dispatch(baseApi.util.invalidateTags([{ type: event.sourceModule as any, id: 'LIST' }]));
  });

  // Listen to sync engine events
  eventBus.subscribe('SYNC_COMPLETED', (event) => {
    log.debug('SYNC_COMPLETED triggered, refreshing UI');
    // Global refetch
    store.dispatch(baseApi.util.resetApiState());
  });
}
