import { createHash, randomBytes, randomInt } from "node:crypto";
import { spawnSync } from "node:child_process";
import { writeFile } from "node:fs/promises";

const [eventId, title, scheduledAt, teamCountText, confirmation] = process.argv.slice(2);
const teamCount = Number(teamCountText);

if (!eventId || !title || !/^\d{4}-\d{2}-\d{2}$/.test(scheduledAt ?? "") || !Number.isInteger(teamCount) || teamCount < 2 || confirmation !== eventId) {
  console.error("Usage: node scripts/prepare-live-family-event.mjs <eventId> <title> <YYYY-MM-DD> <teamCount> <eventId>");
  process.exit(1);
}

const cli = spawnSync("firebase", ["login:list", "--json"], {
  encoding: "utf8",
  env: { ...process.env, FIREBASE_CLI_DISABLE_UPDATE_CHECK: "true" },
});

const output = cli.stdout;
function parseFirstJsonObject(value) {
  const start = value.indexOf("{");
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index >= 0 && index < value.length; index += 1) {
    const character = value[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') inString = true;
    else if (character === "{") depth += 1;
    else if (character === "}" && --depth === 0) return JSON.parse(value.slice(start, index + 1));
  }
  return null;
}

const login = parseFirstJsonObject(output);
if (!login) throw new Error("Firebase CLI 로그인 정보를 읽지 못했습니다.");
const accessToken = login.result?.[0]?.tokens?.access_token;
if (!accessToken) throw new Error("Firebase CLI 로그인이 필요합니다.");

const projectId = "photo-mission-board-prod";
const databaseRoot = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
const eventPath = `events/${eventId}`;
const headers = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };

async function request(url, init = {}) {
  const response = await fetch(url, { ...init, headers: { ...headers, ...init.headers } });
  if (!response.ok) throw new Error(`${init.method ?? "GET"} ${url}: ${response.status} ${await response.text()}`);
  return response.status === 204 ? null : response.json();
}

async function list(collectionPath) {
  const documents = [];
  let pageToken = "";
  do {
    const url = new URL(`${databaseRoot}/${collectionPath}`);
    url.searchParams.set("pageSize", "300");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const page = await request(url);
    documents.push(...(page.documents ?? []));
    pageToken = page.nextPageToken ?? "";
  } while (pageToken);
  return documents;
}

function fieldString(value) {
  return value?.stringValue ?? "";
}

function stringValue(value) {
  return { stringValue: value };
}

function integerValue(value) {
  return { integerValue: String(value) };
}

function booleanValue(value) {
  return { booleanValue: value };
}

function timestampValue() {
  return { timestampValue: new Date().toISOString() };
}

function mapValue(fields) {
  return { mapValue: { fields } };
}

function randomToken(length = 32) {
  return randomBytes(length).toString("base64url").slice(0, length);
}

function randomCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

function hashCode(code) {
  return createHash("sha256").update(code).digest("hex");
}

async function putDocument(path, fields) {
  return request(`${databaseRoot}/${path}`, {
    method: "PATCH",
    body: JSON.stringify({ fields }),
  });
}

async function deleteDocument(document) {
  await request(`https://firestore.googleapis.com/v1/${document.name}`, { method: "DELETE" });
}

async function deleteStorageObject(path) {
  if (!path) return;
  const objectUrl = `https://storage.googleapis.com/storage/v1/b/photo-mission-board-prod.firebasestorage.app/o/${encodeURIComponent(path)}`;
  const response = await fetch(objectUrl, { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok && response.status !== 404) throw new Error(`Storage delete failed: ${response.status} ${path}`);
}

const eventDocument = await request(`${databaseRoot}/${eventPath}`);
const teams = (await list(`${eventPath}/teams`)).sort((a, b) => Number(a.fields.index?.integerValue ?? 0) - Number(b.fields.index?.integerValue ?? 0));
const submissions = await list(`${eventPath}/familySubmissions`);
const votes = await list(`${eventPath}/votes`);
const sessions = await list(`${eventPath}/participantSessions`);
const accessCodes = await list(`${eventPath}/accessCodes`);

await writeFile(
  `/tmp/${eventId}-before-live-reset.json`,
  JSON.stringify({ event: eventDocument, teams, submissions, votes, sessions, accessCodes }, null, 2),
  { mode: 0o600 },
);

for (const submission of submissions) {
  await Promise.all([
    deleteStorageObject(fieldString(submission.fields.originalPath)),
    deleteStorageObject(fieldString(submission.fields.thumbPath)),
  ]);
}

for (const document of [...submissions, ...votes, ...sessions, ...accessCodes]) {
  await deleteDocument(document);
}

const now = timestampValue();
const colors = ["#0284c7", "#7c3aed", "#d97706", "#16a34a", "#db2777", "#0891b2", "#dc2626", "#4f46e5"];
const prepared = [];

for (let index = 1; index <= teamCount; index += 1) {
  const existing = teams[index - 1];
  const teamId = existing?.name?.split("/").pop() ?? randomToken(20);
  const token = randomToken();
  const teamFields = {
    ...(existing?.fields ?? {}),
    eventId: stringValue(eventId),
    index: integerValue(index),
    name: stringValue(`${index}가족`),
    displayName: stringValue(`${index}가족`),
    color: stringValue(colors[(index - 1) % colors.length]),
    token: stringValue(token),
    status: stringValue("idle"),
    joinedMembers: { arrayValue: { values: [] } },
    uploadedCount: integerValue(0),
  };
  delete teamFields.leader;
  delete teamFields.completedAt;
  await putDocument(`${eventPath}/teams/${teamId}`, teamFields);

  const code = randomCode();
  await putDocument(`${eventPath}/accessCodes/${teamId}`, {
    eventId: stringValue(eventId),
    teamId: stringValue(teamId),
    codeHash: stringValue(hashCode(code)),
    displayCode: stringValue(code),
    createdAt: now,
  });
  prepared.push({ index, teamId, token, code });
}

for (const extraTeam of teams.slice(teamCount)) {
  await deleteDocument(extraTeam);
}

const fields = eventDocument.fields;
fields.title = stringValue(title);
fields.scheduledAt = stringValue(scheduledAt);
fields.teamCount = integerValue(teamCount);
fields.status = stringValue("draft");
fields.updatedAt = now;
fields.submission = mapValue({
  status: stringValue("waiting"),
  limit: integerValue(6),
  minimum: integerValue(4),
  titleRequired: booleanValue(true),
  allowReplacement: booleanValue(true),
});
fields.voting = mapValue({
  enabled: booleanValue(true),
  status: stringValue("waiting"),
  target: stringValue("representatives"),
  resultMode: stringValue("team-balanced"),
  unit: stringValue("team"),
  selectionsPerVoter: integerValue(2),
});
fields.results = mapValue({ status: stringValue("hidden"), winnerCount: integerValue(3) });
const guideFields = fields.guide?.mapValue?.fields ?? {};
guideFields.venue = stringValue("더드림핑");
fields.guide = mapValue(guideFields);
await putDocument(eventPath, fields);

console.log(JSON.stringify({ eventId, title, scheduledAt, teamCount, removed: { submissions: submissions.length, votes: votes.length, sessions: sessions.length }, families: prepared }, null, 2));
