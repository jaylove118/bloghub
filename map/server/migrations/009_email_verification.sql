ALTER TABLE users ADD COLUMN email_verified TINYINT(1) NOT NULL DEFAULT 0 AFTER email;
ALTER TABLE users ADD COLUMN verify_token VARCHAR(64) AFTER email_verified;
ALTER TABLE users ADD COLUMN reset_token VARCHAR(64) AFTER verify_token;
ALTER TABLE users ADD COLUMN reset_token_expires TIMESTAMP NULL AFTER reset_token;
