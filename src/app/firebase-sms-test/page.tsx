"use client";

import { useEffect, useRef, useState } from "react";

// Firebase config for Shwe Loader project
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBqQuZF-Z9PmsqmudMjrnZhcd4q_kpIcT8",
  authDomain: "shwe-loader.firebaseapp.com",
  projectId: "shwe-loader",
  storageBucket: "shwe-loader.firebasestorage.app",
  messagingSenderId: "160111869380",
  appId: "1:160111869380:web:b4ce001837d4bc6e77b891",
};

declare global {
  interface Window {
    recaptchaVerifier: unknown;
    recaptchaWidgetId: number;
    confirmationResult: unknown;
    grecaptcha: { reset: (id: number) => void };
  }
}

export default function FirebaseSmsTestPage() {
  const [phone, setPhone] = useState("+959");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState<"" | "error" | "success">("");
  const [sendDisabled, setSendDisabled] = useState(true);
  const [sendLabel, setSendLabel] = useState("Solve reCAPTCHA first");
  const [showVerify, setShowVerify] = useState(false);
  const [verifyDisabled, setVerifyDisabled] = useState(false);
  const [firebaseReady, setFirebaseReady] = useState(false);
  const recaptchaRef = useRef<HTMLDivElement>(null);
  const firebaseRef = useRef<typeof import("firebase/app") | null>(null);
  const authRef = useRef<import("firebase/auth").Auth | null>(null);

  // Load Firebase SDK dynamically
  useEffect(() => {
    let cancelled = false;

    async function loadFirebase() {
      const { initializeApp, getApps } = await import("firebase/app");
      const { getAuth, RecaptchaVerifier } = await import("firebase/auth");

      if (cancelled) return;

      const app = getApps().length === 0 ? initializeApp(FIREBASE_CONFIG) : getApps()[0];
      const auth = getAuth(app);
      firebaseRef.current = await import("firebase/app");
      authRef.current = auth;
      setFirebaseReady(true);

      // Set up reCAPTCHA
      try {
        const verifier = new RecaptchaVerifier(auth, "recaptcha-container", {
          size: "normal",
          callback: () => {
            setSendDisabled(false);
            setSendLabel("Send OTP");
            setStatus("reCAPTCHA verified. Ready to send OTP.");
            setStatusType("");
          },
          "expired-callback": () => {
            setSendDisabled(true);
            setSendLabel("Solve reCAPTCHA first");
            setStatus("reCAPTCHA expired. Please solve again.");
            setStatusType("error");
          },
        });

        window.recaptchaVerifier = verifier;

        const widgetId = await verifier.render();
        window.recaptchaWidgetId = widgetId;
        console.log("reCAPTCHA rendered, widgetId:", widgetId);
      } catch (err) {
        console.error("reCAPTCHA setup error:", err);
        setStatus(`reCAPTCHA setup failed: ${(err as Error).message}`);
        setStatusType("error");
      }
    }

    loadFirebase();
    return () => { cancelled = true; };
  }, []);

  async function sendOtp() {
    if (!phone.trim() || !authRef.current) return;

    setSendDisabled(true);
    setStatus(`Sending OTP to ${phone}...`);
    setStatusType("");

    try {
      const { signInWithPhoneNumber } = await import("firebase/auth");
      const confirmationResult = await signInWithPhoneNumber(
        authRef.current,
        phone,
        window.recaptchaVerifier as import("firebase/auth").RecaptchaVerifier
      );
      window.confirmationResult = confirmationResult;
      setShowVerify(true);
      setStatus(`OTP sent to ${phone}! Check your phone.`);
      setStatusType("success");
      console.log("signInWithPhoneNumber success:", confirmationResult);
    } catch (err: unknown) {
      const firebaseErr = err as { code?: string; message?: string };
      console.error("signInWithPhoneNumber error:", err);
      setStatus(`Send failed: ${firebaseErr.code}\n${firebaseErr.message}`);
      setStatusType("error");
      setSendDisabled(false);
      if (window.recaptchaWidgetId !== undefined && window.grecaptcha) {
        window.grecaptcha.reset(window.recaptchaWidgetId);
      }
    }
  }

  async function verifyCode() {
    if (!code.trim() || !window.confirmationResult) return;

    setVerifyDisabled(true);
    setStatus("Verifying code...");
    setStatusType("");

    try {
      const cr = window.confirmationResult as import("firebase/auth").ConfirmationResult;
      const result = await cr.confirm(code);
      const idToken = await result.user.getIdToken();
      console.log("Verification success:", result.user);
      setStatus(
        `VERIFIED!\nUID: ${result.user.uid}\nPhone: ${result.user.phoneNumber}\nID Token: ${idToken.slice(0, 50)}...`
      );
      setStatusType("success");
    } catch (err: unknown) {
      const firebaseErr = err as { code?: string; message?: string };
      console.error("Verify error:", err);
      setStatus(`Verify failed: ${firebaseErr.code}\n${firebaseErr.message}`);
      setStatusType("error");
      setVerifyDisabled(false);
    }
  }

  return (
    <div style={{
      fontFamily: "system-ui",
      background: "#111",
      color: "#fff",
      padding: 24,
      maxWidth: 400,
      margin: "0 auto",
      minHeight: "100vh",
    }}>
      <h1 style={{ textAlign: "center", fontSize: 22 }}>Firebase SMS POC</h1>

      <label style={{ display: "block", color: "#aaa", fontSize: 14, marginBottom: 4 }}>
        Phone Number
      </label>
      <input
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        style={{
          width: "100%",
          boxSizing: "border-box",
          background: "#222",
          color: "#fff",
          fontSize: 18,
          padding: 12,
          borderRadius: 10,
          border: "1px solid #333",
          marginBottom: 12,
        }}
      />

      <div id="recaptcha-container" ref={recaptchaRef} style={{ marginBottom: 12, minHeight: 78 }} />

      <button
        onClick={sendOtp}
        disabled={sendDisabled || !firebaseReady}
        style={{
          width: "100%",
          padding: 14,
          border: "none",
          borderRadius: 10,
          fontSize: 16,
          fontWeight: 600,
          cursor: sendDisabled ? "not-allowed" : "pointer",
          marginBottom: 8,
          background: "#FBB811",
          color: "#1A1A1A",
          opacity: sendDisabled ? 0.5 : 1,
        }}
      >
        {sendLabel}
      </button>

      {showVerify && (
        <div>
          <label style={{ display: "block", color: "#aaa", fontSize: 14, marginBottom: 4 }}>
            Verification Code
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={6}
            inputMode="numeric"
            placeholder="123456"
            style={{
              width: "100%",
              boxSizing: "border-box",
              background: "#222",
              color: "#fff",
              fontSize: 18,
              padding: 12,
              borderRadius: 10,
              border: "1px solid #333",
              marginBottom: 12,
            }}
          />
          <button
            onClick={verifyCode}
            disabled={verifyDisabled}
            style={{
              width: "100%",
              padding: 14,
              border: "none",
              borderRadius: 10,
              fontSize: 16,
              fontWeight: 600,
              cursor: verifyDisabled ? "not-allowed" : "pointer",
              background: "#22C55E",
              color: "#1A1A1A",
              opacity: verifyDisabled ? 0.5 : 1,
            }}
          >
            Verify Code
          </button>
        </div>
      )}

      {status && (
        <div style={{
          marginTop: 16,
          fontSize: 13,
          textAlign: "center",
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
          color: statusType === "error" ? "#E74C3C" : statusType === "success" ? "#22C55E" : "#aaa",
        }}>
          {status}
        </div>
      )}
    </div>
  );
}
