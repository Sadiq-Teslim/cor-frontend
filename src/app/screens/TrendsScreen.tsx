import { useEffect, useState } from 'react';
import { dashboardApi } from '../../api';
import type { TrendsResponse } from '../../api/types';
import { ArrowLeft } from 'lucide-react';

interface Props {
  userId: string | null;
  onBack: () => void;
}

export default function TrendsScreen({ userId, onBack }: Props) {
  const [trendRange, setTrendRange] = useState('7D');
  const [data, setData] = useState<TrendsResponse | null>(null);

  useEffect(() => {
    if (!userId) return;
    const days = trendRange === '7D' ? 7 : trendRange === '14D' ? 14 : 30;
    dashboardApi.getTrends(userId, days).then(setData).catch(console.error);
  }, [userId, trendRange]);

  const hasTrends = data && data.trends.length > 0;

  const chartPoints = hasTrends
    ? data.trends.map((t, i) => {
        const x = (i / Math.max(data.trends.length - 1, 1)) * 300;
        const y = 140 - (t.css / 100) * 120;
        return `${x},${y}`;
      }).join(' ')
    : '0,120 50,100 100,90 150,110 200,85 250,95 300,80';

  return (
    <div className="px-6 py-6 pb-36">
      <div className="cursor-pointer mb-4" style={{ color: '#8896A8' }} onClick={onBack}><ArrowLeft size={24} /></div>
      <h1 className="text-[22px] font-bold mb-4">My Trend</h1>

      <div className="flex gap-2 mb-6 justify-center">
        {['7D', '14D', '30D'].map(range => (
          <button
            key={range}
            onClick={() => setTrendRange(range)}
            className="px-5 py-2.5 rounded-full text-sm"
            style={{
              background: trendRange === range ? '#00E5CC' : 'transparent',
              border: `1px solid ${trendRange === range ? '#00E5CC' : '#1E2D45'}`,
              color: trendRange === range ? '#0A0F1E' : '#F0F4FF'
            }}
          >
            {range}
          </button>
        ))}
      </div>

      <svg width="100%" height="160" viewBox="0 0 300 160" className="mb-6">
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#00E5CC', stopOpacity: 0.3 }} />
            <stop offset="100%" style={{ stopColor: '#00E5CC', stopOpacity: 0 }} />
          </linearGradient>
        </defs>
        <polygon points={`${chartPoints} 300,160 0,160`} fill="url(#gradient)" />
        <polyline points={chartPoints} stroke="#00E5CC" strokeWidth="2" fill="none" />
      </svg>

      {hasTrends ? (
        <div className="flex flex-col gap-3">
          {data.summary?.bestDay && (
            <div className="p-4 rounded-xl" style={{ background: '#111827', border: '1px solid #1E2D45' }}>
              <div className="text-xs font-semibold mb-1" style={{ color: '#8896A8' }}>Best day</div>
              <div className="text-sm">{data.summary.bestDay.date} — CSS: {data.summary.bestDay.css}, HRV: {data.summary.bestDay.hrv}ms</div>
            </div>
          )}
          {data.summary?.worstDay && (
            <div className="p-4 rounded-xl" style={{ background: '#111827', border: '1px solid #1E2D45' }}>
              <div className="text-xs font-semibold mb-1" style={{ color: '#8896A8' }}>Worst day</div>
              <div className="text-sm" style={{ color: '#FF6B6B' }}>{data.summary.worstDay.date} — CSS: {data.summary.worstDay.css}, HRV: {data.summary.worstDay.hrv}ms</div>
            </div>
          )}
          <div className="p-4 rounded-xl" style={{ background: '#111827', border: '1px solid #1E2D45' }}>
            <div className="text-xs font-semibold mb-1" style={{ color: '#8896A8' }}>Average CSS</div>
            <div className="text-sm" style={{ color: '#F5A623' }}>{data.summary?.averageCSS ?? '—'}</div>
          </div>
        </div>
      ) : (
        <div className="text-center text-sm py-4" style={{ color: '#8896A8' }}>
          {userId ? 'Loading trends...' : 'Complete onboarding to see your trends.'}
        </div>
      )}
    </div>
  );
}
