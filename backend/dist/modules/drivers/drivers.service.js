"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DriversService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const enums_1 = require("../../common/enums");
const events_1 = require("../../common/events");
const realtime_service_1 = require("../realtime/realtime.service");
const user_repository_1 = require("./repositories/user.repository");
const drivershift_repository_1 = require("./repositories/drivershift.repository");
const order_repository_1 = require("./repositories/order.repository");
const delivery_repository_1 = require("./repositories/delivery.repository");
let DriversService = class DriversService {
    constructor(userModel, shiftModel, orderModel, delModel, events, realtime) {
        this.userModel = userModel;
        this.shiftModel = shiftModel;
        this.orderModel = orderModel;
        this.delModel = delModel;
        this.events = events;
        this.realtime = realtime;
    }
    async goOnline(driver, location) {
        if (driver.role !== enums_1.UserRole.DELIVERY)
            throw new common_1.ForbiddenException('Driver role required');
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
    async goOffline(driver) {
        const shift = await this.shiftModel.findOneAndUpdate({ driver_id: driver.id, status: { $ne: 'offline' } }, { $set: { status: 'offline', ended_at: new Date() } }, { new: true, sort: { createdAt: -1 } });
        this.events.emit('driver.offline', { driver_id: driver.id });
        return shift?.toObject() || null;
    }
    async getCurrentShift(driver_id) {
        return this.shiftModel.findOne({ driver_id, status: { $ne: 'offline' } }, { _id: 0, __v: 0 }).sort({ createdAt: -1 });
    }
    async getDriverLocation(driverId) {
        const shift = await this.shiftModel.findOne({ driver_id: driverId, status: 'online' }).sort({ createdAt: -1 });
        if (shift && shift.current_location) {
            return shift.current_location;
        }
        throw new common_1.NotFoundException('NO_DRIVER_LOCATION');
    }
    async updateLocation(driver, loc) {
        const shift = await this.shiftModel.findOneAndUpdate({ driver_id: driver.id, status: { $ne: 'offline' } }, { $set: { current_location: { ...loc, at: new Date() } } }, { new: true, sort: { createdAt: -1 } });
        if (shift) {
            this.events.emit('driver.location_updated', { driver_id: driver.id, location: shift.current_location });
            this.realtime.emitToRole('admin', 'driver_location', { driver_id: driver.id, location: shift.current_location });
            const dels = await this.delModel.find({ driver_id: driver.id, state: { $in: ['picked_up', 'en_route'] } });
            for (const d of dels) {
                this.realtime.emitToChannel(`order:${d.order_id}`, 'driver_location', { order_id: d.order_id, location: shift.current_location });
            }
        }
        return { ok: true };
    }
    async availableOrders(driver) {
        return this.orderModel.find({ state: enums_1.OrderState.READY_FOR_DISPATCH, delivery_id: { $exists: false } }, { _id: 0, __v: 0 }).sort({ createdAt: 1 }).limit(20);
    }
    async myActive(driver) {
        const dels = await this.delModel.find({ driver_id: driver.id, state: { $nin: ['delivered', 'cancelled'] } });
        const orderIds = dels.map((d) => d.order_id);
        return this.orderModel.find({ id: { $in: orderIds } }, { _id: 0, __v: 0 });
    }
    async myHistory(driver, limit = 30) {
        const dels = await this.delModel.find({ driver_id: driver.id, state: 'delivered' }).sort({ updatedAt: -1 }).limit(limit);
        const orderIds = dels.map((d) => d.order_id);
        return this.orderModel.find({ id: { $in: orderIds } }, { _id: 0, __v: 0 });
    }
    async acceptOrder(driver, order_id) {
        const order = await this.orderModel.findOne({ id: order_id });
        if (!order)
            throw new common_1.NotFoundException();
        if (order.state !== enums_1.OrderState.READY_FOR_DISPATCH)
            throw new common_1.BadRequestException('Order not ready for dispatch');
        if (order.delivery_id)
            throw new common_1.BadRequestException('Already assigned');
        let del = await this.delModel.findOne({ order_id });
        if (!del)
            del = await this.delModel.create({ order_id, pharmacy_id: order.pharmacy_id });
        del.driver_id = driver.id;
        del.state = enums_1.DeliveryState.ASSIGNED;
        await del.save();
        order.delivery_id = del.id;
        order.state = enums_1.OrderState.ASSIGNED_TO_DELIVERY;
        order.state_history.push({ from: enums_1.OrderState.READY_FOR_DISPATCH, to: enums_1.OrderState.ASSIGNED_TO_DELIVERY, by_user_id: driver.id, by_role: 'delivery', at: new Date() });
        await order.save();
        this.events.emit(events_1.EVENTS.DELIVERY_ASSIGNED, { order_id, driver_id: driver.id, patient_id: order.patient_id, pharmacy_id: order.pharmacy_id });
        this.events.emit(events_1.EVENTS.ORDER_ASSIGNED, { order_id, driver_id: driver.id, patient_id: order.patient_id, pharmacy_id: order.pharmacy_id });
        return order.toObject();
    }
    async pickupOrder(driver, order_id) {
        const order = await this.orderModel.findOne({ id: order_id });
        if (!order || order.delivery_id == null)
            throw new common_1.NotFoundException();
        const del = await this.delModel.findOne({ order_id, driver_id: driver.id });
        if (!del)
            throw new common_1.ForbiddenException();
        del.state = enums_1.DeliveryState.PICKED_UP;
        await del.save();
        order.state = enums_1.OrderState.OUT_FOR_DELIVERY;
        order.state_history.push({ from: enums_1.OrderState.ASSIGNED_TO_DELIVERY, to: enums_1.OrderState.OUT_FOR_DELIVERY, by_user_id: driver.id, by_role: 'delivery', at: new Date() });
        await order.save();
        this.events.emit(events_1.EVENTS.ORDER_OUT_FOR_DELIVERY, { order_id, patient_id: order.patient_id, pharmacy_id: order.pharmacy_id });
        return order.toObject();
    }
    async deliverOrder(driver, order_id, proof) {
        const order = await this.orderModel.findOne({ id: order_id });
        if (!order)
            throw new common_1.NotFoundException();
        const del = await this.delModel.findOne({ order_id, driver_id: driver.id });
        if (!del)
            throw new common_1.ForbiddenException();
        del.state = enums_1.DeliveryState.DELIVERED;
        if (proof?.signature)
            del.signature = proof.signature;
        if (proof?.photo)
            del.photo_proof = proof.photo;
        del.delivered_at = new Date();
        await del.save();
        order.state = enums_1.OrderState.DELIVERED;
        order.state_history.push({ from: enums_1.OrderState.OUT_FOR_DELIVERY, to: enums_1.OrderState.DELIVERED, by_user_id: driver.id, by_role: 'delivery', at: new Date() });
        await order.save();
        await this.shiftModel.updateOne({ driver_id: driver.id, status: { $ne: 'offline' } }, { $inc: { deliveries_completed: 1, earnings: 15 } });
        this.events.emit(events_1.EVENTS.ORDER_DELIVERED, { order_id, patient_id: order.patient_id, pharmacy_id: order.pharmacy_id });
        return order.toObject();
    }
    async allOnline() {
        return this.shiftModel.find({ status: { $ne: 'offline' } }, { _id: 0, __v: 0 }).sort({ createdAt: -1 });
    }
};
exports.DriversService = DriversService;
exports.DriversService = DriversService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('UserRepository')),
    __param(1, (0, common_1.Inject)('DriverShiftRepository')),
    __param(2, (0, common_1.Inject)('OrderRepository')),
    __param(3, (0, common_1.Inject)('DeliveryRepository')),
    __metadata("design:paramtypes", [user_repository_1.UserRepository,
        drivershift_repository_1.DriverShiftRepository,
        order_repository_1.OrderRepository,
        delivery_repository_1.DeliveryRepository,
        event_emitter_1.EventEmitter2,
        realtime_service_1.RealtimeService])
], DriversService);
//# sourceMappingURL=drivers.service.js.map