import { ForbiddenException } from '@nestjs/common';
import { RadiologyProviderController } from './radiology-provider.controller';

function chain<T>(value: T) {
  return {
    sort: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(value),
  };
}

describe('RadiologyProviderController ownership', () => {
  const center = { _id: 'center-mongo-id', id: 'rad-center-sandbox' };
  const otherCenter = { _id: 'other-center-mongo-id', id: 'rad-center-other' };
  let bookingModel: any;
  let userModel: any;
  let controller: RadiologyProviderController;

  beforeEach(() => {
    bookingModel = {
      find: jest.fn(),
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };
    userModel = { findOne: jest.fn() };
    controller = new RadiologyProviderController(
      bookingModel as any,
      { find: jest.fn() } as any,
      { find: jest.fn() } as any,
      userModel as any,
    );
  });

  it('does not return another center assignment in the provider queue', async () => {
    const rows = [
      { id: 'pending', status: 'PENDING_ACCEPTANCE' },
      { id: 'mine', status: 'ACCEPTED', radiology_center_id: center._id },
    ];
    userModel.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(center) });
    bookingModel.find.mockReturnValue(chain(rows));

    const result = await controller.getProviderQueue('', { id: center.id, role: 'radiology' });

    expect(result).toEqual(rows);
    expect(bookingModel.find).toHaveBeenCalledWith({
      $or: [
        { status: 'PENDING_ACCEPTANCE' },
        { radiology_center_id: center._id, status: { $in: ['ACCEPTED', 'CHECKED_IN', 'SCANNING_COMPLETED'] } },
      ],
    });
  });

  it('rejects finalize for a booking assigned to another center', async () => {
    userModel.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(center) });
    bookingModel.findOne.mockReturnValue({
      id: 'booking-1',
      status: 'CHECKED_IN',
      radiology_center_id: otherCenter._id,
    });

    await expect(controller.finalizeScan(
      'booking-1',
      { reportText: 'x', files: [], pdfUrl: 's3://sandbox/report.pdf' },
      { id: center.id, role: 'radiology' },
    )).rejects.toBeInstanceOf(ForbiddenException);
    expect(bookingModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('rejects allocate for a patient-shaped caller even when the booking exists', async () => {
    userModel.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'patient-mongo-id', id: 'patient-1' }) });
    bookingModel.findOne.mockReturnValue({
      id: 'booking-1',
      status: 'ACCEPTED',
      radiology_center_id: center._id,
    });

    await expect(controller.allocateMachine(
      'booking-1',
      { machineId: 'machine-1' },
      { id: 'patient-1', role: 'patient' },
    )).rejects.toBeInstanceOf(ForbiddenException);
    expect(bookingModel.findOneAndUpdate).not.toHaveBeenCalled();
  });
});
