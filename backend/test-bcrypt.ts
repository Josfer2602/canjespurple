import bcrypt from 'bcryptjs';

async function test() {
  const pass = 'btl12345';
  const hash = '$2a$10$agqn65Z19yPAwsOsRfBVU.S0p6EzSeC6cLi20sa14wVaekWRNP6e2'; // El que generamos antes
  
  const match = await bcrypt.compare(pass, hash);
  console.log('Login Test (btl12345):', match ? 'SUCCESS' : 'FAILURE');
}

test();
