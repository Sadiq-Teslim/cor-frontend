import { useEffect, useState } from 'react';
import { dashboardApi } from '../../api';
import type { LifestyleInsights } from '../../api/types';
import { Moon, Activity, UtensilsCrossed, Brain, ArrowLeft } from 'lucide-react';

interface Props {
  userId: string | null;
  onBack: () => void;
}

export default function InsightsScreen({ userId, onBack }: Props) {
  const [data, setData] = useState<LifestyleInsights | null>(null);

  useEffect(() => {
    if (!userId) return;
    dashboardApi.getLifestyleInsights(userId).then(setData).catch(console.error);
  }, [userId]);

  const getMetrics = () => {
    if (!data) return [
      { icon: <Moon size={24} />, label: 'Sleep', status: '...', color: '#8896A8' },
      { icon: <Activity size={24} />, label: 'Activity', status: '...', color: '#8896A8' },
      { icon: <UtensilsCrossed size={24} />, label: 'Food', status: '...', color: '#8896A8' },
      { icon: <Brain size={24} />, label: 'Stress', status: '...', color: '#8896A8' },
    ];
    const s = data.weekStats;
    return [
      { icon: <Moon size={24} />, label: 'Sleep', status: s.sleepDisruptedNights > 3 ? 'Poor' : s.sleepDisruptedNights > 1 ? 'Fair' : 'Good', color: s.sleepDisruptedNights > 3 ? '#FF6B6B' : s.sleepDisruptedNights > 1 ? '#F5A623' : '#00E5CC' },
      { icon: <Activity size={24} />, label: 'Activity', status: s.averageSedentaryHours > 8 ? 'Low' : s.averageSedentaryHours > 5 ? 'Fair' : 'Good', color: s.averageSedentaryHours > 8 ? '#FF6B6B' : s.averageSedentaryHours > 5 ? '#F5A623' : '#00E5CC' },
      { icon: <UtensilsCrossed size={24} />, label: 'Food', status: s.highSodiumMeals > 4 ? 'Poor' : s.highSodiumMeals > 2 ? 'Fair' : 'Good', color: s.highSodiumMeals > 4 ? '#FF6B6B' : s.highSodiumMeals > 2 ? '#F5A623' : '#00E5CC' },
      { icon: <Brain size={24} />, label: 'Stress', status: s.averageCSS > 60 ? 'High' : s.averageCSS > 40 ? 'Moderate' : 'Low', color: s.averageCSS > 60 ? '#FF6B6B' : s.averageCSS > 40 ? '#F5A623' : '#00E5CC' },
    ];
  };

  return (
    <div className="px-6 py-6 pb-36">
      <div className="cursor-pointer mb-4" style={{ color: '#8896A8' }} onClick={onBack}><ArrowLeft size={24} /></div>
      <h1 className="text-[22px] font-bold mb-5">Your week in review</h1>

      <div className="flex gap-2 mb-5">
        {getMetrics().map(metric => (
          <div key={metric.label} className="flex-1 p-3 rounded-xl text-center" style={{ background: '#111827', border: '1px solid #1E2D45' }}>
            <div className="mb-1 flex justify-center">{metric.icon}</div>
            <div className="text-[11px] mb-1" style={{ color: '#8896A8' }}>{metric.label}</div>
            <div className="text-xs font-semibold" style={{ color: metric.color }}>{metric.status}</div>
          </div>
        ))}
      </div>

      {data ? (
        <>
          <div className="p-5 rounded-xl mb-4" style={{ background: '#111827', border: '1px solid #1E2D45' }}>
            <p className="text-base leading-relaxed">{data.summary}</p>
          </div>
          <div className="px-4 py-4 rounded-xl" style={{ background: 'rgba(0,229,204,0.08)', border: '1px solid #00E5CC' }}>
            <p className="text-base font-semibold" style={{ color: '#00E5CC' }}>{data.recommendation}</p>
          </div>
        </>
      ) : (
        <div className="text-center text-sm py-10" style={{ color: '#8896A8' }}>Loading your insights...</div>
      )}
    </div>
  );
}
