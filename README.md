# Endoscopy reader study

GitHub Pages hosts the exact original 100 images and Real / Synthetic / Unsure assessment. Completed answers are transferred to a prefilled Microsoft Form owned by the study owner’s Mayo Clinic account. Participants finish by selecting **Submit in Microsoft Forms**. Microsoft Forms then confirms receipt and stores the response privately.

Study website: https://wangyichen25.github.io/endoscopy-real-or-synthetic/

## Access and submission

Mayo has disabled external respondents for this form. A **Mayo Clinic account is required** for the final submission. The public image-review page explains this before the assessment. No password or GitHub credential is placed in the page.

The final screen says **Continue to Microsoft Forms** and explains that continuing does not itself save a response. Name, numeric experience, the single Yes/No authorship permission, all 100 image judgments, and the existing sharing acknowledgment are transferred using the supported Forms prefilled-link feature. If Forms offers a previous draft, choose **New draft** to use the newly transferred answers. The site never claims that opening Forms is proof of receipt.

The name/experience/authorship inputs have no default responses. Image judgments must all be completed before transfer. Unsure counts as an answer. The unanswered-image list links directly to missing items. Drafts and JSON backups remain available in the browser. This update preserves the study fingerprint and existing saved drafts.

## Stored data

The Forms response records the Mayo sign-in name/email and submission time, profile answers, sharing acknowledgment, and a readable 100-line answer block. That block includes the fixed study fingerprint and a response UUID. `forms-transfer.js` validates completeness before transfer and exports an independent parser for checking downloaded records. Each B001–B100 judgment maps to the unchanged image hash in `study.json`. Forms completion duration measures only the final submission step, not the 100-image assessment. Individual decision timestamps remain in the optional original JSON backup, rather than the short Forms answer block.

Prefilled answers are editable in Microsoft Forms. Exports must be checked with the parser before analysis. The form permits repeat submissions; deduplicate exact response UUIDs and investigate conflicting duplicates during analysis. One clearly marked QA test response, UUID `00000000-0000-4000-8000-202611150001`, was saved and read back successfully. **Exclude that record from the study.**

No response data, Mayo account credentials, prior reader identities, answer key, or model weights are published in this repository. Image bytes remain separate release assets. Dataset attribution and the CC BY 4.0 license accompany the site.
