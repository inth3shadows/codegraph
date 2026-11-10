# CommonJS bug tracked — 2026-11-08

User approved creating the separate fork tracking issue. Created and fetched back https://github.com/inth3shadows/codegraph/issues/27 (open), title: CommonJS: missing module exports resolve to unrelated unimported class methods. GitHub readback body exactly matches the saved tracking-issue-body.md (6400 characters). No duplicate creation was attempted after context compaction.

The self-contained issue includes the three-file reproduction, commands, tested revisions, controls, root-cause analysis, related upstream work and limitations. Verified missing-member counterexample on em.40, pristine upstream main f72c9d2efb14454ff4f9fd7b8460abd82f19a287 and pristine upstream v1.6.2 6560052a6f856855d3f71eee838fd66ccfa4285d. This failure is not introduced by fork customization. 18 fresh indexes completed; em.40/main have 5 passing cases and 1 semantic failure each, release has 4 passing cases and 2 failures because its real-export control also fails. Kernel0/WASM only. No source fix or deployment.

Evidence directory: /home/ericm/personal_projects/codegraph-qa/codex-20261107-122850-780/.review/commonjs-missing-export-2026-11-08/. Files include bug-report.md, reproduce.mjs, three result JSONs, case source/snapshots, checksums.json and the actual posted tracking-issue-body.md. Original evidence checksums exclude the subsequently added tracking-issue-body.md.

First bug remains https://github.com/inth3shadows/codegraph/issues/26. Existing first-bug QA evidence PR remains https://github.com/inth3shadows/codegraph-qa/pull/27; no PR changes were made in this issue-filing step. Do not confuse codegraph issue27 with codegraph-qa PR27.

Official upstream reporting remains conditional on Tuesday, November 10, after final verification and duplicate/related-issue review. For this CommonJS variant review upstream2952 and3162; do not claim a wholly novel family. No official upstream issue/comment has been created by this step. Follow the existing Tuesday plan and ask before moving to another step, consistent with the user's instruction. No resolver fix, merge, deployment or new investigation authorized here.

Original T0 pilot remains stopped and uncommitted; its source files were not edited in this step. Current dirty working tree is the preserved T0 work plus private .review evidence. Do not commit/pull/reset it. The prior investigation handoff's filing-pending status is superseded by this checkpoint.
