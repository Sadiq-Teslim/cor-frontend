import { useState, useRef, useEffect, useCallback } from "react";
import { healthApi } from "../../api";
import {
  RPPGDetector,
  type SignalQuality,
  type RPPGResult,
} from "../../lib/rppg";
import {
  Smile,
  Meh,
  Frown,
  ArrowLeft,
  X,
  Check,
  Share2,
  RefreshCw,
  HeartPulse,
  Activity,
  Clock,
  AlertCircle,
} from "lucide-react";

interface Props {
  userId: string | null;
  onBack: () => void;
}

interface BPReading {
  hr: number;
  hrv: number;
  systolic?: number;
  diastolic?: number;
  status: string;
  message: string;
  recommendation?: string;
  category?: string;
  lowConfidence: boolean;
  earlyComplete: boolean;
  savedAt?: string;
}

export default function BPCheckScreen({ userId, onBack }: Props) {
  const [isReading, setIsReading] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [signalQuality, setSignalQuality] = useState<SignalQuality>({
    strength: 0,
    brightness: 0,
    pulsatile: 0,
    stability: 1,
    isFingerDetected: false,
  });
  const [bpReading, setBpReading] = useState<BPReading | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [feelingSelected, setFeelingSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [completionTime, setCompletionTime] = useState(30);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectorRef = useRef<RPPGDetector | null>(null);
  const intervalRef = useRef<number | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (detectorRef.current) {
        detectorRef.current.stop();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const handleSignalUpdate = useCallback((quality: SignalQuality) => {
    setSignalQuality(quality);
  }, []);

  const processResult = useCallback(
    async (result: RPPGResult, isEarly: boolean, timeElapsed: number) => {
      if (detectorRef.current) {
        detectorRef.current.stop();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      setIsReading(false);
      setCompletionTime(timeElapsed);

      const { heartRate, hrv, confidence } = result;
      const lowConfidence = confidence < 0.5;
      const savedAt = new Date().toISOString();

      if (userId) {
        try {
          const data = await healthApi.submitBPCheck(
            userId,
            hrv,
            heartRate,
            feelingSelected || undefined,
          );
          setBpReading({
            hr: data.reading.heartRate,
            hrv: data.reading.hrv,
            systolic: data.reading.systolic,
            diastolic: data.reading.diastolic,
            status: data.context.comparedToAverage,
            message: data.context.message,
            recommendation: data.context.recommendation,
            category: data.category.category,
            lowConfidence,
            earlyComplete: isEarly,
            savedAt,
          });
          setShowResultModal(true);
        } catch {
          setBpReading({
            hr: heartRate,
            hrv: hrv,
            status: "elevated",
            message:
              "Reading captured. Connect to see your personalized insights.",
            lowConfidence,
            earlyComplete: isEarly,
            savedAt,
          });
          setShowResultModal(true);
        }
      } else {
        setBpReading({
          hr: heartRate,
          hrv: hrv,
          status: "elevated",
          message:
            "Reading captured. Please complete onboarding to track your health.",
          lowConfidence,
          earlyComplete: isEarly,
        });
        setShowResultModal(true);
      }
    },
    [userId, feelingSelected],
  );

  const handleEarlyCompletion = useCallback(
    (result: RPPGResult) => {
      // Calculate time elapsed (30 - current countdown)
      const timeElapsed = 30 - countdown;
      processResult(result, true, timeElapsed);
    },
    [processResult, countdown],
  );

  const finishReading = useCallback(async () => {
    if (!detectorRef.current) return;

    const result = detectorRef.current.getResult();

    if (!result) {
      detectorRef.current.stop();
      setIsReading(false);
      setError(
        "Could not detect heart rate. Please try again with your finger firmly covering the camera lens.",
      );
      return;
    }

    processResult(result, false, 30);
  }, [processResult]);

  const startReading = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setError(null);
    setBpReading(null);
    setIsReading(true);
    setCountdown(30);
    setCompletionTime(30);
    setSignalQuality({
      strength: 0,
      brightness: 0,
      pulsatile: 0,
      stability: 1,
      isFingerDetected: false,
    });

    // Initialize detector with early completion callback
    detectorRef.current = new RPPGDetector(
      videoRef.current,
      canvasRef.current,
      handleSignalUpdate,
      handleEarlyCompletion,
    );

    try {
      await detectorRef.current.start();
    } catch (err) {
      setIsReading(false);
      setError(
        "Camera access denied. Please allow camera access to measure your heart rate.",
      );
      return;
    }

    // Countdown timer
    intervalRef.current = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          finishReading();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const getSignalStatus = () => {
    const { isFingerDetected, strength, pulsatile, stability } = signalQuality;

    if (!isFingerDetected) {
      return { text: "Place finger on camera", color: "#F5A623", icon: "👆" };
    }
    if (stability < 0.5) {
      return { text: "Hold still", color: "#F5A623", icon: "✋" };
    }
    if (pulsatile < 0.2) {
      return { text: "Press slightly harder", color: "#F5A623", icon: "👇" };
    }
    if (strength > 0.5) {
      return { text: "Signal: Excellent", color: "#00E5CC", icon: "✓" };
    }
    if (strength > 0.3) {
      return { text: "Signal: Good", color: "#00E5CC", icon: "✓" };
    }
    return { text: "Adjusting...", color: "#F5A623", icon: "⏳" };
  };

  const signalStatus = getSignalStatus();

  return (
    <div className="px-6 py-6 pb-36">
      <div
        className="cursor-pointer mb-4"
        style={{ color: "#8896A8" }}
        onClick={onBack}
      >
        <ArrowLeft size={24} />
      </div>

      <h1 className="text-[22px] font-bold mb-2">Check your blood pressure</h1>
      <p className="text-sm mb-8" style={{ color: "#8896A8" }}>
        Place your finger over your back camera and hold still for 30 seconds.
      </p>

      {/* Hidden video and canvas for rPPG processing */}
      <video
        ref={videoRef}
        playsInline
        muted
        className="hidden"
        style={{ width: 1, height: 1 }}
      />
      <canvas
        ref={canvasRef}
        className="hidden"
        style={{ width: 1, height: 1 }}
      />

      {error && (
        <div
          className="mb-6 p-4 rounded-xl"
          style={{ background: "#1E2D45", border: "1px solid #F5A623" }}
        >
          <p className="text-sm" style={{ color: "#F5A623" }}>
            {error}
          </p>
          <button
            onClick={() => setError(null)}
            className="mt-3 text-sm underline"
            style={{ color: "#00E5CC" }}
          >
            Try Again
          </button>
        </div>
      )}

      {!isReading && !bpReading && !error && (
        <>
          {/* Pre-reading feeling selection */}
          <div className="mb-6">
            <div className="text-base font-semibold mb-3">
              How are you feeling right now?
            </div>
            <div className="flex gap-3 justify-center">
              {[
                { icon: <Smile size={28} />, label: "Good" },
                { icon: <Meh size={28} />, label: "Okay" },
                { icon: <Frown size={28} />, label: "Off" },
              ].map((feeling) => (
                <div
                  key={feeling.label}
                  onClick={() => setFeelingSelected(feeling.label)}
                  className="px-5 py-3 rounded-xl cursor-pointer text-center"
                  style={{
                    border: `1px solid ${feelingSelected === feeling.label ? "#00E5CC" : "#1E2D45"}`,
                    background:
                      feelingSelected === feeling.label
                        ? "#111827"
                        : "transparent",
                  }}
                >
                  <div
                    className="mb-1 flex justify-center"
                    style={{
                      color:
                        feelingSelected === feeling.label
                          ? "#00E5CC"
                          : "#8896A8",
                    }}
                  >
                    {feeling.icon}
                  </div>
                  <div className="text-xs">{feeling.label}</div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={startReading}
            className="w-full font-bold text-base px-4 py-4 rounded-xl"
            style={{ background: "#00E5CC", color: "#0A0F1E" }}
          >
            Start Reading
          </button>
        </>
      )}

      {isReading && (
        <div className="text-center">
          {/* Finger placement indicator */}
          <div
            className="w-24 h-24 mx-auto mb-4 rounded-full flex items-center justify-center"
            style={{
              background:
                signalQuality.isFingerDetected && signalQuality.strength > 0.3
                  ? "rgba(0, 229, 204, 0.15)"
                  : "rgba(245, 166, 35, 0.15)",
              border: `3px solid ${signalQuality.isFingerDetected && signalQuality.strength > 0.3 ? "#00E5CC" : "#F5A623"}`,
              transition: "all 0.3s ease",
            }}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{
                background:
                  signalQuality.isFingerDetected && signalQuality.strength > 0.3
                    ? `rgba(0, 229, 204, ${0.3 + signalQuality.pulsatile * 0.5})`
                    : "rgba(245, 166, 35, 0.3)",
                animation:
                  signalQuality.isFingerDetected &&
                  signalQuality.pulsatile > 0.2
                    ? "pulse 1s ease-in-out infinite"
                    : "none",
              }}
            >
              <span className="text-2xl">{signalStatus.icon}</span>
            </div>
          </div>

          {/* Signal quality bars */}
          <div className="flex justify-center gap-1 mb-4">
            {[0.2, 0.4, 0.6, 0.8, 1.0].map((threshold, i) => (
              <div
                key={i}
                className="w-2 rounded-full transition-all duration-300"
                style={{
                  height: `${12 + i * 4}px`,
                  background:
                    signalQuality.strength >= threshold ? "#00E5CC" : "#1E2D45",
                }}
              />
            ))}
          </div>

          <svg width="96" height="96" className="mx-auto mb-4">
            <circle
              cx="48"
              cy="48"
              r="45"
              stroke="#1E2D45"
              strokeWidth="6"
              fill="none"
            />
            <circle
              cx="48"
              cy="48"
              r="45"
              stroke="#00E5CC"
              strokeWidth="6"
              fill="none"
              strokeDasharray="283"
              strokeDashoffset={283 - (283 * (30 - countdown)) / 30}
              className="origin-center -rotate-90"
              style={{ transition: "stroke-dashoffset 1s linear" }}
            />
            <text
              x="48"
              y="58"
              textAnchor="middle"
              fontSize="28"
              fontWeight="700"
              fill="#F0F4FF"
            >
              {countdown}
            </text>
          </svg>
          <div
            className="text-sm font-medium"
            style={{ color: signalStatus.color }}
          >
            {signalStatus.text}
          </div>
          <div className="mt-2 text-xs" style={{ color: "#8896A8" }}>
            {signalQuality.isFingerDetected
              ? "Keep your finger still on the camera"
              : "Cover the camera lens completely with your fingertip"}
          </div>

          {/* CSS for pulse animation */}
          <style>{`
            @keyframes pulse {
              0%, 100% { transform: scale(1); opacity: 0.8; }
              50% { transform: scale(1.1); opacity: 1; }
            }
          `}</style>
        </div>
      )}

      {bpReading && !showResultModal && (
        <div className="text-center">
          <div
            className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
            style={{ background: "rgba(0, 229, 204, 0.15)" }}
          >
            <Check size={32} style={{ color: "#00E5CC" }} />
          </div>
          <h2 className="text-xl font-bold mb-2">Reading Complete!</h2>
          <p className="text-sm mb-4" style={{ color: "#8896A8" }}>
            Your BP data has been saved to your profile.
          </p>
          <button
            onClick={() => setShowResultModal(true)}
            className="w-full font-bold text-base px-4 py-4 rounded-xl"
            style={{ background: "#00E5CC", color: "#0A0F1E" }}
          >
            View Results
          </button>
        </div>
      )}

      {/* Result Modal */}
      {showResultModal && bpReading && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(0, 0, 0, 0.8)" }}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6"
            style={{
              background: "#111827",
              border: "1px solid #1E2D45",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">BP Reading Results</h2>
              <button
                onClick={() => setShowResultModal(false)}
                className="p-2 rounded-full"
                style={{ background: "#1E2D45" }}
              >
                <X size={18} style={{ color: "#8896A8" }} />
              </button>
            </div>

            {/* Saved Confirmation */}
            {bpReading.savedAt && (
              <div
                className="flex items-center gap-2 mb-4 p-3 rounded-xl"
                style={{
                  background: "rgba(0, 229, 204, 0.1)",
                  border: "1px solid #00E5CC",
                }}
              >
                <Check size={18} style={{ color: "#00E5CC" }} />
                <span className="text-sm" style={{ color: "#00E5CC" }}>
                  Saved to your health profile
                </span>
              </div>
            )}

            {/* Early Completion Badge */}
            {bpReading.earlyComplete && !bpReading.lowConfidence && (
              <div
                className="flex items-center gap-2 mb-4 p-3 rounded-xl"
                style={{
                  background: "rgba(0, 229, 204, 0.05)",
                  border: "1px solid #1E2D45",
                }}
              >
                <Clock size={16} style={{ color: "#00E5CC" }} />
                <span className="text-sm">
                  High confidence reading in {completionTime}s
                </span>
              </div>
            )}

            {/* Low Confidence Warning */}
            {bpReading.lowConfidence && (
              <div
                className="flex items-center gap-2 mb-4 p-3 rounded-xl"
                style={{
                  background: "rgba(245, 166, 35, 0.1)",
                  border: "1px solid #F5A623",
                }}
              >
                <AlertCircle size={16} style={{ color: "#F5A623" }} />
                <span className="text-sm" style={{ color: "#F5A623" }}>
                  Variable signal quality
                </span>
              </div>
            )}

            {/* Results Table */}
            <div
              className="rounded-xl overflow-hidden mb-4"
              style={{ border: "1px solid #1E2D45" }}
            >
              <table className="w-full">
                <tbody>
                  <tr style={{ borderBottom: "1px solid #1E2D45" }}>
                    <td
                      className="px-4 py-3 text-sm"
                      style={{ color: "#8896A8" }}
                    >
                      <div className="flex items-center gap-2">
                        <HeartPulse size={16} style={{ color: "#00E5CC" }} />
                        Heart Rate
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {bpReading.hr}{" "}
                      <span
                        className="text-sm font-normal"
                        style={{ color: "#8896A8" }}
                      >
                        bpm
                      </span>
                    </td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #1E2D45" }}>
                    <td
                      className="px-4 py-3 text-sm"
                      style={{ color: "#8896A8" }}
                    >
                      <div className="flex items-center gap-2">
                        <Activity size={16} style={{ color: "#A78BFA" }} />
                        HRV
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {bpReading.hrv}{" "}
                      <span
                        className="text-sm font-normal"
                        style={{ color: "#8896A8" }}
                      >
                        ms
                      </span>
                    </td>
                  </tr>
                  {bpReading.systolic && bpReading.diastolic && (
                    <tr style={{ borderBottom: "1px solid #1E2D45" }}>
                      <td
                        className="px-4 py-3 text-sm"
                        style={{ color: "#8896A8" }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🩸</span>
                          Blood Pressure
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-bold text-lg">
                          {bpReading.systolic}/{bpReading.diastolic}
                        </span>
                        <span
                          className="text-sm font-normal ml-1"
                          style={{ color: "#8896A8" }}
                        >
                          mmHg
                        </span>
                      </td>
                    </tr>
                  )}
                  {bpReading.category && (
                    <tr>
                      <td
                        className="px-4 py-3 text-sm"
                        style={{ color: "#8896A8" }}
                      >
                        Category
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className="px-3 py-1 rounded-full text-sm font-semibold"
                          style={{
                            background:
                              bpReading.status === "normal"
                                ? "rgba(0, 229, 204, 0.15)"
                                : "rgba(245, 166, 35, 0.15)",
                            color:
                              bpReading.status === "normal"
                                ? "#00E5CC"
                                : "#F5A623",
                          }}
                        >
                          {bpReading.category}
                        </span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Health Interpretation */}
            <div
              className="p-4 rounded-xl mb-4"
              style={{ background: "#0A0F1E", border: "1px solid #1E2D45" }}
            >
              <div
                className="text-xs font-semibold mb-2"
                style={{
                  color: bpReading.status === "normal" ? "#00E5CC" : "#F5A623",
                }}
              >
                INTERPRETATION
              </div>
              <p className="text-sm leading-relaxed mb-2">
                {bpReading.message}
              </p>
              {bpReading.recommendation && (
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "#8896A8" }}
                >
                  {bpReading.recommendation}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowResultModal(false);
                  setBpReading(null);
                  setFeelingSelected(null);
                }}
                className="flex-1 font-semibold text-sm px-4 py-3 rounded-xl flex items-center justify-center gap-2"
                style={{
                  background: "transparent",
                  border: "1px solid #1E2D45",
                  color: "#F0F4FF",
                }}
              >
                <RefreshCw size={16} />
                New Reading
              </button>
              <button
                onClick={() => {
                  // Share functionality
                  if (navigator.share) {
                    navigator
                      .share({
                        title: "My BP Reading",
                        text: `BP: ${bpReading.systolic || "--"}/${bpReading.diastolic || "--"} mmHg | HR: ${bpReading.hr} bpm | HRV: ${bpReading.hrv}ms`,
                      })
                      .catch(console.error);
                  }
                }}
                className="flex-1 font-semibold text-sm px-4 py-3 rounded-xl flex items-center justify-center gap-2"
                style={{ background: "#00E5CC", color: "#0A0F1E" }}
              >
                <Share2 size={16} />
                Share
              </button>
            </div>

            {/* Close Modal Button */}
            <button
              onClick={() => {
                setShowResultModal(false);
                onBack();
              }}
              className="w-full mt-3 font-semibold text-sm px-4 py-3 rounded-xl"
              style={{
                background: "transparent",
                border: "1px solid #00E5CC",
                color: "#00E5CC",
              }}
            >
              Back to Home
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
