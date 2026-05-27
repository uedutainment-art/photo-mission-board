import { useEffect, useMemo, useState } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db, googleProvider } from "./firebase";

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  isOperator: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

async function ensureUserDocument(user: User): Promise<void> {
  if (user.isAnonymous) {
    return;
  }

  const userRef = doc(db, "users", user.uid);
  const snapshot = await getDoc(userRef);
  const profile: {
    uid: string;
    displayName: string;
    email: string;
    photoURL?: string;
  } = {
    uid: user.uid,
    displayName: user.displayName ?? "운영자",
    email: user.email ?? "",
  };

  if (user.photoURL) {
    profile.photoURL = user.photoURL;
  }

  if (snapshot.exists()) {
    await setDoc(
      userRef,
      {
        ...profile,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    return;
  }

  await setDoc(userRef, {
    ...profile,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    auth.useDeviceLanguage();

    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);

      if (nextUser && !nextUser.isAnonymous) {
        void ensureUserDocument(nextUser).catch(() => {
          setError("사용자 정보를 저장하지 못했습니다. 잠시 후 다시 시도해주세요.");
        });
      }
    });
  }, []);

  return useMemo(
    () => ({
      user,
      loading,
      error,
      isOperator: Boolean(user && !user.isAnonymous),
      signInWithGoogle: async () => {
        setError(null);
        const credential = await signInWithPopup(auth, googleProvider);
        await ensureUserDocument(credential.user);
      },
      signOut: async () => {
        setError(null);
        await firebaseSignOut(auth);
      },
    }),
    [error, loading, user],
  );
}
