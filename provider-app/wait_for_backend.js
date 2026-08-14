const axios = require('axios');
(async () => {
  const api = axios.create({ baseURL: 'http://localhost:8002/api/v1' });
  let ok = false;
  while (!ok) {
    try {
      await api.get('/health'); // Or any endpoint
      ok = true;
    } catch (e) {
      if (e.response && e.response.status !== undefined) ok = true; // Backend is responding
      else await new Promise(r => setTimeout(r, 1000));
    }
  }
  console.log("Backend is UP!");
  
  try {
    const res = await api.post('/provider/requests/req_123/sick-leave', { diagnosis: 'Flu' });
    console.log('Sick Leave:', res.data);
  } catch(e) { console.log('Sick Leave Failed:', e.response?.status, e.response?.data); }

  try {
    const res = await api.post('/provider/requests/req_123/medical-report', { findings: 'All good' });
    console.log('Medical Report:', res.data);
  } catch(e) { console.log('Medical Report Failed:', e.response?.status, e.response?.data); }

})();
