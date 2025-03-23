# Telegram Email Forwarder Bot

A NestJS application that forwards email notifications to Telegram and allows you to interact with them.

## Features

- Receive notifications in Telegram when new emails arrive
- Mark emails as read or spam directly from Telegram
- Securely store email credentials with encryption
- Support for multiple email accounts
- Easy setup through Telegram bot commands

## Prerequisites

- Node.js (v18+)
- MySQL database
- Telegram Bot Token (from [@BotFather](https://t.me/BotFather))

## Installation

### Option 1: Standard Setup

1. Clone the repository

   ```bash
   git clone https://github.com/yourusername/telegram-email-forwarder.git
   cd telegram-email-forwarder
   ```

2. Install dependencies

   ```bash
   npm install
   ```

3. Configure environment variables

   Copy the `.env.example` file to `.env` and update the values:

   ```bash
   cp .env.example .env
   ```

   Generate encryption keys by running:

   ```bash
   npm run generate:keys
   ```

   Update the `.env` file with your database credentials, Telegram bot token, and encryption keys.

4. Create the database

   ```bash
   npm run init:db
   ```

5. Build and run the application

   ```bash
   npm run build
   npm run start
   ```

   For development mode:

   ```bash
   npm run start:dev
   ```

### Option 2: Docker Setup

1. Clone the repository

   ```bash
   git clone https://github.com/yourusername/telegram-email-forwarder.git
   cd telegram-email-forwarder
   ```

2. Generate encryption keys

   ```bash
   npm run generate:keys
   ```

3. Create a `.env` file in the project root with the following content:

   ```
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token
   ENCRYPTION_KEY=your_encryption_key_from_step_2
   ENCRYPTION_IV=your_encryption_iv_from_step_2
   ```

   **Database user configuration:**

   - If you use `DB_USERNAME=root` in your `.env` file, it will only be used for connecting the application to MySQL, not for creating a MySQL user
   - In the Docker setup, MySQL automatically creates a user named `telegram_bot` for database operations

   Verify your environment variables:

   ```bash
   npm run check:env
   ```

4. Choose your Docker mode:

   **For development** (mounts local files, hot-reload):

   ```bash
   npm run docker:dev
   # or directly: docker-compose up app-dev
   ```

   **For production** (builds optimized image):

   ```bash
   npm run docker:prod
   # or directly: docker-compose --profile prod up -d app-prod db
   ```

   Both modes will start the application and a MySQL database.

   Other useful Docker commands:

   ```bash
   # View logs
   npm run docker:logs

   # Stop containers
   npm run docker:stop

   # Build production image without starting
   npm run docker:build
   ```

## Usage

1. Start the bot on Telegram by sending `/start`
2. Add an email account with `/addemail` and follow the prompts
3. View your connected email accounts with `/myemails`
4. Remove an email account with `/remove_email`

When you receive new emails, the bot will send you a notification with options to mark the email as read or spam.

## Bot Commands

- `/start` - Start the bot and see available commands
- `/help` - Show help information
- `/addemail` - Add a new email account
- `/myemails` - List your connected email accounts
- `/remove_email` - Remove an email account

## IMAP Configuration for Common Email Providers

### Gmail

- IMAP Server: imap.gmail.com
- IMAP Port: 993
- TLS: Yes
- Note: You need to enable "Less secure app access" or use an app password

### Outlook/Hotmail

- IMAP Server: outlook.office365.com
- IMAP Port: 993
- TLS: Yes

### Yahoo

- IMAP Server: imap.mail.yahoo.com
- IMAP Port: 993
- TLS: Yes

## Security Considerations

- Email passwords are stored encrypted in the database
- All database communication uses encryption keys from environment variables
- Consider using app-specific passwords instead of your main account password when possible

## Development Notes

### TypeScript Configuration

This project uses a relaxed TypeScript configuration due to compatibility issues between nestjs-telegraf and newer versions of NestJS/TypeScript. The `tsconfig.json` has the following settings to help with these compatibility issues:

```json
{
  "compilerOptions": {
    "skipLibCheck": true,
    "strict": false,
    "noImplicitAny": false
  }
}
```

If you encounter type errors during development, you can use type assertions (`as any`) as a workaround for the Telegraf context types.

### Docker Build Process

When building with Docker, TypeScript errors related to the Telegraf context types are bypassed by using a special build script that sets the `NODE_ENV` to production. This is a deliberate workaround for the incompatibility between the library types and current TypeScript version.

If you see TypeScript errors during the Docker build process, they will be ignored and the build will continue as expected in production mode.

## License

MIT
