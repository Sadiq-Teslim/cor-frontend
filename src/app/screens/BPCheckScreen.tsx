import { useState, useRef, useEffect, useCallback } from 'react';
import { healthApi } from '../../api';
import { RPPGDetector } from '../../lib/rppg';
import { Smile, Meh, Frown, ArrowLeft } from 'lucide-react';

interface Props {
  userId: string | null;
  onBack: () => void;
}

export default function BPCheckScreen({ userId, onBack }: Props) {
  const [isReading, setIsReading] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [signalStrength, setSignalStrength] = useState(0);
  const [bpReading, setBpReading] = useState<any>(null);
  const [feelingSelected, setFeelingSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const handleSignalUpdate = useCallback((strength: number) => {
    setSignalStrength(strength);
  }, []);

  const finishReading = useCallback(async () => {
    if (!detectorRef.current) return;

    const result = detectorRef.current.getResult();
    detectorRef.current.stop();
    setIsReading(false);

    if (!result) {
      setError('Could not detect heart rate. Please try again with your finger firmly on the camera.');
      return;
    }

    const { heartRate, hrv } = result;

    if (userId) {
      try {
        const data = await healthApi.submitBPCheck(userId, hrv, heartRate, feelingSelected || undefined);
        setBpReading({
          hr: data.reading.heartRate, 
          hrv: data.reading.hrv,
          systolic: data.reading.systolic, 
          diastolic: data.reading.diastolic,
          status: data.context.comparedToAverage, 
          message: data.context.message,
          recommendation: data.context.recommendation, 
          category: data.category.category,
        });
      } catch {
        // Fallback with local data
        setBpReading({
          hr: heartRate, hrv: hrv, status: 'elevated',
          message: 'Reading captured. Connect to see your personalized insights.'
        });
      }
    } else {
      setBpReading({
        hr: heartRate, hrv: hrv, status: 'elevated',
        message: 'Reading captured. Please complete onboarding to track your health.'
      });
    }
  }, [userId, feelingSelected]);

  const startReading = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setError(null);
    setBpReading(null);
    setIsReading(true);
    setCountdown(30);
    setSignalStrength(0);

    // Initialize detector
    detectorRef.current = new RPPGDetector(
      videoRef.current,
      canvasRef.current,
      handleSignalUpdate
    );

    try {
      await detectorRef.current.start();
    } catch (err) {
      setIsReading(false);
      setError('Camera access denied. Please allow camera access to measure your heart rate.');
      return;
    }

    // Countdown timer
    intervalRef.current = window.setInterval(() => {
      setCountdown(prev => {
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
    if (signalStrength > 0.5) return { text: 'Signal: Good', color: '#00E5CC' };
    if (signalStrength > 0.2) return { text: 'Adjust finger', color: '#F5A623' };
    return { text: 'Place finger on camera', color: '#F5A623' };
  };

  const signalStatus = getSignalStatus();

  return (
    <div className="px-6 py-6 pb-36">
      <div className="cursor-pointer mb-4" style={{ color: '#8896A8' }} onClick={onBack}><ArrowLeft size={24} /></div>

      <h1 className="text-[22px] font-bold mb-2">Check your blood pressure</h1>
      <p className="text-sm mb-8" style={{ color: '#8896A8' }}>
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
        <div className="mb-6 p-4 rounded-xl" style={{ background: '#1E2D45', border: '1px solid #F5A623' }}>
          <p className="text-sm" style={{ color: '#F5A623' }}>{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-3 text-sm underline"
            style={{ color: '#00E5CC' }}
          >
            Try Again
          </button>
        </div>
      )}

      {!isReading && !bpReading && !error && (
        <>
          {/* Pre-reading feeling selection */}
          <div className="mb-6">
            <div className="text-base font-semibold mb-3">How are you feeling right now?</div>
            <div className="flex gap-3 justify-center">
              {[
                { icon: <Smile size={28} />, label: 'Good' },
                { icon: <Meh size={28} />, label: 'Okay' },
                { icon: <Frown size={28} />, label: 'Off' }
              ].map(feeling => (
                <div
                  key={feeling.label}
                  onClick={() => setFeelingSelected(feeling.label)}
                  className="px-5 py-3 rounded-xl cursor-pointer text-center"
                  style={{
                    border: `1px solid ${feelingSelected === feeling.label ? '#00E5CC' : '#1E2D45'}`,
                    background: feelingSelected === feeling.label ? '#111827' : 'transparent'
                  }}
                >
                  <div className="mb-1 flex justify-center" style={{ color: feelingSelected === feeling.label ? '#00E5CC' : '#8896A8' }}>{feeling.icon}</div>
                  <div className="text-xs">{feeling.label}</div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={startReading}
            className="w-full font-bold text-base px-4 py-4 rounded-xl"
            style={{ background: '#00E5CC', color: '#0A0F1E' }}
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
              background: signalStrength > 0.3 ? 'rgba(0, 229, 204, 0.15)' : 'rgba(245, 166, 35, 0.15)',
              border: `3px solid ${signalStrength > 0.3 ? '#00E5CC' : '#F5A623'}`,
              transition: 'all 0.3s ease'
            }}
          >
            <div 
              className="w-16 h-16 rounded-full"
              style={{ 
                background: signalStrength > 0.3 
                  ? `rgba(0, 229, 204, ${0.3 + signalStrength * 0.5})` 
                  : 'rgba(245, 166, 35, 0.3)',
                animation: signalStrength > 0.3 ? 'pulse 1s ease-in-out infinite' : 'none'
              }}
            />
          </div>

          <svg width="96" height="96" className="mx-auto mb-4">
            <circle cx="48" cy="48" r="45" stroke="#1E2D45" strokeWidth="6" fill="none" />
            <circle
              cx="48" cy="48" r="45" stroke="#00E5CC" strokeWidth="6" fill="none"
              strokeDasharray="283" 
              strokeDashoffset={283 - (283 * (30 - countdown) / 30)}
              className="origin-center -rotate-90"
              style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
            <text x="48" y="58" textAnchor="middle" fontSize="28" fontWeight="700" fill="#F0F4FF">
              {countdown}
            </text>
          </svg>
          <div className="text-sm" style={{ color: signalStatus.color }}>
            {signalStatus.text}
          </div>
          <div className="mt-2 text-xs" style={{ color: '#8896A8' }}>
            Keep your finger still on the camera
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

      {bpReading && (
        <>
          <div className="p-5 rounded-xl mb-4" style={{ background: '#111827', border: '1px solid #1E2D45' }}>
            <h2 className="text-lg font-semibold mb-3">Today's Reading</h2>
            <div className="text-base mb-2">HR: {bpReading.hr} bpm</div>
            <div className="text-base mb-2">HRV: {bpReading.hrv}ms</div>
            {bpReading.systolic && (
              <div className="text-base mb-2">
                BP: {bpReading.systolic}/{bpReading.diastolic} mmHg
                {bpReading.category && <span className="ml-2 text-sm" style={{ color: '#F5A623' }}>({bpReading.category})</span>}
              </div>
            )}
            <div className="text-base leading-relaxed" style={{ color: bpReading.status === 'normal' ? '#00E5CC' : '#F5A623' }}>
              {bpReading.message}
            </div>
            {bpReading.recommendation && (
              <div className="text-sm mt-2" style={{ color: '#8896A8' }}>{bpReading.recommendation}</div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setBpReading(null);
                setFeelingSelected(null);
              }}
              className="flex-1 font-semibold text-base px-4 py-4 rounded-xl"
              style={{ background: 'transparent', border: '1px solid #1E2D45', color: '#F0F4FF' }}
            >
              New Reading
            </button>
            <button
              className="flex-1 font-semibold text-base px-4 py-4 rounded-xl"
              style={{ background: 'transparent', border: '1px solid #1E2D45', color: '#F0F4FF' }}
            >
              Share Result
            </button>
          </div>
        </>
      )}
    </div>
  );
}
