# ─────────────────────────────────────────────────────────────────
# Stage 1: Build the Vite React app
# ─────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Accept VITE_ env vars at build time (baked into the JS bundle)
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_RAZORPAY_KEY_ID
# API base URL — in production this points to the EC2 public IP / domain via Nginx
ARG VITE_AUTH_SERVICE_URL=http://YOUR_EC2_IP

ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_RAZORPAY_KEY_ID=$VITE_RAZORPAY_KEY_ID
ENV VITE_AUTH_SERVICE_URL=$VITE_AUTH_SERVICE_URL

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ─────────────────────────────────────────────────────────────────
# Stage 2: Serve with Nginx
# ─────────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom SPA config (handles React Router client-side routing)
COPY nginx-spa.conf /etc/nginx/conf.d/default.conf

# Copy built static assets
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
