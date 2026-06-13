#!/usr/bin/env bash
# OCN Auto Mode (AM-009 / DEC-034) — User Acceptance Test
# Runs the BUILT dist CLI against real temp projects, asserting acceptance.
set -u
OCN="node /home/timou/repos/OCN/dist/cli/index.js"
PASS=0; FAIL=0
ROOT=$(mktemp -d /tmp/ocn-uat.XXXXXX)
trap 'rm -rf "$ROOT"' EXIT

ok()   { PASS=$((PASS+1)); printf '  \033[32mPASS\033[0m %s\n' "$1"; }
bad()  { FAIL=$((FAIL+1)); printf '  \033[31mFAIL\033[0m %s\n' "$1"; [ -n "${2:-}" ] && printf '       └─ %s\n' "$2"; }
# assert_eq <desc> <expected> <actual>
assert_eq() { [ "$2" = "$3" ] && ok "$1" || bad "$1" "expected[$2] got[$3]"; }
# assert_contains <desc> <haystack> <needle>
assert_contains() { case "$2" in *"$3"*) ok "$1";; *) bad "$1" "missing: $3";; esac; }
hdr() { printf '\n\033[1m── %s ──\033[0m\n' "$1"; }

newproj() { # <name> <sop>
  local d="$ROOT/$1"; mkdir -p "$d"; ( cd "$d" && $OCN init --tier minimal --sop-version "$2" >/dev/null 2>&1 ); echo "$d";
}
jq_field() { node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const o=JSON.parse(s);const p=process.argv[1].split(".");let v=o;for(const k of p)v=v?.[k];console.log(typeof v==="object"?JSON.stringify(v):v)}catch(e){console.log("PARSE_ERR")}})' "$1"; }
audit_has() { # <projdir> <eventType> <field=value>  → prints matching count
  node -e '
    const fs=require("fs");const [dir,et,kv]=process.argv.slice(1);
    const [k,val]=kv?kv.split("="):[null,null];
    let t="";try{t=fs.readFileSync(dir+"/.ocoding/audit/audit-events.jsonl","utf8")}catch{console.log(0);process.exit()}
    const n=t.split("\n").filter(Boolean).map(JSON.parse).filter(e=>e.eventType===et&&(!k||String(k.split(".").reduce((o,x)=>o?.[x],e))===val)).length;
    console.log(n);' "$1" "$2" "${3:-}";
}

#############################################
hdr "UAT-1  Manual mode is the default"
P=$(newproj p1 0.3.0)
cd "$P"
OUT=$($OCN advance --json 2>/dev/null); CODE=$?
assert_eq "human advance with no artifact → gate fail (exit 1)" 1 $CODE
OUT=$(OCN_ACTOR=ai_agent $OCN advance --json 2>/dev/null); CODE=$?
assert_eq "AI advance in manual mode refused (exit 4)" 4 $CODE
assert_eq "  refusal reason = automation_not_enabled" automation_not_enabled "$(echo "$OUT" | jq_field data.reason)"
BR=$($OCN brief --json 2>/dev/null)
assert_contains "manual brief keeps legacy 'AI must NOT advance'" "$(echo "$BR" | jq_field data.aiGovernanceReminder)" "AI must NOT advance project state"
assert_eq "manual brief has no automation field" undefined "$(echo "$BR" | jq_field automation)"
ST=$($OCN auto status --json 2>/dev/null)
assert_eq "auto status: phase1 off by default" false "$(echo "$ST" | jq_field data.config.phase1)"
assert_eq "auto status: phase2 off by default" false "$(echo "$ST" | jq_field data.config.phase2)"
assert_eq "auto status writes NO audit (pull mode)" 0 "$(audit_has "$P" auto_mode_changed)"

#############################################
hdr "UAT-2  The switch is human-only"
OUT=$(OCN_ACTOR=ai_agent $OCN auto on --phase 1 --json 2>/dev/null); CODE=$?
assert_eq "AI cannot turn auto on (exit 4)" 4 $CODE
assert_eq "  reason = automation_switch_human_only" automation_switch_human_only "$(echo "$OUT" | jq_field data.reason)"
assert_eq "  config untouched: still phase1 off" false "$($OCN auto status --json | jq_field data.config.phase1)"

