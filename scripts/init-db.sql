-- Create the email_forwarder database if it doesn't exist
CREATE DATABASE IF NOT EXISTS email_forwarder;

-- Switch to the email_forwarder database
USE email_forwarder;

-- Create the email_accounts table
CREATE TABLE IF NOT EXISTS email_accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  chatId INT NOT NULL,
  email VARCHAR(255) NOT NULL,
  password TEXT NOT NULL,
  isActive BOOLEAN DEFAULT TRUE,
  imapHost VARCHAR(255),
  imapPort INT,
  smtpHost VARCHAR(255),
  smtpPort INT,
  useTls BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_userId (userId),
  INDEX idx_chatId (chatId),
  INDEX idx_email (email)
);

-- Add instructions
-- To run this script: mysql -u root -p < scripts/init-db.sql 