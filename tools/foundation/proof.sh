set -eu
test "$(pwd)" = /work
test "${APP_ENV:-}" = synthetic
test -d /proc/1
node --version
pnpm --version
pnpm exec tsc --version
lock_before=$(sha256sum pnpm-lock.yaml)
rm -rf /work/node_modules /root/.local/share/pnpm/store /work/apps/api/node_modules /work/apps/worker/node_modules /work/apps/web/node_modules /work/packages/contracts/node_modules /work/packages/tracker/node_modules
pnpm install --frozen-lockfile --strict-peer-dependencies
test "$lock_before" = "$(sha256sum pnpm-lock.yaml)"
pnpm check:boundaries
pnpm lint
pnpm typecheck
pnpm build
pnpm db:reset:checks
pnpm db:verify
pnpm test
pnpm db:seed:synthetic
pnpm test:e2e
pnpm test:operations
