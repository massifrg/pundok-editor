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

FROM node:22-trixie-slim AS build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build:common && npm run build:renderer && npm run build:server

FROM node:22-trixie-slim AS production-dependencies
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

FROM debian:trixie-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV PUNDOK_DATA_DIR=/data
ARG PANDOC_VERSION=3.11

RUN apt-get update \
  && apt-get install --yes --no-install-recommends ca-certificates curl \
  && curl --fail --location --output /tmp/pandoc.deb \
    "https://github.com/jgm/pandoc/releases/download/${PANDOC_VERSION}/pandoc-${PANDOC_VERSION}-1-amd64.deb" \
  && apt-get install --yes /tmp/pandoc.deb \
  && rm /tmp/pandoc.deb \
  && rm -rf /var/lib/apt/lists/*

COPY --from=build /usr/local/bin/node /usr/local/bin/node
COPY --from=build /usr/local/lib/node_modules /usr/local/lib/node_modules
COPY --from=production-dependencies /app/node_modules ./node_modules
COPY --from=build /app/packages/server/dist ./packages/server/dist
COPY --from=build /app/packages/renderer/dist ./packages/renderer/dist
COPY --from=build /app/staticResources ./staticResources

EXPOSE 3000
VOLUME ["/data"]
CMD ["node", "packages/server/dist/index.mjs"]
