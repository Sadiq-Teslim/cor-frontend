import { useEffect, useRef, useState } from 'react';
import { Mic, Volume2, Loader2 } from 'lucide-react';
import { LANGUAGE_MAP } from '../../api/types';
import { useVoiceOnboarding } from '../../hooks/useVoiceOnboarding';
import type { VoiceState } from '../../hooks/useVoiceOnboarding';

export interface OnboardingFormData {
  name: string;
  age: string;
  sex: string;
  highBP: string;
  medication: string;
  smokeDrink: string;
  activity: string;
  sleep: string;
}

interface Props {
  data: OnboardingFormData;
  step: number;
  isSubmitting: boolean;
  language: string;
  onUpdateData: (data: OnboardingFormData) => void;
  onNextStep: () => void;
  onComplete: () => void;
}

// Parse voice transcript into a form field + value
function parseVoice(text: string, step: number): { field: keyof OnboardingFormData; value: string } | null {
  const t = text.toLowerCase().trim();
  if (!t) return null;

  switch (step) {
    case 1: {
      let name = t
        .replace(/^(my name is|i'm|i am|call me|they call me|it's|na)\s*/i, '')
        .replace(/[.!?,]/g, '')
        .trim();
      if (!name) return null;
      name = name.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      return { field: 'name', value: name };
    }
    case 2: {
      const m = t.match(/\d+/);
      return m ? { field: 'age', value: m[0] } : null;
    }
    case 3: {
      if (/\b(male|man|boy|guy)\b/i.test(t)) return { field: 'sex', value: 'Male' };
      if (/\b(female|woman|girl|lady)\b/i.test(t)) return { field: 'sex', value: 'Female' };
      if (/\b(prefer|rather|skip)\b/i.test(t)) return { field: 'sex', value: 'Prefer not to say' };
      return null;
    }
    case 4: {
      if (/\b(not sure|don't know|unsure|no idea|maybe)\b/i.test(t)) return { field: 'highBP', value: 'Not sure' };
      if (/\b(yes|yeah|yep|i have|diagnosed)\b/i.test(t)) return { field: 'highBP', value: 'Yes' };
      if (/\b(no|nah|nope|never|haven't)\b/i.test(t)) return { field: 'highBP', value: 'No' };
      return null;
    }
    case 5: {
      if (/\b(yes|yeah|yep|i do|i take)\b/i.test(t)) return { field: 'medication', value: 'Yes' };
      if (/\b(no|nah|nope|i don't|don't take)\b/i.test(t)) return { field: 'medication', value: 'No' };
      return null;
    }
    case 6: {
      if (/\b(sometimes|occasionally|once in a while|a little)\b/i.test(t)) return { field: 'smokeDrink', value: 'Sometimes' };
      if (/\b(yes|yeah|yep|i do|i smoke|i drink)\b/i.test(t)) return { field: 'smokeDrink', value: 'Yes' };
      if (/\b(no|nah|nope|i don't|never)\b/i.test(t)) return { field: 'smokeDrink', value: 'No' };
      return null;
    }
    case 7: {
      if (/\b(active|very active|exercise|workout|gym)\b/i.test(t)) return { field: 'activity', value: 'Active' };
      if (/\b(moderate|somewhat|fairly|a bit)\b/i.test(t)) return { field: 'activity', value: 'Moderate' };
      if (/\b(sedentary|not active|inactive|lazy|sit|desk)\b/i.test(t)) return { field: 'activity', value: 'Sedentary' };
      return null;
    }
    case 8: {
      const m = t.match(/\d+/);
      return m ? { field: 'sleep', value: m[0] } : null;
    }
    default:
      return null;
  }
}

export default function OnboardingScreen({ data, step, isSubmitting, language, onUpdateData, onNextStep, onComplete }: Props) {
  const langCode = LANGUAGE_MAP[language] || 'en';
  const micInited = useRef(false);
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [voiceTranscript, setVoiceTranscript] = useState('');

  // Voice result handler
  const handleVoiceResult = (text: string) => {
    setVoiceTranscript(text);
    const parsed = parseVoice(text, step);
    if (parsed) {
      onUpdateData({ ...data, [parsed.field]: parsed.value });
      playConfirmation();
      autoTimer.current = setTimeout(() => {
        if (step === 8) onComplete();
        else onNextStep();
      }, 1200);
    }
  };

  const { voiceState, voiceReady, micLevel, initMic, playQuestion, playConfirmation, tapMic, stopAll } =
    useVoiceOnboarding(langCode, handleVoiceResult);

  // Init mic once, then play question on each step change
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!micInited.current) {
        micInited.current = true;
        await initMic();
      }
      if (!cancelled) playQuestion(step);
    })();
    setVoiceTranscript('');

    return () => {
      cancelled = true;
      stopAll();
      if (autoTimer.current) {
        clearTimeout(autoTimer.current);
        autoTimer.current = null;
      }
    };
  }, [step]);

  // Clear auto-advance timer on manual step change
  useEffect(() => {
    return () => {
      if (autoTimer.current) {
        clearTimeout(autoTimer.current);
        autoTimer.current = null;
      }
    };
  }, [step]);

  const handleNext = () => {
    if (autoTimer.current) {
      clearTimeout(autoTimer.current);
      autoTimer.current = null;
    }
    stopAll();
    if (step === 8) onComplete();
    else onNextStep();
  };

  const renderChips = (options: string[], field: keyof OnboardingFormData) => (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button
          key={opt}
          onClick={() => onUpdateData({ ...data, [field]: opt })}
          className="px-5 py-2.5 rounded-full text-sm"
          style={{
            background: data[field] === opt ? '#00E5CC' : 'transparent',
            border: `1px solid ${data[field] === opt ? '#00E5CC' : '#1E2D45'}`,
            color: data[field] === opt ? '#0A0F1E' : '#F0F4FF'
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  );

  const voiceIcon = (state: VoiceState) => {
    if (state === 'transcribing') return <Loader2 size={28} className="animate-spin" style={{ color: '#00E5CC' }} />;
    if (state === 'playing') return <Volume2 size={28} style={{ color: '#00E5CC' }} />;
    return <Mic size={28} style={{ color: state === 'recording' ? '#FF6B6B' : '#8896A8' }} />;
  };

  const voiceLabel = (state: VoiceState) => {
    switch (state) {
      case 'playing': return 'Speaking...';
      case 'listening': return 'Listening \u2014 speak your answer';
      case 'recording': return 'Recording...';
      case 'transcribing': return 'Processing...';
      default: return voiceReady ? 'Tap to speak' : '';
    }
  };

  const circleBorder = voiceState === 'recording' ? '#FF6B6B' : voiceState === 'playing' || voiceState === 'listening' ? '#00E5CC' : '#1E2D45';
  const circleBg = voiceState === 'recording' ? 'rgba(255,107,107,0.1)' : voiceState === 'playing' ? 'rgba(0,229,204,0.1)' : 'transparent';
  const pulseScale = voiceState === 'recording' ? 1 + micLevel / 200 : 1;

  return (
    <div className="min-h-screen">
      {/* Progress bar */}
      <div className="h-1" style={{ background: '#1E2D45' }}>
        <div className="h-full transition-all duration-300" style={{ width: `${(step / 8) * 100}%`, background: '#00E5CC' }} />
      </div>
      <div className="px-8 py-4 text-sm" style={{ color: '#8896A8' }}>Step {step} of 8</div>

      <div className="px-8 pb-8">
        <div className="p-5 rounded-xl" style={{ background: '#111827', border: '1px solid #1E2D45' }}>
          {/* Question */}
          {step === 1 && <h2 className="text-xl font-semibold mb-2">What is your name?</h2>}
          {step === 2 && <h2 className="text-xl font-semibold mb-2">How old are you?</h2>}
          {step === 3 && <h2 className="text-xl font-semibold mb-2">Biological sex?</h2>}
          {step === 4 && <h2 className="text-xl font-semibold mb-2">Ever diagnosed with high blood pressure?</h2>}
          {step === 5 && <h2 className="text-xl font-semibold mb-2">Do you take regular medication?</h2>}
          {step === 6 && <h2 className="text-xl font-semibold mb-2">Do you smoke or drink alcohol?</h2>}
          {step === 7 && <h2 className="text-xl font-semibold mb-2">How active are you?</h2>}
          {step === 8 && <h2 className="text-xl font-semibold mb-2">How many hours do you sleep on average?</h2>}

          {/* Voice indicator */}
          <div className="flex flex-col items-center my-5">
            <div
              onClick={voiceReady ? tapMic : undefined}
              className="w-20 h-20 rounded-full flex items-center justify-center cursor-pointer transition-transform"
              style={{
                border: `2px solid ${circleBorder}`,
                background: circleBg,
                animation: voiceState === 'playing' || voiceState === 'listening' ? 'pulse 2s ease-in-out infinite' : 'none',
                transform: `scale(${pulseScale})`,
              }}
            >
              {voiceIcon(voiceState)}
            </div>
            <div className="text-xs mt-2" style={{ color: '#8896A8' }}>{voiceLabel(voiceState)}</div>

            {voiceTranscript && (
              <div className="text-sm mt-2 px-3 py-1 rounded-lg" style={{ color: '#00E5CC', background: 'rgba(0,229,204,0.08)' }}>
                &ldquo;{voiceTranscript}&rdquo;
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px" style={{ background: '#1E2D45' }} />
            <div className="text-xs" style={{ color: '#8896A8' }}>or type below</div>
            <div className="flex-1 h-px" style={{ background: '#1E2D45' }} />
          </div>

          {/* Manual inputs */}
          {step === 1 && (
            <input
              type="text"
              placeholder="Enter your name"
              value={data.name}
              onChange={(e) => onUpdateData({ ...data, name: e.target.value })}
              className="w-full px-4 py-3 text-base rounded-xl"
              style={{ background: '#0A0F1E', border: '1px solid #1E2D45', color: '#F0F4FF' }}
            />
          )}
          {step === 2 && (
            <input
              type="number"
              placeholder="Age"
              value={data.age}
              onChange={(e) => onUpdateData({ ...data, age: e.target.value })}
              className="w-full px-4 py-3 text-base rounded-xl"
              style={{ background: '#0A0F1E', border: '1px solid #1E2D45', color: '#F0F4FF' }}
            />
          )}
          {step === 3 && renderChips(['Male', 'Female', 'Prefer not to say'], 'sex')}
          {step === 4 && renderChips(['Yes', 'No', 'Not sure'], 'highBP')}
          {step === 5 && renderChips(['Yes', 'No'], 'medication')}
          {step === 6 && renderChips(['Yes', 'No', 'Sometimes'], 'smokeDrink')}
          {step === 7 && renderChips(['Sedentary', 'Moderate', 'Active'], 'activity')}
          {step === 8 && (
            <input
              type="number"
              min="1"
              max="12"
              placeholder="Hours"
              value={data.sleep}
              onChange={(e) => onUpdateData({ ...data, sleep: e.target.value })}
              className="w-full px-4 py-3 text-base rounded-xl"
              style={{ background: '#0A0F1E', border: '1px solid #1E2D45', color: '#F0F4FF' }}
            />
          )}
        </div>

        <button
          disabled={isSubmitting}
          onClick={handleNext}
          className="w-full mt-8 font-bold text-base px-4 py-4 rounded-xl"
          style={{ background: isSubmitting ? '#888' : '#00E5CC', color: '#0A0F1E' }}
        >
          {isSubmitting ? 'Saving...' : 'Next'}
        </button>
      </div>
    </div>
  );
}
