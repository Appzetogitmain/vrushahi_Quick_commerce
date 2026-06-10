const axios = require('axios');

async function testRegister() {
  try {
    const response = await axios.post('http://localhost:9000/api/v1/auth/delivery/register', {
      name: "Test Rider",
      mobile: "9999999991",
      email: "testrider91@example.com",
      address: "123 Main St",
      city: "Test City",
      pincode: "123456",
      drivingLicense: "http://example.com/dl.pdf",
      nationalIdentityCard: "http://example.com/id.pdf"
    });
    console.log("Success:", response.data);
  } catch (error) {
    if (error.response) {
      console.log("Error Status:", error.response.status);
      console.log("Error Data:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.log("Error:", error.message);
    }
  }
}

testRegister();
