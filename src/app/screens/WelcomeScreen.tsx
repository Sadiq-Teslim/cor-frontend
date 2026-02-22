const LANGUAGES = ['English', 'Pidgin', 'Yoruba', 'Igbo', 'Hausa', 'French'];

interface Props {
  selectedLanguage: string;
  onSelectLanguage: (lang: string) => void;
  onContinue: () => void;
}

export default function WelcomeScreen({ selectedLanguage, onSelectLanguage, onContinue }: Props) {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-8">
      <div className="text-[72px] font-bold text-center" style={{ color: '#00E5CC' }}>Cor</div>
      <div className="text-lg text-center mt-3 mb-10" style={{ color: '#8896A8' }}>Your heart has a guardian.</div>

      <div className="w-full mb-8">
        <div className="text-sm font-semibold mb-3 text-center" style={{ color: '#8896A8' }}>Choose your language</div>
        <div className="grid grid-cols-2 gap-3">
          {LANGUAGES.map(lang => (
            <div
              key={lang}
              onClick={() => onSelectLanguage(lang)}
              className="p-4 text-center font-semibold text-sm rounded-xl cursor-pointer"
              style={{
                background: '#111827',
                border: `1px solid ${selectedLanguage === lang ? '#00E5CC' : '#1E2D45'}`,
                color: selectedLanguage === lang ? '#00E5CC' : '#F0F4FF'
              }}
            >
              {lang}
            </div>
          ))}
        </div>
      </div>

      {selectedLanguage && (
        <button
          onClick={onContinue}
          className="w-full font-bold text-base px-4 py-4 rounded-xl"
          style={{ background: '#00E5CC', color: '#0A0F1E' }}
        >
          Get Started
        </button>
      )}
    </div>
  );
}
