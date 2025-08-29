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

# Copy backend package files
COPY backend/package.json ./

# Generate package-lock.json and install dependencies
RUN npm install --production

# Copy source code
COPY backend/ ./backend/
COPY contracts/ ./contracts/
# Note: do NOT copy .env or deployed-addresses.json at build time. Mount them at runtime or ensure they exist in build context when needed.

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

# Start the application (run migrations first)
CMD ["/bin/sh", "-c", "node backend/migrations/run_migrations.js || true; node backend/server.js"]