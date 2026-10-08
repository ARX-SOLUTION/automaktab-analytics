#!/bin/sh
set -eu
cd /work
# /work is image-local: the approved proof command mounts no host paths.
rm -rf /work/node_modules /root/.local/share/pnpm/store
before=$(sha256sum pnpm-lock.yaml)
pnpm install --frozen-lockfile --strict-peer-dependencies
[ "$before" = "$(sha256sum pnpm-lock.yaml)" ]
node --version
pnpm --version
pnpm exec tsc --version
node -e 'console.log(import.meta.resolve("typescript"))'
pnpm typecheck
pnpm lint
pnpm test:lint
pnpm test:types
pnpm test:unit
pnpm build
pnpm test:di
pnpm db:generate
pnpm db:roundtrip
pnpm test:browser
[ "$before" = "$(sha256sum pnpm-lock.yaml)" ]
