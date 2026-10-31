#!/bin/bash
# Ezeikel Pemberton Photography (www.ezeikelpemberton.photography): Vercel -> Cloudflare Worker cutover. OWNER RUNS THIS:   ! bash docs/cloudflare/cutover.sh
# Prepared 31 October 2026 from fleet-cloudflare-migration/templates/scripts/cutover.sh and the Salt Mammal script.
# NOT RUN. Dry run of every branch against stubbed tools:   python3 docs/cloudflare/dry-run/run.py
#
# There is no database and no secret to move, so the steps are short:
#   0 preflight  read only: tools, branch pushed and clean, Cloudflare token and zones, the Vercel project and its
#                domains, the DNS records and Worker domains of every hostname, and a snapshot of what the live site
#                answers today (status, type, hash of the visible text, the redirects of the other hostnames)
#   1 deploy     build the pushed commit, `wrangler deploy` it to the Worker (workers.dev only), and require it to
#                answer like the live site
#   2 DNS        snapshot the A/AAAA/CNAME records of every hostname to the rollback file BEFORE any change, then per
#                hostname: delete them, attach the Worker as a custom domain (a failure restores everything by itself)
#   3 live       the same checks against the real hostnames (DNS over HTTPS), retried for about a minute
#   4 GitHub     secrets and variables, fast-forward push of the branch, watch the deploy workflow
#   5 Vercel     PAUSE (never delete), once resolvers that cached the old records have had their TTL
# Rollback after step 2:   bash docs/cloudflare/cutover.sh rollback
# Single steps:            verify | github | pause | rollback      (all safe to repeat)
# Never prints a token or any other secret value.
set -euo pipefail

########## CONFIG ##########
TITLE="Ezeikel Pemberton Photography (www.ezeikelpemberton.photography)"
TEAM=chewy-bytes
BRANCH=wip/cloudflare-static-20261031
DEPLOY_WORKFLOW=deploy-cloudflare.yml
CUTOVER_VAR=CLOUDFLARE_CUTOVER
SLUG=ezeikel-pemberton-photography-web
WORKER=ezeikel-pemberton-photography-web
VERCEL_NAME=ezeikel-pemberton-photography-web
P=prj_kojGnIWJpjEyrl7n4VlxSuRVSt0P                 # Vercel project, team chewy-bytes
GH=ezeikel/ezeikel-pemberton-photography-web
DEFAULT_BRANCH=master
R=${R:-$HOME/Development/Personal/ezeikel-pemberton-photography-web-cf}   # clean clone on $BRANCH
APPDIR=$R                                          # the directory holding wrangler.jsonc
CANONICAL=www.ezeikelpemberton.photography
LIVE_URL=https://www.ezeikelpemberton.photography
# hostname:zone-id. The records at these two names are proxied A records to Vercel; the wildcard A records, the CAA
# records and _domainconnect stay (they are not at these names).
HOSTS=(
  "www.ezeikelpemberton.photography:7ca50bfe4693668c051e5fc464f4d33d"
  "ezeikelpemberton.photography:7ca50bfe4693668c051e5fc464f4d33d"
)
ALIAS_URLS=("https://ezeikelpemberton.photography/x-check?x=1")
PAGES=(/ /home /blog /blog/anything /main.js /vendor.js /styles.css /favicon.ico /assets/logo-ep-full.svg /fontawesome-webfont.woff2 /sitemap.xml /nope-404 /robots.txt)
ALLOW=("/robots.txt=the zone already answers /robots.txt with Cloudflare's managed file in front of Vercel; workers.dev shows the app's own answer")
EXPECT_BEACON=1
NEEDS_FONTAWESOME_TOKEN=0
VERCEL_VALUES=()
GH_VARS_FROM_VERCEL=()

build_and_deploy() {                               # nothing is built: the committed Vercel output is uploaded as it is
  ( cd "$R/cloudflare" && shasum -a 256 -c SHA256SUMS \
    && cd "$R" \
    && node --test cloudflare/worker.test.mjs \
    && npx -y wrangler@4.151.3 deploy )
}
########## END CONFIG ##########

HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
S=${S:-$HOME/.cutover/$SLUG}
CF_ENV_FILE=${CF_ENV_FILE:-$HOME/Development/docs/keys/cloudflare.env}
NODE_BIN=${NODE_BIN:-$HOME/.nvm/versions/node/v22.23.3/bin}
mkdir -p "$S"; chmod 700 "$S"; umask 077
export PATH="$NODE_BIN:$PATH" NEXT_TELEMETRY_DISABLED=1 CI=true
set -a; . "$CF_ENV_FILE"; set +a
: "${CLOUDFLARE_API_TOKEN:?no CLOUDFLARE_API_TOKEN in $CF_ENV_FILE}" "${CLOUDFLARE_ACCOUNT_ID:?no CLOUDFLARE_ACCOUNT_ID in $CF_ENV_FILE}"
API=https://api.cloudflare.com/client/v4
# The token goes to curl through a header file, so it is never in a process list.
printf 'Authorization: Bearer %s\n' "$CLOUDFLARE_API_TOKEN" > "$S/cf.hdr"
CFH=(-H "@$S/cf.hdr")
STAGE_URL="https://$WORKER.chewybytes.workers.dev"
LOG="$S/cutover.log"
SNAP="$S/dns-rollback.json"; SNAP_TXT="$S/dns-rollback.txt"; SNAP_TSV="$S/dns-records.tsv"
BASE="$S/baseline.json"; FLIP_TIME="$S/flip-time"; MAIN_PUSHED="$S/main-pushed"
CHECK="$HERE/check.py"
say() { echo "$(date +%H:%M:%S) $*" | tee -a "$LOG"; }

DNS_TOUCHED=0     # set before the first record is deleted
FLIP_ACTIVE=0     # 1 while records are being deleted and domains attached: a failure then restores the records
WAITING=0         # 1 while waiting for old DNS records to expire before the Vercel pause
STANDALONE=0      # 1 when a single step (verify, github, pause, rollback) is run on its own
FOLLOWUP=()       # things that did not finish and need a human

cfapi() {         # METHOD PATH [JSON]  ->  the JSON answer on stdout
  local method=$1 path=$2 body=${3:-}
  if [ -n "$body" ]; then
    curl -s --max-time 60 -X "$method" "${CFH[@]}" -H "Content-Type: application/json" --data "$body" "$API$path"
  else
    curl -s --max-time 60 -X "$method" "${CFH[@]}" -H "Content-Type: application/json" "$API$path"
  fi
}
cf_success() { python3 -c "import sys,json;print(json.load(sys.stdin).get('success'))" 2>/dev/null || echo False; }
vapi() {          # vercel api ARGS...  ->  the JSON answer (the CLI may print a banner first)
  (cd /tmp && vercel api "$@" --scope "$TEAM") | python3 -c "import sys;t=sys.stdin.read();print(t[t.index('{'):] if '{' in t else '{}')"
}
cleanup() { rm -f "$S/cf.hdr" "$S/verify.out"; }
trap cleanup EXIT
trap 'if [ "$WAITING" = 1 ]; then trap - INT HUP TERM; say "interrupted while waiting: finish later with   bash $HERE/cutover.sh pause"; exit 130; else die "interrupted"; fi' INT HUP TERM

rollback_text() {
  cat <<EOF | tee -a "$LOG"
ROLLBACK (puts everything back as it was; safe to run twice):   bash $HERE/cutover.sh rollback
  it detaches the Worker domains, re-creates the DNS records saved in $SNAP (readable copy: $SNAP_TXT),
  unpauses the Vercel project and turns the GitHub deploy switch off. Then check https://$CANONICAL from outside.
EOF
}

die() {
  trap - INT HUP TERM
  say "STOP: $*"
  if [ "$FLIP_ACTIVE" = 1 ]; then
    FLIP_ACTIVE=0
    say "The DNS move was interrupted: restoring the records from the snapshot now."
    undo_dns || say "WARNING: DNS is NOT fully restored. Read $SNAP_TXT and fix the records named above by hand."
  elif [ "$DNS_TOUCHED" = 1 ]; then
    say "DNS has moved to the Worker. Vercel is paused only if a line above says so."
    rollback_text
  elif [ "$STANDALONE" = 1 ]; then
    :
  else
    say "Nothing was changed on DNS or Vercel."
  fi
  exit 1
}

fa_token() {      # the Font Awesome registry token from ~/.npmrc (the repo .npmrc reads it from the environment)
  awk -F'_authToken=' '/npm.fontawesome.com\/:_authToken/{print $2; exit}' "$HOME/.npmrc" 2>/dev/null || true
}

