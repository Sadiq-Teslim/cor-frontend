import { useState, useRef, useEffect, useCallback } from 'react';
import { healthApi } from '../../api';
import { RPPGDetector, type RPPGResult } from '../../lib/rppg';

interface Props {
  userId: string | null;
  onComplete: () => void;
}

export default function FirstReadingScreen({ userId, onComplete }: Props) {
  const [isReading, setIsReading] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [signalStrength, setSignalStrength] = useState(0);
  const [bpReading, setBpReading] = useState<any>(null);
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
        const data = await healthApi.submitFirstReading(userId, hrv, heartRate);
        setBpReading({
          hr: data.reading.heartRate,
          hrv: data.reading.hrv,
          status: data.hrvStatus,
          message: data.message,
          bpEstimate: data.bpEstimate,
        });
      } catch {
        // Fallback with local data
        setBpReading({
          hr: heartRate, hrv: hrv, status: 'normal',
          message: 'Your baseline is set. Cor will now personalise your monitoring.'
        });
      }
    } else {
      setBpReading({
        hr: heartRate, hrv: hrv, status: 'normal',
        message: 'Your baseline is set. Cor will now personalise your monitoring.'
      });
    }
  }, [userId]);

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
    <div className="min-h-screen px-8 py-8 text-center">
      <h1 className="text-2xl font-bold mb-3">Let's get your baseline</h1>
      <p className="text-base mb-8" style={{ color: '#8896A8' }}>
        Place your finger gently over your phone's back camera and hold still.
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
        </div>
      )}

      {!isReading && !bpReading && (
        <button
          onClick={startReading}
          className="w-full font-bold text-base px-4 py-4 rounded-xl"
          style={{ background: '#00E5CC', color: '#0A0F1E' }}
        >
          Start Reading
        </button>
      )}

      {isReading && (
        <div>
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
        </div>
      )}

      {bpReading && (
        <>
          <div className="text-left p-5 rounded-xl mb-4" style={{ background: '#111827', border: '1px solid #1E2D45' }}>
            <div className="text-lg font-semibold mb-3">
              Heart Rate: {bpReading.hr} bpm — {bpReading.status === 'normal' ? 'Normal' : 'Elevated'}
            </div>
            <div className="text-base mb-3">
              HRV: {bpReading.hrv}ms — {bpReading.status === 'normal' ? 'Healthy range' : 'Slightly low'}
            </div>
            {bpReading.bpEstimate && (
              <div className="text-base mb-3">
                Est. BP: {bpReading.bpEstimate.systolic}/{bpReading.bpEstimate.diastolic} mmHg
                {bpReading.bpEstimate.category && (
                  <span className="ml-2 text-sm" style={{ color: '#00E5CC' }}>
                    ({bpReading.bpEstimate.category})
                  </span>
                )}
              </div>
            )}
            <div className="text-base leading-relaxed">{bpReading.message}</div>
          </div>
          <button
            onClick={onComplete}
            className="w-full font-bold text-base px-4 py-4 rounded-xl"
            style={{ background: '#00E5CC', color: '#0A0F1E' }}
          >
            Enter Cor
          </button>
        </>
      )}

      {/* CSS for pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
