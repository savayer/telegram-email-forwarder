-- Сначала удаляем пользователя если он существует, чтобы избежать ошибок
DROP USER IF EXISTS 'telegram_bot'@'%';

-- Создаем пользователя с доступом от любого хоста (% wildcard)
CREATE USER 'telegram_bot'@'%' IDENTIFIED BY 'password';

-- Даем права только на базу данных telegram_bot (без GRANT OPTION для большей безопасности)
GRANT ALL PRIVILEGES ON telegram_bot.* TO 'telegram_bot'@'%';

-- Применяем изменения
FLUSH PRIVILEGES; 