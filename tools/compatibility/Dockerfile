FROM node:24.21.0-bookworm@sha256:91882e0e5959240d4413fc42c180022bbdd09c5491e00e75faa6c100d8d7751b
RUN npm install --prefix /bootstrap --ignore-scripts --no-audit --no-fund pnpm@12.9.1
ENV PATH="/bootstrap/node_modules/.bin:${PATH}"
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
WORKDIR /work
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --strict-peer-dependencies
RUN pnpm exec playwright install --with-deps chromium
COPY . .
CMD ["timeout", "--signal=TERM", "--kill-after=30s", "900", "sh", "proof.sh"]
