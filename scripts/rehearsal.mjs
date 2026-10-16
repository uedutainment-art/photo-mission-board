import { execFileSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { writeFile, mkdir } from 'node:fs/promises';
import { loadEnv } from 'vite';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, doc, getDoc, getDocs, query, where, setDoc, serverTimestamp, terminate } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { PNG } from 'pngjs';

const liveId = 'bm0KcgvqcAzjD1EFh3T4';
const [action = 'status', eventId = liveId] = process.argv.slice(2);
if (eventId !== liveId && !eventId.startsWith('rehearsal-qa-')) throw new Error('Unsupported event');
const env = loadEnv('production', process.cwd(), 'VITE_');
const project = 'photo-mission-board-prod';
const root = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents`;
const login = execFileSync('firebase', ['login:list', '--json'], { encoding: 'utf8' });
const accessToken = JSON.parse(login.slice(login.indexOf('{'))).result[0].tokens.access_token;
const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };
async function request(path, method = 'GET', body) {
  const res = await fetch(`${root}/${path}`, { method, headers, ...(body ? { body: JSON.stringify(body) } : {}) });
  if (!res.ok) throw new Error(`${method} ${res.status}: ${await res.text()}`);
  return res.json();
}
function decode(v) {
  if ('mapValue' in v) return Object.fromEntries(Object.entries(v.mapValue.fields ?? {}).map(([k,x]) => [k,decode(x)]));
  if ('arrayValue' in v) return (v.arrayValue.values ?? []).map(decode);
  if ('integerValue' in v) return Number(v.integerValue);
  return v.stringValue ?? v.booleanValue ?? v.doubleValue ?? v.timestampValue ?? null;
}
function encode(v) {
  if (v === null) return { nullValue: null };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(encode) } };
  if (typeof v === 'object') return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k,x])=>[k,encode(x)])) } };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  return { stringValue: v };
}
const data = document => decode({ mapValue: { fields: document.fields } });
async function list(path) {
  let pageToken = ''; const docs = [];
  do { const page = await request(`${path}?pageSize=300${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`); docs.push(...(page.documents ?? [])); pageToken=page.nextPageToken; } while(pageToken);
  return docs;
}
async function commit(writes) {
  for(let i=0;i<writes.length;i+=400) {
    const res = await fetch(`${root}:commit`, { method:'POST', headers, body:JSON.stringify({writes:writes.slice(i,i+400)}) });
    if(!res.ok) throw new Error(await res.text());
  }
}
const nameFor = path => `projects/${project}/databases/(default)/documents/${path}`;
const write = (path, value) => ({ update: { name:nameFor(path), fields:encode(value).mapValue.fields } });
async function patch(value) {
  await commit([{...write(`events/${eventId}`,value),updateMask:{fieldPaths:Object.keys(value)}}]);
}
const eventRaw = await request(`events/${eventId}`);
const event = data(eventRaw);
const teams = (await list(`events/${eventId}/teams`)).map(d=>({...data(d),id:d.name.split('/').at(-1)})).sort((a,b)=>a.index-b.index);
const codes = (await list(`events/${eventId}/accessCodes`)).map(data);
const ids = ['familySubmissions','songRequests','votes','participantSessions','private','photos','selfies'];

async function client(team) {
  const app=initializeApp({apiKey:env.VITE_FIREBASE_API_KEY, projectId:project, storageBucket:env.VITE_FIREBASE_STORAGE_BUCKET, appId:env.VITE_FIREBASE_APP_ID}, `qa-${randomBytes(5).toString('hex')}`);
  const auth=getAuth(app); await signInAnonymously(auth);
  const db=getFirestore(app), functions=getFunctions(app,'asia-northeast3');
  if(team) await httpsCallable(functions,'joinParticipantGroup')({eventId,accessCode:codes.find(c=>c.teamId===team.id).displayCode,familyName:team.displayName});
  return { app,auth,db,functions,storage:getStorage(app), close:async()=>{await terminate(db);await deleteApp(app);} };
}
const others=teams.filter(t=>t.index!==1);

if(action==='status') {
  const counts={};for(const id of ids)counts[id]=(await list(`events/${eventId}/${id}`)).length;
  console.log(JSON.stringify({eventId,submission:event.submission.status,voting:event.voting.status,results:event.results,counts},null,2));
} else if(action==='create-qa') {
  if(eventId!==liveId)throw new Error('Clone live only');
  const id=`rehearsal-qa-${Date.now()}`;
  const clone=structuredClone(eventRaw);delete clone.createTime;delete clone.updateTime;
  clone.name=nameFor(`events/${id}`);clone.fields.title=encode('[리허설 QA] Sonova Family Day');
  clone.fields.submission=encode({...event.submission,status:'open'});clone.fields.voting=encode({...event.voting,status:'waiting'});clone.fields.results=encode({status:'hidden',winnerCount:3,winners:[],revealedRanks:[]});
  const writes=[{update:clone}];
  for(const t of teams){const code=String(100000+t.index);writes.push(write(`events/${id}/teams/${t.id}`,{...t,eventId:id,token:randomBytes(24).toString('base64url')}));writes.push(write(`events/${id}/accessCodes/${t.id}`,{eventId:id,teamId:t.id,displayCode:code,codeHash:createHash('sha256').update(code).digest('hex')}));}
  await commit(writes); console.log(id);
} else if(action==='reset') {
  const docs=[];for(const id of ids)docs.push(...await list(`events/${eventId}/${id}`));
  const backup=`/tmp/${eventId}-reset-${Date.now()}.json`;
  await writeFile(backup,JSON.stringify({event:eventRaw,documents:docs},null,2),{mode:0o600});
  await patch({submission:{...event.submission,status:'waiting'},voting:{...event.voting,status:'waiting'},results:{status:'hidden',winnerCount:3,winners:[],revealedRanks:[],ceremonyStarted:false}});
  const bucket=env.VITE_FIREBASE_STORAGE_BUCKET;
  let pageToken='';const objects=[];
  do {const url=new URL(`https://storage.googleapis.com/storage/v1/b/${bucket}/o`);url.searchParams.set('prefix',`events/${eventId}/`);if(pageToken)url.searchParams.set('pageToken',pageToken);const res=await fetch(url,{headers});if(!res.ok)throw new Error(await res.text());const page=await res.json();objects.push(...(page.items??[]).filter(o=>/^events\/[^/]+\/(contest|photos|selfies)\//.test(o.name)));pageToken=page.nextPageToken;}while(pageToken);
  await writeFile(`${backup}.storage.json`,JSON.stringify(objects,null,2),{mode:0o600});
  for(const o of objects){const res=await fetch(`https://storage.googleapis.com/storage/v1/b/${bucket}/o/${encodeURIComponent(o.name)}`,{method:'DELETE',headers});if(!res.ok&&res.status!==404)throw new Error(await res.text());}
  await commit(docs.map(d=>({delete:d.name})));
  const slots=await list(`events/${eventId}/slots`);
  await commit(slots.map(d=>({...write(d.name.split('/documents/')[1],{submissionCount:0}),updateMask:{fieldPaths:['submissionCount','representativePhotoId','checkedAt']}})));
  await commit(teams.map(t=>({...write(`events/${eventId}/teams/${t.id}`,{joinedMembers:[],uploadedCount:0,status:'idle'}),updateMask:{fieldPaths:['joinedMembers','uploadedCount','status']}})));
  for(const id of ids)if((await list(`events/${eventId}/${id}`)).length)throw new Error(`Reset incomplete: ${id}`);
  console.log(`Reset verified. Names/codes preserved. Backup: ${backup}. Deleted ${objects.length} image objects.`);
} else if(action==='photos') {
  if(event.submission.status!=='open')throw new Error('운영자에서 접수를 시작해주세요.');
  for(const team of others){const c=await client(team);try{
    for(const [i,prompt] of event.submission.prompts.entries()){
      const target=doc(c.db,'events',eventId,'familySubmissions',`${team.id}_${prompt.id}`);
      if((await getDoc(target)).exists())continue;
      const png=new PNG({width:1200,height:800});
      for(let y=0;y<800;y++)for(let x=0;x<1200;x++){const j=(y*1200+x)*4;png.data[j]=(team.index*23+x/8)%255;png.data[j+1]=(i*60+y/5)%255;png.data[j+2]=120;png.data[j+3]=255;}
      const bytes=PNG.sync.write(png),path=`events/${eventId}/contest/${team.id}/rehearsal-${prompt.id}.png`;
      await uploadBytes(ref(c.storage,path),bytes,{contentType:'image/png'});const url=await getDownloadURL(ref(c.storage,path));
      await setDoc(target,{eventId,teamId:team.id,uploaderId:c.auth.currentUser.uid,promptId:prompt.id,title:prompt.title,originalPath:path,thumbPath:path,originalUrl:url,thumbUrl:url,width:1200,height:800,bytes:bytes.length,hidden:false,cropMeta:{x:.5,y:.5,scale:1},submittedAt:serverTimestamp(),updatedAt:serverTimestamp()});
    }console.log(`${team.displayName}: 4 mission images ready`);
  }finally{await c.close();}}
} else if(action==='songs') {
  const existing=new Set((await list(`events/${eventId}/songRequests`)).map(d=>d.name.split('/').at(-1)));
  for(const team of others){if(existing.has(`rehearsal-${team.id}`))continue;const c=await client(team);try{await setDoc(doc(c.db,'events',eventId,'songRequests',`rehearsal-${team.id}`),{eventId,teamId:team.id,familyName:team.displayName,songTitle:'행복',artist:'H.O.T.',story:`[리허설] ${team.displayName}의 즐거운 하루를 기억하고 싶습니다. 함께해 주셔서 감사합니다.`,requesterId:c.auth.currentUser.uid,submittedAt:serverTimestamp()});}finally{await c.close();}}
  console.log('Nine song requests added. Daniel excluded.');
} else if(action==='votes') {
  if(event.voting.status!=='open')throw new Error('운영자에서 투표를 시작해주세요.');
  const photos=(await list(`events/${eventId}/familySubmissions`)).map(data).filter(p=>!p.hidden);
  const eligible=new Set(photos.map(p=>p.teamId));
  for(const team of others){const c=await client(team);try{const targets=teams.filter(t=>t.id!==team.id&&eligible.has(t.id)).slice(0,2).map(t=>t.id);if(targets.length!==2)throw new Error('At least two other participants need photos');await httpsCallable(c.functions,'castContestVote')({eventId,targetTeamIds:targets});console.log(`${team.displayName}: two votes saved`);}finally{await c.close();}}
} else if(action==='qa-stage') {
  if(!eventId.startsWith('rehearsal-qa-'))throw new Error('QA only');
  await patch({submission:{...event.submission,status:'closed'},voting:{...event.voting,status:'open'}});
} else if(action==='qa-award') {
  if(!eventId.startsWith('rehearsal-qa-'))throw new Error('QA only');
  const rank=Number(process.argv[4]);if(![1,2,3].includes(rank))throw new Error('Rank required');
  const photos=(await list(`events/${eventId}/familySubmissions`)).map(d=>({...data(d),id:d.name.split('/').at(-1)}));
  const winners=others.slice(0,3).map((t,i)=>({rank:i+1,teamId:t.id,prizeAmount:[50000,30000,10000][i],photoId:photos.find(p=>p.teamId===t.id&&p.promptId===event.submission.prompts[0].id).id}));
  await commit([write(`events/${eventId}/private/results`,{winners,tieBreakNote:'리허설 동점 선정'}),{...write(`events/${eventId}`,{voting:{...event.voting,status:'closed'},results:{status:'published',winnerCount:3,ceremonyStarted:true,revealedRanks:[3,2,1].filter(r=>r>=rank),winners:winners.filter(w=>w.rank>=rank)}}),updateMask:{fieldPaths:['voting','results']}}]);
  const c=await client(others[0]);try{const publicEvent=(await getDoc(doc(c.db,'events',eventId))).data();if(publicEvent.results.winners.some(w=>w.rank<rank))throw new Error('Unrevealed winner leaked'); console.log(`Rank ${rank}: only revealed winners readable`);}finally{await c.close();}
} else if(action==='qa-story') {
  if(!eventId.startsWith('rehearsal-qa-'))throw new Error('QA only');
  const song=(await list(`events/${eventId}/songRequests`))[0];const value=data(song);
  await patch({results:{...event.results,storyAward:{requestId:song.name.split('/').at(-1),familyName:value.familyName,story:value.story,songTitle:value.songTitle}}});
} else if(action==='verify-security') {
  let checks=0;
  async function denied(fn){try{await fn();}catch(e){if(String(e.code).includes('permission-denied')){checks++;return;}throw e;}throw new Error('Expected permission denied');}
  const outsider=await client();try{
    await denied(()=>getDocs(collection(outsider.db,'events',eventId,'teams')));
    await denied(()=>httpsCallable(outsider.functions,'joinParticipantGroupByToken')({token:teams[1].token}));
    await denied(()=>getDoc(doc(outsider.db,'events',eventId,'private','results')));
  }finally{await outsider.close();}
  const c=await client(teams[1]);try{
    await getDocs(query(collection(c.db,'events',eventId,'familySubmissions'),where('teamId','==',teams[1].id)));
    await denied(()=>httpsCallable(c.functions,'joinParticipantGroupByToken')({token:teams[2].token}));
    await denied(()=>getDocs(collection(c.db,'events',eventId,'votes')));
    await denied(()=>getDoc(doc(c.db,'events',eventId,'private','results')));
    const gallery=()=>getDocs(query(collection(c.db,'events',eventId,'familySubmissions'),where('hidden','==',false)));
    if(event.voting.status==='open'||event.voting.status==='closed')await gallery();else await denied(gallery);
  }finally{await c.close();}
  console.log(`Security checks passed: ${checks} forbidden actions blocked; own uploads readable.`);
} else throw new Error('Unknown action');
