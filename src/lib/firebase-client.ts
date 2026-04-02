"use client";

import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyAsXdH8tZwcsRy_bRlDHUcmdhVScPt4Cvo",
  projectId: "shwe-loader",
  databaseURL:
    "https://shwe-loader-default-rtdb.asia-southeast1.firebasedatabase.app",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

/** Firebase Realtime Database instance (client-side, for presence) */
export const rtdb = getDatabase(app);
