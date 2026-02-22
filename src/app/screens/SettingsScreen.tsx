import { useState } from 'react';
import { LogOut } from 'lucide-react';
import type { User } from '../../api/types';

interface Props {
  selectedLanguage: string;
  connectedDevices: string[];
  fileUploaded: boolean;
  user: User | null;
  onSignOut: () => void;
}

export default function SettingsScreen({ selectedLanguage, connectedDevices, fileUploaded, user, onSignOut }: Props) {
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div className="px-6 py-6 pb-36">
      <h1 className="text-[22px] font-bold mb-6">Settings</h1>

      <div className="mt-5">
        <div className="text-[11px] font-semibold tracking-wider mb-2" style={{ color: '#8896A8' }}>PREFERENCES</div>
        {[
          { label: 'Language', value: selectedLanguage },
          { label: 'Hey Cor wake word', toggle: true },
          { label: 'Notifications', toggle: true }
        ].map(item => (
          <div key={item.label} className="py-4 flex justify-between items-center cursor-pointer" style={{ borderBottom: '1px solid #1E2D45' }}>
            <div>{item.label}</div>
            {item.value && <div style={{ color: '#8896A8' }}>{item.value}</div>}
            {item.toggle && <div style={{ color: '#8896A8' }}>›</div>}
          </div>
        ))}
      </div>

      <div className="mt-5">
        <div className="text-[11px] font-semibold tracking-wider mb-2" style={{ color: '#8896A8' }}>CONNECTIONS</div>
        <div className="py-4 flex justify-between items-center cursor-pointer" style={{ borderBottom: '1px solid #1E2D45' }}>
          <div>Smartwatch</div>
          <div style={{ color: connectedDevices.length > 0 || user?.smartwatchConnected ? '#00E5CC' : '#8896A8' }}>
            {connectedDevices.length > 0 ? `${connectedDevices[0]} — Connected` : user?.smartwatchConnected ? `${user.smartwatchType || 'Device'} — Connected` : 'Not connected'}
          </div>
        </div>
        <div className="py-4 flex justify-between items-center cursor-pointer" style={{ borderBottom: '1px solid #1E2D45' }}>
          <div>Medical records</div>
          <div style={{ color: '#8896A8' }}>{fileUploaded ? '1 file uploaded' : 'None'}</div>
        </div>
      </div>

      <div className="mt-5">
        <div className="text-[11px] font-semibold tracking-wider mb-2" style={{ color: '#8896A8' }}>PRIVACY & DATA</div>
        {[
          { label: 'View stored data' },
          { label: 'Delete my data', alert: true },
          { label: 'Consent management' }
        ].map(item => (
          <div key={item.label} className="py-4 flex justify-between items-center cursor-pointer"
            style={{ borderBottom: '1px solid #1E2D45', color: item.alert ? '#FF6B6B' : '#F0F4FF' }}>
            <div>{item.label}</div>
            {!item.alert && <div style={{ color: '#8896A8' }}>›</div>}
          </div>
        ))}
      </div>

      <div className="mt-5">
        <div className="text-[11px] font-semibold tracking-wider mb-2" style={{ color: '#8896A8' }}>ABOUT</div>
        {[{ label: 'How Cor works' }, { label: 'Clinical disclaimer' }].map(item => (
          <div key={item.label} className="py-4 flex justify-between items-center cursor-pointer" style={{ borderBottom: '1px solid #1E2D45' }}>
            <div>{item.label}</div>
            <div style={{ color: '#8896A8' }}>›</div>
          </div>
        ))}
        <div className="py-4" style={{ borderBottom: '1px solid #1E2D45', color: '#8896A8' }}>
          Version — Cor v1.0 — Hackathon Build
        </div>
      </div>

      {/* Sign Out */}
      <button
        onClick={() => setShowConfirm(true)}
        className="w-full mt-8 py-4 rounded-xl flex items-center justify-center gap-2 text-base font-semibold cursor-pointer"
        style={{ background: 'rgba(255, 107, 107, 0.1)', border: '1px solid #FF6B6B', color: '#FF6B6B' }}
      >
        <LogOut size={18} />
        Sign Out
      </button>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center px-6"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setShowConfirm(false)}
        >
          <div
            className="w-full max-w-[360px] p-6 rounded-2xl"
            style={{ background: '#111827', border: '1px solid #1E2D45' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-2">Sign out?</h3>
            <p className="text-sm mb-6" style={{ color: '#8896A8' }}>
              You'll need to go through onboarding again to use Cor. Your health data is saved on the server.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold"
                style={{ background: '#1E2D45', color: '#F0F4FF' }}
              >
                Cancel
              </button>
              <button
                onClick={onSignOut}
                className="flex-1 py-3 rounded-xl text-sm font-semibold"
                style={{ background: '#FF6B6B', color: '#0A0F1E' }}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
