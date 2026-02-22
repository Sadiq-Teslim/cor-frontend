import { useState, useCallback, useRef } from "react";
import { voiceApi } from "../api";

interface UseVoiceInputOptions {
  language?: string;
  onTranscript?: (text: string) => void;
  onError?: (error: string) => void;
}

// Language code mapping for speech recognition
const SPEECH_LANG_MAP: Record<string, string> = {
  en: "en-US",
  yo: "yo-NG",
  ha: "ha-NG",
  ig: "ig-NG",
  pcm: "en-NG", // Nigerian Pidgin uses English locale with Pidgin recognition
  fr: "fr-FR",
};

export function useVoiceInput({
  language = "en",
  onTranscript,
  onError,
}: UseVoiceInputOptions = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Use Web Speech API for real-time transcription
  const startRecording = useCallback(async () => {
    // Add a small delay to ensure wake word has fully stopped and released microphone
    await new Promise(resolve => setTimeout(resolve, 100));

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      // Web Speech API available - use it
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = SPEECH_LANG_MAP[language] || "en-US";

      recognition.onstart = () => {
        setIsRecording(true);
        setTranscript("");
        setInterimTranscript("");
      };

      recognition.onresult = (event: any) => {
        let final = "";
        let interim = "";

        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            final += result[0].transcript + " ";
          } else {
            interim += result[0].transcript;
          }
        }

        if (final) {
          setTranscript((prev) => prev + final);
          setInterimTranscript("");
          onTranscript?.(final.trim());
        } else {
          setInterimTranscript(interim);
        }
      };

      recognition.onerror = (event: any) => {
        console.error("[VoiceInput] Error:", event.error);
        setIsRecording(false);
        onError?.(event.error);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      // Auto-stop after speech ends
      recognition.onspeechend = () => {
        setTimeout(() => {
          if (recognitionRef.current) {
            recognitionRef.current.stop();
          }
        }, 1500);
      };

      try {
        recognition.start();
      } catch (err) {
        console.error("[VoiceInput] Failed to start:", err);
        onError?.("Failed to start voice recognition");
      }
    } else {
      // Fallback to MediaRecorder + server-side transcription
      let retries = 0;
      const maxRetries = 3;

      const attemptGetMedia = async (): Promise<void> => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
          });
          const mediaRecorder = new MediaRecorder(stream, {
            mimeType: "audio/webm",
          });
          mediaRecorderRef.current = mediaRecorder;
          audioChunksRef.current = [];

          mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
              audioChunksRef.current.push(e.data);
            }
          };

          mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunksRef.current, {
              type: "audio/webm",
            });
            const audioFile = new File([audioBlob], "voice.webm", {
              type: "audio/webm",
            });

            try {
              setInterimTranscript("Transcribing...");
              const result = await voiceApi.transcribe(audioFile);
              setTranscript(result.text);
              setInterimTranscript("");
              onTranscript?.(result.text);
            } catch (err) {
              console.error("[VoiceInput] Transcription error:", err);
              onError?.("Failed to transcribe audio");
            }

            // Stop all tracks
            stream.getTracks().forEach((track) => track.stop());
          };

          mediaRecorder.start();
          setIsRecording(true);
          setTranscript("");
          setInterimTranscript("");

          // Auto-stop after 30 seconds
          setTimeout(() => {
            if (mediaRecorderRef.current?.state === "recording") {
              stopRecording();
            }
          }, 30000);
        } catch (err: any) {
          console.error("[VoiceInput] Media error:", err);
          
          // Retry on NotAllowedError or NotFoundError (microphone in use)
          if (
            (err.name === "NotAllowedError" || err.name === "NotFoundError" || err.message?.includes("Permission denied")) &&
            retries < maxRetries
          ) {
            retries++;
            console.log(`[VoiceInput] Retrying getUserMedia (${retries}/${maxRetries})...`);
            // Wait before retrying to let other processes release the microphone
            await new Promise(resolve => setTimeout(resolve, 300 * retries));
            await attemptGetMedia();
          } else {
            onError?.("Microphone access denied");
            setIsRecording(false);
          }
        }
      };

      await attemptGetMedia();
    }
  }, [language, onTranscript, onError]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        recognitionRef.current.abort();
      } catch {
        // Ignore error
      }
      recognitionRef.current = null;
    }

    if (mediaRecorderRef.current?.state === "recording") {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // Ignore error
      }
      mediaRecorderRef.current = null;
    }

    setIsRecording(false);
  }, []);

  const getFullTranscript = useCallback(() => {
    return (transcript + " " + interimTranscript).trim();
  }, [transcript, interimTranscript]);

  return {
    isRecording,
    transcript,
    interimTranscript,
    fullTranscript: getFullTranscript(),
    startRecording,
    stopRecording,
  };
}

export default useVoiceInput;
