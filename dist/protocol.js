export const choices = ['real', 'generated', 'unsure'];
export const authorship = ['yes', 'no', 'discuss'];
export function validateProfile(p) {
  if (!p || typeof p.name !== 'string' || !p.name.trim() || p.name.length > 120) throw Error('Please enter your full name.');
  if (typeof p.experienceYears !== 'number' || !Number.isFinite(p.experienceYears) || p.experienceYears < 0 || p.experienceYears > 80) throw Error('Enter years of experience between 0 and 80.');
  if (!authorship.includes(p.individualAuthorship) || !authorship.includes(p.groupAuthorship)) throw Error('Please answer both authorship questions.');
  if (p.dataSharingConsent !== true) throw Error('Please agree to share your responses with the study team.');
  return { name: p.name.trim(), experienceYears: p.experienceYears, individualAuthorship: p.individualAuthorship, groupAuthorship: p.groupAuthorship, dataSharingConsent: true };
}
export function validatePacket(p, study, complete = false) {
  if (!p || p.packetType !== study.packetType || p.schemaVersion !== 2 || p.packageFingerprint !== study.packageFingerprint || p.originalPackageFingerprint !== study.originalPackageFingerprint || p.consentVersion !== study.consentVersion) throw Error('This backup belongs to a different study or version.');
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
    if (!choices.includes(guess) && guess !== '') throw Error('Invalid image judgment.');
    if (complete && !choices.includes(guess)) throw Error('Please complete all 100 judgments.');
    if (guess && (typeof r.updatedAt !== 'string' || !Number.isFinite(Date.parse(r.updatedAt)))) throw Error('Invalid decision timestamp.');
    return {recordId:r.recordId,imageSha256:r.imageSha256,values:{guess},updatedAt:guess?r.updatedAt:null};
  });
  return {packetType:study.packetType,schemaVersion:2,appVersion:'2.0.0',packageFingerprint:study.packageFingerprint,originalPackageFingerprint:study.originalPackageFingerprint,consentVersion:study.consentVersion,submissionId:p.submissionId,submissionToken:p.submissionToken,profile,reviewerName:profile.name,completedRecords:records.filter(r=>choices.includes(r.values.guess)).length,totalRecords:100,records};
}
