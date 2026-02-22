import { useState } from 'react';
import { foodApi, voiceApi } from '../../api';
import type { FoodAnalysis } from '../../api/types';
import { LANGUAGE_MAP } from '../../api/types';
import { Camera, Mic, UtensilsCrossed, ArrowLeft } from 'lucide-react';

interface Props {
  userId: string | null;
  selectedLanguage: string;
  onBack: () => void;
}

export default function FoodLoggerScreen({ userId, selectedLanguage, onBack }: Props) {
  const [mealMode, setMealMode] = useState('camera');
  const [mealAnalyzed, setMealAnalyzed] = useState(false);
  const [mealAnalyzing, setMealAnalyzing] = useState(false);
  const [foodResult, setFoodResult] = useState<FoodAnalysis | null>(null);
  const [mealDescription, setMealDescription] = useState('');

  const analyzeMealCamera = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setMealAnalyzing(true);
      setFoodResult(null);
      try {
        const result = await foodApi.analyzeImage(file, userId || undefined);
        setFoodResult(result);
        setMealAnalyzed(true);
      } catch (err) {
        console.error('Food analysis failed:', err);
        setMealAnalyzing(false);
        setMealAnalyzed(false);
        alert('Could not analyze the meal. Please try again.');
        return;
      }
      setMealAnalyzing(false);
    };
    input.click();
  };

  const analyzeMealVoice = async () => {
    if (!mealDescription.trim() || !userId) return;
    setMealAnalyzing(true);
    setFoodResult(null);
    try {
      const textBlob = new Blob([mealDescription], { type: 'text/plain' });
      const audioFile = new File([textBlob], 'description.wav', { type: 'audio/wav' });
      const result = await foodApi.logVoice(audioFile, userId);
      setFoodResult(result);
      setMealAnalyzed(true);
    } catch {
      try {
        const langCode = LANGUAGE_MAP[selectedLanguage] || 'en';
        const response = await voiceApi.respond(`Analyze this food for BP impact: ${mealDescription}`, langCode, userId);
        setFoodResult({ foodName: mealDescription, bpImpact: 'moderate', message: response.text });
        setMealAnalyzed(true);
      } catch {
        setMealAnalyzed(false);
        alert('Could not analyze the meal. Please try again.');
      }
    }
    setMealAnalyzing(false);
  };

  const impactColor = (impact: string) =>
    impact === 'high' ? '#FF6B6B' : impact === 'moderate' ? '#F5A623' : '#00E5CC';

  const impactBg = (impact: string) =>
    impact === 'high' ? 'rgba(255,107,107,0.1)' : impact === 'moderate' ? 'rgba(245,166,35,0.1)' : 'rgba(0,229,204,0.1)';

  return (
    <div className="px-6 py-6 pb-36">
      <div className="cursor-pointer mb-4" style={{ color: '#8896A8' }} onClick={onBack}><ArrowLeft size={24} /></div>
      <h1 className="text-[22px] font-bold mb-4">What are you eating?</h1>

      <div className="flex gap-2 mb-6">
        {['camera', 'voice'].map(mode => (
          <button
            key={mode}
            onClick={() => { setMealMode(mode); setMealAnalyzed(false); setFoodResult(null); }}
            className="flex-1 px-5 py-2.5 rounded-full text-sm"
            style={{
              background: mealMode === mode ? '#00E5CC' : 'transparent',
              border: `1px solid ${mealMode === mode ? '#00E5CC' : '#1E2D45'}`,
              color: mealMode === mode ? '#0A0F1E' : '#F0F4FF'
            }}
          >
            {mode === 'camera' ? <><Camera size={14} className="inline mr-1" /> Camera</> : <><Mic size={14} className="inline mr-1" /> Voice</>}
          </button>
        ))}
      </div>

      {mealMode === 'camera' && !mealAnalyzed && !mealAnalyzing && (
        <div
          onClick={analyzeMealCamera}
          className="h-[200px] flex items-center justify-center rounded-xl cursor-pointer mb-4"
          style={{ border: '2px dashed #1E2D45' }}
        >
          <div className="text-center text-sm" style={{ color: '#8896A8' }}>Tap to snap your meal</div>
        </div>
      )}

      {mealMode === 'voice' && !mealAnalyzed && !mealAnalyzing && (
        <div className="text-center mb-4">
          <div className="mb-4 flex justify-center"><Mic size={48} style={{ color: '#8896A8' }} /></div>
          <div className="text-sm mb-4" style={{ color: '#8896A8' }}>Describe your meal</div>
          <input
            type="text"
            placeholder="e.g., Jollof rice with chicken"
            value={mealDescription}
            onChange={(e) => setMealDescription(e.target.value)}
            className="w-full px-4 py-3 text-base rounded-xl mb-3"
            style={{ background: '#111827', border: '1px solid #1E2D45', color: '#F0F4FF' }}
          />
          <button
            onClick={analyzeMealVoice}
            disabled={!mealDescription.trim()}
            className="w-full font-bold text-base px-4 py-4 rounded-xl"
            style={{ background: mealDescription.trim() ? '#00E5CC' : '#555', color: '#0A0F1E' }}
          >
            Analyse
          </button>
        </div>
      )}

      {mealAnalyzing && (
        <div className="text-center text-base py-10" style={{ color: '#00E5CC' }}>Analysing your meal...</div>
      )}

      {mealAnalyzed && foodResult && (
        <div className="p-5 rounded-xl" style={{ background: '#111827', border: '1px solid #1E2D45' }}>
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2"><UtensilsCrossed size={20} /> {foodResult.foodName}</h2>
          {foodResult.calories && (
            <div className="text-sm mb-3" style={{ color: '#8896A8' }}>Calories: {foodResult.calories} kcal</div>
          )}
          <div className="mb-3">
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{
              color: impactColor(foodResult.bpImpact),
              background: impactBg(foodResult.bpImpact)
            }}>
              BP Impact: {foodResult.bpImpact.toUpperCase()}
            </span>
          </div>
          <div className="text-sm leading-relaxed mt-3" style={{ color: '#8896A8' }}>{foodResult.message}</div>
        </div>
      )}
    </div>
  );
}
