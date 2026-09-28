import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ReturnsService } from './returns.service';

describe('ReturnsService service-booking returns (LJ-05)', () => {
  function setup(booking: any, transactions: any[] = []) {
    const repo = { create: jest.fn().mockImplementation(async (doc: any) => ({ toObject: () => ({ id: 'return-1', ...doc }) })) };
    const refundExec = { execute: jest.fn() };
    const collections: Record<string, any> = {
      appointments: { findOne: jest.fn().mockResolvedValue(booking), find: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), toArray: jest.fn().mockResolvedValue([]) }) },
      labbookings: { findOne: jest.fn().mockResolvedValue(null), find: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), toArray: jest.fn().mockResolvedValue([]) }) },
      radiologybookings: { findOne: jest.fn().mockResolvedValue(null), find: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), toArray: jest.fn().mockResolvedValue([]) }) },
      homecarebookings: { findOne: jest.fn().mockResolvedValue(null), find: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), toArray: jest.fn().mockResolvedValue([]) }) },
      transactions: { find: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue(transactions) }) },
    };
    const conn = { collection: jest.fn((name: string) => collections[name] || { findOne: jest.fn() }) };
    const service = new ReturnsService(repo as any, {} as any, refundExec as any, conn as any);
    return { service, repo, refundExec, collections };
  }

  it('resolves a completed owned consultation amount from the booking, not client input', async () => {
    const { service, repo } = setup({
      id: 'appt-1', patient_id: 'patient-1', status: 'COMPLETED', payment_status: 'paid', total_price: 300,
    }, [{ amount: 40 }]);

    const result = await service.createRequest('patient-1', {
      serviceType: 'consultation', orderId: 'appt-1', reason: 'service issue', amount: 1,
    });

    expect(result.amount).toBe(300);
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ booking_kind: 'consultation', amount: 300 }));
  });

  it('rejects bookings owned by another patient', async () => {
    const { service, repo } = setup({
      id: 'appt-1', patient_id: 'patient-other', status: 'COMPLETED', payment_status: 'paid', total_price: 300,
    });

    await expect(service.createRequest('patient-1', {
      serviceType: 'consultation', orderId: 'appt-1', reason: 'service issue',
    })).rejects.toBeInstanceOf(ForbiddenException);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('rejects a service booking that is not completed or paid', async () => {
    const { service, repo } = setup({
      id: 'appt-1', patient_id: 'patient-1', status: 'CONFIRMED', payment_status: 'pending', total_price: 300,
    });

    await expect(service.createRequest('patient-1', {
      serviceType: 'consultation', orderId: 'appt-1', reason: 'service issue',
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('lists only completed patient bookings with a collected amount for the picker', async () => {
    const appointments = [{ id: 'appt-1', patient_id: 'patient-1', status: 'COMPLETED', payment_status: 'paid', total_price: 300 }];
    const appointmentCursor = { sort: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), toArray: jest.fn().mockResolvedValue(appointments) };
    const transactionCursor = { toArray: jest.fn().mockResolvedValue([{ amount: 300 }]) };
    const conn = {
      collection: jest.fn((name: string) => name === 'appointments'
        ? { find: jest.fn().mockReturnValue(appointmentCursor) }
        : name === 'transactions'
          ? { find: jest.fn().mockReturnValue(transactionCursor) }
          : { findOne: jest.fn().mockResolvedValue(null) }),
    };
    const service = new ReturnsService({} as any, {} as any, {} as any, conn as any);

    await expect(service.eligibleBookings('patient-1', 'consultation')).resolves.toEqual([
      expect.objectContaining({ id: 'appt-1', booking_kind: 'consultation', amount: 300 }),
    ]);
  });
});
