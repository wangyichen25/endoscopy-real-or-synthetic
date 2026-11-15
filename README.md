# Endoscopy reader study

A GitHub Pages assessment of the same 100 images, in the same order, as the original five-reader SNEL study. Participants choose Real, Synthetic, or Unsure. The profile asks for full name, years of endoscopy experience (including training), and separate permission choices for individual authorship and group authorship/collaborator listing. Participation does not establish authorship.

The image set is byte-identical to the original PNG packet. Image bytes are separate release assets, outside Git. Dataset credits and the CC BY 4.0 license accompany the site. No answer key, previous reader identities, prior responses, or model weights are included.

## Current status

**Preview only: the study is not open to responses.** GitHub Pages serves the interface and images. Automatic private submission requires a separately hosted API and database. `config.json` deliberately keeps participation closed until the live backend is configured and verified.

## Collection contract

The backend must implement `POST /api/responses`, accept schema version 2 packets bound to `study.json`, validate exactly 100 decisions, and return `{ "receipt": { "id": "<submissionId>", "receivedAt": "<ISO time>" } }` only after durable storage. Exact retries must return the original receipt without adding rows. It must reject attempts to alter a submitted response and provide no public response-list endpoint. The production API must allow the `https://wangyichen25.github.io` browser origin.

Browser storage holds an unsubmitted draft and downloadable JSON backup. It is not the study database. The site shows a confirmation only after the API acknowledges the response. There are no analytics or external fonts. Responses and personal details must never be committed or uploaded as public release assets.

## Opening the study

After deploying and testing the private backend, set `dist/config.json` to its HTTPS origin and `collectionEnabled: true`. Commit the reviewed configuration, redeploy using the existing frozen image release, and verify a complete test response plus private owner export before distributing invitations. The previous five-reader analysis remains separate and unchanged.
