import { Injectable, ServiceUnavailableException } from '@nestjs/common';

/**
 * Legacy pharmacy_ops compatibility surface.
 *
 * The former implementation read and mutated the legacy Order collection,
 * accepted client-shaped price/quantity/substitution fields, and exposed raw
 * patient data. The reviewed Pharmacy journey is implemented by the canonical
 * broadcast → versioned offer → patient selection → allocation flow instead.
 * Keep this provider only for dependency compatibility and fail closed before
 * any repository lookup or mutation so a future controller cannot accidentally
 * resurrect the bypass.
 */
@Injectable()
export class PharmacyOpsService {
  private unavailable(): never {
    throw new ServiceUnavailableException('canonical_pharmacy_flow_required');
  }

  incoming(_pharmacy: any): never { return this.unavailable(); }
  preparing(_pharmacy: any): never { return this.unavailable(); }
  ready(_pharmacy: any): never { return this.unavailable(); }
  completed(_pharmacy: any): never { return this.unavailable(); }
  refillOrders(_pharmacy: any): never { return this.unavailable(); }
  basketReview(_pharmacy: any): never { return this.unavailable(); }
  awaitingApproval(_pharmacy: any): never { return this.unavailable(); }
  getInventory(_pharmacy: any): never { return this.unavailable(); }
  updateStock(_pharmacy: any, _medicineId: string, _stockQty: number, _available = true): never { return this.unavailable(); }
  addMedicineToInventory(_pharmacy: any, _body: any): never { return this.unavailable(); }
  orderDetail(_pharmacy: any, _id: string): never { return this.unavailable(); }
  markItemUnavailable(_pharmacy: any, _id: string, _idx: number): never { return this.unavailable(); }
  restoreItem(_pharmacy: any, _id: string, _idx: number): never { return this.unavailable(); }
  updateItemQty(_pharmacy: any, _id: string, _idx: number, _qty: number): never { return this.unavailable(); }
  substituteItem(_pharmacy: any, _id: string, _idx: number, _body: any): never { return this.unavailable(); }
  submitBasket(_pharmacy: any, _id: string, _note?: string): never { return this.unavailable(); }
  patientApproveBasket(_patient: any, _id: string): never { return this.unavailable(); }
  patientRejectBasket(_patient: any, _id: string, _reason?: string): never { return this.unavailable(); }
  setInsuranceStatus(_pharmacy: any, _id: string, _status: any, _reason?: string): never { return this.unavailable(); }
}
