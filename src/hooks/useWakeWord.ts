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

  // Check if Web Speech API is supported
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition || !enabled) return;

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
          // Stop recognition briefly and trigger wake callback
          recognition.stop();
          onWake();
          return;
        }
      }
    };

    recognition.onerror = (event) => {
      console.warn("[WakeWord] Error:", event.error);
      setIsListening(false);
      onListening?.(false);

      // Auto-restart on certain errors
      if (event.error !== "aborted" && enabled) {
        restartTimeoutRef.current = window.setTimeout(() => {
          startListening();
        }, 1000);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      onListening?.(false);

      // Auto-restart if still enabled
      if (enabled && recognitionRef.current === recognition) {
        restartTimeoutRef.current = window.setTimeout(() => {
          startListening();
        }, 500);
      }
    };

    try {
      recognition.start();
    } catch (err) {
      console.warn("[WakeWord] Failed to start:", err);
    }
  }, [enabled, onWake, onListening]);

  const stopListening = useCallback(() => {
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }

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
      startListening();
    } else {
      stopListening();
    }

    return () => {
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
