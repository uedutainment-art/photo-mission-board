const crypto = require("node:crypto");
const { initializeApp } = require("firebase-admin/app");
const { FieldValue, getFirestore } = require("firebase-admin/firestore");
const { HttpsError, onCall } = require("firebase-functions/v2/https");

initializeApp();

const db = getFirestore();
const region = "asia-northeast3";

function requireUser(request) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
  }

  return request.auth.uid;
}

function requiredString(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    throw new HttpsError("invalid-argument", `${label} 값이 필요합니다.`);
  }

  return value.trim();
}

function normalizeCode(value) {
  return value.replace(/[^0-9A-Za-z]/g, "").toUpperCase();
}

function hashCode(value) {
  return crypto.createHash("sha256").update(normalizeCode(value)).digest("hex");
}

async function saveParticipantSession({ eventId, teamId, uid }) {
  await db.doc(`events/${eventId}/participantSessions/${uid}`).set({
    eventId,
    teamId,
    uid,
    verifiedAt: FieldValue.serverTimestamp(),
  });
}

exports.joinParticipantGroup = onCall({ region }, async (request) => {
  const uid = requireUser(request);
  const eventId = requiredString(request.data?.eventId, "이벤트");
  const accessCode = requiredString(request.data?.accessCode, "참가 코드");
  const eventRef = db.doc(`events/${eventId}`);
  const eventSnapshot = await eventRef.get();

  if (!eventSnapshot.exists) {
    throw new HttpsError("not-found", "이벤트를 찾을 수 없습니다.");
  }

  const codeSnapshot = await eventRef
    .collection("accessCodes")
    .where("codeHash", "==", hashCode(accessCode))
    .limit(1)
    .get();
  const codeDocument = codeSnapshot.docs[0];

  if (!codeDocument) {
    throw new HttpsError("permission-denied", "참가 코드가 올바르지 않습니다.");
  }

  const teamId = codeDocument.get("teamId");
  const teamSnapshot = await eventRef.collection("teams").doc(teamId).get();

  if (!teamSnapshot.exists) {
    throw new HttpsError("not-found", "참가 단위를 찾을 수 없습니다.");
  }

  await saveParticipantSession({ eventId, teamId, uid });

  return {
    eventId,
    teamId,
    teamToken: teamSnapshot.get("token"),
    teamName: teamSnapshot.get("displayName") || teamSnapshot.get("name"),
  };
});

exports.joinParticipantGroupByToken = onCall({ region }, async (request) => {
  const uid = requireUser(request);
  const token = requiredString(request.data?.token, "참가 링크");
  const teamsSnapshot = await db.collectionGroup("teams").where("token", "==", token).limit(1).get();
  const teamDocument = teamsSnapshot.docs[0];

  if (!teamDocument) {
    throw new HttpsError("not-found", "참가 링크를 찾을 수 없습니다.");
  }

  const eventRef = teamDocument.ref.parent.parent;

  if (!eventRef) {
    throw new HttpsError("not-found", "이벤트를 찾을 수 없습니다.");
  }

  await saveParticipantSession({ eventId: eventRef.id, teamId: teamDocument.id, uid });

  return {
    eventId: eventRef.id,
    teamId: teamDocument.id,
  };
});

exports.castContestVote = onCall({ region }, async (request) => {
  const uid = requireUser(request);
  const eventId = requiredString(request.data?.eventId, "이벤트");
  const targetTeamId = requiredString(request.data?.targetTeamId, "투표 대상");
  const eventRef = db.doc(`events/${eventId}`);
  const sessionRef = eventRef.collection("participantSessions").doc(uid);
  const submissionRef = eventRef.collection("familySubmissions").doc(targetTeamId);

  return db.runTransaction(async (transaction) => {
    const [eventSnapshot, sessionSnapshot, submissionSnapshot] = await Promise.all([
      transaction.get(eventRef),
      transaction.get(sessionRef),
      transaction.get(submissionRef),
    ]);

    if (!eventSnapshot.exists || !sessionSnapshot.exists) {
      throw new HttpsError("permission-denied", "참가 인증을 다시 진행해주세요.");
    }

    const eventData = eventSnapshot.data();
    const voterTeamId = sessionSnapshot.get("teamId");

    if (!eventData?.voting?.enabled || eventData.voting.status !== "open") {
      throw new HttpsError("failed-precondition", "현재 투표 시간이 아닙니다.");
    }

    if (eventData.voting.unit !== "team") {
      throw new HttpsError("failed-precondition", "그룹별 투표 행사가 아닙니다.");
    }

    if (voterTeamId === targetTeamId) {
      throw new HttpsError("failed-precondition", "자기 그룹에는 투표할 수 없습니다.");
    }

    if (!submissionSnapshot.exists || submissionSnapshot.get("hidden") === true) {
      throw new HttpsError("not-found", "투표할 수 있는 사진이 아닙니다.");
    }

    const voteRef = eventRef.collection("votes").doc(`team_${voterTeamId}`);
    transaction.set(voteRef, {
      eventId,
      photoId: targetTeamId,
      teamId: targetTeamId,
      voterId: uid,
      voterTeamId,
      unit: "team",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { voterTeamId, targetTeamId };
  });
});

exports.clearContestVote = onCall({ region }, async (request) => {
  const uid = requireUser(request);
  const eventId = requiredString(request.data?.eventId, "이벤트");
  const voterTeamId = requiredString(request.data?.voterTeamId, "참가 단위");
  const eventRef = db.doc(`events/${eventId}`);
  const eventSnapshot = await eventRef.get();

  if (!eventSnapshot.exists || eventSnapshot.get("ownerId") !== uid) {
    throw new HttpsError("permission-denied", "운영자만 투표를 초기화할 수 있습니다.");
  }

  await eventRef.collection("votes").doc(`team_${voterTeamId}`).delete();
  return { cleared: true };
});

exports.regenerateParticipantCode = onCall({ region }, async (request) => {
  const uid = requireUser(request);
  const eventId = requiredString(request.data?.eventId, "이벤트");
  const teamId = requiredString(request.data?.teamId, "참가 단위");
  const eventRef = db.doc(`events/${eventId}`);
  const [eventSnapshot, teamSnapshot] = await Promise.all([
    eventRef.get(),
    eventRef.collection("teams").doc(teamId).get(),
  ]);

  if (!eventSnapshot.exists || eventSnapshot.get("ownerId") !== uid) {
    throw new HttpsError("permission-denied", "운영자만 코드를 재발급할 수 있습니다.");
  }

  if (!teamSnapshot.exists) {
    throw new HttpsError("not-found", "참가 단위를 찾을 수 없습니다.");
  }

  const displayCode = String(crypto.randomInt(0, 1000000)).padStart(6, "0");
  await eventRef.collection("accessCodes").doc(teamId).set({
    eventId,
    teamId,
    codeHash: hashCode(displayCode),
    displayCode,
    createdAt: FieldValue.serverTimestamp(),
  });

  return { displayCode };
});
