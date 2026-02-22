import { FileText, ArrowRight } from 'lucide-react';

interface Props {
  fileUploaded: boolean;
  isSubmitting: boolean;
  onUploadFile: (file: File) => void;
  onContinue: () => void;
  onSkip: () => void;
}

export default function MedicalRecordsScreen({ fileUploaded, isSubmitting, onUploadFile, onContinue, onSkip }: Props) {
  const handleClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) onUploadFile(file);
    };
    input.click();
  };

  return (
    <div className="min-h-screen px-8 py-8">
      <h1 className="text-2xl font-bold">Do you have health records?</h1>
      <p className="text-sm mt-2 mb-8" style={{ color: '#8896A8' }}>
        Optional — helps Cor know you better from day one.
      </p>
      <div className="flex flex-col gap-4">
        <div
          onClick={handleClick}
          className="p-5 rounded-xl text-center cursor-pointer"
          style={{ background: '#111827', border: '1px solid #1E2D45' }}
        >
          <div className="mb-2 flex justify-center"><FileText size={32} style={{ color: '#8896A8' }} /></div>
          <div className="font-semibold text-base">Upload a file</div>
          <div className="text-sm mt-1" style={{ color: '#8896A8' }}>PDF or image</div>
          {isSubmitting && (
            <div className="mt-3 text-sm" style={{ color: '#F5A623' }}>Uploading...</div>
          )}
          {fileUploaded && (
            <div className="mt-3 text-sm" style={{ color: '#00E5CC' }}>
              Got it. I've noted your history.
            </div>
          )}
        </div>
        <div
          onClick={onSkip}
          className="p-5 rounded-xl text-center cursor-pointer"
          style={{ background: '#111827', border: '1px solid #1E2D45' }}
        >
          <div className="mb-2 flex justify-center"><ArrowRight size={32} style={{ color: '#8896A8' }} /></div>
          <div className="font-semibold text-base">Skip for now</div>
        </div>
      </div>
      {fileUploaded && (
        <button
          onClick={onContinue}
          className="w-full mt-12 font-bold text-base px-4 py-4 rounded-xl"
          style={{ background: '#00E5CC', color: '#0A0F1E' }}
        >
          Continue
        </button>
      )}
    </div>
  );
}