host_name() { echo "${1%%:*}"; }
host_zone() { echo "${1#*:}"; }

# ---- DNS helpers ------------------------------------------------------------------------------------------------
host_records() {  # ZONE HOST -> one line per A/AAAA/CNAME record: id type name content proxied ttl zone
  cfapi GET "/zones/$1/dns_records?name=$2&per_page=100" | python3 -c "
import sys,json
d=json.load(sys.stdin)
if not d.get('success'): sys.exit(3)
for r in d['result']:
    if r['type'] in ('A','AAAA','CNAME'):
        print('\t'.join([r['id'],r['type'],r['name'],r['content'],'true' if r['proxied'] else 'false',str(r['ttl']),sys.argv[1]]))" "$1"
}

write_snapshot() {
  : > "$SNAP_TSV"
  local entry
  for entry in ${HOSTS[@]+"${HOSTS[@]}"}; do
    host_records "$(host_zone "$entry")" "$(host_name "$entry")" >> "$SNAP_TSV" || die "could not read the DNS records of $(host_name "$entry") (DNS untouched)"
  done
  python3 - "$SNAP_TSV" "$SNAP" "$SNAP_TXT" > "$S/snapshot.out" <<'PY' || die "could not write the DNS snapshot (DNS untouched)"
import json,sys
recs=[]
for line in open(sys.argv[1]):
    i,t,n,c,p,ttl,z=line.rstrip('\n').split('\t')
    recs.append({'id':i,'type':t,'name':n,'content':c,'proxied':p=='true','ttl':int(ttl),'zone':z})
if not recs: raise SystemExit('no A/AAAA/CNAME record found for any hostname: refusing to continue')
json.dump(recs,open(sys.argv[2],'w'),indent=1)
open(sys.argv[3],'w').write(''.join(f"{r['type']} {r['name']} {r['content']} proxied={r['proxied']} ttl={r['ttl']} (zone {r['zone']})\n" for r in recs))
print(f'  snapshot: {len(recs)} records saved')
PY
  say "$(cat "$S/snapshot.out")"
  [ -s "$SNAP" ] || die "the DNS snapshot is empty (DNS untouched)"
}

max_old_ttl() {   # seconds resolvers may still hold the old records: the longest TTL of an unproxied one, at most an hour
  python3 - "$SNAP" <<'PY'
import json,sys
t=[(r['ttl'] if r['ttl']>1 else 300) for r in json.load(open(sys.argv[1])) if not r['proxied']]
print(min(max(t or [0]),3600))
PY
}

detach_host() {   # HOST: remove the Worker custom domain (the records Cloudflare made for it go with it)
  local h=$1 ids id ok
  ids=$(cfapi GET "/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/domains?hostname=$h&service=$WORKER" \
    | python3 -c "import sys,json;print(' '.join(d['id'] for d in (json.load(sys.stdin).get('result') or [])))" 2>/dev/null) || ids=''
  if [ -z "$ids" ]; then say "  $h: no Worker domain attached"; return 0; fi
  for id in $ids; do
    ok=$(cfapi DELETE "/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/domains/$id" | cf_success)
    say "  detached $h: $ok"
    [ "$ok" = True ] || return 1
  done
}

restore_records() {   # re-create every snapshot record that is missing; 0 only when all are back
  if [ ! -s "$SNAP" ]; then
    if ls "$SNAP".restored-* >/dev/null 2>&1; then say "  DNS was already restored by an earlier rollback"; return 0; fi
    say "  no DNS snapshot at $SNAP: the DNS step never ran, or the file was lost. Check the records by hand."; return 1
  fi
  python3 - "$SNAP" > "$S/dns-restore.tsv" <<'PY'
import json,sys
for r in json.load(open(sys.argv[1])):
    print('\t'.join([r['zone'],r['type'],r['name'],r['content'],'true' if r['proxied'] else 'false',str(r['ttl'])]))
PY
  local zone type name content proxied ttl cur ok tries failed=0
  while IFS=$'\t' read -r zone type name content proxied ttl; do
    # A name may carry several records of one type (round robin): look at all of them, not only the first.
    cur=$(cfapi GET "/zones/$zone/dns_records?name=$name&type=$type" \
      | python3 -c "import sys,json;print('\n'.join(x['content'] for x in json.load(sys.stdin)['result']))" 2>/dev/null) || cur='?'
    if [ "$cur" = '?' ]; then say "  $type $name: could not read the current records, fix it by hand"; failed=1; continue; fi
    if grep -qxF -- "$content" <<<"$cur"; then say "  $type $name already points at $content"; continue; fi
    # Cloudflare removes the records it made for a detached Worker domain a moment later: retry a failed create.
    ok=False; tries=0
    while [ "$ok" != True ] && [ "$tries" -lt 3 ]; do
      ok=$(cfapi POST "/zones/$zone/dns_records" "{\"type\":\"$type\",\"name\":\"$name\",\"content\":\"$content\",\"proxied\":$proxied,\"ttl\":$ttl}" | cf_success)
      [ "$ok" = True ] || sleep 5
      tries=$((tries + 1))
    done
    say "  restored $type $name -> $content: $ok"
    [ "$ok" = True ] || failed=1
  done < "$S/dns-restore.tsv"
  rm -f "$S/dns-restore.tsv"
  return $failed
}

