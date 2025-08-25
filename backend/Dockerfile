# Backend Dockerfile for ChainTrust API
FROM node:18-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    curl

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install dependencies
RUN npm ci --only=production --omit=dev

# Copy source code
COPY backend/ ./backend/
COPY contracts/ ./contracts/
COPY deployed-addresses.json ./
COPY hardhat.config.js ./
COPY .env ./

# Create uploads directory
RUN mkdir -p uploads

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S chaintrust -u 1001

# Change ownership of app directory
RUN chown -R chaintrust:nodejs /app
USER chaintrust

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Start the application
CMD ["node", "backend/server.js"]