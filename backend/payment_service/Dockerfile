# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install dependencies (clean install)
RUN npm install

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Stage 2: Production stage
FROM node:20-alpine

WORKDIR /app

# Copy built files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Set user to non-root for security
USER node

# Expose port
EXPOSE 8003

# Start the service
CMD ["node", "dist/server.js"]

