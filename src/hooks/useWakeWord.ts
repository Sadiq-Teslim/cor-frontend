import { useState, useEffect, useCallback, useRef } from "react";

interface UseWakeWordOptions {
  wakePhrase?: string;
  enabled?: boolean;
  onWake: () => void;
  onListening?: (isListening: boolean) => void;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: Event & { error: string }) => void;
  onend: () => void;
  onstart: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export function useWakeWord({
  wakePhrase = "hey cor",
  enabled = true,
  onWake,
  onListening,
}: UseWakeWordOptions) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const restartTimeoutRef = useRef<number | null>(null);
  const isStartingRef = useRef(false);
  const hasPermissionDeniedRef = useRef(false);
  const manualStopRef = useRef(false);

  // Check if Web Speech API is supported
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);
  }, []);

  const startListening = useCallback(() => {
    // Don't start if already starting or permission denied
    if (isStartingRef.current || hasPermissionDeniedRef.current) {
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition || !enabled) return;

    isStartingRef.current = true;

    // Clean up existing recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // Ignore abort errors
      }
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US"; // Start with English, wake word works in all languages

    recognition.onstart = () => {
      isStartingRef.current = false;
      setIsListening(true);
      onListening?.(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      // Check all results for wake phrase
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript.toLowerCase().trim();

        // Check for wake phrase variations
        const wakeVariations = [
          "hey cor",
          "hey core",
          "hey call",
          "hey car",
          "a cor",
          "hey cora",
          "cor",
          "okay cor",
          "ok cor",
        ];

        const detected = wakeVariations.some(
          (phrase) =>
            transcript.includes(phrase) ||
            transcript.endsWith(phrase.split(" ").pop() || ""),
        );

        if (detected) {
          console.log("[WakeWord] Detected:", transcript);
          // Mark as intentional stop to prevent auto-restart in onend
          manualStopRef.current = true;
          // Stop recognition and trigger wake callback
          recognition.stop();
          onWake();
          return;
        }
      }
    };

    recognition.onerror = (event) => {
      console.warn("[WakeWord] Error:", event.error);
      isStartingRef.current = false;
      setIsListening(false);
      onListening?.(false);

      // Permission denied - don't retry
      if (event.error === "not-allowed") {
        console.warn("[WakeWord] Microphone permission denied");
        hasPermissionDeniedRef.current = true;
        return;
      }

      // Aborted - don't retry
      if (event.error === "aborted") {
        return;
      }

      // Network error - retry with longer delay
      if (enabled && event.error === "network") {
        restartTimeoutRef.current = window.setTimeout(() => {
          startListening();
        }, 3000);
      }
    };

    recognition.onend = () => {
      isStartingRef.current = false;
      setIsListening(false);
      onListening?.(false);

      // Don't auto-restart if manually stopped for wake detection
      if (manualStopRef.current) {
        manualStopRef.current = false;
        return;
      }

      // Auto-restart only if enabled, permission not denied, and this is still the current instance
      if (enabled && !hasPermissionDeniedRef.current && recognitionRef.current === recognition) {
        restartTimeoutRef.current = window.setTimeout(() => {
          startListening();
        }, 1000);
      }
    };

    try {
      recognition.start();
    } catch (err) {
      console.warn("[WakeWord] Failed to start:", err);
      isStartingRef.current = false;
      // Don't retry if it's a permission error
      if ((err as any)?.name === "NotAllowedError") {
        console.warn("[WakeWord] Microphone permission not granted");
        hasPermissionDeniedRef.current = true;
        setIsListening(false);
        onListening?.(false);
      }
    }
  }, [enabled, onWake, onListening]);

  const stopListening = useCallback(() => {
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }

    isStartingRef.current = false;
    hasPermissionDeniedRef.current = false;
    // Don't reset manualStopRef - let onend handle it

    if (recognitionRef.current) {
      try {
        // Properly stop and abort to release microphone
        recognitionRef.current.stop();
        recognitionRef.current.abort();
      } catch {
        // Ignore abort errors
      }
      recognitionRef.current = null;
    }

    setIsListening(false);
    onListening?.(false);
  }, [onListening]);

    // Start/stop based on enabled
  useEffect(() => {
    if (enabled && isSupported) {
      console.log("[WakeWord] Starting listener");
      startListening();
    } else {
      console.log("[WakeWord] Stopping listener");
      stopListening();
    }

    return () => {
      console.log("[WakeWord] Cleanup: stopping listener");
      stopListening();
    };
  }, [enabled, isSupported, startListening, stopListening]);

  return {
    isListening,
    isSupported,
    startListening,
    stopListening,
  };
}

export default useWakeWord;