undo_dns() {      # detach every Worker domain, put every record back
  local entry rc=0
  for entry in ${HOSTS[@]+"${HOSTS[@]}"}; do detach_host "$(host_name "$entry")" || rc=1; done
  restore_records || rc=1
  return $rc
}

unpause_vercel() {
  vapi "/v1/projects/$P/unpause" -X POST >/dev/null && say "  Vercel project unpaused" || { say "  WARNING: could not unpause $P: do it in the Vercel dashboard"; return 1; }
}

# ---- step 0 -----------------------------------------------------------------------------------------------------
preflight() {
  say "== 0. preflight (read only) for $TITLE"
  [ ! -e "$SNAP" ] || die "$SNAP exists: an earlier run reached the DNS step. Undo it with 'bash $HERE/cutover.sh rollback'; if DNS is already back on Vercel and you are sure, move that file away first"
  local t
  for t in curl python3 git gh vercel node npx; do command -v "$t" >/dev/null || die "missing tool: $t"; done
  [ "$(git -C "$R" branch --show-current)" = "$BRANCH" ] || die "$R is not on $BRANCH"
  [ -z "$(git -C "$R" status --porcelain)" ] || die "$R has uncommitted changes"
  git -C "$R" fetch -q origin || die "git fetch failed"
  [ "$(git -C "$R" rev-parse "origin/$BRANCH")" = "$(git -C "$R" rev-parse HEAD)" ] || die "$BRANCH is not pushed (HEAD differs from origin/$BRANCH)"
  [ "$(cfapi GET /user/tokens/verify | python3 -c "import sys,json;print(json.load(sys.stdin).get('result',{}).get('status'))" 2>/dev/null || echo ?)" = active ] || die "the Cloudflare token in $CF_ENV_FILE is not active"
  local seen=" " entry z h svc
  for entry in ${HOSTS[@]+"${HOSTS[@]}"}; do
    z=$(host_zone "$entry"); h=$(host_name "$entry")
    case "$seen" in *" $z "*) ;; *)
      [ "$(cfapi GET "/zones/$z" | python3 -c "import sys,json;print(json.load(sys.stdin).get('result',{}).get('status'))" 2>/dev/null || echo ?)" = active ] || die "Cloudflare zone $z (for $h) is not active or not readable with this token"
      seen="$seen$z " ;;
    esac
    svc=$(cfapi GET "/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/domains?hostname=$h" | python3 -c "import sys,json;r=json.load(sys.stdin).get('result') or [];print(r[0].get('service','') if r else '')" 2>/dev/null || echo ?)
    case "$svc" in
      '') ;;
      "$WORKER") say "  $h is already attached to $WORKER" ;;
      *) die "$h is already a custom domain of another Worker ($svc): resolve that first" ;;
    esac
  done
  # The Vercel project must be the one that serves these hostnames, and must not be paused already.
  local proj
  proj=$(vapi "/v9/projects/$P" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('name',''),'paused' if d.get('paused') else 'running')") || proj=''
  case "$proj" in "$VERCEL_NAME running") say "  Vercel project $VERCEL_NAME is running" ;; *) die "Vercel project $P is '$proj', expected '$VERCEL_NAME running'" ;; esac
  if [ ${#HOSTS[@]} -gt 0 ]; then
    local names=() dom
    for entry in "${HOSTS[@]}"; do names+=("$(host_name "$entry")"); done
    dom=$(vapi "/v9/projects/$P/domains" | python3 -c "
import sys,json
have={d['name'] for d in json.load(sys.stdin).get('domains',[])}
want=set(sys.argv[1:])
miss=sorted(want-have)
print('  Vercel serves: '+', '.join(sorted(want&have))+('   NOTE: not on the Vercel project: '+', '.join(miss) if miss else ''))" "${names[@]}") || dom='  could not read the Vercel domains'
    say "$dom"
  fi
  if [ ${#HOSTS[@]} -gt 0 ]; then
    say "  DNS records that will be deleted (A/AAAA/CNAME only; TXT, MX, CAA and everything else stay):"
    write_snapshot
    sed 's/^/    /' "$SNAP_TXT" | tee -a "$LOG"
    rm -f "$SNAP" "$SNAP_TXT"      # the real snapshot is written again at step 2, right before the first change
  fi
  load_vercel_values
  say "  what the live site answers today (the baseline every later check is held to):"
  take_baseline | tee -a "$LOG" || die "the live site did not answer every path (nothing changed)"
}

load_vercel_values() {   # VERCEL_VALUES=(NAME=env-id ...): readable (plain/encrypted) values, kept in VV_<NAME>, never printed
  local kv name id v
  [ "${VV_LOADED:-0}" = 1 ] && return 0
  for kv in ${VERCEL_VALUES[@]+"${VERCEL_VALUES[@]}"}; do
    name=${kv%%=*}; id=${kv#*=}
    v=$(vapi "/v9/projects/$P/env/$id" | python3 -c "import sys,json;print(json.load(sys.stdin).get('value',''),end='')") || v=''
    [ -n "$v" ] || die "could not read $name from the Vercel project (env id $id)"
    export "VV_$name=$v"
  done
  VV_LOADED=1
  return 0
}
vercel_value() { local var="VV_$1"; printf '%s' "${!var}"; }

take_baseline() {
  local a args=() h
  for a in ${ALIAS_URLS[@]+"${ALIAS_URLS[@]}"}; do args+=(--alias "$a"); done
  for h in $CANONICAL $(for entry in ${HOSTS[@]+"${HOSTS[@]}"}; do host_name "$entry"; done); do args+=(--host "$h"); done
  python3 "$CHECK" snapshot --origin "$LIVE_URL" --out "$BASE" --doh ${args[@]+"${args[@]}"} "${PAGES[@]}"
}

allow_args() {    # prints the --allow arguments, one per line
  local a
  for a in ${ALLOW[@]+"${ALLOW[@]}"}; do printf '%s\n' --allow "$a"; done
}

run_check() {     # run check.py with the --allow list (read line by line: the reasons contain spaces)
  local sub=$1; shift
  local args=() line
  while IFS= read -r line; do args+=("$line"); done < <(allow_args)
  python3 "$CHECK" "$sub" ${args[@]+"${args[@]}"} "$@"
}

# ---- step 1 -----------------------------------------------------------------------------------------------------
deploy_worker() {
  say "== 1. deploy the pushed commit to $WORKER (workers.dev only) and compare it with the live site"
  local f
  for f in .env .env.local .env.development .env.development.local .env.production .env.production.local; do
    [ ! -e "$APPDIR/$f" ] && [ ! -e "$R/$f" ] || die "$f is present: a build would bake it into the bundle. Remove it (or build from a clean checkout)"
  done
  if [ "${NEEDS_FONTAWESOME_TOKEN:-0}" = 1 ]; then
    FONTAWESOME_NPM_AUTH_TOKEN=$(fa_token)
    [ -n "$FONTAWESOME_NPM_AUTH_TOKEN" ] || die "no Font Awesome registry token in ~/.npmrc; pnpm install needs it (nothing changed)"
    export FONTAWESOME_NPM_AUTH_TOKEN
  fi
  build_and_deploy >> "$LOG" 2>&1 || die "build or deploy failed (details: $LOG). DNS untouched"
  sleep 8
  local hosts=() h
  for h in $CANONICAL $(for entry in ${HOSTS[@]+"${HOSTS[@]}"}; do host_name "$entry"; done); do hosts+=(--host "$h"); done
  run_check compare --live "$LIVE_URL" --stage "$STAGE_URL" --doh ${hosts[@]+"${hosts[@]}"} "${PAGES[@]}" | tee -a "$LOG" || die "the staged Worker differs from the live site (nothing changed on DNS)"
}

# ---- step 2 -----------------------------------------------------------------------------------------------------
flip_host() {     # HOST ZONE
  local h=$1 z=$2 id type name content proxied ttl zone ok resp
  while IFS=$'\t' read -r id type name content proxied ttl zone; do
    [ "$name" = "$h" ] || continue
    ok=$(cfapi DELETE "/zones/$z/dns_records/$id" | cf_success)
    say "  deleted $type $name -> $content: $ok"
    [ "$ok" = True ] || die "could not delete $type $name"
  done < "$SNAP_TSV"
  resp=$(cfapi PUT "/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/domains" \
    "{\"hostname\":\"$h\",\"service\":\"$WORKER\",\"zone_id\":\"$z\",\"environment\":\"production\"}") || resp='{}'
  ok=$(python3 -c "import sys,json;print(json.loads(sys.argv[1]).get('success'))" "$resp" 2>/dev/null || echo False)
  say "  attached $h to $WORKER: $ok"
  [ "$ok" = True ] || die "attaching $h failed"
}

dns_phase() {
  if [ ${#HOSTS[@]} -eq 0 ]; then
    say "== 2. this site has no custom domain: there is no DNS to move (it stays reachable at $STAGE_URL)"
    return 0
  fi
  say "== 2. DNS: snapshot first, then each hostname moves to the Worker"
  write_snapshot
  say "  rollback file written BEFORE any change: $SNAP"
  DNS_TOUCHED=1; FLIP_ACTIVE=1
  local entry
  for entry in "${HOSTS[@]}"; do flip_host "$(host_name "$entry")" "$(host_zone "$entry")"; done
  FLIP_ACTIVE=0
  date +%s > "$FLIP_TIME"
  # Wait until the canonical hostname stops being answered by Vercel (resolvers may hold the old record for a while).
  local i hd off=0
  for i in $(seq 1 "${FLIP_TRIES:-60}"); do
    hd=$(curl -s -D - -o /dev/null --doh-url https://cloudflare-dns.com/dns-query --max-time 20 "$LIVE_URL/" | tr -d '\r' || true)
    if ! grep -qi '^x-vercel-id' <<<"$hd" && grep -qiE '^HTTP/[0-9.]+ 200' <<<"$hd"; then off=1; break; fi
    sleep 10
  done
  [ $off = 1 ] || die "$CANONICAL is still answered by Vercel (or not 200) after $(( ${FLIP_TRIES:-60} * 10 )) seconds. DNS did move; slow resolvers may need up to the old TTL. Re-run the checks later with 'bash $HERE/cutover.sh verify', or roll back"
}

# ---- step 3 -----------------------------------------------------------------------------------------------------
verify_live() {
  say "== 3. live checks through DNS over HTTPS (retried for about a minute)"
  local hosts=() entry i
  for entry in ${HOSTS[@]+"${HOSTS[@]}"}; do hosts+=(--host "$(host_name "$entry")"); done
  local extra=()
  [ ${#HOSTS[@]} -gt 0 ] && extra+=(--expect-no-vercel)
  [ "${EXPECT_BEACON:-0}" = 1 ] && extra+=(--expect-beacon)
  for i in $(seq 1 "${VERIFY_TRIES:-12}"); do
    if run_check verify --baseline "$BASE" --origin "$LIVE_URL" --doh ${hosts[@]+"${hosts[@]}"} ${extra[@]+"${extra[@]}"} > "$S/verify.out" 2>&1; then
      tee -a "$LOG" < "$S/verify.out"; return 0
    fi
    sleep 5
  done
  tee -a "$LOG" < "$S/verify.out"
  return 1
}

# ---- step 4 -----------------------------------------------------------------------------------------------------
gh_secret() {     # NAME VALUE: the value goes in on stdin, never as an argument, and is never printed
  printf '%s' "$2" | gh secret set "$1" -R "$GH" >/dev/null 2>&1 || { FOLLOWUP+=("GitHub secret $1 was not set: set it by hand (gh secret set $1 -R $GH)"); return 1; }
  say "  GitHub secret $1 set"
}
gh_var() {        # NAME VALUE (on stdin, like the secrets: no value in a process list)
  printf '%s' "$2" | gh variable set "$1" -R "$GH" >/dev/null 2>&1 || { FOLLOWUP+=("GitHub variable $1 was not set: gh variable set $1 -R $GH --body '<value>'"); return 1; }
  say "  GitHub variable $1 set"
}

github_phase() {
  say "== 4. GitHub: secrets and variables, push $BRANCH to $DEFAULT_BRANCH, watch $DEPLOY_WORKFLOW"
  local ok=1 n
  gh_secret CLOUDFLARE_API_TOKEN "$CLOUDFLARE_API_TOKEN" || ok=0
  gh_secret CLOUDFLARE_ACCOUNT_ID "$CLOUDFLARE_ACCOUNT_ID" || ok=0
  if [ "${NEEDS_FONTAWESOME_TOKEN:-0}" = 1 ]; then
    # The repo's .npmrc sends @fortawesome/* to npm.fontawesome.com; the token is the one in ~/.npmrc.
    local fa; fa=$(fa_token)
    if [ -n "$fa" ]; then gh_secret FONTAWESOME_NPM_AUTH_TOKEN "$fa" || ok=0; else FOLLOWUP+=("FONTAWESOME_NPM_AUTH_TOKEN not found in ~/.npmrc: set the GitHub secret by hand"); ok=0; fi
    unset fa
  fi
  load_vercel_values
  for n in ${GH_VARS_FROM_VERCEL[@]+"${GH_VARS_FROM_VERCEL[@]}"}; do
    gh_var "$n" "$(vercel_value "$n")" || ok=0
  done
  gh_var "$CUTOVER_VAR" true || ok=0
  if [ $ok = 0 ]; then FOLLOWUP+=("the branch was NOT pushed to $DEFAULT_BRANCH because a secret or variable is missing; finish above, then: git -C $R push origin HEAD:$DEFAULT_BRANCH"); return 0; fi
  git -C "$R" fetch -q origin || { FOLLOWUP+=("git fetch failed; push by hand: git -C $R push origin HEAD:$DEFAULT_BRANCH"); return 0; }
  if ! git -C "$R" merge-base --is-ancestor "origin/$DEFAULT_BRANCH" HEAD; then
    FOLLOWUP+=("origin/$DEFAULT_BRANCH moved past $BRANCH: merge it into the branch and push by hand. The site is live on the Worker you deployed in step 1")
    return 0
  fi
  local sha run="" i
  sha=$(git -C "$R" rev-parse HEAD)
  if git -C "$R" push -q origin "HEAD:$DEFAULT_BRANCH"; then
    echo "$sha" > "$MAIN_PUSHED"
    say "  $DEFAULT_BRANCH is now ${sha:0:8}"
  else
    FOLLOWUP+=("push to $DEFAULT_BRANCH failed: git -C $R push origin HEAD:$DEFAULT_BRANCH"); return 0
  fi
  for i in $(seq 1 24); do
    run=$(gh run list -R "$GH" --workflow "$DEPLOY_WORKFLOW" --commit "$sha" --limit 1 --json databaseId -q '.[0].databaseId' 2>/dev/null || true)
    [ -n "$run" ] && break
    sleep 5
  done
  if [ -z "$run" ]; then FOLLOWUP+=("no $DEPLOY_WORKFLOW run was found for ${sha:0:8}: open the Actions tab of $GH")
  elif gh run watch -R "$GH" "$run" --exit-status >/dev/null 2>&1; then say "  $DEPLOY_WORKFLOW: success"
  else FOLLOWUP+=("$DEPLOY_WORKFLOW FAILED for ${sha:0:8} (the Worker keeps serving the step 1 deploy): gh run view $run -R $GH --log-failed"); fi
}

# ---- step 5 -----------------------------------------------------------------------------------------------------
pause_vercel() {
  say "== 5. pause the Vercel project (paused, never deleted)"
  local pw=${PAUSE_WAIT:-auto} ttl=0 waited=0 left=0
  if [ "$pw" = auto ]; then
    if [ -s "$SNAP" ] && [ -s "$FLIP_TIME" ]; then
      ttl=$(max_old_ttl)
      left=$(( $(cat "$FLIP_TIME") + ttl - $(date +%s) ))
    fi
  else
    left=$pw
  fi
  if [ "$left" -gt 0 ]; then
    say "  waiting $left s so that resolvers which cached the old records (TTL ${ttl}s) still find Vercel. Ctrl-C is safe: run 'bash $HERE/cutover.sh pause' later. PAUSE_WAIT=0 skips the wait"
    WAITING=1
    while [ "$waited" -lt "$left" ]; do sleep 30; waited=$((waited + 30)); done
    WAITING=0
  fi
  vapi "/v1/projects/$P/pause" -X POST >/dev/null || die "could not pause the Vercel project $P: pause it in the dashboard (the site is already served by the Worker)"
  local state; state=$(vapi "/v9/projects/$P" | python3 -c "import sys,json;print('paused' if json.load(sys.stdin).get('paused') else 'running')" 2>/dev/null || echo ?)
  say "  Vercel project $VERCEL_NAME is $state"
  [ "$state" = paused ] || FOLLOWUP+=("Vercel did not confirm the pause: check the dashboard")
}

# ---- rollback ---------------------------------------------------------------------------------------------------
do_rollback() {
  local rc=0
  say "== ROLLBACK: Worker domains off, DNS records restored, Vercel unpaused, GitHub deploy switch off"
  undo_dns || rc=1
  if [ $rc = 0 ] && [ -s "$SNAP" ]; then
    mv "$SNAP" "$SNAP.restored-$(date +%Y%m%dT%H%M%S)"; say "  DNS restored; the snapshot was renamed so that a new run is allowed"
  elif [ $rc != 0 ]; then
    say "  DNS is NOT fully restored: fix the lines above by hand. The snapshot stays at $SNAP (readable copy: $SNAP_TXT)"
  fi
  unpause_vercel || rc=1
  if gh variable set "$CUTOVER_VAR" -R "$GH" --body false >/dev/null 2>&1; then say "  GitHub variable $CUTOVER_VAR set to false (the deploy workflow stops)"; else say "  could not set $CUTOVER_VAR=false: gh variable set $CUTOVER_VAR -R $GH --body false"; fi
  if [ -f "$MAIN_PUSHED" ]; then
    say "  $DEFAULT_BRANCH holds the Cloudflare commits ($(cut -c1-8 "$MAIN_PUSHED")). That does no harm while Vercel serves (its build ignores them), revert them only if you want them gone."
  fi
  say "== rollback done: open https://$CANONICAL from outside and check it"
  return $rc
}

summary() {       # full | part
  local f
  if [ ${#FOLLOWUP[@]} -gt 0 ]; then
    say "NEEDS YOU:"
    for f in "${FOLLOWUP[@]}"; do say "  - $f"; done
  fi
  if [ "${1:-full}" != full ]; then say "step finished (see above)"; return 0; fi
  say "$SLUG DONE. $TITLE is served by the Worker $WORKER; the Vercel project $VERCEL_NAME is paused."
  cat <<EOF | tee -a "$LOG"

AFTER THIS (printed, NOT run):
  - Watch it for a quiet week, then delete the paused Vercel project yourself (echo y | vercel project rm $VERCEL_NAME --scope $TEAM).
  - Left on purpose: the wildcard A records (*.ezeikelpemberton.photography, proxied to Vercel IPs), the CAA records and _domainconnect. Delete the wildcard with the Vercel project if nothing uses a subdomain.
  - Open https://www.ezeikelpemberton.photography in a blocker-free browser and check that the beacon's POST to /cdn-cgi/rum answers 204.
  - Keep $SNAP_TXT (only DNS records, no secrets) for as long as you want the rollback option.
EOF
}

case "${1:-all}" in
  rollback) STANDALONE=1; do_rollback; exit $? ;;
  verify)   STANDALONE=1; verify_live || die "live checks failed: DNS has moved but the Worker does not answer like the old site yet. Wait for the old TTL and run this again, or roll back"
            say "live checks passed. Next: bash $HERE/cutover.sh github   then   bash $HERE/cutover.sh pause"; exit 0 ;;
  github)   STANDALONE=1; github_phase; summary part; exit 0 ;;
  pause)    STANDALONE=1; pause_vercel; summary full; exit 0 ;;
  all)      ;;
  *)        echo "usage: bash $0 [rollback|verify|github|pause]"; exit 2 ;;
esac

preflight
deploy_worker
dns_phase
if [ ${#HOSTS[@]} -gt 0 ]; then
  verify_live || die "the live checks failed after the DNS move. The Worker is deployed and DNS points at it, Vercel is still running. Fix forward, or roll back"
fi
github_phase
pause_vercel
summary
