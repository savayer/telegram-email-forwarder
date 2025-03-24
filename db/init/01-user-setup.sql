-- Сначала удаляем пользователей если они существуют, чтобы избежать ошибок
DROP USER IF EXISTS 'telegram_bot'@'%';
DROP USER IF EXISTS 'telegram_bot'@'localhost';

-- Создаем пользователя с доступом от любого хоста (% wildcard)
CREATE USER 'telegram_bot'@'%' IDENTIFIED BY 'password';
CREATE USER 'telegram_bot'@'localhost' IDENTIFIED BY 'password';

-- Даем базовые права на базу данных telegram_bot
GRANT ALL PRIVILEGES ON telegram_bot.* TO 'telegram_bot'@'%';
GRANT ALL PRIVILEGES ON telegram_bot.* TO 'telegram_bot'@'localhost';

-- Применяем изменения
FLUSH PRIVILEGES;

-- Убедимся, что пользователь создан (для диагностики)
SELECT User, Host FROM mysql.user WHERE User = 'telegram_bot'; 