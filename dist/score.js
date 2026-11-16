import {validatePacket} from './protocol.js?v=binary-v1';

export async function digest(value) {
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
}

// The scoring key arrives only in the Forms confirmation link's fragment.
// Public source contains its commitment, never the image labels or this link.
export async function readScoreKey(value,study,commitment,legacyCommitment) {
  const match=value.match(/^v1\.([a-f0-9]{64})\.([a-f0-9]{25})$/);
  const expected=match?.[1]===study.packageFingerprint?commitment:match?.[1]===study.previousPackageFingerprint?legacyCommitment:null;
  if(!match||!expected||await digest(`SNEL-score-v1\n${match[1]}\n${match[2]}`)!==expected)
    throw Error('This score link is invalid or belongs to another assessment. Please use the link on your Microsoft Forms confirmation page.');
  return Array.from(match[2],c=>parseInt(c,16).toString(2).padStart(4,'0')).join('').split('').map(b=>b==='0'?'real':'generated');
}

async function answerDigest(packet) {
  return digest(JSON.stringify({submissionId:packet.submissionId,profile:packet.profile,answers:packet.records.map(r=>r.values.guess)}));
}

export async function scoreAssessment(packet,study,truth,commitment) {
  const p=validatePacket(packet,study,true);
  if(truth.length!==100||truth.some(v=>!['real','generated'].includes(v)))throw Error('Invalid scoring information.');
  const unsure=p.records.filter(r=>r.values.guess==='unsure').length;
  const correct=p.records.filter((r,i)=>r.values.guess===truth[i]).length;
  return {version:1,submissionId:p.submissionId,commitment,answerDigest:await answerDigest(p),correct,decisive:100-unsure,unsure};
}

export async function restoreScore(summary,packet,study,commitment) {
  try {
    const p=validatePacket(packet,study,true);
    if(!summary||summary.version!==1||summary.submissionId!==p.submissionId||summary.commitment!==commitment||
        summary.answerDigest!==await answerDigest(p)||
        !['correct','decisive','unsure'].every(k=>Number.isInteger(summary[k])&&summary[k]>=0&&summary[k]<=100)||
        summary.decisive+summary.unsure!==100||summary.correct>summary.decisive||
        summary.unsure!==p.records.filter(r=>r.values.guess==='unsure').length)return null;
    return {version:1,submissionId:summary.submissionId,commitment,answerDigest:summary.answerDigest,correct:summary.correct,decisive:summary.decisive,unsure:summary.unsure};
  } catch {return null;}
}
