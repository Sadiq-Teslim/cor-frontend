interface Props {
  selectedLanguage: string;
  onSelectLanguage: (lang: string) => void;
  onContinue: () => void;
}

const LANGUAGES = ['English', 'Pidgin', 'Yoruba', 'Igbo', 'Hausa', 'French'];

export default function LanguageSelectScreen({ selectedLanguage, onSelectLanguage, onContinue }: Props) {
  return (
    <div className="min-h-screen px-8 py-8">
      <h1 className="text-2xl font-bold mb-6">Choose your language</h1>
      <div className="grid grid-cols-2 gap-3 mb-8">
        {LANGUAGES.map(lang => (
          <div
            key={lang}
            onClick={() => onSelectLanguage(lang)}
            className="p-5 text-center font-semibold text-base rounded-xl cursor-pointer"
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
      {selectedLanguage && (
        <button
          onClick={onContinue}
          className="w-full font-bold text-base px-4 py-4 rounded-xl"
          style={{ background: '#00E5CC', color: '#0A0F1E' }}
        >
          Continue
        </button>
      )}
    </div>
  );
}
