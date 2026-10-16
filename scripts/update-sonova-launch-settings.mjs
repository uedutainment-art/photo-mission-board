import { execFileSync } from 'node:child_process';

const output = execFileSync('firebase', ['login:list', '--json'], { encoding: 'utf8' });
const login = JSON.parse(output.slice(output.indexOf('{')));
const token = login.result?.[0]?.tokens?.access_token;
if (!token) throw new Error('Firebase login required');
const url = 'https://firestore.googleapis.com/v1/projects/photo-mission-board-prod/databases/(default)/documents/events/bm0KcgvqcAzjD1EFh3T4';
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
const current = await fetch(url, { headers });
if (!current.ok) throw new Error(`Read failed: ${current.status}`);
const event = await current.json();
const fields = {
  organizer: { mapValue: { fields: {
    ...event.fields.organizer?.mapValue?.fields,
    name: { stringValue: '행사 운영팀' },
    phone: { stringValue: '01067770313' },
    contactPreference: { stringValue: 'sms-first' },
  } } },
  submission: { mapValue: { fields: {
    ...event.fields.submission.mapValue.fields,
    status: { stringValue: 'waiting' },
  } } },
  places: event.fields.places,
};
for (const place of fields.places?.arrayValue?.values ?? []) {
  const data = place.mapValue?.fields;
  if (data?.name?.stringValue === '가족 대표사진') {
    data.name = { stringValue: '가족 사진 미션 4장' };
    data.description = { stringValue: '우리 가족 셀카, 자연 속 행복, 전통놀이, 열정 또는 점프샷을 한 장씩 남겨주세요.' };
  }
}
const query = new URLSearchParams();
for (const key of Object.keys(fields)) query.append('updateMask.fieldPaths', key);
query.set('currentDocument.updateTime', event.updateTime);
const saved = await fetch(`${url}?${query}`, { method: 'PATCH', headers, body: JSON.stringify({ fields }) });
if (!saved.ok) throw new Error(`Update failed: ${saved.status} ${await saved.text()}`);
const result = await saved.json();
console.log(JSON.stringify({ organizer: result.fields.organizer, submissionStatus: result.fields.submission.mapValue.fields.status, updatedAt: result.updateTime }));
