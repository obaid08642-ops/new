import { BadRequestException, Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { CareService } from './care.service';
import { CurrentUser, JwtAuthGuard, Public } from '../../common/auth.guard';
import { queryInt, queryNumber } from '../../common/safe-query';

@Controller('care')
@UseGuards(JwtAuthGuard)
export class CareController {
  constructor(private svc: CareService) {}

  @Public()
  @Get('specialties')
  specialties() {
    return this.svc.specialties();
  }

  @Public()
  @Get('insurance')
  insuranceCompanies() {
    return this.svc.insuranceCompanies();
  }

  @Public()
  @Get('degrees')
  degrees() {
    return this.svc.academicDegrees();
  }

  @Public()
  @Get('doctors')
  doctors(
    @Query('specialty') specialty?: string,
    @Query('service_type') service_type?: 'clinic' | 'video' | 'home',
    @Query('available_today') available_today?: string,
    @Query('q') q?: string,
    @Query('city') city?: string,
    @Query('facility_id') facility_id?: string,
    @Query('degree') degree?: string,
    @Query('insurance') insurance?: string,
    @Query('insurance_class') insuranceClass?: string,
    @Query('payment') payment?: string,
    @Query('accepts_insurance') accepts_insurance?: string,
    @Query('gender') gender?: string,
    @Query('price_min') price_min?: string,
    @Query('price_max') price_max?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('sort') sort?: 'rating' | 'price_asc' | 'price_desc' | 'experience' | 'distance' | 'distance_asc' | 'distance_desc',
    @Query('type') type?: 'clinic' | 'video' | 'home_visit',
    @Query('available_within') available_within?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @CurrentUser() user?: any,
  ) {
    // Q-13: a value that is not a number is refused, not silently ignored (queryNumber returns undefined).
    const availableWithin = available_within !== undefined ? queryNumber(available_within) : undefined;
    if (available_within !== undefined && availableWithin === undefined) {
      throw new BadRequestException('available_within must be a positive whole number of minutes');
    }
    return this.svc.listDoctors({
      specialty, service_type: service_type ?? (type === 'home_visit' ? 'home' : type as any) ?? undefined,
      nearest_type: type,
      available_today: available_today === 'true' || available_today === '1',
      q, city, facility_id, degree, insurance,
      insuranceClass,
      paymentInsurance: payment === 'insurance',
      accepts_insurance: accepts_insurance === 'true' ? true : accepts_insurance === 'false' ? false : undefined,
      gender: gender === 'male' || gender === 'female' ? gender : undefined,
      price_min: price_min === undefined ? undefined : queryNumber(price_min),
      price_max: price_max === undefined ? undefined : queryNumber(price_max),
      lat: lat === undefined ? undefined : queryNumber(lat),
      lng: lng === undefined ? undefined : queryNumber(lng),
      sort,
      available_type: type,
      available_within: availableWithin,
      page: queryInt(page, 1),
      limit: queryInt(limit, 20),
      user,
    });
  }

  @Public()
  @Get('doctors/:id')
  doctor(@Param('id') id: string) {
    return this.svc.doctorById(id);
  }

  /**
   * 2-web#3 / 2-app#13: a public doctor's photo or clinic photo (the addresses toPublicDoctor writes). Only that doctor's
   * own images, only while the doctor is public; bytes from the local store, else a short redirect to the stored file.
   */
  @Public()
  @Get('doctors/:id/media/:mediaId')
  async doctorMedia(@Param('id') id: string, @Param('mediaId') mediaId: string, @Res() res: Response) {
    const image = await this.svc.doctorMedia(id, mediaId);
    res.setHeader('Cache-Control', 'public, max-age=300');
    if (image.data) {
      res.setHeader('Content-Type', image.mime);
      return res.send(image.data);
    }
    return res.redirect(302, image.url as string);
  }

  @Public()
  @Get('doctors/:id/slots')
  slots(
    @Param('id') id: string,
    @Query('date') date: string,
    @Query('service_type') service_type: 'clinic' | 'video' | 'home',
  ) {
    return this.svc.doctorSlots(id, date, service_type);
  }

  @Public()
  @Get('search')
  search(@Query('q') q: string) {
    return this.svc.smartSearch(q || '');
  }

  // Facilities
  @Public()
  @Get('facilities')
  facilities(
    @Query('city') city?: string,
    @Query('type') type?: string,
    @Query('specialty') specialty?: string,
    @Query('q') q?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.listFacilities({ city, type, specialty, q, limit: queryInt(limit, 50) });
  }

  @Public()
  @Get('facilities/:id')
  facility(@Param('id') id: string) {
    return this.svc.facilityById(id);
  }
}

/** Compatibility contract surface for public patient-web discovery. */
@Controller('public')
export class PublicSpecialtiesController {
  constructor(private svc: CareService) {}

  @Public()
  @Get('specialties')
  specialties() {
    return this.svc.specialties();
  }
}
