-- Этот файл будет заменен bash-скриптом
-- Пожалуйста, используйте 01-setup-user.sh вместо этого файла

-- Сначала удаляем пользователей если они существуют, чтобы избежать ошибок
DROP USER IF EXISTS 'telegram_bot'@'%';
DROP USER IF EXISTS 'telegram_bot'@'localhost';

-- Создаем пользователя для приложения и даем ему права на базу данных
-- При локальной разработке можно использовать пароль 'password' для простоты
-- В продакшене будет использоваться пароль из переменной DB_PASSWORD

-- Создаем пользователя с доступом от любого хоста
CREATE USER IF NOT EXISTS 'telegram_bot'@'%' IDENTIFIED BY 'password';
GRANT ALL PRIVILEGES ON telegram_bot.* TO 'telegram_bot'@'%';

CREATE USER IF NOT EXISTS 'telegram_bot'@'localhost' IDENTIFIED BY 'password';
GRANT ALL PRIVILEGES ON telegram_bot.* TO 'telegram_bot'@'localhost';

-- Применяем изменения прав
FLUSH PRIVILEGES;

-- Диагностическая информация (список созданных пользователей)
SELECT user, host FROM mysql.user WHERE user = 'telegram_bot'; 