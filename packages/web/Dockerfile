FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* .npmrc ./
COPY packages/web/package.json packages/web/
RUN pnpm install --frozen-lockfile --filter @cpedge/web

FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/web/node_modules ./packages/web/node_modules
COPY packages/web/ packages/web/
WORKDIR /app/packages/web
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app/packages/web/.next/standalone ./
COPY --from=build /app/packages/web/.next/static ./packages/web/.next/static
COPY --from=build /app/packages/web/public ./packages/web/public
WORKDIR /app/packages/web
EXPOSE 3001
ENV PORT=3001
CMD ["node", "server.js"]
