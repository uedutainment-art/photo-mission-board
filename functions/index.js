const crypto = require("node:crypto");
const { initializeApp } = require("firebase-admin/app");
const { FieldValue, getFirestore } = require("firebase-admin/firestore");
const { HttpsError, onCall } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");

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
  const familyName = requiredString(request.data?.familyName, "가족 이름");
  const rawPhone = typeof request.data?.phone === "string" ? request.data.phone.trim() : "";
  const phone = (rawPhone.startsWith("+") ? "+" : "") + rawPhone.replace(/\D/g, "");
  if (rawPhone && (!/^\+?\d{10,15}$/.test(phone) || request.data?.contactConsent !== true)) {
    throw new HttpsError("invalid-argument", "전화번호와 연락처 수집 동의를 확인해주세요.");
  }

  if (familyName.length > 30) {
    throw new HttpsError("invalid-argument", "가족 이름은 30자 이하로 입력해주세요.");
  }

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
  const teamRef = eventRef.collection("teams").doc(teamId);
  const team = await db.runTransaction(async (transaction) => {
    const teamSnapshot = await transaction.get(teamRef);
    const contactRef = eventRef.collection("participantContacts").doc(teamId);
    const contactSnapshot = await transaction.get(contactRef);

    if (!teamSnapshot.exists) {
      throw new HttpsError("not-found", "참가 단위를 찾을 수 없습니다.");
    }

    const defaultName = teamSnapshot.get("name");
    const currentDisplayName = teamSnapshot.get("displayName");
    const canClaimName = !currentDisplayName || currentDisplayName === defaultName;
    const displayName = canClaimName ? familyName : currentDisplayName;
    // Another family login must not replace the consenting representative.
    if (phone && !contactSnapshot.exists) {
      transaction.set(contactRef, {
        teamId, familyName: displayName, phone,
        consentVersion: "event-notices-v1", consentedAt: FieldValue.serverTimestamp(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
    }

    if (canClaimName) {
      transaction.update(teamRef, { displayName });
    }

    return {
      displayName,
      token: teamSnapshot.get("token"),
    };
  });

  await saveParticipantSession({ eventId, teamId, uid });

  return {
    eventId,
    teamId,
    teamToken: team.token,
    teamName: team.displayName,
  };
});

exports.deleteExpiredParticipantContacts = onSchedule({ region, schedule: "every 1 hours" }, async () => {
  const events = await db.collection("events").get();
  for (const event of events.docs) {
    const contacts = await event.ref.collection("participantContacts").where("expiresAt", "<=", new Date()).get();
    for (let offset = 0; offset < contacts.size; offset += 400) {
      const batch = db.batch();
      contacts.docs.slice(offset, offset + 400).forEach((contact) => batch.delete(contact.ref));
      await batch.commit();
    }
  }
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

  const event = await eventRef.get();
  if (event.get('participantConfig.accessMethod') === 'code' && event.get('ownerId') !== uid) {
    const session = await eventRef.collection('participantSessions').doc(uid).get();
    if (session.get('teamId') !== teamDocument.id) {
      throw new HttpsError('permission-denied', '공통 입장 QR에서 가족 코드로 먼저 입장해주세요.', { eventId: eventRef.id });
    }
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
  const requestedTargetIds = Array.isArray(request.data?.targetTeamIds)
    ? request.data.targetTeamIds
    : [request.data?.targetTeamId];
  const targetTeamIds = requestedTargetIds.map((value) => requiredString(value, "투표 대상"));
  const eventRef = db.doc(`events/${eventId}`);
  const sessionRef = eventRef.collection("participantSessions").doc(uid);

  return db.runTransaction(async (transaction) => {
    const [eventSnapshot, sessionSnapshot] = await Promise.all([
      transaction.get(eventRef),
      transaction.get(sessionRef),
    ]);

    if (!eventSnapshot.exists || !sessionSnapshot.exists) {
      throw new HttpsError("permission-denied", "참가 인증을 다시 진행해주세요.");
    }

    const eventData = eventSnapshot.data();
    const voterTeamId = sessionSnapshot.get("teamId");
    const selectionLimit = eventData?.voting?.selectionsPerVoter
      ?? (eventData?.preset === "family-photo-contest" ? 2 : 1);

    if (
      !eventData?.voting?.enabled
      || eventData.voting.status !== "open"
      || eventData?.submission?.status !== "closed"
      || eventData?.results?.status === "published"
    ) {
      throw new HttpsError("failed-precondition", "현재 투표 시간이 아닙니다.");
    }

    if (eventData.voting.unit !== "team") {
      throw new HttpsError("failed-precondition", "그룹별 투표 행사가 아닙니다.");
    }

    if (targetTeamIds.length !== selectionLimit || new Set(targetTeamIds).size !== targetTeamIds.length) {
      throw new HttpsError("invalid-argument", `서로 다른 ${selectionLimit}곳을 선택해주세요.`);
    }

    if (targetTeamIds.includes(voterTeamId)) {
      throw new HttpsError("failed-precondition", "자기 그룹에는 투표할 수 없습니다.");
    }

    const submissionSnapshots = await Promise.all(
      targetTeamIds.map((targetTeamId) => transaction.get(
        eventRef.collection("familySubmissions").where("teamId", "==", targetTeamId),
      )),
    );

    if (submissionSnapshots.some((snapshot) => (
      snapshot.empty || snapshot.docs.every((document) => document.get("hidden") === true)
    ))) {
      throw new HttpsError("not-found", "투표할 수 없는 가족이 포함되어 있습니다.");
    }

    transaction.delete(eventRef.collection("votes").doc(`team_${voterTeamId}`));
    transaction.delete(eventRef.collection("votes").doc(`team_${voterTeamId}_1`));
    transaction.delete(eventRef.collection("votes").doc(`team_${voterTeamId}_2`));

    targetTeamIds.forEach((targetTeamId, index) => {
      transaction.set(eventRef.collection("votes").doc(`team_${voterTeamId}_${index + 1}`), {
        eventId,
        photoId: targetTeamId,
        teamId: targetTeamId,
        voterId: uid,
        voterTeamId,
        unit: "team",
        selectionIndex: index,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    return { voterTeamId, targetTeamIds };
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

  const batch = db.batch();
  batch.delete(eventRef.collection("votes").doc(`team_${voterTeamId}`));
  batch.delete(eventRef.collection("votes").doc(`team_${voterTeamId}_1`));
  batch.delete(eventRef.collection("votes").doc(`team_${voterTeamId}_2`));
  await batch.commit();
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
