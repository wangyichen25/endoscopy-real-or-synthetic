import fs from 'node:fs';import crypto from 'node:crypto';
const study=JSON.parse(fs.readFileSync('dist/study.json'));
if(study.images.length!==100||new Set(study.images.map(r=>r.id)).size!==100)throw Error('Wrong image set');
if(JSON.stringify(fs.readdirSync('dist/images').sort())!==JSON.stringify(study.images.map(r=>`${r.id}.png`).sort()))throw Error('Unexpected image files');
for(const row of study.images){const data=fs.readFileSync(`dist/${row.path}`);if(data.length!==row.bytes||crypto.createHash('sha256').update(data).digest('hex')!==row.sha256)throw Error(`Image mismatch ${row.id}`);}
const config=JSON.parse(fs.readFileSync('dist/config.json'));if(config.collectionEnabled&&(!config.apiBase.startsWith('https://')||!config.apiBase))throw Error('Automatic submissions require a configured HTTPS backend');
console.log(JSON.stringify({status:'passed',images:100,collectionEnabled:config.collectionEnabled,packageFingerprint:study.packageFingerprint}));
