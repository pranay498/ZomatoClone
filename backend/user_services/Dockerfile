# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies for native modules (argon2, bcrypt, etc.)
RUN apk add --no-cache python3 make g++

# Copy dependency manifests
COPY package*.json ./

# Install all dependencies (including devDeps for build)
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Stage 2: Production stage
FROM node:20-alpine

WORKDIR /app

# Re-install runtime build tools (needed for native module recompile)
RUN apk add --no-cache python3 make g++

# Copy package manifests and install production deps only
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev

# Remove build tools after install to keep image small
RUN apk del python3 make g++

# Copy compiled app from builder
COPY --from=builder /app/dist ./dist

# Set user to non-root for security
USER node

# Expose port
EXPOSE 8001

# Start the service
CMD ["node", "dist/server.js"]
