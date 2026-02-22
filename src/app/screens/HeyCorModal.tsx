import { useState, useEffect, useRef } from "react";
import { voiceApi, healthApi } from "../../api";
import { LANGUAGE_MAP } from "../../api/types";
import { Heart, Mic, MicOff, Send, Volume2 } from "lucide-react";
import { useVoiceInput } from "../../hooks";

interface Props {
  userId: string | null;
  selectedLanguage: string;
  onClose: () => void;
}

export default function HeyCorModal({
  userId,
  selectedLanguage,
  onClose,
}: Props) {
  const [corInput, setCorInput] = useState("");
  const [corResponse, setCorResponse] = useState(
    "Hi! I'm Cor, your heart health companion. Ask me anything about your health...",
  );
  const [corLoading, setCorLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [userContext, setUserContext] = useState<string>("");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const langCode = LANGUAGE_MAP[selectedLanguage] || "en";

  const { isRecording, fullTranscript, startRecording, stopRecording } =
    useVoiceInput({
      language: langCode,
      onTranscript: (text) => {
        setCorInput((prev) => (prev + " " + text).trim());
      },
    });

  // Fetch user context on mount
  useEffect(() => {
    if (!userId) return;

    // Get user's BP readings for context summary
    healthApi
      .getBPReadings(userId, 7)
      .then((data) => {
        if (data.readings && data.readings.length > 0) {
          const latest = data.readings[0];
          const avgSystolic =
            data.readings.reduce((sum, r) => sum + r.systolic, 0) /
            data.readings.length;
          const avgDiastolic =
            data.readings.reduce((sum, r) => sum + r.diastolic, 0) /
            data.readings.length;

          setUserContext(
            `Your average BP this week is ${Math.round(avgSystolic)}/${Math.round(avgDiastolic)}. `,
          );

          // Update greeting based on status
          if (avgSystolic >= 140 || avgDiastolic >= 90) {
            setCorResponse(
              "Hi! I noticed your readings have been elevated lately. Let's talk about what might help. What would you like to know?",
            );
          } else if (avgSystolic >= 130 || avgDiastolic >= 80) {
            setCorResponse(
              "Hi! Your BP has been slightly elevated. I'm here to help you manage it. What's on your mind?",
            );
          } else {
            setCorResponse(
              "Hi! Your BP has been looking good! Keep up the healthy habits. What can I help you with today?",
            );
          }
        }
      })
      .catch(console.error);
  }, [userId]);

  // Preload speechSynthesis voices (they load async on some browsers)
  useEffect(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  // Stop recording and clean up on unmount
  useEffect(() => {
    return () => {
      if (isRecording) {
        stopRecording();
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isRecording, stopRecording]);

  const askCor = async () => {
    const question = corInput.trim();
    if (!question) return;

    setCorLoading(true);
    setCorResponse("Thinking...");
    setCorInput("");

    try {
      const response = await voiceApi.respond(
        question,
        langCode,
        userId || undefined,
        {
          appContext: userContext,
          features: ['bp-camera', 'food-logger', 'voice-assistant', 'medication-tracking', 'health-trends'],
        },
      );
      setCorResponse(response.text);

      // Speak the response
      speakResponse(response.text);
    } catch {
      setCorResponse(
        "I'm having trouble connecting right now. Please try again.",
      );
    } finally {
      setCorLoading(false);
    }
  };

  // Language map for browser speechSynthesis
  const SYNTH_LANG_MAP: Record<string, string> = {
    en: "en-US", yo: "yo-NG", ha: "ha-NG", ig: "ig-NG", pcm: "en-NG", fr: "fr-FR",
  };

  // African languages that benefit from YarnGPT's Nigerian voices
  const AFRICAN_LANGS = new Set(["yo", "ha", "ig", "pcm"]);

  const speakResponse = async (text: string) => {
    setIsSpeaking(true);

    // For African languages, try YarnGPT API (better voices) with a 5s timeout
    // For English/French, use instant browser speechSynthesis
    if (AFRICAN_LANGS.has(langCode)) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const audioBlob = await Promise.race([
          voiceApi.speak(text, langCode),
          new Promise<never>((_, reject) => {
            controller.signal.addEventListener("abort", () =>
              reject(new Error("TTS timeout"))
            );
          }),
        ]);
        clearTimeout(timeout);

        const audioUrl = URL.createObjectURL(audioBlob);
        if (audioRef.current) {
          audioRef.current.src = audioUrl;
          audioRef.current.onended = () => {
            setIsSpeaking(false);
            URL.revokeObjectURL(audioUrl);
          };
          audioRef.current.onerror = () => {
            setIsSpeaking(false);
            URL.revokeObjectURL(audioUrl);
          };
          await audioRef.current.play();
          return;
        }
      } catch (err) {
        console.warn("[HeyCor] YarnGPT TTS failed/slow, falling back to browser:", err);
        // Fall through to browser speechSynthesis
      }
    }

    // Browser speechSynthesis — instant, no network call
    if ("speechSynthesis" in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = SYNTH_LANG_MAP[langCode] || "en-US";
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      // Try to pick a good voice
      const voices = window.speechSynthesis.getVoices();
      const targetLang = utterance.lang.split("-")[0];
      const match = voices.find(
        (v) => v.lang.startsWith(targetLang) && v.localService
      ) || voices.find((v) => v.lang.startsWith(targetLang));
      if (match) utterance.voice = match;

      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    } else {
      // No TTS available at all
      setIsSpeaking(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleClose = () => {
    // Stop recording and audio playback before closing
    if (isRecording) {
      stopRecording();
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    onClose();
  };

  return (
    <div
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] px-6 py-6 rounded-t-3xl z-[100]"
      style={{
        background: "#111827",
        borderTop: "1px solid #1E2D45",
      }}
    >
      <audio ref={audioRef} className="hidden" />

      <div
        onClick={handleClose}
        className="absolute top-3 right-3 text-xl cursor-pointer"
        style={{ color: "#8896A8" }}
      >
        ×
      </div>

      {/* Cor Avatar */}
      <div
        className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center relative"
        style={{
          background: isRecording
            ? "#FF6B6B"
            : isSpeaking
              ? "#A78BFA"
              : "#00E5CC",
          animation:
            corLoading || isRecording || isSpeaking
              ? "pulse 1s ease-in-out infinite"
              : "pulse 2s ease-in-out infinite",
        }}
      >
        {isRecording ? (
          <Mic size={28} style={{ color: "#0A0F1E" }} />
        ) : isSpeaking ? (
          <Volume2 size={28} style={{ color: "#0A0F1E" }} />
        ) : (
          <Heart size={28} style={{ color: "#0A0F1E" }} />
        )}
      </div>

      {/* Status */}
      <div className="text-sm text-center mb-3" style={{ color: "#8896A8" }}>
        {isRecording
          ? "Listening..."
          : isSpeaking
            ? "Speaking..."
            : corLoading
              ? "Thinking..."
              : "Ask Cor"}
      </div>

      {/* Response Area */}
      <div
        className="min-h-[80px] text-center text-base px-4 mb-4 leading-relaxed"
        style={{
          color:
            corResponse.includes("Hi!") || corResponse.includes("Ask me")
              ? "#8896A8"
              : "#F0F4FF",
        }}
      >
        {corResponse}
      </div>

      {/* Voice Transcript Preview */}
      {(isRecording || fullTranscript) && (
        <div
          className="text-sm text-center mb-3 px-4 py-2 rounded-lg"
          style={{ background: "#0A0F1E", color: "#00E5CC" }}
        >
          {fullTranscript || "Speak now..."}
        </div>
      )}

      {/* Input Area */}
      <div className="flex gap-2">
        {/* Voice Button */}
        <button
          onClick={toggleRecording}
          className="w-12 h-12 rounded-xl flex items-center justify-center transition-colors"
          style={{
            background: isRecording ? "#FF6B6B" : "#1E2D45",
            color: isRecording ? "#0A0F1E" : "#00E5CC",
          }}
        >
          {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        {/* Text Input */}
        <input
          type="text"
          placeholder="Ask about your heart health..."
          value={corInput}
          onChange={(e) => setCorInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && askCor()}
          className="flex-1 px-4 py-3 text-sm rounded-xl"
          style={{
            background: "#0A0F1E",
            border: "1px solid #1E2D45",
            color: "#F0F4FF",
          }}
        />

        {/* Send Button */}
        <button
          onClick={askCor}
          disabled={corLoading || !corInput.trim()}
          className="w-12 h-12 rounded-xl flex items-center justify-center transition-colors"
          style={{
            background: corInput.trim() && !corLoading ? "#00E5CC" : "#333",
            color: "#0A0F1E",
          }}
        >
          <Send size={20} />
        </button>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2 mt-4">
        {[
          "What's my BP trend?",
          "Am I at risk?",
          "What should I eat?",
          "Tips for today",
        ].map((prompt) => (
          <button
            key={prompt}
            onClick={() => {
              setCorInput(prompt);
            }}
            className="px-3 py-1.5 rounded-full text-xs"
            style={{ background: "#1E2D45", color: "#8896A8" }}
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
