import { useState, useEffect, useRef } from 'react';
import type { AlertData } from '../../api/types';
import { Heart, Clock } from 'lucide-react';

interface Props {
  alertData: AlertData | null;
  onDismiss: () => void;
}

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

export default function AlertOverlay({ alertData, onDismiss }: Props) {
  const [reminderSet, setReminderSet] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const setReminder = async () => {
    // Request notification permission if available
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }

    // Schedule a real reminder via setTimeout + Notification
    timerRef.current = setTimeout(() => {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Cor Health Reminder', {
          body: 'Time to check your blood pressure. Open Cor to take a reading.',
          icon: '/favicon.ico',
        });
      }
    }, TWO_HOURS_MS);

    setReminderSet(true);
    onDismiss();
  };

  return (
    <div className="fixed inset-0 overflow-y-auto px-8 py-8 z-50" style={{ background: 'rgba(6, 9, 18, 0.95)' }}>
      <div className="max-w-md mx-auto">
        <div
          className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
          style={{ background: '#FF6B6B', animation: 'pulse 2s ease-in-out infinite' }}
        >
          <Heart size={32} className="text-white" />
        </div>

        {alertData?.shouldAlert ? (
          <div className="p-5 rounded-xl mb-4" style={{ background: '#111827', border: '1px solid #1E2D45' }}>
            <div className="text-[11px] font-semibold tracking-wider mb-2" style={{ color: '#8896A8' }}>ALERT</div>
            <p className="text-base leading-relaxed">{alertData.message}</p>
          </div>
        ) : (
          <>
            <div className="p-5 rounded-xl mb-4" style={{ background: '#111827', border: '1px solid #1E2D45' }}>
              <div className="text-[11px] font-semibold tracking-wider mb-2" style={{ color: '#8896A8' }}>WHAT I NOTICED</div>
              <p className="text-base leading-relaxed">
                {alertData?.message || 'Your cardiovascular stress has been elevated for 6 days in a row. Your sleep has averaged 5 hours and you have been mostly sedentary.'}
              </p>
            </div>
            <div className="p-5 rounded-xl mb-4" style={{ background: '#111827', border: '1px solid #1E2D45' }}>
              <div className="text-[11px] font-semibold tracking-wider mb-2" style={{ color: '#8896A8' }}>WHAT THIS MEANS</div>
              <p className="text-base leading-relaxed">
                This pattern is consistent with early-stage cardiovascular stress. It does not mean something is wrong — but it is worth paying attention to.
              </p>
            </div>
            <div className="p-5 rounded-xl mb-4" style={{ background: '#111827', border: '1px solid #1E2D45' }}>
              <div className="text-[11px] font-semibold tracking-wider mb-2" style={{ color: '#8896A8' }}>WHAT TO DO NOW</div>
              <p className="text-base leading-relaxed">
                1. Drink a glass of water now.<br/>
                2. Take a 10-minute walk today.<br/>
                3. Get a physical BP check this week.
              </p>
            </div>
          </>
        )}

        <button
          onClick={() => window.open('https://www.google.com/maps/search/pharmacy+near+me', '_blank')}
          className="w-full font-bold text-base px-4 py-4 rounded-xl"
          style={{ background: '#00E5CC', color: '#0A0F1E' }}
        >
          Find a BP check near me
        </button>

        <button
          onClick={setReminder}
          disabled={reminderSet}
          className="w-full mt-3 font-semibold text-base px-4 py-4 rounded-xl flex items-center justify-center gap-2"
          style={{
            background: 'transparent',
            border: `1px solid ${reminderSet ? '#00E5CC' : '#1E2D45'}`,
            color: reminderSet ? '#00E5CC' : '#F0F4FF',
          }}
        >
          <Clock size={16} />
          {reminderSet ? 'Reminder set!' : 'Remind me in 2 hours'}
        </button>

        <div onClick={onDismiss} className="text-center text-xs underline cursor-pointer mt-4" style={{ color: '#8896A8' }}>
          Dismiss
        </div>
      </div>
    </div>
  );
}
