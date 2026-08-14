const axios = require('axios');

async function testLogin() {
  try {
    const res = await axios.post('http://localhost:8002/api/v1/auth/login', {
      identifier: 'doctor_test@nabd.com',
      password: 'Test1234'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('Login successful!');
    console.log('Token received:', res.data.token ? 'YES' : 'NO');
    console.log('User role:', res.data.user?.role || res.data.provider_type);
  } catch (error) {
    console.error('Login failed!');
    console.error(error.response ? error.response.data : error.message);
  }
}

testLogin();
