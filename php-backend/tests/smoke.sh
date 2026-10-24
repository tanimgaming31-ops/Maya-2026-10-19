#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
for file in "$ROOT"/src/*.php "$ROOT"/public/*.php "$ROOT"/bin/*.php; do php -l "$file"; done
TMP="$(mktemp -d)"
PORT=18962
export MAYA_DATA_DIR="$TMP/private"
export MAYA_BACKEND_TOKEN="test-only-super-long-secret-000000000000000000000"
export MAYA_DATA_KEY="$(printf 'a%.0s' {1..64})"
export MAYA_ALLOWED_ORIGIN="https://maya.example.test"
php -S "127.0.0.1:$PORT" -t "$ROOT/public" "$ROOT/public/index.php" >"$TMP/server.log" 2>&1 &
PID=$!
trap 'status=$?; if [ "$status" -ne 0 ]; then echo "---PHP test server log---"; tail -80 "$TMP/server.log"; fi; kill "$PID" 2>/dev/null || true; rm -rf "$TMP"' EXIT
for n in {1..25}; do
  if curl -sf "http://127.0.0.1:$PORT/v1/health" >/dev/null; then break; fi
  sleep 0.2
done
URL="http://127.0.0.1:$PORT/v1"
AUTH="Authorization: Bearer $MAYA_BACKEND_TOKEN"
req() { curl -sS -H "$AUTH" -H 'Content-Type: application/json' "$@"; }
assert() {
  printf '%s' "$1" | python3 -c "import sys,json;d=json.load(sys.stdin);$2"
}
code="$(curl -s -o /dev/null -w '%{http_code}' "$URL/memories")"
test "$code" = "401" || { echo "Expected unauthorized 401, got $code"; exit 1; }
code="$(curl -s -o /dev/null -w '%{http_code}' -H "$AUTH" -H 'Origin: https://evil.test' "$URL/memories")"
test "$code" = "403" || { echo "Expected forbidden Origin 403, got $code"; exit 1; }
health="$(curl -s "$URL/health")"
assert "$health" "assert d['ok'] and d['configured']"

created="$(req -d '{"text":"Maya remembers বাংলা facts"}' "$URL/memories")"
assert "$created" "assert d['memory']['text'].startswith('Maya')"
found="$(req --get --data-urlencode 'q=বাংলা' "$URL/memories/search")"
assert "$found" "assert d['ok'],d; assert len(d['memories'])==1"

backup="$(req -d '{"consent":true,"payload":{"memoryPacks":["original pack"],"version":1}}' "$URL/backups")"
assert "$backup" "assert d['backup']['id']"
latest="$(req "$URL/backups/latest")"
assert "$latest" "assert d['backup']['payload']['memoryPacks'][0]=='original pack' and d['restored_to_device']==False"

invalid="$(req -d '{"goal":"unsafe","steps":[{"tool":"OPEN_APP","query":"X"}]}' "$URL/tasks")"
assert "$invalid" "assert not d['ok'] and d['error']=='unsafe_or_invalid_step'"
task="$(req -d '{"goal":"Find Maya","steps":[{"tool":"wikiSummary","query":"Maya"}]}' "$URL/tasks")"
assert "$task" "assert d['task']['state']=='planned_not_executed' and d['executed']==False"

doc="$(req -d '{"consent":true,"title":"Notes","text":"Knowledge retrieval about memory"}' "$URL/documents")"
assert "$doc" "assert d['pdf_parsed']==False"
hits="$(req --get --data-urlencode 'q=memory' "$URL/documents/search")"
assert "$hits" "assert len(d['documents'])==1 and d['documents'][0]['title']=='Notes'"

message="$(req -d '{"consent":true,"incoming":"Hi","draft":"Hello"}' "$URL/messages/drafts")"
assert "$message" "assert d['draft']['sent']==False and d['automatic_reply']==False"
suggest="$(req -d '{"type":"OPEN_APP","detail":"Calculator"}' "$URL/native/suggestions")"
assert "$suggest" "assert d['device_action_executed']==False and 'confirmation' in d['suggestion']['state']"

failed="$(req -d '{"source":"gemini","code":"timeout","retryable":true}' "$URL/failures")"
assert "$failed" "assert d['failure']['retryable'] and d['automatic_retry_executed']==False"

DUE="$(date -u -d '+2 seconds' +'%Y-%m-%dT%H:%M:%S+00:00')"
routine="$(req -d "{\"message\":\"Drink water\",\"due_at\":\"$DUE\"}" "$URL/routines")"
assert "$routine" "assert d['scheduled_on_android']==False and d['routine']['enabled']"
sleep 3
tick="$(php "$ROOT/bin/tick.php")"
assert "$tick" "assert d['queued_count']==1"
twice="$(php "$ROOT/bin/tick.php")"
assert "$twice" "assert d['queued_count']==0"
events="$(req "$URL/events")"
assert "$events" "assert len(d['events'])==1 and d['events'][0]['state']=='queued_for_device'"
diagnostics="$(req "$URL/diagnostics")"
assert "$diagnostics" "assert d['diagnostics']['failures'][0]['code']=='timeout' and d['android_apk_tested']==False"
test -f "$MAYA_DATA_DIR/maya-vault.enc"
! grep -q 'Maya remembers' "$MAYA_DATA_DIR/maya-vault.enc" || { echo "Unencrypted vault"; exit 1; }
echo "PASS: auth, CORS, encrypted memory, opt-in backup, plan whitelist, documents, draft, native suggestion, diagnostics, cron queue and no duplicate reminders"
