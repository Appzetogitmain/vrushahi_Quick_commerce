const http = require('http');

const req = http.request({
  hostname: 'localhost',
  port: 9000,
  path: '/api/v1/seller/customers',
  method: 'GET',
}, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Body: ${data}`);
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.end();
