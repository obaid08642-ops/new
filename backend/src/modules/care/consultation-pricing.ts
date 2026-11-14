import { BadRequestException } from '@nestjs/common';
import { consultationFees } from '../../common/provider-home-fees';

/** Platform fee schedule (SAR). Move to DB/config when admin dashboard supports it. */
export const PLATFORM_FEES = {
  service_fee: 15,           // flat service fee for all bookings
  home_visit_fee: 100,       // additional fee for home visits
  transportation_fee: 50,    // transportation surcharge for home visits
};

export type ConsultationServiceType = 'clinic' | 'video' | 'home';

/**
 * What a consultation costs: the doctor's price for the visit type, the platform fee, and for a home visit the home-visit and
 * transport fees (the doctor's own when set at registration, else the platform's). The booking and the quote both call this, so the
 * figure shown is the figure charged.
 */
export function consultationPricing(doctor: any, serviceType: ConsultationServiceType) {
  const priceMap: Record<ConsultationServiceType, number | undefined> = {
    clinic: doctor?.price_clinic,
    video: doctor?.price_online,
    home: doctor?.price_home,
  };
  const price = priceMap[serviceType];
  if (price === undefined || price === null) throw new BadRequestException(`no price configured for service_type=${serviceType}`);
  const { service_fee, home_visit_fee, transportation_fee } = consultationFees(doctor, serviceType, PLATFORM_FEES);
  return { price, service_fee, home_visit_fee, transportation_fee, total_price: price + service_fee + home_visit_fee + transportation_fee };
}
