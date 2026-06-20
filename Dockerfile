# ── Coral Agent — Multi-stage Docker Build ──
# Stage 1: Dependencies + Build

FROM node:22-alpine AS builder

WORKDIR /app

# Install build deps required by better-sqlite3 native module
RUN apk add --no-cache python3 make g++

# Copy package files first (leverage Docker layer cache)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code
COPY tsconfig.json ./
COPY src/ ./src/
COPY scripts/ ./scripts/
COPY knowledge/wiki/ ./knowledge/wiki/

# TypeScript check (optional — can use tsx at runtime)
RUN npx tsc --noEmit 2>&1 | head -5 || true


# ── Stage 2: Production Runtime ──
FROM node:22-alpine AS runner

WORKDIR /app

# Install runtime build deps for better-sqlite3
RUN apk add --no-cache python3 make g++

# Copy node_modules from builder (includes native modules)
COPY --from=builder /app/node_modules ./node_modules

# Copy application code
COPY --from=builder /app/package.json ./
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/src ./src
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/knowledge ./knowledge

# Create required directories
RUN mkdir -p knowledge/memory knowledge/memory-store knowledge/raw-input knowledge/raw-md

# Expose ports (adjust as needed for your platform adapters)
# Telegram: uses outbound connections, no port needed
# Dashboard (optional): 8766
EXPOSE 8766

# Coral uses Telegram adapter (outbound) — no HTTP endpoint for health check.
# Docker's default process-alive monitor handles this.
# If Dashboard server is enabled later, add a health endpoint:
# HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
#   CMD node -e "require('http').get('http://localhost:8766/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Environment variables (mandatory)
ENV NODE_ENV=production
ENV CORAL_WARMUP=true

# Entry point
CMD ["npx", "tsx", "src/scripts/start-telegram.ts"]
