# Exact Patient read route contracts
## User/profile/family modules
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/users/users.controller.ts:6:@Controller('users')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/users/users.controller.ts:11:  @Get('me/profile')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/users/users.controller.ts:16:  @Patch('me/profile')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/users/users.controller.ts:21:  @Get('me/wishlist')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/users/users.controller.ts:26:  @Post('me/wishlist/:itemId')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/users/users.controller.ts:32:  @Get('me/notification-settings')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/users/users.controller.ts:37:  @Patch('me/notification-settings')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/users/users.controller.ts:42:  @Get('me/storage')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/users/users.controller.ts:47:  @Get('me/privacy-settings')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/users/users.controller.ts:52:  @Patch('me/privacy-settings')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/users/users.controller.ts:57:  @Get('me/security-settings')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/users/users.controller.ts:62:  @Patch('me/security-settings')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/users/users.controller.ts:67:  @Post('me/change-password')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/users/users.controller.ts:72:  @Get('me/sessions')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/users/users.controller.ts:76:  @Delete('me/sessions/:jti')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/users/users.controller.ts:80:  @Get()
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/users/users.controller.ts:86:  @Post(':id/toggle')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/users/users.controller.ts:92:  @Delete(':id')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/users/user.insurance.controller.ts:5:@Controller('user')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/users/user.insurance.controller.ts:12:  @Get('insurance')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/users/users.addresses.controller.ts:6:@Controller('users/me/addresses')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/users/users.addresses.controller.ts:11:  @Get()
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/users/users.addresses.controller.ts:17:  @Post()
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/users/users.addresses.controller.ts:34:  @Patch(':addressId')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/users/users.addresses.controller.ts:52:  @Delete(':addressId')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/users/users.insurance.controller.ts:5:@Controller('users/me/insurance')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/users/users.insurance.controller.ts:10:  @Get()
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/users/users.insurance.controller.ts:16:  @Post()
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/family/family.controller.ts:9:@Controller('family')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/family/family.controller.ts:16:  @Post('create')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/family/family.controller.ts:23:  @Get('my-group')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/family/family.controller.ts:29:  @Post('invite')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/family/family.controller.ts:35:  @Post('join')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/family/family.controller.ts:41:  @Post('leave')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/family/family.controller.ts:47:  @Patch('member/:userId/relation')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/family/family.controller.ts:53:  @Patch('member/:userId/permissions')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/family/family.controller.ts:59:  @Get('member-records/:userId')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/family/family.controller.ts:65:  @Delete('remove-member/:userId')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/family/family.controller.ts:71:  @Get('members')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/family/family.controller.ts:77:  @Get('member-health/:userId')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/family/family.controller.ts:83:  @Get('emergency-contacts')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/family/family.controller.ts:91:  @Post('calendar/event')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/family/family.controller.ts:97:  @Get('calendar')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/family/family.controller.ts:103:  @Delete('calendar/event/:eventId')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/family/family.controller.ts:111:  @Post('permissions/request')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/family/family.controller.ts:124:  @Get('permissions/pending')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/family/family.controller.ts:130:  @Put('permissions/respond/:requestId')
## Appointment/booking modules
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/doctors/doctors.module.ts:246:@Controller('doctors')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/doctors/doctors.module.ts:251:  @Public() @Get('') list(@Query() q: any) { return this.svc.listDoctors(q); }
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/doctors/doctors.module.ts:252:  @Public() @Get('specialties') specs() { return this.svc.specialties(); }
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/doctors/doctors.module.ts:253:  @Public() @Get(':id') detail(@Param('id') id: string) { return this.svc.doctorDetail(id); }
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/doctors/doctors.module.ts:254:  @Public() @Get(':id/slots') slots(@Param('id') id: string, @Query('date') date: string) { return this.svc.availableSlots(id, date); }
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/doctors/doctors.module.ts:256:  @Post('appointments') book(@Body() body: any, @CurrentUser() user: any) { return this.svc.book(user, body); }
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/doctors/doctors.module.ts:257:  @Get('appointments/mine') mine(@CurrentUser() user: any) { return this.svc.myAppointments(user); }
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/doctors/doctors.module.ts:258:  @Get('appointments/inbox') inbox(@Query('status') s: string | undefined, @CurrentUser() user: any) { return this.svc.doctorInbox(user, s); }
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/doctors/doctors.module.ts:259:  @Get('appointments/:id') ap(@Param('id') id: string, @CurrentUser() user: any) { return this.svc.appointmentDetail(user, id); }
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/doctors/doctors.module.ts:260:  @Patch('appointments/:id/state') tr(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) { return this.svc.transition(user, id, body.state); }
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/doctors/doctors.module.ts:262:  @Get('appointments/:id/messages') msgs(@Param('id') id: string, @CurrentUser() user: any) { return this.svc.listMessages(user, id); }
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/doctors/doctors.module.ts:263:  @Post('appointments/:id/messages') postMsg(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) { return this.svc.postMessage(user, id, body.text); }
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/doctors/doctors.module.ts:264:  @Post('appointments/:id/note') note(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) { return this.svc.upsertNote(user, id, body); }
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/doctors/doctors.module.ts:266:  @Patch('availability') avail(@Body() body: any, @CurrentUser() user: any) { return this.svc.setAvailability(user, body); }
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/doctors/doctors.module.ts:269:@Controller('notifications')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/doctors/doctors.module.ts:273:  @Get('') list(@CurrentUser() user: any) { return this.svc.listNotifications(user); }
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/doctors/doctors.module.ts:274:  @Get('unread-count') unread(@CurrentUser() user: any) { return this.svc.unreadCount(user); }
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/doctors/doctors.module.ts:275:  @Patch(':id/read') mr(@Param('id') id: string, @CurrentUser() user: any) { return this.svc.markRead(user, id); }
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/doctors/doctors.module.ts:276:  @Post('mark-all-read') mar(@CurrentUser() user: any) { return this.svc.markAllRead(user); }
## Hospital/facility modules
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/hospital/controllers/hospital.controller.ts:5:@Controller('hospital')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/hospital/controllers/hospital.controller.ts:10:  @Post('branches')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/hospital/controllers/hospital.controller.ts:15:  @Get('branches')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/hospital/controllers/hospital.controller.ts:20:  @Post('departments')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/hospital/controllers/hospital.controller.ts:25:  @Get('departments')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/hospital/controllers/hospital.controller.ts:30:  @Post('staff')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/hospital/controllers/hospital.controller.ts:35:  @Get('staff')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/hospital/controllers/hospital.controller.ts:40:  @Post('doctors/onboard')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/hospital/controllers/hospital.controller.ts:45:  @Get('appointments')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/hospital/controllers/hospital.controller.ts:53:  @Put('appointments/:id/status')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/hospital/controllers/hospital.controller.ts:58:  @Get('wallet')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/hospital/controllers/hospital.controller.ts:66:  @Post('invitations')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/hospital/controllers/hospital.controller.ts:71:  @Get('invitations')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/hospital/controllers/hospital.controller.ts:76:  @Get('invitations/inbox')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/hospital/controllers/hospital.controller.ts:81:  @Post('invitations/:id/respond')
