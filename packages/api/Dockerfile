FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* .npmrc ./
COPY packages/api/package.json packages/api/
RUN pnpm install --frozen-lockfile --filter @cpedge/api

FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/api/node_modules ./packages/api/node_modules
COPY tsconfig.base.json ./
COPY packages/api/ packages/api/
WORKDIR /app/packages/api
RUN pnpm build

FROM node:20-alpine AS runner
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/api/node_modules ./packages/api/node_modules
COPY --from=build /app/packages/api/dist ./packages/api/dist
COPY packages/api/package.json packages/api/
COPY packages/api/knexfile.ts packages/api/
COPY packages/api/migrations packages/api/migrations
COPY packages/api/seeds packages/api/seeds
COPY tsconfig.base.json ./
WORKDIR /app/packages/api
EXPOSE 3002
CMD ["sh", "-c", "pnpm db:migrate && pnpm db:seed && pnpm start"]
