# Product Requirements Document｜产品需求文档

## Problem｜问题

The product solves the AI Coding false-completion problem.

## Goals｜目标

Deliver a working Skeleton Spike that detects missing required sections.

## Non-goals｜非目标

Full implementation of the v1.0 OCN.

## Users｜用户

Solo builders and small AI Coding teams.

## Scenarios｜使用场景

- Scenario A — user runs `ocn check` after creating a PRD with all required sections present.
- Scenario B — user adds the previously-missing Scenarios section and re-runs `ocn check`.
- Scenario C — user inspects the bilingual error message for a missing section.

## Requirements｜需求

- Must detect missing Scenarios section.
- Must return ERR_ARTIFACT_INVALID with exit code 2 when sections are missing.
- Must return OK with exit code 0 when all required sections are present.

## Risks｜风险

Skeleton Spike scope creep into Phase 2 features.
