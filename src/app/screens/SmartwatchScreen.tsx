import { useState } from 'react';

interface Props {
  connectedDevices: string[];
  onConnect: (device: string) => void;
  onContinue: () => void;
  onSkip: () => void;
}

const DEVICES = ['Apple Health', 'Google Health', 'Samsung Health', 'Fitbit'];

export default function SmartwatchScreen({ connectedDevices, onConnect, onContinue, onSkip }: Props) {
  const [connectingDevice, setConnectingDevice] = useState<string | null>(null);
  const [deviceConnected, setDeviceConnected] = useState(false);

  const connectDevice = (device: string) => {
    setConnectingDevice(device);
    setDeviceConnected(false);
    setTimeout(() => {
      setDeviceConnected(true);
      setTimeout(() => {
        onConnect(device);
        setConnectingDevice(null);
        setDeviceConnected(false);
      }, 1500);
    }, 2000);
  };

  return (
    <>
      <div className="min-h-screen px-8 py-8">
        <h1 className="text-2xl font-bold mb-6">Do you own a smartwatch?</h1>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {DEVICES.map(device => (
            <div key={device} className="p-5 rounded-xl text-center" style={{ background: '#111827', border: '1px solid #1E2D45' }}>
              <div className="font-semibold text-sm mb-3">{device}</div>
              {!connectedDevices.includes(device) ? (
                <button
                  onClick={() => connectDevice(device)}
                  className="px-3 py-1.5 rounded-lg text-xs"
                  style={{ border: '1px solid #00E5CC', background: 'transparent', color: '#00E5CC' }}
                >
                  Connect
                </button>
              ) : (
                <div className="text-xl" style={{ color: '#00E5CC' }}>✓</div>
              )}
            </div>
          ))}
        </div>
        <div
          onClick={onSkip}
          className="text-center text-sm underline cursor-pointer mb-4"
          style={{ color: '#8896A8' }}
        >
          I don't have one
        </div>
        {connectedDevices.length > 0 && (
          <button
            onClick={onContinue}
            className="w-full font-bold text-base px-4 py-4 rounded-xl"
            style={{ background: '#00E5CC', color: '#0A0F1E' }}
          >
            Continue
          </button>
        )}
      </div>

      {/* Device Connection Modal */}
      {connectingDevice && (
        <div className="fixed inset-0 flex items-center justify-center px-8 z-[110]" style={{ background: 'rgba(6, 9, 18, 0.95)' }}>
          <div className="max-w-sm w-full p-8 rounded-2xl text-center" style={{ background: '#111827', border: '1px solid #1E2D45' }}>
            {!deviceConnected ? (
              <>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: '#00E5CC' }}>
                  <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#0A0F1E', borderTopColor: 'transparent' }} />
                </div>
                <h2 className="text-xl font-bold mb-2">Connecting to {connectingDevice}...</h2>
                <p className="text-sm" style={{ color: '#8896A8' }}>Please wait while we link your device</p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: '#00E5CC' }}>
                  <div className="text-3xl" style={{ color: '#0A0F1E' }}>✓</div>
                </div>
                <h2 className="text-xl font-bold mb-2">Connected successfully!</h2>
                <p className="text-sm" style={{ color: '#8896A8' }}>{connectingDevice} is now linked to Cor</p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
