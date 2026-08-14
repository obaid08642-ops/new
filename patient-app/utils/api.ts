export const apiFetch = async (endpoint: string, options: any = {}) => {
  console.log(`[API Call] ${options.method || 'GET'} ${endpoint}`);
  if (options.body) console.log(`[Payload] ${options.body}`);
  
  await new Promise(resolve => setTimeout(resolve, 800));

  // 1. Providers List (with filters)
  if (endpoint.includes('/home-care/providers?')) {
    return [
      { id: 'nurse-1', name_ar: 'سارة أحمد', facility_name: 'مستشفى دله', gender: 'female', rating: 4.9, distance_km: 3.2, price: 150, available_now: true },
      { id: 'nurse-2', name_ar: 'محمد السيد', facility_name: 'مستوصف الحياة', gender: 'male', rating: 4.7, distance_km: 5.1, price: 130, available_now: false }
    ];
  }

  // 2. Single Provider Details
  if (endpoint.includes('/home-care/providers/') && !endpoint.includes('?')) {
    return {
      id: 'nurse-1',
      name: 'سارة أحمد',
      facility: 'مستشفى دله',
      degree: 'بكالوريوس تمريض متقدم - العناية المركزة',
      rating: 4.9,
      reviews_count: 120,
      price: 150,
      reviews: [{ id: 1, user: 'أم محمد', text: 'ممرضة ممتازة وحنونة جداً مع كبار السن.' }]
    };
  }

  // 3. Insurance Verification
  if (endpoint.includes('/insurance/verify')) {
    return { provider: 'بوبا (Bupa)', policy: 'BUP-9928172', coverage: 'فعال' };
  }

  // 4. Booking Submission
  if (endpoint.includes('/home-care/bookings')) {
    return { success: true, booking_id: 'BKG-9921', status: 'pending_approval' };
  }

  // 5. Tracking Data
  if (endpoint.includes('/tracking')) {
    return { 
      nurse_phone: '+966500000000', 
      hospital_lat: 24.7136, 
      hospital_lng: 46.6753, 
      eta_minutes: 15 
    };
  }

  return {};
};
