# Builds and runs the pundok-editor server (packages/server) in a container.
#
# The server lives in a monorepo that shares a single package.json/node_modules
# with the other packages (common, main, preload, renderer), so the whole
# repository is needed at build time to compile packages/common and
# packages/server.
#
# Build (from the repository root):
#   docker build -f packages/server/Dockerfile -t pundok-editor-server .
# Run:
#   docker run -p 3000:3000 pundok-editor-server

FROM node:22-slim AS build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build:common && npm run build:renderer && npm run build:server

FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV PUNDOK_DATA_DIR=/data

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY --from=build /app/packages/server/dist ./packages/server/dist
COPY --from=build /app/packages/renderer/dist ./packages/renderer/dist

EXPOSE 3000
VOLUME ["/data"]
CMD ["node", "packages/server/dist/index.mjs"]
