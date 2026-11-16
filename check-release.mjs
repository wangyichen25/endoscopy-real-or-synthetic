import fs from 'node:fs';import crypto from 'node:crypto';
const study=JSON.parse(fs.readFileSync('dist/study.json'));
if(study.images.length!==100||new Set(study.images.map(r=>r.id)).size!==100)throw Error('Wrong image set');
if(JSON.stringify(fs.readdirSync('dist/images').sort())!==JSON.stringify(study.images.map(r=>`${r.id}.png`).sort()))throw Error('Unexpected image files');
for(const row of study.images){const data=fs.readFileSync(`dist/${row.path}`);if(data.length!==row.bytes||crypto.createHash('sha256').update(data).digest('hex')!==row.sha256)throw Error(`Image mismatch ${row.id}`);}
const config=JSON.parse(fs.readFileSync('dist/config.json'));
if(config.collectionEnabled){
  if(config.collectionMethod==='microsoftForms'){
    const target=config.microsoftForms,u=new URL(target.url);
    if(u.origin!=='https://forms.cloud.microsoft'||u.pathname!=='/Pages/ResponsePage.aspx'||!u.searchParams.get('id')||config.previewMode||!['name','experience','authorship','judgments','agreement'].every(k=>/^r[a-f0-9]{32}$/.test(target.fields?.[k]??'')))throw Error('Invalid active Microsoft Forms destination');
    if(!fs.existsSync('dist/forms-transfer.js'))throw Error('Missing Microsoft Forms transfer helper');
  }else if(!config.apiBase.startsWith('https://'))throw Error('Automatic submissions require a configured HTTPS backend');
}
if(!/^[a-f0-9]{64}$/.test(config.scoreCommitment??'')||!fs.existsSync('dist/score.js'))throw Error('Missing aggregate scoring support');
if(JSON.stringify(study.choices)!==JSON.stringify(['real','generated'])||study.version!==3||!study.previousPackageFingerprint||!config.legacyScoreCommitment)throw Error('Binary protocol or historical compatibility missing');
console.log(JSON.stringify({status:'passed',images:100,collectionEnabled:config.collectionEnabled,packageFingerprint:study.packageFingerprint}));
