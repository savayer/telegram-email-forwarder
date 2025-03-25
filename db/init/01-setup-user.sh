#!/bin/bash
set -e

echo "Starting user setup script..."

# В Docker MySQL MYSQL_PASSWORD автоматически устанавливается для пользователя MYSQL_USER
# Но нам нужно убедиться, что у нас есть доступ с любого хоста
DB_USER_PASSWORD="${MYSQL_PASSWORD}"
echo "Using password from MYSQL_PASSWORD environment variable"

# Ждем полной готовности MySQL
echo "Waiting for MySQL to be ready..."
until mysqladmin ping -h"localhost" -u"root" -p"${MYSQL_ROOT_PASSWORD}" --silent; do
  echo "MySQL is not ready yet... waiting 5 seconds"
  sleep 5
done
echo "MySQL is ready!"

# Создаем пользователей для приложения с правильным паролем
echo "Creating database users with proper password..."
mysql -u root -p"${MYSQL_ROOT_PASSWORD}" << EOF
-- Удаляем пользователей если они существуют
DROP USER IF EXISTS 'telegram_bot'@'%';
DROP USER IF EXISTS 'telegram_bot'@'localhost';

-- Создаем пользователя заново
CREATE USER 'telegram_bot'@'%' IDENTIFIED BY '${DB_USER_PASSWORD}';
GRANT ALL PRIVILEGES ON telegram_bot.* TO 'telegram_bot'@'%';

CREATE USER 'telegram_bot'@'localhost' IDENTIFIED BY '${DB_USER_PASSWORD}';
GRANT ALL PRIVILEGES ON telegram_bot.* TO 'telegram_bot'@'localhost';

-- Применяем изменения прав
FLUSH PRIVILEGES;

-- Выводим информацию для отладки
SELECT 'Users created:' as message;
SELECT user, host FROM mysql.user WHERE user = 'telegram_bot';
EOF

echo "Database users setup completed successfully!" 