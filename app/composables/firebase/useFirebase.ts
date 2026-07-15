import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { useRuntimeConfig } from "#app";

/**
 * Module-level singleton — Firebase initializes once and is cached forever.
 * This avoids timing issues with plugin execution order and Pinia hydration.
 */
let _app: FirebaseApp | null = null;

export const useFirebase = (): FirebaseApp => {
  if (_app) return _app;

  if (getApps().length) {
    _app = getApp();
    return _app;
  }

  const runtimeConfig = useRuntimeConfig();
  const pub = runtimeConfig.public as {
    firebaseApiKey?: string;
    firebaseAuthDomain?: string;
    firebaseProjectId?: string;
    firebaseStorageBucket?: string;
    firebaseMessagingSenderId?: string;
    firebaseAppId?: string;
    firebaseMeasurementId?: string;
  };

  _app = initializeApp({
    apiKey: pub.firebaseApiKey ?? "",
    authDomain: pub.firebaseAuthDomain ?? "",
    projectId: pub.firebaseProjectId ?? "",
    storageBucket: pub.firebaseStorageBucket ?? "",
    messagingSenderId: pub.firebaseMessagingSenderId ?? "",
    appId: pub.firebaseAppId ?? "",
    measurementId: pub.firebaseMeasurementId ?? "",
  });

  return _app;
};
