import {validatePacket} from './protocol.js';
export function formatFormsJudgments(packet,study){
  const p=validatePacket(packet,study,true),id=p.submissionId.replaceAll('-','');
  if(!/^[a-f0-9]{32}$/.test(id))throw Error('Invalid assessment identifier.');
  const codes={real:'R',generated:'S',unsure:'U'};
  return `SNEL2.${study.packageFingerprint}.${id}.${p.records.map(r=>codes[r.values.guess]).join('')}`;
}
export function parseFormsJudgments(value,study){
  if(value.startsWith('SNEL2.')){
    const parts=value.split('.');
    if(parts.length!==4||parts[1]!==study.packageFingerprint||!/^[a-f0-9]{32}$/.test(parts[2])||!/^[RSU]{100}$/.test(parts[3]))throw Error('The transferred assessment is incomplete or belongs to a different study.');
    const id=parts[2],reverse={R:'real',S:'generated',U:'unsure'};
    return {packageFingerprint:study.packageFingerprint,submissionId:`${id.slice(0,8)}-${id.slice(8,12)}-${id.slice(12,16)}-${id.slice(16,20)}-${id.slice(20)}`,completedRecords:100,records:study.images.map((image,i)=>({recordId:image.id,imageSha256:image.sha256,values:{guess:reverse[parts[3][i]]}}))};
  }
  // Retain support for the readable blocks stored before the shorter transport.
  const lines=value.replace(/\r\n/g,'\n').split('\n');
  if(lines.length!==103||lines[0]!=='SNEL reader assessment v1'||lines[1]!==`Study: ${study.packageFingerprint}`||!/^Response: [a-f0-9-]{36}$/.test(lines[2]))throw Error('The transferred assessment is incomplete or belongs to a different study.');
  const reverse={Real:'real',Synthetic:'generated',Unsure:'unsure'};
  const records=study.images.map((image,i)=>{const match=lines[i+3].match(/^(B\d{3}): (Real|Synthetic|Unsure)$/);if(!match||match[1]!==image.id)throw Error('Transferred image identifiers, order, or judgments differ from the study.');return {recordId:image.id,imageSha256:image.sha256,values:{guess:reverse[match[2]]}};});
  return {packageFingerprint:study.packageFingerprint,submissionId:lines[2].slice('Response: '.length),completedRecords:100,records};
}
export function buildFormsTransferURL(packet,study,target){
  const p=validatePacket(packet,study,true),url=new URL(target.url);
  if(url.protocol!=='https:'||url.hostname!=='forms.cloud.microsoft'||url.pathname!=='/Pages/ResponsePage.aspx'||!url.searchParams.get('id'))throw Error('The Microsoft Forms destination is not configured correctly.');
  const fields=target.fields;
  if(!fields||new Set(Object.values(fields)).size!==5||!['name','experience','authorship','judgments','agreement'].every(k=>/^r[a-f0-9]{32}$/.test(fields[k]??'')))throw Error('The Microsoft Forms question mapping is incomplete.');
  url.searchParams.set(fields.name,p.profile.name);
  url.searchParams.set(fields.experience,String(p.profile.experienceYears));
  url.searchParams.set(fields.authorship,JSON.stringify(p.profile.authorshipConsent==='yes'?'Yes':'No'));
  url.searchParams.set(fields.judgments,formatFormsJudgments(p,study));
  url.searchParams.set(fields.agreement,JSON.stringify('I agree'));
  // Forms decodes percent escapes but leaves URLSearchParams' plus signs literal.
  return url.toString().replace(/\+/g,'%20');
}