#############################################
hdr "UAT-3  Phase-1 auto: AI walks DISCOVERY→PLAN unattended, stops at PLAN→BUILD"
$OCN auto on --phase 1 >/dev/null 2>&1
assert_eq "human turned phase1 on" true "$($OCN auto status --json | jq_field data.config.phase1)"
BR=$($OCN brief --json 2>/dev/null)
assert_contains "brief now shows AUTO MODE delegation" "$(echo "$BR" | jq_field data.aiGovernanceReminder)" "AUTO MODE"
# Walk the 11 phase-1 steps as the AI agent
STEPS="project-brief scope prd acceptance-criteria technical-architecture information-architecture data-model logic-backbone api-contract test-strategy mvp-plan"
WALKED=0
for s in $STEPS; do
  $OCN doc create "$s" >/dev/null 2>&1
  OUT=$(OCN_ACTOR=ai_agent $OCN advance --rationale "背景:$s done;依据:gate green;操作:advance" --json 2>/dev/null)
  [ "$(echo "$OUT" | jq_field ok)" = "true" ] && WALKED=$((WALKED+1)) || { bad "advance after $s" "$(echo "$OUT" | jq_field message.en)"; break; }
done
assert_eq "AI auto-advanced all 11 planning steps" 11 $WALKED
ST=$($OCN status --json 2>/dev/null)
assert_eq "cursor landed at state_plan" state_plan "$(echo "$ST" | jq_field data.currentStateId)"
assert_eq "cursor at step_build_plan (last phase-1 step)" step_build_plan "$(echo "$ST" | jq_field data.currentStepId)"
# The PLAN→BUILD boundary advance targets phase 2 → refused under phase1-only
$OCN doc create build-plan >/dev/null 2>&1
OUT=$(OCN_ACTOR=ai_agent $OCN advance --rationale "cross into build" --json 2>/dev/null); CODE=$?
assert_eq "AI stopped at PLAN→BUILD boundary (exit 4)" 4 $CODE
assert_eq "  reason = automation_not_enabled (phase2 not granted)" automation_not_enabled "$(echo "$OUT" | jq_field data.reason)"
assert_eq "every AI advance audited as ai_agent" 11 "$(audit_has "$P" advance_succeeded actor=ai_agent)"

#############################################
hdr "UAT-4  Decision trace & replay (ocn auto trace)"
TR=$($OCN auto trace --limit 200 --json 2>/dev/null)
NSUC=$(node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const o=JSON.parse(s);console.log(o.data.entries.filter(e=>e.eventType==="advance_succeeded").length)})' <<<"$TR")
assert_eq "trace replays all 11 AI advances" 11 "$NSUC"
HASR=$(node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const o=JSON.parse(s);const a=o.data.entries.filter(e=>e.eventType==="advance_succeeded");console.log(a.every(e=>typeof e.rationale==="string"&&e.rationale.length>0))})' <<<"$TR")
assert_eq "every traced advance carries a rationale" true "$HASR"
HASCTX=$(node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const o=JSON.parse(s);const a=o.data.entries.find(e=>e.eventType==="advance_succeeded");console.log(a.data.context.gatePassed)})' <<<"$TR")
assert_eq "engine machine-context recorded (gatePassed)" true "$HASCTX"

#############################################
hdr "UAT-5  Phase-2 auto: AI task check + milestone loop (multi-P build plan)"
Q=$(newproj p2 0.5.0)
cd "$Q"
# Seed to step_build_plan, write AC + a P0 build plan with one task
node -e '
const fs=require("fs");const d=process.argv[1];
const s=JSON.parse(fs.readFileSync(d+"/.ocoding/state.json","utf8"));
s.currentStateId="state_plan";s.currentStepId="step_build_plan";
fs.writeFileSync(d+"/.ocoding/state.json",JSON.stringify(s,null,2)+"\n");' "$Q"
cat > "$Q/docs/03-acceptance-criteria.md" <<'MD'
# AC

## Acceptance Criteria

