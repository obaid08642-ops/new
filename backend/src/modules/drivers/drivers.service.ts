import { Injectable, BadRequestException, NotFoundException, ForbiddenException, Inject } from '@nestjs/common';
import { Model } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { User, UserDocument } from '../../schemas/user.schema';
import { DriverShift, DriverShiftDocument } from '../../schemas/driver-shift.schema';
import { Order, OrderDocument } from '../../schemas/order.schema';
import { Delivery, DeliveryDocument } from '../../schemas/delivery.schema';
import { OrderState, DeliveryState, UserRole } from '../../common/enums';
import { EVENTS } from '../../common/events';
import { RealtimeService } from '../realtime/realtime.service';
import { UserRepository } from "./repositories/user.repository";
import { DriverShiftRepository } from "./repositories/drivershift.repository";
import { OrderRepository } from "./repositories/order.repository";
import { DeliveryRepository } from "./repositories/delivery.repository";

@Injectable()
export class DriversService {
  constructor(
    @Inject('UserRepository') private userModel: UserRepository,
    @Inject('DriverShiftRepository') private shiftModel: DriverShiftRepository,
    @Inject('OrderRepository') private orderModel: OrderRepository,
    @Inject('DeliveryRepository') private delModel: DeliveryRepository,
    private events: EventEmitter2,
    private realtime: RealtimeService,
  ) {}

  // ============ SHIFT MANAGEMENT ============
  async goOnline(driver: any, location?: { lat: number; lng: number }) {
    if (driver.role !== UserRole.DELIVERY) throw new ForbiddenException('Driver role required');
    // Close any existing open shift first
    await this.shiftModel.updateMany({ driver_id: driver.id, status: { $ne: 'offline' } }, { $set: { status: 'offline', ended_at: new Date() } });
    const shift = await this.shiftModel.create({
      driver_id: driver.id,
      status: 'online',
      started_at: new Date(),
      current_location: location ? { ...location, at: new Date() } : undefined,
    });
    this.events.emit('driver.online', { driver_id: driver.id, shift_id: shift.id });
    return shift.toObject();
  }

  async goOffline(driver: any) {
    const shift = await this.shiftModel.findOneAndUpdate(
      { driver_id: driver.id, status: { $ne: 'offline' } },
      { $set: { status: 'offline', ended_at: new Date() } },
      { new: true, sort: { createdAt: -1 } },
    );
    this.events.emit('driver.offline', { driver_id: driver.id });
    return shift?.toObject() || null;
  }

  async getCurrentShift(driver_id: string) {
    return this.shiftModel.findOne({ driver_id, status: { $ne: 'offline' } }, { _id: 0, __v: 0 }).sort({ createdAt: -1 });
  }

  // ============ LIVE LOCATION ============
  async getDriverLocation(driverId: string) {
    const shift = await this.shiftModel.findOne({ driver_id: driverId, status: 'online' }).sort({ createdAt: -1 });
    if (shift && shift.current_location) {
      return shift.current_location;
    }
    throw new NotFoundException('NO_DRIVER_LOCATION');
  }

  async updateLocation(driver: any, loc: { lat: number; lng: number; heading?: number; speed?: number }) {
    const shift = await this.shiftModel.findOneAndUpdate(
      { driver_id: driver.id, status: { $ne: 'offline' } },
      { $set: { current_location: { ...loc, at: new Date() } } },
      { new: true, sort: { createdAt: -1 } },
    );
    if (shift) {
      this.events.emit('driver.location_updated', { driver_id: driver.id, location: shift.current_location });
      // Push to admin (live tracking) and to any patient watching their order assigned to this driver
      this.realtime.emitToRole('admin', 'driver_location', { driver_id: driver.id, location: shift.current_location });
      // For all active deliveries of this driver, push to order:* room
      const dels = await this.delModel.find({ driver_id: driver.id, state: { $in: ['picked_up', 'en_route'] as any } });
      for (const d of dels) {
        this.realtime.emitToChannel(`order:${d.order_id}`, 'driver_location', { order_id: d.order_id, location: shift.current_location });
      }
    }
    return { ok: true };
  }

  // ============ ORDER QUEUE ============
  /** Orders ready_for_dispatch with no driver assigned and pharmacy lacking own drivers. */
  async availableOrders(driver: any) {
    return this.orderModel.find(
      { state: OrderState.READY_FOR_DISPATCH, delivery_id: { $exists: false } },
      { _id: 0, __v: 0 },
    ).sort({ createdAt: 1 }).limit(20);
  }

