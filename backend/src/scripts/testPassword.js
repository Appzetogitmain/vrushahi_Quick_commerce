const bcrypt = require('bcrypt');
const hash = '$2b$10$vT0PRE6B1t1l1pOQ67fwVuFeZsMXwRxoGlctvqr5sezrqf81khtPe';
bcrypt.compare('Admin@123', hash).then(res => console.log('Match with Admin@123:', res));
