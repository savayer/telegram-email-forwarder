-- Разрешаем подключение пользователю telegram_bot с любого хоста
CREATE USER IF NOT EXISTS 'telegram_bot'@'%' IDENTIFIED BY 'password';
GRANT ALL PRIVILEGES ON telegram_bot.* TO 'telegram_bot'@'%';
FLUSH PRIVILEGES; 