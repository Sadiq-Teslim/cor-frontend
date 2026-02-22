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

  const speakResponse = async (text: string) => {
    try {
      setIsSpeaking(true);
      const audioBlob = await voiceApi.speak(text, langCode);
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
      }
    } catch (err) {
      console.error("[HeyCor] TTS error:", err);
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
    stopRecording();
    if (audioRef.current) {
      audioRef.current.pause();
    }
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
