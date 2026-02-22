import { useEffect, useState } from 'react';
import { dashboardApi, medicationApi, healthApi } from '../../api';
import type { HomeDashboardData, Medication, AlertData } from '../../api/types';
import { Zap, HeartPulse, UtensilsCrossed, TrendingUp, Pill } from 'lucide-react';

interface Props {
  userId: string | null;
  userName: string;
  onNavigate: (screen: string) => void;
  onShowAlert: (data: AlertData | null) => void;
}

export default function HomeScreen({ userId, userName, onNavigate, onShowAlert }: Props) {
  const [homeData, setHomeData] = useState<HomeDashboardData | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);

  useEffect(() => {
    if (!userId) return;
    dashboardApi.getHomeData(userId).then(setHomeData).catch(console.error);
    medicationApi.getMedications(userId).then(d => setMedications(d.medications)).catch(console.error);
  }, [userId]);

  const today = new Date();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const greeting = today.getHours() < 12 ? 'Good morning' : today.getHours() < 17 ? 'Good afternoon' : 'Good evening';
  const dateStr = `${dayNames[today.getDay()]}, ${today.getDate()} ${monthNames[today.getMonth()]}`;

  const triggerAlert = async () => {
    if (!userId) { onShowAlert(null); return; }
    try {
      const data = await healthApi.checkAlert(userId);
      onShowAlert(data);
    } catch {
      onShowAlert(null);
    }
  };

  const reminders = homeData?.medicationReminders || medications.filter(m => m.dailyReminder).map(m => ({ name: m.name, time: m.reminderTime || '' }));

  return (
    <div className="px-6 py-6 pb-36">
      <div className="mb-5">
        <h1 className="text-[22px] font-bold">{greeting}, {userName || 'there'}</h1>
        <div className="text-sm" style={{ color: '#8896A8' }}>{dateStr}</div>
      </div>

      <div className="p-5 rounded-xl mb-3" style={{ background: '#111827', borderLeft: '3px solid #00E5CC', border: '1px solid #1E2D45' }}>
        <div className="text-[11px] font-semibold tracking-wider mb-2" style={{ color: '#00E5CC' }}>HEALTH PULSE</div>
        <div className="text-base font-semibold">
          {homeData?.healthPulse || 'Your stress pattern has been climbing. Let\'s check in.'}
        </div>
      </div>

      <button
        onClick={triggerAlert}
        className="px-3 py-1.5 rounded-lg text-xs mb-5"
        style={{ background: 'transparent', border: '1px solid #FF6B6B', color: '#FF6B6B' }}
      >
        <Zap size={14} className="inline mr-1" /> Check Alert
      </button>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {[
          { screen: 'screen-8', icon: <HeartPulse size={28} />, label: 'Check BP', color: '#00E5CC' },
          { screen: 'screen-9', icon: <UtensilsCrossed size={28} />, label: 'Log a Meal', color: '#F5A623' },
          { screen: 'screen-12', icon: <TrendingUp size={28} />, label: 'My Trend', color: '#8896A8' },
          { screen: 'screen-10', icon: <Pill size={28} />, label: 'Medications', color: '#A78BFA' },
        ].map(item => (
          <div
            key={item.screen}
            onClick={() => onNavigate(item.screen)}
            className="p-4 rounded-xl cursor-pointer"
            style={{ background: '#111827', border: '1px solid #1E2D45' }}
          >
            <div className="mb-2" style={{ color: item.color }}>{item.icon}</div>
            <div className="text-sm font-semibold">{item.label}</div>
          </div>
        ))}
      </div>

      {reminders.map((med, i) => (
        <div key={i} className="px-4 py-3 rounded-xl mb-3 flex justify-between items-center" style={{
          background: 'rgba(0,229,204,0.08)', border: '1px solid #00E5CC'
        }}>
          <div className="text-sm font-medium" style={{ color: '#00E5CC' }}>
            <Pill size={14} className="inline mr-1" /> {med.name} due at {med.time}
          </div>
        </div>
      ))}

      <div className="text-sm mb-4" style={{ color: '#8896A8' }}>
        {homeData?.recentActivity || 'Mostly sedentary today — a short walk would help.'}
      </div>

      {homeData?.todayTip && (
        <div className="p-4 rounded-xl mb-4" style={{ background: 'rgba(0,229,204,0.08)', border: '1px solid #1E2D45' }}>
          <div className="text-xs font-semibold mb-1" style={{ color: '#00E5CC' }}>TODAY'S TIP</div>
          <div className="text-sm">{homeData.todayTip}</div>
        </div>
      )}

      <div
        onClick={() => onNavigate('screen-14')}
        className="text-center text-sm underline cursor-pointer"
        style={{ color: '#00E5CC' }}
      >
        Share health report with your doctor
      </div>
    </div>
  );
}
