import {choices,validateProfile,validatePacket,isLegacyPacket,migrateLegacyDraft} from './protocol.js?v=binary-v1';
import {buildFormsTransferURL} from './forms-transfer.js?v=binary-v1';
import {readScoreKey,scoreAssessment,restoreScore} from './score.js?v=binary-v1';
const $=id=>document.getElementById(id);
function takeScoreKey(){const value=new URLSearchParams(location.hash.slice(1)).get('score');if(value)history.replaceState(null,'',location.pathname+location.search);return value;}
let pendingScoreKey=takeScoreKey();
let study,config,state,index=0,ready=false,objectURL=null,loadNumber=0,saving=false,storageOK=true,completionPrompt=false;
addEventListener('hashchange',async()=>{const value=takeScoreKey();if(!value)return;pendingScoreKey=value;if(study&&config&&state)await revealScore();});
const notice=(message,error=false)=>{$('notice').textContent=message;$('notice').className=error?'error':'';};
const token=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
const storageKey=(fingerprint=state?.packageFingerprint||study.packageFingerprint)=>`snel-reader-v2:${fingerprint}`;
const scoreCommitmentFor=p=>isLegacyPacket(p,study)?config.legacyScoreCommitment:config.scoreCommitment;
let migratedDraft=false;
function currentDraft(p){if(!isLegacyPacket(p,study))return p;try{localStorage.setItem(`snel-reader-archive:${p.submissionId}`,JSON.stringify(p));}catch{}migratedDraft=true;return migrateLegacyDraft(p,study,crypto.randomUUID(),token());}
function fresh(){return {packetType:study.packetType,schemaVersion:2,packageFingerprint:study.packageFingerprint,originalPackageFingerprint:study.originalPackageFingerprint,consentVersion:study.consentVersion,submissionId:crypto.randomUUID(),submissionToken:token(),profile:null,records:study.images.map(r=>({recordId:r.id,imageSha256:r.sha256,values:{guess:''},updatedAt:null})),index:0,receipt:null,formsTransfer:null,scoreSummary:null};}
function save(){state.index=index;try{localStorage.setItem(storageKey(),JSON.stringify(state));}catch{storageOK=false;notice('This browser cannot save your progress. Keep this tab open and download a backup before leaving.',true);}}
function show(id){for(const part of ['welcome','review','complete','score'])$(part).hidden=part!==id;}
function profileToForm(){if(!state.profile)return;const p=state.profile;$('name').value=p.name;$('experience').value=p.experienceYears;for(const e of document.querySelectorAll('[name=authorship]'))e.checked=e.value===p.authorshipConsent;$('agreement').checked=p.dataSharingConsent;}
function readProfile(){return validateProfile({name:$('name').value,experienceYears:$('experience').value===''?NaN:Number($('experience').value),authorshipConsent:document.querySelector('[name=authorship]:checked')?.value,dataSharingConsent:$('agreement').checked});}
function completed(){return state.records.filter(r=>choices.includes(r.values.guess)).length;}
function update(){
  const n=completed(),missing=state.records.map((r,i)=>choices.includes(r.values.guess)?-1:i).filter(i=>i>=0);
  $('count').textContent=`${n} of 100 answered`;$('progress').value=n;$('image-title').textContent=`Image ${index+1} of 100`;$('jump').value=String(index);$('previous').disabled=index===0;$('next').textContent=index===99?'Finish':'Next';$('finish').hidden=n!==100;
  const guess=state.records[index].values.guess;
  $('answer-status').textContent=choices.includes(guess)?`Your answer: ${{real:'Real',generated:'Synthetic'}[guess]}`:'Not answered yet';
  for(const b of document.querySelectorAll('[data-guess]')){b.setAttribute('aria-pressed',String(guess===b.dataset.guess));b.disabled=!ready;}
  for(let i=0;i<100;i++)$('jump').options[i].textContent=`${i+1} — ${choices.includes(state.records[i].values.guess)?'answered':'unanswered'}`;
  $('pending').hidden=missing.length===0;
  $('unanswered-summary').textContent=missing.length?`Unanswered images (${missing.length})`:'All 100 images answered';
  $('unanswered-help').hidden=missing.length===0;
  $('unanswered-list').replaceChildren(...missing.map(i=>{const b=document.createElement('button');b.type='button';b.textContent=String(i+1);b.setAttribute('aria-label',`Go to unanswered image ${i+1}`);b.onclick=()=>{navigate(i);$('image-title').focus();$('image-title').scrollIntoView({block:'start'});};return b;}));
  if(completionPrompt){if(missing.length)notice(`${missing.length} image${missing.length===1?' is':'s are'} still unanswered. Select a number in the Unanswered images list.`,true);else{completionPrompt=false;notice(config.previewMode?'Preview only. Use test details; responses cannot be submitted yet.':'');}}
}
async function render(){if(state.scoreSummary){showScore();return;}show('review');ready=false;const current=++loadNumber;const row=study.images[index];$('image-state').hidden=false;$('image-state').textContent='Loading image…';$('image').hidden=true;update();try{const r=await fetch(row.path);if(!r.ok)throw Error();const bytes=await r.arrayBuffer();const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');if(digest!==row.sha256||bytes.byteLength!==row.bytes)throw Error();if(current!==loadNumber)return;if(objectURL)URL.revokeObjectURL(objectURL);objectURL=URL.createObjectURL(new Blob([bytes],{type:'image/png'}));const img=$('image');img.src=objectURL;await img.decode();if(current!==loadNumber)return;img.alt=`Endoscopy image ${index+1} for assessment`;img.hidden=false;$('image-state').hidden=true;ready=true;update();}catch{if(current===loadNumber){$('image-state').textContent='The image could not be verified or loaded. Use Next, then Previous to retry.';}}}
function navigate(i){index=Math.max(0,Math.min(99,i));save();render();}
function finish(){
  if(state.scoreSummary){showScore();return;}
  if(completed()!==100){completionPrompt=true;update();$('unanswered-panel').open=true;$('unanswered-summary').focus();$('unanswered-panel').scrollIntoView({block:'start'});return;}
  show('complete');const forms=config.collectionMethod==='microsoftForms';
  $('complete-title').textContent=state.receipt?'Assessment received':(forms?'Finish submission in Microsoft Forms':'Ready to submit');
  $('summary').textContent=`${state.profile.name} · ${state.profile.experienceYears} years of experience · 100 images answered`;
  $('submit-actions').hidden=Boolean(state.receipt);$('forms-draft-note').hidden=!forms;
  $('submit').textContent=forms?'Continue to Microsoft Forms':'Submit assessment';
  $('submission-info').textContent=forms?'Sign in with your Mayo account, check the transferred details, then select Submit in Microsoft Forms. Your assessment is saved only after Forms confirms receipt. Then use the score link in its confirmation message, in this same browser.':'Your judgments will be saved to the study team’s private database when you submit.';
  $('receipt').textContent=state.receipt?`Thank you. Your response was saved. Confirmation: ${state.receipt.id}.`:(!config.collectionEnabled?'Preview only. Your answers have not been sent to the study team. Automatic submission will be available after the study opens.':'');
  $('submit').disabled=!config.collectionEnabled;$('submission-info').hidden=!config.collectionEnabled;$('complete-title').focus();
}
function showScore(){
  show('score');notice('');const s=state.scoreSummary;
  $('score-value').textContent=s.decisive?`${(100*s.correct/s.decisive).toFixed(1)}%`:'No score';
  $('score-detail').textContent=isLegacyPacket(state,study)?`${s.correct} of ${s.decisive} Real/Synthetic judgments correct · ${s.unsure} Unsure`:`${s.correct} of 100 images correct`;
  $('score-explanation').hidden=!isLegacyPacket(state,study);
  $('score-explanation').textContent=s.decisive?'Unsure answers are excluded from the percentage.':'All 100 answers were Unsure, so a percentage cannot be calculated.';
  $('score-context').textContent='Calculated from your saved assessment. Submission confirmation is provided by Microsoft Forms.';
  $('score-result').hidden=false;$('score-recovery').hidden=true;$('score-title').focus();
}
async function revealScore(){
  show('score');notice('');$('score-result').hidden=true;$('score-recovery').hidden=false;
  try{
    let truth=await readScoreKey(pendingScoreKey,study,config.scoreCommitment,config.legacyScoreCommitment);
    let assessed;
    try{assessed=validatePacket(state.formsTransfer||state,study,true);}catch{
      $('score-recovery-message').textContent='Open the score link in the same browser you used for the assessment, or restore your completed response backup below. Please do not submit again.';
      return;
    }
    const summary=await scoreAssessment(assessed,study,truth,scoreCommitmentFor(assessed));
    truth=null;pendingScoreKey=null;
    state={...assessed,index:0,receipt:state.receipt??null,formsTransfer:null,scoreSummary:summary};index=0;save();showScore();
  }catch(e){pendingScoreKey=null;$('score-recovery-message').textContent=e.message;}
}
$('score-backup').onclick=download;
$('score-restore').onclick=()=>$('import').click();
function packet(){return {...validatePacket(state,study),exportedAt:new Date().toISOString(),receipt:state.receipt??null,scoreSummary:state.scoreSummary??null};}
function download(){try{const p=packet();const url=URL.createObjectURL(new Blob([JSON.stringify(p,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`endoscopy-reader-${state.submissionId}${state.receipt?'-submitted':'-backup'}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){notice(e.message,true);}}
$('profile').addEventListener('submit',event=>{event.preventDefault();if(!config.collectionEnabled&&!config.previewMode){notice('The study is not open yet. Please return when the study team shares the invitation.',true);return;}try{state.profile=readProfile();save();notice(storageOK?(config.previewMode?'Preview only. Use test details; responses cannot be submitted yet.':''):'Progress cannot be saved in this browser. Download a backup before leaving.',!storageOK);render();}catch(e){notice(e.message,true);}});
for(const b of document.querySelectorAll('[data-guess]'))b.addEventListener('click',()=>{if(!ready||state.receipt||state.scoreSummary)return;state.records[index].values.guess=b.dataset.guess;state.records[index].updatedAt=new Date().toISOString();save();update();});
$('previous').onclick=()=>navigate(index-1);$('next').onclick=()=>index===99?finish():navigate(index+1);$('jump').onchange=e=>navigate(Number(e.target.value));$('pending').onclick=()=>{for(let n=1;n<=100;n++){const i=(index+n)%100;if(!state.records[i].values.guess){navigate(i);return;}}finish();};
$('finish').onclick=finish;$('return').onclick=()=>render();$('profile-edit').onclick=()=>{profileToForm();show('welcome');};$('backup').onclick=download;$('final-backup').onclick=download;$('import-open').onclick=()=>$('import').click();
$('import').onchange=async event=>{const f=event.target.files[0];if(!f)return;try{if(f.size>150000)throw Error('The backup file is too large.');const parsed=validatePacket(JSON.parse(await f.text()),study);if(!confirm('Replace this browser’s current draft with the selected backup?'))return;state={...(pendingScoreKey?parsed:currentDraft(parsed)),receipt:null,index:0,formsTransfer:null,scoreSummary:null};index=0;save();profileToForm();if(pendingScoreKey){await revealScore();}else{notice(migratedDraft?'Choose Real or Synthetic for every image. Your previous Real/Synthetic choices have been kept; please answer the remaining images.':config.collectionMethod==='microsoftForms'?'Backup restored. Continue to Microsoft Forms to submit. If you already submitted this assessment, avoid submitting it again.':'Backup restored. Submit to confirm whether it has already been received.');if(config.collectionEnabled||config.previewMode)render();}}catch(e){notice(e.message,true);}event.target.value='';};
$('submit').onclick=async()=>{if(saving||state.receipt)return;if(!config.collectionEnabled){notice('The study is not open for submissions yet.',true);return;}if(config.collectionMethod==='microsoftForms'){try{const target=buildFormsTransferURL(state,study,config.microsoftForms);state.formsTransfer=validatePacket(state,study,true);save();window.location.assign(target);}catch(e){$('receipt').textContent=e.message;}return;}saving=true;$('submit').disabled=true;$('submit').textContent='Saving…';$('receipt').textContent='';try{const p=validatePacket(state,study,true);const response=await fetch(`${config.apiBase}/api/responses`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p),signal:AbortSignal.timeout(30000)});const result=await response.json();if(!response.ok||!result.receipt||result.receipt.id!==state.submissionId)throw Error(result.error||'The response was not confirmed.');state.receipt=result.receipt;save();notice('');finish();}catch(e){$('receipt').textContent=`We could not confirm that your response was saved. Your answers are still here. Please retry, or download a backup and contact the study team. ${e.message}`;}finally{saving=false;$('submit').disabled=false;$('submit').textContent='Submit assessment';}};
try{[study,config]=await Promise.all(['study.json','config.json'].map(async p=>{const r=await fetch(p,{cache:'no-store'});if(!r.ok)throw Error('The study could not be loaded. Please refresh.');return r.json();}));for(let i=0;i<100;i++){const o=document.createElement('option');o.value=String(i);o.textContent=String(i+1);$('jump').append(o);}state=fresh();try{const currentRaw=localStorage.getItem(storageKey(study.packageFingerprint)),legacyRaw=localStorage.getItem(storageKey(study.previousPackageFingerprint));const raw=pendingScoreKey?.split('.')[1]===study.previousPackageFingerprint?legacyRaw||currentRaw:currentRaw||legacyRaw;if(raw){const saved=JSON.parse(raw);const v=validatePacket(saved,study);state={...v,index:Number.isInteger(saved.index)?Math.max(0,Math.min(99,saved.index)):0,receipt:null};if(saved.formsTransfer){const transferred=validatePacket(saved.formsTransfer,study,true);if(transferred.submissionId===state.submissionId)state.formsTransfer=transferred;}state.scoreSummary=await restoreScore(saved.scoreSummary,state,study,scoreCommitmentFor(state));if(!pendingScoreKey&&!state.scoreSummary&&isLegacyPacket(state,study)){state={...currentDraft(state),index:0,receipt:null,formsTransfer:null,scoreSummary:null};save();}index=state.index;}}catch{notice('No valid saved draft was found. You can restore a downloaded backup.');}profileToForm();if(config.collectionMethod==='microsoftForms')$('privacy-note').textContent='Your responses will be stored privately in Mayo Clinic Microsoft Forms. A Mayo account is required for final submission. Your progress is saved in this browser until you submit.';$('start').disabled=!config.collectionEnabled&&!config.previewMode;if(config.previewMode){notice('Preview only. Use test details; responses cannot be submitted yet.');$('start').textContent=state.profile?'Resume preview':'Try the preview';}else if(!config.collectionEnabled){notice('The study is being prepared and is not open for responses yet.');$('start').textContent='Study not yet open';}else{notice(migratedDraft?'Choose Real or Synthetic for every image. Your previous Real/Synthetic choices have been kept; please answer the remaining images.':config.collectionMethod==='microsoftForms'?'Mayo Clinic sign-in is required for final submission.':'');$('start').textContent=state.profile?'Resume assessment':'Begin assessment';}if(pendingScoreKey){await revealScore();}else if(state.scoreSummary){showScore();}else{show('welcome');}}catch(e){notice(e.message,true);}
