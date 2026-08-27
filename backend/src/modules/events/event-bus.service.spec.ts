import { EventBusService } from './event-bus.service';

describe('EventBusService durability boundary', () => {
  it('does not fan out when durable event persistence fails', async () => {
    const repository = { create: jest.fn(async () => { throw new Error('database unavailable'); }) };
    const emitter = { emit: jest.fn() };
    const service = new EventBusService(repository as any, emitter as any);
    await expect(service.emit({ type: 'service.confirmed', entity_type: 'order', entity_id: 'order-1' })).rejects.toThrow('database unavailable');
    expect(emitter.emit).not.toHaveBeenCalled();
  });

  it('fans out only after the event is persisted', async () => {
    const repository = { create: jest.fn(async () => ({ id: 'event-1' })) };
    const emitter = { emit: jest.fn() };
    const service = new EventBusService(repository as any, emitter as any);
    await expect(service.emit({ type: 'service.confirmed', entity_type: 'order', entity_id: 'order-1' })).resolves.toEqual({ duplicate: false });
    expect(emitter.emit).toHaveBeenCalledWith('service.confirmed', expect.objectContaining({ entity_id: 'order-1' }));
  });
});
