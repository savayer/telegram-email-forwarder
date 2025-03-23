FROM node:20-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build the application with production settings to bypass type checking
RUN npm run build:docker

# Remove development dependencies
RUN npm prune --production --legacy-peer-deps

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy built files and production dependencies
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./
COPY --from=build /app/scripts ./scripts

# Environment configuration
ENV NODE_ENV=production
ENV PORT=3000

# Expose the port
EXPOSE 3000

# Command to run the application
CMD ["node", "dist/main"] 