  async myActive(driver: any) {
    const dels = await this.delModel.find({ driver_id: driver.id, state: { $nin: ['delivered', 'cancelled'] as any } });
    const orderIds = dels.map((d) => d.order_id);
    return this.orderModel.find({ id: { $in: orderIds } }, { _id: 0, __v: 0 });
  }

  async myHistory(driver: any, limit = 30) {
    const dels = await this.delModel.find({ driver_id: driver.id, state: 'delivered' as any }).sort({ updatedAt: -1 }).limit(limit);
    const orderIds = dels.map((d) => d.order_id);
    return this.orderModel.find({ id: { $in: orderIds } }, { _id: 0, __v: 0 });
  }

  async acceptOrder(driver: any, order_id: string) {
    const order = await this.orderModel.findOne({ id: order_id });
    if (!order) throw new NotFoundException();
    if (order.state !== OrderState.READY_FOR_DISPATCH) throw new BadRequestException('Order not ready for dispatch');
    if (order.delivery_id) throw new BadRequestException('Already assigned');
    let del = await this.delModel.findOne({ order_id });
    if (!del) del = await this.delModel.create({ order_id, pharmacy_id: order.pharmacy_id });
    del.driver_id = driver.id; del.state = DeliveryState.ASSIGNED;
    await del.save();
    order.delivery_id = del.id;
    order.state = OrderState.ASSIGNED_TO_DELIVERY;
    order.state_history.push({ from: OrderState.READY_FOR_DISPATCH, to: OrderState.ASSIGNED_TO_DELIVERY, by_user_id: driver.id, by_role: 'delivery', at: new Date() } as any);
    await order.save();
    this.events.emit(EVENTS.DELIVERY_ASSIGNED, { order_id, driver_id: driver.id, patient_id: order.patient_id, pharmacy_id: order.pharmacy_id });
    this.events.emit(EVENTS.ORDER_ASSIGNED, { order_id, driver_id: driver.id, patient_id: order.patient_id, pharmacy_id: order.pharmacy_id });
    return order.toObject();
  }

  async pickupOrder(driver: any, order_id: string) {
    const order = await this.orderModel.findOne({ id: order_id });
    if (!order || order.delivery_id == null) throw new NotFoundException();
    const del = await this.delModel.findOne({ order_id, driver_id: driver.id });
    if (!del) throw new ForbiddenException();
    del.state = DeliveryState.PICKED_UP; await del.save();
    order.state = OrderState.OUT_FOR_DELIVERY;
    order.state_history.push({ from: OrderState.ASSIGNED_TO_DELIVERY, to: OrderState.OUT_FOR_DELIVERY, by_user_id: driver.id, by_role: 'delivery', at: new Date() } as any);
    await order.save();
    this.events.emit(EVENTS.ORDER_OUT_FOR_DELIVERY, { order_id, patient_id: order.patient_id, pharmacy_id: order.pharmacy_id });
    return order.toObject();
  }

  async deliverOrder(driver: any, order_id: string, proof?: { signature?: string; photo?: string }) {
    const order = await this.orderModel.findOne({ id: order_id });
    if (!order) throw new NotFoundException();
    const del = await this.delModel.findOne({ order_id, driver_id: driver.id });
    if (!del) throw new ForbiddenException();
    del.state = DeliveryState.DELIVERED;
    if (proof?.signature) del.signature = proof.signature;
    if (proof?.photo) del.photo_proof = proof.photo;
    del.delivered_at = new Date();
    await del.save();
    order.state = OrderState.DELIVERED;
    order.state_history.push({ from: OrderState.OUT_FOR_DELIVERY, to: OrderState.DELIVERED, by_user_id: driver.id, by_role: 'delivery', at: new Date() } as any);
    await order.save();
    // Update shift stats
    await this.shiftModel.updateOne({ driver_id: driver.id, status: { $ne: 'offline' } }, { $inc: { deliveries_completed: 1, earnings: 15 } });
    this.events.emit(EVENTS.ORDER_DELIVERED, { order_id, patient_id: order.patient_id, pharmacy_id: order.pharmacy_id });
    return order.toObject();
  }

  // ============ ADMIN ============
  async allOnline() {
    return this.shiftModel.find({ status: { $ne: 'offline' } }, { _id: 0, __v: 0 }).sort({ createdAt: -1 });
  }
}
