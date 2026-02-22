import { useState, useRef, useCallback, useEffect } from "react";
import { voiceApi } from "../api";

const PREGEN_LANGS = ["en", "yo", "ha"];

const Q_FILES = [
  "question-1-name.mp3",
  "question-2-age.mp3",
  "question-3-sex.mp3",
  "question-4-hypertension.mp3",
  "question-5-medications.mp3",
  "question-6-smoke-drink.mp3",
  "question-7-activity.mp3",
  "question-8-sleep.mp3",
];

const Q_TEXTS = [
  "What is your name?",
  "How old are you?",
  "What is your biological sex?",
  "Have you ever been diagnosed with high blood pressure?",
  "Do you take regular medication?",
  "Do you smoke or drink alcohol?",
  "How active are you?",
  "How many hours do you sleep on average?",
];

export type VoiceState =
  | "idle"
  | "playing"
  | "listening"
  | "recording"
  | "transcribing";

export function useVoiceOnboarding(
  langCode: string,
  onResult: (text: string) => void,
) {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [micLevel, setMicLevel] = useState(0);
  const [voiceReady, setVoiceReady] = useState(false);

  // Refs — all mutable state that doesn't trigger re-renders
  const audioEl = useRef<HTMLAudioElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const rafRef = useRef(0);
  const silRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recRef = useRef(false);
  // Keep latest callback in ref to avoid stale closures
  const cbRef = useRef(onResult);
  cbRef.current = onResult;
  const langRef = useRef(langCode);
  langRef.current = langCode;

  // ---- internal helpers (plain functions, access refs) ----

  function haltAudio() {
    if (audioEl.current) {
      audioEl.current.pause();
      audioEl.current = null;
    }
  }

  function cancelRaf() {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
  }

  function clearSil() {
    if (silRef.current) {
      clearTimeout(silRef.current);
      silRef.current = null;
    }
  }

  function beginCapture() {
    if (!streamRef.current || recRef.current) return;
    recRef.current = true;
    chunksRef.current = [];
    setVoiceState("recording");

    const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";

    const rec = new MediaRecorder(streamRef.current, { mimeType: mime });
    recorderRef.current = rec;
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.start(100);
  }

  function endCapture() {
    if (!recRef.current) return;
    recRef.current = false;
    clearSil();
    cancelRaf();

    const rec = recorderRef.current;
    if (rec && rec.state === "recording") {
      rec.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType });
        if (blob.size < 200) {
          setVoiceState("listening");
          return;
        }
        setVoiceState("transcribing");
        try {
          const file = new File([blob], "answer.webm", { type: rec.mimeType });
          const res = await voiceApi.transcribe(file);
          cbRef.current(res.text);
        } catch (err) {
          console.error("Transcription failed:", err);
        }
        setVoiceState("idle");
      };
      rec.stop();
    } else {
      setVoiceState("idle");
    }
  }

  function monitor() {
    const an = analyserRef.current;
    if (!an) return;
    const buf = new Uint8Array(an.frequencyBinCount);

    function tick() {
      an.getByteFrequencyData(buf);
      const avg = buf.reduce((a, b) => a + b, 0) / buf.length;
      setMicLevel(avg);

      // Voice activity → barge-in
      if (avg > 25 && !recRef.current) {
        haltAudio();
        beginCapture();
      }

      // Silence detection while recording
      if (recRef.current) {
        if (avg > 12) {
          clearSil();
        } else if (!silRef.current) {
          silRef.current = setTimeout(endCapture, 1800);
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    }
    tick();
  }

  // ---- public API ----

  const initMic = useCallback(async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = s;
      const ctx = new AudioContext();
      ctxRef.current = ctx;
      const src = ctx.createMediaStreamSource(s);
      const an = ctx.createAnalyser();
      an.fftSize = 512;
      src.connect(an);
      analyserRef.current = an;

      // Resume audio context to enable playback (user interaction happened via mic permission)
      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      // Unlock audio playback by playing a silent sound (helps with autoplay policies)
      try {
        const silentAudio = new Audio(
          "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA",
        );
        await silentAudio.play();
        console.log("[Voice] Audio unlocked via silent play");
      } catch (e) {
        console.log("[Voice] Silent audio unlock not needed or failed:", e);
      }

      setVoiceReady(true);
      console.log("[Voice] Mic initialized successfully");
      return true;
    } catch (e) {
      console.error("[Voice] Mic init failed:", e);
      setVoiceReady(false);
      return false;
    }
  }, []);

  const playQuestion = useCallback(async (step: number) => {
    console.log(
      "[Voice] playQuestion called for step:",
      step,
      "lang:",
      langRef.current,
    );

    // Reset
    haltAudio();
    if (recRef.current) endCapture();
    cancelRaf();
    setVoiceState("playing");

    // Resume AudioContext if suspended (required for some browsers)
    if (ctxRef.current?.state === "suspended") {
      try {
        await ctxRef.current.resume();
      } catch (e) {
        console.warn("Could not resume AudioContext:", e);
      }
    }

    try {
      let audioBlob: Blob;
      if (PREGEN_LANGS.includes(langRef.current)) {
        console.log("[Voice] Fetching pre-generated audio for:", Q_FILES[step - 1]);
        audioBlob = await voiceApi.getPregeneratedAudio(
          'onboarding',
          langRef.current,
          Q_FILES[step - 1],
        );
      } else {
        console.log("[Voice] Fetching TTS for:", Q_TEXTS[step - 1]);
        audioBlob = await voiceApi.speak(Q_TEXTS[step - 1], langRef.current);
      }
      console.log("[Voice] Audio blob received, size:", audioBlob.size);

      const blobUrl = URL.createObjectURL(audioBlob);

      const el = new Audio(blobUrl);
      audioEl.current = el;

      el.onended = () => {
        console.log("[Voice] Audio playback ended");
        URL.revokeObjectURL(blobUrl);
        audioEl.current = null;
        if (!recRef.current) setVoiceState("listening");
      };
      el.onerror = (e) => {
        console.error("[Voice] Audio playback error:", e, el.error);
        URL.revokeObjectURL(blobUrl);
        audioEl.current = null;
        if (!recRef.current) setVoiceState("listening");
      };

      console.log("[Voice] Attempting to play audio...");
      await el.play();
      console.log("[Voice] Audio playing successfully");
      // Start VAD monitoring for barge-in
      if (streamRef.current) monitor();
    } catch (e) {
      console.error("[Voice] Audio play failed:", e);
      setVoiceState("listening");
      if (streamRef.current) monitor();
    }
  }, []);

  const playConfirmation = useCallback(async () => {
    try {
      // Resume AudioContext if suspended
      if (ctxRef.current?.state === "suspended") {
        await ctxRef.current.resume();
      }

      let audioBlob: Blob;
      if (PREGEN_LANGS.includes(langRef.current)) {
        audioBlob = await voiceApi.getPregeneratedAudio(
          'confirmations',
          langRef.current,
          'got-it.mp3',
        );
      } else {
        audioBlob = await voiceApi.speak("Got it!", langRef.current);
      }

      const blobUrl = URL.createObjectURL(audioBlob);

      const audio = new Audio(blobUrl);
      audio.onended = () => URL.revokeObjectURL(blobUrl);
      await audio.play();
    } catch (e) {
      console.error("Confirmation audio failed:", e);
      // silent fail
    }
  }, []);

  const tapMic = useCallback(() => {
    if (recRef.current) {
      endCapture();
    } else {
      haltAudio();
      beginCapture();
      monitor();
    }
  }, []);

  const stopAll = useCallback(() => {
    haltAudio();
    cancelRaf();
    clearSil();
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    recRef.current = false;
    setVoiceState("idle");
    setMicLevel(0);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      haltAudio();
      cancelRaf();
      clearSil();
      if (recorderRef.current?.state === "recording")
        recorderRef.current.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (ctxRef.current?.state !== "closed") ctxRef.current?.close();
    };
  }, []);

  return {
    voiceState,
    voiceReady,
    micLevel,
    initMic,
    playQuestion,
    playConfirmation,
    tapMic,
    stopAll,
  };
}