- AC-001: P0 done
- AC-002: P1 done
MD
bp() { # writes build plan with the given task block
cat > "$Q/docs/11-build-plan.md" <<MD
# Build Plan｜构建计划

## Target Scope｜目标范围
## Files Expected to Change｜预期变更文件
## Implementation Tasks｜实施任务
## Non-goals｜非目标
## Risk Points｜风险点
## Verification Commands｜验证命令

## Task Specs｜任务规格

$1
MD
}
bp "### task_p0
- goal: ship P0
- traces: AC-001
- verify: true
- dod: p0 ok
"
$OCN gate >/dev/null 2>&1   # freeze ledger (may exit 1 on readiness; ledger still written)
test -f "$Q/.ocoding/task-ledger.json" && ok "build-plan gate froze the task ledger" || bad "ledger not frozen"
# move into BUILD
node -e 'const fs=require("fs");const d=process.argv[1];const s=JSON.parse(fs.readFileSync(d+"/.ocoding/state.json","utf8"));s.currentStateId="state_build";s.currentStepId="step_implementation_log";fs.writeFileSync(d+"/.ocoding/state.json",JSON.stringify(s,null,2)+"\n");' "$Q"
# AI task check without phase2 → refused
OUT=$(OCN_ACTOR=ai_agent $OCN task check --rationale x --json 2>/dev/null); CODE=$?
assert_eq "AI task check refused without phase2 (exit 4)" 4 $CODE
$OCN auto on --phase 2 >/dev/null 2>&1
# AI task check without rationale → refused
OUT=$(OCN_ACTOR=ai_agent $OCN task check --json 2>/dev/null); CODE=$?
assert_eq "phase2 on but no rationale → refused" 4 $CODE
assert_eq "  reason = automation_rationale_required" automation_rationale_required "$(echo "$OUT" | jq_field data.reason)"
# AI checks P0 (frozen command `true` exits 0)
OUT=$(OCN_ACTOR=ai_agent $OCN task check --rationale "背景:task_p0;依据:冻结命令 true exit 0;操作:check" --json 2>/dev/null)
assert_eq "AI task check P0 → done" done "$(echo "$OUT" | jq_field data.status)"
assert_eq "task_completed audited as ai_agent" 1 "$(audit_has "$Q" task_completed actor=ai_agent)"
FC=$(audit_has "$Q" task_completed)
# Milestone loop: rewind to step_build_plan, append P1, re-gate, check P1
OUT=$(OCN_ACTOR=ai_agent $OCN rewind --to step_prd --reason "escape" --json 2>/dev/null); CODE=$?
assert_eq "AI rewind to non-milestone target refused (exit 4)" 4 $CODE
OUT=$(OCN_ACTOR=ai_agent $OCN rewind --to step_build_plan --reason "P0完成,回拨追加P1" --json 2>/dev/null); CODE=$?
assert_eq "AI milestone rewind to step_build_plan → ok" 0 $CODE
assert_eq "  landed at step_build_plan" step_build_plan "$(echo "$OUT" | jq_field data.to.stepId)"
# Append P1 task (P0 kept verbatim → its done status carries over by hash)
bp "### task_p0
- goal: ship P0
- traces: AC-001
- verify: true
- dod: p0 ok

### task_p1
- goal: ship P1
- traces: AC-002
- verify: true
- dod: p1 ok
"
$OCN gate >/dev/null 2>&1
P0STATUS=$(node -e 'const fs=require("fs");const l=JSON.parse(fs.readFileSync(process.argv[1]+"/.ocoding/task-ledger.json","utf8"));console.log(l.tasks.find(t=>t.id==="task_p0").status)' "$Q")
assert_eq "after re-gate, P0 stays done (hash-carry)" done "$P0STATUS"
P1STATUS=$(node -e 'const fs=require("fs");const l=JSON.parse(fs.readFileSync(process.argv[1]+"/.ocoding/task-ledger.json","utf8"));console.log(l.tasks.find(t=>t.id==="task_p1").status)' "$Q")
assert_eq "P1 appended as pending" pending "$P1STATUS"
node -e 'const fs=require("fs");const d=process.argv[1];const s=JSON.parse(fs.readFileSync(d+"/.ocoding/state.json","utf8"));s.currentStateId="state_build";s.currentStepId="step_implementation_log";fs.writeFileSync(d+"/.ocoding/state.json",JSON.stringify(s,null,2)+"\n");' "$Q"
OUT=$(OCN_ACTOR=ai_agent $OCN task check --rationale "背景:task_p1;依据:冻结命令 true;操作:check" --json 2>/dev/null)
assert_eq "AI task check P1 → done (milestone loop closes)" done "$(echo "$OUT" | jq_field data.status)"

