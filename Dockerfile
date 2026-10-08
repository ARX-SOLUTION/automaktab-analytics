FROM node:24.21.0-bookworm@sha256:91882e0e5959240d4413fc42c180022bbdd09c5491e00e75faa6c100d8d7751b AS dependencies
RUN npm install --prefix /bootstrap --ignore-scripts --no-audit --no-fund pnpm@12.9.1
ENV PATH="/bootstrap/node_modules/.bin:${PATH}"
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
WORKDIR /work
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/tracker/package.json packages/tracker/package.json
RUN pnpm install --frozen-lockfile --strict-peer-dependencies
RUN pnpm exec playwright install --with-deps --only-shell chromium
FROM dependencies
COPY . .
RUN pnpm build
CMD ["pnpm","proof"]
