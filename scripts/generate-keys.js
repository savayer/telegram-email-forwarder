const crypto = require('crypto');

// Generate random encryption key and IV
function generateEncryptionKeys() {
  const key = crypto.randomBytes(32).toString('hex'); // 32 bytes = 256 bits
  const iv = crypto.randomBytes(16).toString('hex'); // 16 bytes = 128 bits
  return { key, iv };
}

// Generate and print the keys
const keys = generateEncryptionKeys();
console.log('Encryption Keys:');
console.log(`ENCRYPTION_KEY=${keys.key}`);
console.log(`ENCRYPTION_IV=${keys.iv}`);
console.log('\nAdd these to your .env file.');
