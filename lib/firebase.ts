import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyDjmcE7CiKrNpSnu20gFB2cG620HU36Zqg",
  authDomain: "gen-lang-client-0836251512.firebaseapp.com",
  databaseURL: "https://gen-lang-client-0836251512-default-rtdb.firebaseio.com",
  projectId: "gen-lang-client-0836251512",
  storageBucket: "gen-lang-client-0836251512.firebasestorage.app",
  messagingSenderId: "811711024905",
  appId: "1:811711024905:web:b805531d56342ba41b8dd8",
  measurementId: "G-CEGJCJ914Y"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
export const googleProvider = new GoogleAuthProvider();

const GOOGLE_OAUTH_TOKEN_STORAGE_KEY = 'beatrice_google_oauth_token_v1';
const GOOGLE_OAUTH_TOKEN_TTL_MS = 55 * 60 * 1000;

type StoredGoogleOAuthToken = {
  accessToken: string;
  acquiredAt: number;
};

const canUseStorage = () => typeof window !== 'undefined' && !!window.localStorage;

export const storeGoogleAccessToken = (accessToken?: string | null) => {
  if (!accessToken || !canUseStorage()) return;
  const payload: StoredGoogleOAuthToken = {
    accessToken,
    acquiredAt: Date.now(),
  };
  window.localStorage.setItem(GOOGLE_OAUTH_TOKEN_STORAGE_KEY, JSON.stringify(payload));
};

export const getStoredGoogleAccessToken = () => {
  if (!canUseStorage()) return null;
  const raw = window.localStorage.getItem(GOOGLE_OAUTH_TOKEN_STORAGE_KEY);
  if (!raw) return null;

  try {
    const payload = JSON.parse(raw) as StoredGoogleOAuthToken;
    if (!payload.accessToken || Date.now() - payload.acquiredAt > GOOGLE_OAUTH_TOKEN_TTL_MS) {
      window.localStorage.removeItem(GOOGLE_OAUTH_TOKEN_STORAGE_KEY);
      return null;
    }
    return payload.accessToken;
  } catch {
    window.localStorage.removeItem(GOOGLE_OAUTH_TOKEN_STORAGE_KEY);
    return null;
  }
};

export const clearStoredGoogleAccessToken = () => {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(GOOGLE_OAUTH_TOKEN_STORAGE_KEY);
};

const GOOGLE_SERVICE_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://mail.google.com/',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/contacts',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/presentations',
  'https://www.googleapis.com/auth/forms.body',
  'https://www.googleapis.com/auth/forms.responses.readonly',
  'https://www.googleapis.com/auth/chat.spaces',
  'https://www.googleapis.com/auth/chat.messages',
  'https://www.googleapis.com/auth/tasks',
  'https://www.googleapis.com/auth/youtube',
];

GOOGLE_SERVICE_SCOPES.forEach(scope => googleProvider.addScope(scope));

googleProvider.setCustomParameters({
  prompt: 'consent select_account',
  include_granted_scopes: 'true',
});

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    storeGoogleAccessToken(credential?.accessToken);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};

export const logout = async () => {
  try {
    clearStoredGoogleAccessToken();
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out", error);
  }
};
