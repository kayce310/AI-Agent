#!/bin/bash
# Batch mark all untracked blueprint files
# Usage: bash scripts/batch-mark-blueprints.sh

BASE="knowledge/blueprints"
CMD="npx tsx src/scripts/kato-state-manager.ts mark"

# Markdown files -> ingest into wiki
$CMD "$BASE/awesome-design-raw.md" reference_created 
$CMD "$BASE/awesome-gpt-image-2.md" reference_created
$CMD "$BASE/kato-ui-brief.md" reference_created
$CMD "$BASE/placeholder.md" reference_created

# PDF files -> reference_created
$CMD "$BASE/AD0758978.pdf" reference_created
$CMD "$BASE/Báo cáo giai đoạn 1 OVAP-X1-1.pdf" reference_created
$CMD "$BASE/Gilbert_Strang_Linear_Algebra_and_Its_Applicatio_230928_225121 (1).pdf" reference_created
$CMD "$BASE/Introduction to aircraft flight mechanics (1).pdf" reference_created
$CMD "$BASE/Space Vehicle Dynamics and Control.pdf" reference_created

# Directories -> archived
$CMD "$BASE/OVAP-X1-Flight-Control-1.4" archived
$CMD "$BASE/OVAP-X1-Flight-Control-1.5" archived
$CMD "$BASE/queue" archived