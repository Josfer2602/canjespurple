const bcrypt = require('bcryptjs');

async function test() {
  const password = 'btl12345';
  const hash = await bcrypt.hash(password, 10);
  console.log('Hash produced:', hash);
  const isValid = await bcrypt.compare(password, hash);
  console.log('Is valid:', isValid);
}

test();