#############################################
hdr "UAT-6  Circuit breaker trips and resume re-arms"
R=$(newproj p3 0.3.0)
cd "$R"
$OCN auto on --phase 1 >/dev/null 2>&1
# lower threshold to 2 via config surgery
node -e 'const fs=require("fs");const f=process.argv[1]+"/.ocoding/config.yaml";fs.writeFileSync(f,fs.readFileSync(f,"utf8").replace(/maxConsecutiveGateFailures: \d+/,"maxConsecutiveGateFailures: 2"))' "$R"
OCN_ACTOR=ai_agent $OCN advance --rationale "try1" --json >/dev/null 2>&1
SUS=$(node -e 'const fs=require("fs");console.log(JSON.parse(fs.readFileSync(process.argv[1]+"/.ocoding/automation-runtime.json","utf8")).suspended)' "$R")
assert_eq "1st AI gate failure: not yet suspended" false "$SUS"
OCN_ACTOR=ai_agent $OCN advance --rationale "try2" --json >/dev/null 2>&1
SUS=$(node -e 'const fs=require("fs");console.log(JSON.parse(fs.readFileSync(process.argv[1]+"/.ocoding/automation-runtime.json","utf8")).suspended)' "$R")
assert_eq "2nd failure trips the breaker → suspended" true "$SUS"
assert_eq "suspend event audited as actor=system" 1 "$(audit_has "$R" auto_mode_changed actor=system)"
OUT=$(OCN_ACTOR=ai_agent $OCN advance --rationale "try3" --json 2>/dev/null); CODE=$?
assert_eq "AI advance while suspended → refused (exit 4)" 4 $CODE
assert_eq "  reason = automation_suspended" automation_suspended "$(echo "$OUT" | jq_field data.reason)"
CODE=$($OCN advance --json >/dev/null 2>&1; echo $?)
assert_eq "human advance NOT blocked by suspension (gate fail=1)" 1 $CODE
$OCN auto resume >/dev/null 2>&1
SUS=$(node -e 'const fs=require("fs");console.log(JSON.parse(fs.readFileSync(process.argv[1]+"/.ocoding/automation-runtime.json","utf8")).suspended)' "$R")
assert_eq "ocn auto resume re-arms (suspended=false)" false "$SUS"

#############################################
hdr "UAT-7  Hard human-only zones refuse AI in every mode"
S=$(newproj p4 0.5.0)
cd "$S"
$OCN auto on --phase all >/dev/null 2>&1
CODE=$(OCN_ACTOR=ai_agent $OCN cycle new --yes --json >/dev/null 2>&1; echo $?)
assert_eq "AI cycle new refused even in full auto (exit 4)" 4 $CODE
CODE=$(OCN_ACTOR=ai_agent $OCN readiness waive rdy_network_engineer --reason r --probe true --json >/dev/null 2>&1; echo $?)
assert_eq "AI readiness waive refused (exit 4)" 4 $CODE
CODE=$(OCN_ACTOR=ai_agent $OCN sop upgrade --plan --json >/dev/null 2>&1; echo $?)
assert_eq "AI sop upgrade refused (exit 4)" 4 $CODE

#############################################
hdr "UAT-8  MCP surface unchanged; full-auto governance; manual restored on off"
# MCP tool list still exactly 7, no auto/advance/task tool
NT=$(node -e 'import("/home/timou/repos/OCN/dist/mcp/tools/index.js").then(m=>{console.log(m.ALLOWED_TOOLS.length+"|"+m.ALLOWED_TOOL_NAMES.join(","))})')
assert_eq "MCP exposes exactly 7 tools" 7 "${NT%%|*}"
case "${NT#*|}" in *auto*|*advance*|*task*|*rewind*|*cycle*) bad "MCP names leak automation verbs" "${NT#*|}";; *) ok "no auto/advance/task/rewind/cycle in MCP names";; esac
cd "$S"
GOV=$($OCN brief --json 2>/dev/null | jq_field data.aiGovernanceReminder)
assert_contains "full-auto brief names both phases" "$GOV" "phase 1 (DISCOVERY→PLAN) and phase 2 (BUILD→VERIFY)"
NP=$($OCN next-prompt --json 2>/dev/null | jq_field data.prompt)
assert_contains "next-prompt has Automation loop section" "$NP" "## Automation loop"
assert_contains "  loop lists machine stop conditions" "$NP" "STOP and hand back to the human"
$OCN auto off >/dev/null 2>&1
GOV=$($OCN brief --json 2>/dev/null | jq_field data.aiGovernanceReminder)
assert_contains "after 'auto off' brief restores legacy reminder" "$GOV" "AI must NOT advance project state"
CODE=$(OCN_ACTOR=ai_agent $OCN advance --rationale x --json >/dev/null 2>&1; echo $?)
assert_eq "after off, AI advance refused again (exit 4)" 4 $CODE

#############################################
printf '\n\033[1m════════════════════════════════════\033[0m\n'
printf '  UAT RESULT:  \033[32m%d passed\033[0m / \033[31m%d failed\033[0m\n' "$PASS" "$FAIL"
printf '\033[1m════════════════════════════════════\033[0m\n'
[ "$FAIL" -eq 0 ]
