import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { CareService } from './care.service';
import { JwtAuthGuard, Public } from '../../common/auth.guard';

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
    @Query('accepts_insurance') accepts_insurance?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('sort') sort?: 'rating' | 'price_asc' | 'price_desc' | 'experience' | 'distance_asc' | 'distance_desc',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.listDoctors({
      specialty, service_type,
      available_today: available_today === 'true' || available_today === '1',
      q, city, facility_id, degree, insurance,
      accepts_insurance: accepts_insurance === 'true' ? true : accepts_insurance === 'false' ? false : undefined,
      lat: lat ? parseFloat(lat) : undefined,
      lng: lng ? parseFloat(lng) : undefined,
      sort,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Public()
  @Get('doctors/:id')
  doctor(@Param('id') id: string) {
    return this.svc.doctorById(id);
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
    return this.svc.listFacilities({ city, type, specialty, q, limit: limit ? parseInt(limit, 10) : 50 });
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
