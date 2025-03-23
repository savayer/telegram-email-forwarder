const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

// Required variables
const requiredVars = [
  'DB_HOST',
  'DB_PORT',
  'DB_USERNAME',
  'DB_DATABASE',
  'TELEGRAM_BOT_TOKEN',
  'ENCRYPTION_KEY',
  'ENCRYPTION_IV',
];

// Check if each required variable is defined
const missingVars = requiredVars.filter((varName) => {
  const value = process.env[varName];
  return value === undefined || value === '';
});

// Display results
if (missingVars.length === 0) {
  console.log('✅ All required environment variables are set.');

  // Additional checks for encryption keys
  const encryptionKey = process.env.ENCRYPTION_KEY;
  const encryptionIv = process.env.ENCRYPTION_IV;

  if (encryptionKey.length !== 64) {
    console.warn(
      '⚠️  Warning: ENCRYPTION_KEY should be 32 bytes (64 hex characters) long.',
    );
  }

  if (encryptionIv.length !== 32) {
    console.warn(
      '⚠️  Warning: ENCRYPTION_IV should be 16 bytes (32 hex characters) long.',
    );
  }

  if (process.env.TELEGRAM_BOT_TOKEN === 'your_telegram_bot_token') {
    console.warn(
      '⚠️  Warning: TELEGRAM_BOT_TOKEN is set to the default value. Please update it with your actual bot token.',
    );
  }
} else {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach((varName) => {
    console.error(`   - ${varName}`);
  });
  console.error('\nPlease update your .env file with these variables.');
}

// Check if DB_SYNCHRONIZE is true (might be dangerous in production)
if (
  process.env.DB_SYNCHRONIZE === 'true' &&
  process.env.NODE_ENV === 'production'
) {
  console.warn(
    '⚠️  Warning: DB_SYNCHRONIZE is set to true in production. This might cause data loss.',
  );
}
