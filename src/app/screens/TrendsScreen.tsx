import { useEffect, useState } from 'react';
import { dashboardApi, healthApi } from '../../api';
import type { TrendsResponse, BPReadingHistory } from '../../api/types';
import { ArrowLeft } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface Props {
  userId: string | null;
  onBack: () => void;
}

export default function TrendsScreen({ userId, onBack }: Props) {
  const [trendRange, setTrendRange] = useState('7D');
  const [activeTab, setActiveTab] = useState<'css' | 'bp'>('bp');
  const [cssData, setCssData] = useState<TrendsResponse | null>(null);
  const [bpData, setBpData] = useState<BPReadingHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    setLoading(true);
    const days = trendRange === '7D' ? 7 : trendRange === '14D' ? 14 : 30;

    Promise.all([
      dashboardApi.getTrends(userId, days).then(setCssData).catch(console.error),
      healthApi.getBPReadings(userId, days).then((res) => setBpData(res.readings || [])).catch(console.error),
    ]).finally(() => setLoading(false));
  }, [userId, trendRange]);

  const bpChartData = bpData.map((reading) => ({
    date: new Date(reading.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    systolic: reading.systolic,
    diastolic: reading.diastolic,
    fullDate: reading.date,
  }));

  const cssChartData = cssData?.trends.map((t) => ({
    date: new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    css: t.css,
    hrv: t.hrv,
    fullDate: t.date,
  })) || [];

  const hasBPData = bpData.length > 0;
  const hasCSSData = cssData && cssData.trends.length > 0;

  // Calculate BP stats
  const bpStats = hasBPData ? {
    avgSystolic: Math.round(bpData.reduce((sum, r) => sum + r.systolic, 0) / bpData.length),
    avgDiastolic: Math.round(bpData.reduce((sum, r) => sum + r.diastolic, 0) / bpData.length),
    maxSystolic: Math.max(...bpData.map(r => r.systolic)),
    minSystolic: Math.min(...bpData.map(r => r.systolic)),
  } : null;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      if (activeTab === 'bp') {
        return (
          <div className="p-2 rounded bg-[#111827] border border-[#1E2D45] text-xs">
            <p style={{ color: '#F0F4FF' }}>{data.date}</p>
            <p style={{ color: '#FF6B6B' }}>Systolic: {data.systolic} mmHg</p>
            <p style={{ color: '#A78BFA' }}>Diastolic: {data.diastolic} mmHg</p>
          </div>
        );
      } else {
        return (
          <div className="p-2 rounded bg-[#111827] border border-[#1E2D45] text-xs">
            <p style={{ color: '#F0F4FF' }}>{data.date}</p>
            <p style={{ color: '#00E5CC' }}>CSS: {data.css}</p>
            <p style={{ color: '#F5A623' }}>HRV: {data.hrv}ms</p>
          </div>
        );
      }
    }
    return null;
  };

  return (
    <div className="px-6 py-6 pb-36">
      <div className="cursor-pointer mb-4" style={{ color: '#8896A8' }} onClick={onBack}>
        <ArrowLeft size={24} />
      </div>
      <h1 className="text-[22px] font-bold mb-4">My Trends</h1>

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

      {/* Tab switcher */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('bp')}
          className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold transition-all"
          style={{
            background: activeTab === 'bp' ? '#FF6B6B' : '#1E2D45',
            color: activeTab === 'bp' ? '#0A0F1E' : '#8896A8',
          }}
        >
          Blood Pressure
        </button>
        <button
          onClick={() => setActiveTab('css')}
          className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold transition-all"
          style={{
            background: activeTab === 'css' ? '#00E5CC' : '#1E2D45',
            color: activeTab === 'css' ? '#0A0F1E' : '#8896A8',
          }}
        >
          Stress Score
        </button>
      </div>

      {/* BP Chart Tab */}
      {activeTab === 'bp' && (
        <>
          {hasBPData && !loading ? (
            <>
              <div className="mb-6 p-4 rounded-xl" style={{ background: '#111827', border: '1px solid #1E2D45' }}>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={bpChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E2D45" />
                    <XAxis
                      dataKey="date"
                      stroke="#8896A8"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis
                      stroke="#8896A8"
                      style={{ fontSize: '12px' }}
                      domain={[60, 180]}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      wrapperStyle={{ paddingTop: '20px' }}
                      contentStyle={{ color: '#F0F4FF' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="systolic"
                      stroke="#FF6B6B"
                      strokeWidth={2}
                      dot={{ fill: '#FF6B6B', r: 4 }}
                      activeDot={{ r: 6 }}
                      name="Systolic (mmHg)"
                    />
                    <Line
                      type="monotone"
                      dataKey="diastolic"
                      stroke="#A78BFA"
                      strokeWidth={2}
                      dot={{ fill: '#A78BFA', r: 4 }}
                      activeDot={{ r: 6 }}
                      name="Diastolic (mmHg)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* BP Stats */}
              <div className="flex flex-col gap-3">
                <div className="p-4 rounded-xl" style={{ background: '#111827', border: '1px solid #1E2D45' }}>
                  <div className="text-xs font-semibold mb-2" style={{ color: '#8896A8' }}>Average</div>
                  <div className="flex justify-between">
                    <div>
                      <p className="text-xs" style={{ color: '#8896A8' }}>Systolic</p>
                      <p className="text-lg font-bold" style={{ color: '#FF6B6B' }}>{bpStats?.avgSystolic} mmHg</p>
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: '#8896A8' }}>Diastolic</p>
                      <p className="text-lg font-bold" style={{ color: '#A78BFA' }}>{bpStats?.avgDiastolic} mmHg</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl" style={{ background: '#111827', border: '1px solid #1E2D45' }}>
                  <div className="text-xs font-semibold mb-2" style={{ color: '#8896A8' }}>Range</div>
                  <div className="flex justify-between">
                    <div>
                      <p className="text-xs" style={{ color: '#8896A8' }}>Systolic</p>
                      <p className="text-sm" style={{ color: '#F0F4FF' }}>{bpStats?.minSystolic} - {bpStats?.maxSystolic} mmHg</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center text-sm py-8" style={{ color: '#8896A8' }}>
              {loading ? 'Loading BP data...' : 'No BP readings yet. Complete a BP check to see trends.'}
            </div>
          )}
        </>
      )}

      {/* CSS Chart Tab */}
      {activeTab === 'css' && (
        <>
          {hasCSSData && !loading ? (
            <>
              <div className="mb-6 p-4 rounded-xl" style={{ background: '#111827', border: '1px solid #1E2D45' }}>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={cssChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E2D45" />
                    <XAxis
                      dataKey="date"
                      stroke="#8896A8"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis
                      stroke="#8896A8"
                      style={{ fontSize: '12px' }}
                      domain={[0, 100]}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      wrapperStyle={{ paddingTop: '20px' }}
                      contentStyle={{ color: '#F0F4FF' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="css"
                      stroke="#00E5CC"
                      strokeWidth={2}
                      dot={{ fill: '#00E5CC', r: 4 }}
                      activeDot={{ r: 6 }}
                      name="CSS Score"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* CSS Stats */}
              <div className="flex flex-col gap-3">
                {cssData.summary?.bestDay && (
                  <div className="p-4 rounded-xl" style={{ background: '#111827', border: '1px solid #1E2D45' }}>
                    <div className="text-xs font-semibold mb-1" style={{ color: '#8896A8' }}>Best day</div>
                    <div className="text-sm">{cssData.summary.bestDay.date} — CSS: {cssData.summary.bestDay.css}, HRV: {cssData.summary.bestDay.hrv}ms</div>
                  </div>
                )}
                {cssData.summary?.worstDay && (
                  <div className="p-4 rounded-xl" style={{ background: '#111827', border: '1px solid #1E2D45' }}>
                    <div className="text-xs font-semibold mb-1" style={{ color: '#8896A8' }}>Worst day</div>
                    <div className="text-sm" style={{ color: '#FF6B6B' }}>{cssData.summary.worstDay.date} — CSS: {cssData.summary.worstDay.css}, HRV: {cssData.summary.worstDay.hrv}ms</div>
                  </div>
                )}
                <div className="p-4 rounded-xl" style={{ background: '#111827', border: '1px solid #1E2D45' }}>
                  <div className="text-xs font-semibold mb-1" style={{ color: '#8896A8' }}>Average CSS</div>
                  <div className="text-sm" style={{ color: '#F5A623' }}>{cssData.summary?.averageCSS ?? '—'}</div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center text-sm py-8" style={{ color: '#8896A8' }}>
              {loading ? 'Loading CSS data...' : 'No CSS data yet. Complete readings to see trends.'}
            </div>
          )}
        </>
      )}
    </div>
  );
}
