#!/bin/bash
set -e

# Проверяем, установлены ли переменные окружения
if [ -z "$MYSQL_PASSWORD" ]; then
  echo "MYSQL_PASSWORD is not set, using default password 'password'"
  DB_USER_PASSWORD="password"
else
  echo "Using password from MYSQL_PASSWORD environment variable"
  DB_USER_PASSWORD="$MYSQL_PASSWORD"
fi

# Ждем полной готовности MySQL
echo "Waiting for MySQL to be ready..."
until mysqladmin ping -h"localhost" -u"root" -p"$MYSQL_ROOT_PASSWORD" --silent; do
  echo "MySQL is not ready yet... waiting 5 seconds"
  sleep 5
done
echo "MySQL is ready!"

# Создаем пользователей для приложения с правильным паролем
echo "Creating database users with proper password..."
mysql -u root -p"$MYSQL_ROOT_PASSWORD" << EOF
-- Сначала удаляем пользователей если они существуют, чтобы избежать ошибок
DROP USER IF EXISTS 'telegram_bot'@'%';
DROP USER IF EXISTS 'telegram_bot'@'localhost';

-- Создаем пользователя с доступом от любого хоста
CREATE USER 'telegram_bot'@'%' IDENTIFIED BY '$DB_USER_PASSWORD';
GRANT ALL PRIVILEGES ON telegram_bot.* TO 'telegram_bot'@'%';

CREATE USER 'telegram_bot'@'localhost' IDENTIFIED BY '$DB_USER_PASSWORD';
GRANT ALL PRIVILEGES ON telegram_bot.* TO 'telegram_bot'@'localhost';

-- Применяем изменения прав
FLUSH PRIVILEGES;

-- Диагностическая информация (список созданных пользователей)
SELECT user, host FROM mysql.user WHERE user = 'telegram_bot';
EOF

echo "Database users setup completed successfully!" 