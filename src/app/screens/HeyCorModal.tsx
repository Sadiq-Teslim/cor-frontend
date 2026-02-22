import { useState } from 'react';
import { voiceApi } from '../../api';
import { LANGUAGE_MAP } from '../../api/types';
import { Heart } from 'lucide-react';

interface Props {
  userId: string | null;
  selectedLanguage: string;
  onClose: () => void;
}

export default function HeyCorModal({ userId, selectedLanguage, onClose }: Props) {
  const [corInput, setCorInput] = useState('');
  const [corResponse, setCorResponse] = useState("Ask me anything about your heart health...");
  const [corLoading, setCorLoading] = useState(false);

  const askCor = async () => {
    if (!corInput.trim()) return;
    setCorLoading(true);
    setCorResponse('Thinking...');
    try {
      const langCode = LANGUAGE_MAP[selectedLanguage] || 'en';
      const response = await voiceApi.respond(corInput, langCode, userId || undefined);
      setCorResponse(response.text);
    } catch {
      setCorResponse("I'm having trouble connecting right now. Please try again.");
    } finally {
      setCorLoading(false);
      setCorInput('');
    }
  };

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] px-6 py-6 rounded-t-3xl z-[100]" style={{
      background: '#111827',
      borderTop: '1px solid #1E2D45'
    }}>
      <div
        onClick={() => { onClose(); setCorResponse("Ask me anything about your heart health..."); }}
        className="absolute top-3 right-3 text-xl cursor-pointer"
        style={{ color: '#8896A8' }}
      >
        ×
      </div>
      <div
        className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
        style={{ background: '#00E5CC', animation: corLoading ? 'pulse 1s ease-in-out infinite' : 'pulse 2s ease-in-out infinite' }}
      >
        <Heart size={24} style={{ color: '#0A0F1E' }} />
      </div>
      <div className="text-sm text-center mb-4" style={{ color: '#8896A8' }}>
        {corLoading ? 'Thinking...' : 'Ask Cor'}
      </div>
      <div
        className="min-h-[60px] text-center text-base px-4 mb-4"
        style={{ color: corResponse.includes('Ask me') ? '#8896A8' : '#F0F4FF' }}
      >
        {corResponse}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Ask about your heart health..."
          value={corInput}
          onChange={(e) => setCorInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && askCor()}
          className="flex-1 px-4 py-3 text-sm rounded-xl"
          style={{ background: '#0A0F1E', border: '1px solid #1E2D45', color: '#F0F4FF' }}
        />
        <button
          onClick={askCor}
          disabled={corLoading || !corInput.trim()}
          className="px-4 py-3 rounded-xl font-semibold text-sm"
          style={{ background: corInput.trim() ? '#00E5CC' : '#333', color: '#0A0F1E' }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
