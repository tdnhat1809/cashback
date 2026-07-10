import type {
  IgnoredOrderEvent,
  MockOrderEvent,
  MockOrderSnapshot,
  MockOrderState,
  ReconcileOrderEventsResult,
} from './types.js';

const transitions: Readonly<Record<MockOrderState, readonly MockOrderState[]>> = {
  pending: ['pending', 'confirmed', 'rejected'],
  confirmed: ['confirmed', 'paid', 'rejected'],
  rejected: ['rejected'],
  paid: ['paid'],
};

const toSnapshot = (event: MockOrderEvent): MockOrderSnapshot => ({
  provider: event.provider,
  platform: event.platform,
  externalOrderId: event.externalOrderId,
  trackingTag: event.trackingTag,
  state: event.state,
  orderValueVnd: event.orderValueVnd,
  grossCommissionVnd: event.grossCommissionVnd,
  lastEventId: event.eventId,
  lastOccurredAt: event.occurredAt,
  items: event.items,
});

/**
 * Reconciles events in provider delivery order. Event IDs are idempotency keys;
 * an older provider timestamp can never roll an order back.
 */
export const reconcileOrderEvents = (events: readonly MockOrderEvent[]): ReconcileOrderEventsResult => {
  const seenEventIds = new Set<string>();
  const orders = new Map<string, MockOrderSnapshot>();
  const ignoredEvents: IgnoredOrderEvent[] = [];

  for (const event of events) {
    if (seenEventIds.has(event.eventId)) {
      ignoredEvents.push({
        eventId: event.eventId,
        externalOrderId: event.externalOrderId,
        reason: 'duplicate',
      });
      continue;
    }
    seenEventIds.add(event.eventId);

    const current = orders.get(event.externalOrderId);
    if (!current) {
      orders.set(event.externalOrderId, toSnapshot(event));
      continue;
    }

    if (event.occurredAt < current.lastOccurredAt) {
      ignoredEvents.push({
        eventId: event.eventId,
        externalOrderId: event.externalOrderId,
        reason: 'stale',
      });
      continue;
    }

    if (!transitions[current.state].includes(event.state)) {
      ignoredEvents.push({
        eventId: event.eventId,
        externalOrderId: event.externalOrderId,
        reason: 'invalid_transition',
      });
      continue;
    }

    orders.set(event.externalOrderId, toSnapshot(event));
  }

  return {
    orders: [...orders.values()].sort((left, right) =>
      left.externalOrderId.localeCompare(right.externalOrderId)),
    ignoredEvents,
  };
};
