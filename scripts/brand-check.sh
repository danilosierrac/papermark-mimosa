#!/usr/bin/env bash
# Fails (non-zero exit) if any client-facing route or email template still
# mentions "papermark" (case-insensitive). LICENSE and README are exempt by
# design -- everything else this hits is served to a browser or an inbox.
#
# Usage: ./scripts/brand-check.sh [base-url]
#   base-url defaults to https://docs.mimosa.computer

set -uo pipefail

BASE_URL="${1:-https://docs.mimosa.computer}"
TEST_LINK="${BRAND_CHECK_TEST_LINK:-cmub2oyi70001l3040orirqwb}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

total_hits=0

check_url() {
  local label="$1" url="$2"
  local body
  body="$(curl -sL "$url")"
  local hits
  hits=$(printf '%s' "$body" | grep -io "papermark" | wc -l | tr -d ' ')
  if [ "$hits" -gt 0 ]; then
    echo "FAIL  $label ($url): $hits hit(s)"
    total_hits=$((total_hits + hits))
  else
    echo "ok    $label ($url): 0 hits"
  fi
}

echo "brand-check against $BASE_URL"
echo "---"

check_url "root"              "$BASE_URL/"
check_url "login"             "$BASE_URL/login"
check_url "register"          "$BASE_URL/register"
check_url "view (email gate)" "$BASE_URL/view/$TEST_LINK"
check_url "404"               "$BASE_URL/this-page-does-not-exist"

echo "---"
echo "rendered email templates (from source, not a live send):"

email_html="$(cd "$SCRIPT_DIR/.." && npx tsx scripts/render-email-templates.tsx 2>&1)"
email_hits=$(printf '%s' "$email_html" | grep -io "papermark" | wc -l | tr -d ' ')
if [ "$email_hits" -gt 0 ]; then
  echo "FAIL  email templates: $email_hits hit(s)"
  total_hits=$((total_hits + email_hits))
else
  echo "ok    email templates: 0 hits"
fi

echo "---"
if [ "$total_hits" -gt 0 ]; then
  echo "RESULT: FAIL -- $total_hits total hit(s) for \"papermark\""
  exit 1
else
  echo "RESULT: PASS -- 0 hits for \"papermark\" across all checked surfaces"
  exit 0
fi
