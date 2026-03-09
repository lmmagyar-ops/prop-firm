#!/usr/bin/env bash
# =============================================================================
# migrate-to-neon-direct.sh
#
# Production cutover: Prisma Postgres (db.prisma.io) → Direct Neon (neon.tech)
#
# PREREQUISITES:
#   - pg_dump / pg_restore installed (brew install postgresql@16)
#   - Both PRISMA_URL and NEON_DIRECT_URL set in environment or passed as args
#   - Vercel CLI installed (npm i -g vercel)
#   - At least 30 min maintenance window (warn users first)
#
# USAGE:
#   export PRISMA_URL="postgres://...@db.prisma.io:5432/postgres?sslmode=require"
#   export NEON_DIRECT_URL="postgresql://neondb_owner:...@ep-xxx.neon.tech/neondb?sslmode=require"
#   bash scripts/migrate-to-neon-direct.sh
#
# ROLLBACK:
#   If anything fails, the production DATABASE_URL in Vercel still points to
#   the Prisma Postgres DB (unchanged until the final step). Re-trigger the last
#   Vercel deployment that worked to restore instantly.
# =============================================================================

set -euo pipefail

PRISMA_URL="${PRISMA_URL:?Must set PRISMA_URL}"
NEON_DIRECT_URL="${NEON_DIRECT_URL:?Must set NEON_DIRECT_URL}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DUMP_FILE="/tmp/prop-firm-backup-${TIMESTAMP}.sql"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║     prop-firm: Neon Direct Migration                        ║"
echo "║     Started: $(date)                          ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# ── STEP 1: Backup ──────────────────────────────────────────────────────────
echo "[1/6] Creating backup from Prisma Postgres..."
pg_dump \
  --no-owner \
  --no-acl \
  --format=plain \
  --file="${DUMP_FILE}" \
  "${PRISMA_URL}"

echo "      ✓ Backup saved to: ${DUMP_FILE}"
echo "      ✓ Size: $(du -sh "${DUMP_FILE}" | cut -f1)"

# ── STEP 2: Schema on new Neon DB ───────────────────────────────────────────
echo "[2/6] Deploying schema to direct Neon DB..."
DATABASE_URL="${NEON_DIRECT_URL}" npx drizzle-kit push --force
echo "      ✓ Schema deployed"

# ── STEP 3: Restore data ────────────────────────────────────────────────────
echo "[3/6] Restoring data to direct Neon DB..."
psql \
  --single-transaction \
  --quiet \
  "${NEON_DIRECT_URL}" \
  < "${DUMP_FILE}"
echo "      ✓ Data restored"

# ── STEP 4: Row count sanity check ──────────────────────────────────────────
echo "[4/6] Verifying row counts..."

check_count() {
  local table=$1
  local source_count target_count
  source_count=$(psql -t -c "SELECT COUNT(*) FROM ${table};" "${PRISMA_URL}" | tr -d ' ')
  target_count=$(psql -t -c "SELECT COUNT(*) FROM ${table};" "${NEON_DIRECT_URL}" | tr -d ' ')
  if [ "${source_count}" == "${target_count}" ]; then
    echo "      ✓ ${table}: ${source_count} rows"
  else
    echo "      ✗ MISMATCH ${table}: source=${source_count}, target=${target_count}"
    echo "        ABORTING — do not proceed. Data integrity check failed."
    exit 1
  fi
}

check_count "users"
check_count "challenges"
check_count "trades"
check_count "positions"
check_count "audit_logs"

echo "      ✓ All row counts match"

# ── STEP 5: Update Vercel DATABASE_URL ──────────────────────────────────────
echo "[5/6] Updating Vercel DATABASE_URL..."
echo "      → Removing Prisma-managed DATABASE_URL..."
vercel env rm DATABASE_URL production --yes 2>/dev/null || true
echo "      → Setting direct Neon URL..."
echo "${NEON_DIRECT_URL}" | vercel env add DATABASE_URL production
echo "      ✓ Vercel DATABASE_URL updated"

# ── STEP 6: Redeploy ────────────────────────────────────────────────────────
echo "[6/6] Triggering Vercel production redeploy..."
vercel --prod --yes
echo "      ✓ Redeploy triggered"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  Migration complete!                                         ║"
echo "║  Verify: https://prop-firmx.vercel.app/api/system/status    ║"
echo "║  Backup: ${DUMP_FILE}"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "  If anything looks wrong:"
echo "  1. vercel env rm DATABASE_URL production"
echo "  2. echo \"\$PRISMA_URL\" | vercel env add DATABASE_URL production"
echo "  3. vercel --prod --yes"
echo ""
