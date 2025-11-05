# Multi-stage Docker build for Live Trading Bot
# Production deployment configuration

# Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY bun.lock* ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Generate Prisma client with correct binary targets
RUN npx prisma generate

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S trading-bot -u 1001

# Set working directory
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder --chown=trading-bot:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=trading-bot:nodejs /app/.next ./.next
COPY --from=builder --chown=trading-bot:nodejs /app/public ./public
COPY --from=builder --chown=trading-bot:nodejs /app/package*.json ./
COPY --from=builder --chown=trading-bot:nodejs /app/lib ./lib
COPY --from=builder --chown=trading-bot:nodejs /app/app ./app
COPY --from=builder --chown=trading-bot:nodejs /app/components ./components
COPY --from=builder --chown=trading-bot:nodejs /app/prisma ./prisma

# Create directories for logs and backups with proper permissions
RUN mkdir -p /app/logs /app/backups && \
    chown -R trading-bot:nodejs /app/logs /app/backups && \
    chmod 755 /app/logs /app/backups

# Switch to non-root user
USER trading-bot

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["npm", "start"]