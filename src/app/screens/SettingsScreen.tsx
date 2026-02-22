import type { User } from '../../api/types';

interface Props {
  selectedLanguage: string;
  connectedDevices: string[];
  fileUploaded: boolean;
  user: User | null;
}

export default function SettingsScreen({ selectedLanguage, connectedDevices, fileUploaded, user }: Props) {
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
    </div>
  );
}
