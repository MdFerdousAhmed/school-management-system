# Multi-stage Docker build for Student Management System
FROM node:20-slim AS builder

WORKDIR /app

# Copy root and workspace definitions
COPY package.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/

# Install dependencies (install build-essential for better-sqlite3 native bindings)
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
RUN npm install --prefix server
RUN npm install --prefix client

# Copy application source code
COPY client/ ./client/
COPY server/ ./server/

# Build client React frontend
RUN npm run build --prefix client

# Production runtime stage
FROM node:20-slim AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Copy built server and dependencies
COPY --from=builder /app/package.json ./
COPY --from=builder /app/server ./server
COPY --from=builder /app/client/dist ./client/dist

EXPOSE 3000

CMD ["node", "server/index.js"]
