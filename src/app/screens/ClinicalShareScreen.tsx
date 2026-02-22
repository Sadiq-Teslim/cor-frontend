import { useState } from 'react';
import { dashboardApi } from '../../api';
import { Check, ArrowLeft } from 'lucide-react';

interface Props {
  userId: string | null;
  onBack: () => void;
}

export default function ClinicalShareScreen({ userId, onBack }: Props) {
  const [reportRange, setReportRange] = useState('7 days');
  const [reportGenerated, setReportGenerated] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportBlob, setReportBlob] = useState<Blob | null>(null);

  const generateReport = async () => {
    if (!userId) return;
    setIsGenerating(true);
    try {
      const days = parseInt(reportRange) || 7;
      const blob = await dashboardApi.generateClinicalReport(userId, days);
      setReportBlob(blob);
      setReportGenerated(true);
    } catch {
      alert('Failed to generate report. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadReport = () => {
    if (!reportBlob) return;
    const url = URL.createObjectURL(reportBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cor-health-report-${reportRange.replace(' ', '')}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="px-6 py-6 pb-36">
      <div className="cursor-pointer mb-4" style={{ color: '#8896A8' }} onClick={onBack}><ArrowLeft size={24} /></div>
      <h1 className="text-[22px] font-bold mb-2">Share your health report</h1>
      <p className="text-sm mb-4" style={{ color: '#8896A8' }}>Choose a time range</p>

      <div className="flex gap-2 mb-6 justify-center">
        {['7 days', '14 days', '30 days'].map(range => (
          <button
            key={range}
            onClick={() => { setReportRange(range); setReportGenerated(false); setReportBlob(null); }}
            className="px-5 py-2.5 rounded-full text-sm"
            style={{
              background: reportRange === range ? '#00E5CC' : 'transparent',
              border: `1px solid ${reportRange === range ? '#00E5CC' : '#1E2D45'}`,
              color: reportRange === range ? '#0A0F1E' : '#F0F4FF'
            }}
          >
            {range}
          </button>
        ))}
      </div>

      <div className="p-5 rounded-xl mb-6" style={{ background: '#111827', border: '1px solid #1E2D45' }}>
        <div className="text-[11px] font-semibold tracking-wider mb-3" style={{ color: '#8896A8' }}>REPORT INCLUDES</div>
        {['Cardiovascular Stress Score trend', 'BP readings', 'Sleep summary', 'Food patterns', 'Medications logged', 'Alerts fired'].map(item => (
          <div key={item} className="text-sm mb-2">
            <Check size={14} className="inline mr-1" style={{ color: '#00E5CC' }} />{item}
          </div>
        ))}
      </div>

      {!reportGenerated ? (
        <button
          onClick={generateReport}
          disabled={isGenerating}
          className="w-full font-bold text-base px-4 py-4 rounded-xl"
          style={{ background: isGenerating ? '#888' : '#00E5CC', color: '#0A0F1E' }}
        >
          {isGenerating ? 'Generating...' : 'Generate Report'}
        </button>
      ) : (
        <div className="flex flex-col gap-3">
          <button
            onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent('Check out my Cor health report')}`, '_blank')}
            className="w-full font-semibold text-base px-4 py-4 rounded-xl"
            style={{ background: '#25D366', color: 'white' }}
          >
            Share via WhatsApp
          </button>
          <button
            onClick={() => { window.location.href = 'mailto:?subject=My Cor Health Report&body=Please find my health report attached.'; }}
            className="w-full font-semibold text-base px-4 py-4 rounded-xl"
            style={{ background: 'transparent', border: '1px solid #1E2D45', color: '#F0F4FF' }}
          >
            Share via Email
          </button>
          <button
            onClick={downloadReport}
            className="w-full font-semibold text-base px-4 py-4 rounded-xl"
            style={{ background: 'transparent', border: '1px solid #1E2D45', color: '#F0F4FF' }}
          >
            Download PDF
          </button>
        </div>
      )}

      <p className="text-xs text-center mt-4" style={{ color: '#8896A8' }}>
        This is a wellness report, not a clinical diagnosis.
      </p>
    </div>
  );
}
