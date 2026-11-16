export const choices = ['real', 'generated'];
export const isLegacyPacket = (packet,study) => packet?.packageFingerprint === study.previousPackageFingerprint;
export const authorship = ['yes', 'no'];
export function validateProfile(p) {
  if (!p || typeof p.name !== 'string' || !p.name.trim() || p.name.length > 120) throw Error('Please enter your full name.');
  if (typeof p.experienceYears !== 'number' || !Number.isFinite(p.experienceYears) || p.experienceYears < 0 || p.experienceYears > 80) throw Error('Enter years of experience between 0 and 80.');
  if (!authorship.includes(p.authorshipConsent)) throw Error('Please select Yes or No for authorship permission.');
  if (p.dataSharingConsent !== true) throw Error('Please agree to share your responses with the study team.');
  return { name: p.name.trim(), experienceYears: p.experienceYears, authorshipConsent: p.authorshipConsent, dataSharingConsent: true };
}
export function validatePacket(p, study, complete = false) {
  if (!p || p.packetType !== study.packetType || p.schemaVersion !== 2 || (!isLegacyPacket(p,study) && p.packageFingerprint !== study.packageFingerprint) || p.originalPackageFingerprint !== study.originalPackageFingerprint || p.consentVersion !== study.consentVersion) throw Error('This backup belongs to a different study or version.');
  const allowed=isLegacyPacket(p,study)?[...choices,'unsure']:choices;
  const profile=validateProfile(p.profile);
  if (typeof p.submissionId !== 'string' || !/^[a-f0-9-]{36}$/.test(p.submissionId)) throw Error('Invalid response identifier.');
  if (typeof p.submissionToken !== 'string' || !/^[a-f0-9]{64}$/.test(p.submissionToken)) throw Error('Invalid response key.');
  if (!Array.isArray(p.records) || p.records.length !== 100) throw Error('Expected all 100 image records.');
  const seen=new Set();
  const records=p.records.map((r,i)=>{
    const expected=study.images[i];
    if (!r || r.recordId !== expected.id || seen.has(r.recordId) || r.imageSha256 !== expected.sha256) throw Error('Image identifiers, order, or hashes differ from the study.');
    seen.add(r.recordId);
    const guess=r.values?.guess;
    if (!allowed.includes(guess) && guess !== '') throw Error('Choose Real or Synthetic for every image.');
    if (complete && !allowed.includes(guess)) throw Error('Please complete all 100 judgments.');
    if (guess && (typeof r.updatedAt !== 'string' || !Number.isFinite(Date.parse(r.updatedAt)))) throw Error('Invalid decision timestamp.');
    return {recordId:r.recordId,imageSha256:r.imageSha256,values:{guess},updatedAt:guess?r.updatedAt:null};
  });
  return {packetType:study.packetType,schemaVersion:2,appVersion:'2.3.0',responseMode:isLegacyPacket(p,study)?'ternary-v2':'binary-v1',packageFingerprint:p.packageFingerprint,originalPackageFingerprint:study.originalPackageFingerprint,consentVersion:study.consentVersion,submissionId:p.submissionId,submissionToken:p.submissionToken,profile,reviewerName:profile.name,completedRecords:records.filter(r=>allowed.includes(r.values.guess)).length,totalRecords:100,records};
}
export function validateBinaryPacket(packet,study){
  const p=validatePacket(packet,study,true);
  if(isLegacyPacket(p,study))throw Error('This is an earlier assessment. Restore it on the website and choose Real or Synthetic for all remaining images before submitting.');
  return p;
}
export function migrateLegacyDraft(packet,study,submissionId,submissionToken){
  const p=validatePacket(packet,study);
  if(!isLegacyPacket(p,study))return p;
  return validatePacket({...p,packageFingerprint:study.packageFingerprint,submissionId,submissionToken,records:p.records.map(r=>choices.includes(r.values.guess)?r:{...r,values:{guess:''},updatedAt:null})},study);
}
