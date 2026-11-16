# Endoscopy reader study

Website: https://wangyichen25.github.io/endoscopy-real-or-synthetic/

GitHub Pages hosts the frozen 100-image assessment. Mayo Microsoft Forms stores submissions privately. A Mayo account is required; the organization disables public/external responses. Participants choose **Real or Synthetic for every image**, continue to Forms, then select Submit. Opening Forms does not confirm receipt.

## Binary protocol from November 15, 2026

The active study is version 3, with 100 required binary decisions and a distinct package fingerprint in `study.json`. New packets identify `responseMode: binary-v1` and transfer as `SNEL3.<fingerprint>.<UUID>.<100 R/S choices>`. Both packet validation and transfer generation reject Unsure and incomplete responses. The optional database backend enforces the same binary contract if it is separately activated; it is not the active collector.

All original image IDs, hashes, bytes, and order are unchanged. The five original readers, earlier Forms submissions, manuscript, and earlier analyses are preserved. Historic `SNEL2` and readable transfers retain their original fingerprint, Unsure values, and `ternary-v2` mode when decoded. Do not pool protocol versions without accounting for the response-option change.

When an unfinished earlier draft or backup is resumed, the app archives the original locally, copies its Real/Synthetic decisions to a new binary response ID, and makes each Unsure decision unanswered. Readers must replace all remaining answers before proceeding. Earlier completed score views remain readable and retain their original scoring definition. Historic Forms entries are never rewritten or resubmitted by migration.

## Collection and score

Profile: full name, numeric years of experience (0–80, decimals allowed), one Yes/No authorship permission, and sharing acknowledgment. Mayo also records authenticated name/email and submission time. Forms duration covers only the final form step. Individual decision timestamps are available in optional JSON backups.

The final Forms confirmation message contains the score return link. Use the same browser/device, or restore a completed response backup. New binary results show correct answers out of 100 and the corresponding percentage. No image-level truth or correctness is displayed. Earlier ternary scores continue to exclude Unsure from their denominator.

The private return link supplies a scoring key in its URL fragment. The app checks the commitment in `config.json`, removes the fragment from the address bar, and persists aggregate score data only. Real keys and return URLs must stay out of public source, screenshots, logs, and invitations. The current link is kept privately in `data/reader-study/binary-20261115-v1/`; the earlier link remains in its historical private folder.

This static return link is not a cryptographically verified Forms receipt. It can be forwarded and a technical participant can inspect its client-side scoring information. Forms remains the authority for actual submission. Analyze validated Forms exports, not browser-displayed scores. Prefilled Forms fields are editable, so validate version, fingerprint, IDs, order and judgment alphabet on export. Deduplicate response UUIDs and inspect repeated Mayo identities.

## QA exclusions

Exclude labeled test records with UUIDs ending `202611150001` (original integration), `202611150003` (compact transfer), `202611150004` (score), and `202611150005` (binary acceptance), each with the prefix `00000000-0000-4000-8000-`. The user’s record named “test” is also a demonstration, not part of the original five-reader dataset. No QA or new response is merged into that analysis automatically.

## Maintenance

Canonical frontend: `index.html`, `app.js`, `protocol.js`, `forms-transfer.js`, `score.js`, `style.css`, `study.json`, and `config.json`. `prepare.py` reproduces the frozen image bank and binary contract. `sync-server.py` updates the retained optional backend frontend. The active Microsoft Forms collector does not use Sites, Cloudflare, D1, or an admin token.

Run `npm test` and `npm run check` for packet validation, migration, historic parsing, compact login-safe transfers, scoring, and optional backend tests. New transfer codes remain 204 characters, avoiding the earlier AADSTS90015 long-query failure. Transfer only public question IDs and participant answers; never send the local retry token. Keep participant data private and outside public Git.
