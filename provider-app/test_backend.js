const axios = require('axios');
(async () => {
  try {
    const api = axios.create({ baseURL: 'http://localhost:8002/api/v1' });
    
    console.log('Testing Sick Leave...');
    try {
      const res = await api.post('/provider/requests/req_123/sick-leave', { diagnosis: 'Flu' });
      console.log('Sick Leave:', res.data);
    } catch(e) { console.log('Sick Leave Failed:', e.response?.status, e.response?.data); }

    console.log('Testing Medical Report...');
    try {
      const res = await api.post('/provider/requests/req_123/medical-report', { findings: 'All good' });
      console.log('Medical Report:', res.data);
    } catch(e) { console.log('Medical Report Failed:', e.response?.status, e.response?.data); }

  } catch (err) {
    console.error(err);
  }
})();
