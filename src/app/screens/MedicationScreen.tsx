import { useEffect, useState } from 'react';
import { medicationApi } from '../../api';
import type { Medication } from '../../api/types';
import { AlertTriangle, ArrowLeft } from 'lucide-react';

interface Props {
  userId: string | null;
  onBack: () => void;
}

export default function MedicationScreen({ userId, onBack }: Props) {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [taken, setTaken] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!userId) return;
    medicationApi.getMedications(userId).then(d => setMedications(d.medications)).catch(console.error);
  }, [userId]);

  const toggle = async (med: Medication) => {
    const wasTaken = taken[med.id];
    setTaken(prev => ({ ...prev, [med.id]: !wasTaken }));
    if (!wasTaken && userId) {
      try { await medicationApi.logMedicationTaken(med.id, userId); } catch (err) { console.error(err); }
    }
  };

  const addMed = async () => {
    const name = prompt('Enter medication name:');
    if (!name || !userId) return;
    const time = prompt('Reminder time (e.g. 20:00):') || undefined;
    try {
      const data = await medicationApi.addMedication({ userId, name, dailyReminder: !!time, reminderTime: time });
      setMedications(prev => [...prev, data.medication]);
    } catch { alert('Failed to add medication.'); }
  };

  return (
    <div className="px-6 py-6 pb-36">
      <div className="cursor-pointer mb-4" style={{ color: '#8896A8' }} onClick={onBack}><ArrowLeft size={24} /></div>
      <h1 className="text-[22px] font-bold mb-6">Medications</h1>

      {medications.length === 0 && (
        <div className="text-center text-sm mt-8" style={{ color: '#8896A8' }}>
          No medications added yet. Tap + to add your first medication.
        </div>
      )}

      {medications.map(med => (
        <div key={med.id} className="p-5 rounded-xl mb-4" style={{ background: '#111827', border: '1px solid #1E2D45' }}>
          <div className="flex justify-between items-center mb-2">
            <div>
              <div className="text-base font-semibold">{med.name}</div>
              {med.reminderTime && <div className="text-sm" style={{ color: '#8896A8' }}>{med.reminderTime}</div>}
            </div>
            <label className="relative inline-block w-11 h-6">
              <input type="checkbox" checked={!!taken[med.id]} onChange={() => toggle(med)} className="opacity-0 w-0 h-0" />
              <span className="absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-all duration-300"
                style={{ background: taken[med.id] ? '#00E5CC' : '#1E2D45' }}>
                <span className="absolute w-[18px] h-[18px] bottom-[3px] bg-white rounded-full transition-all duration-300"
                  style={{ left: taken[med.id] ? '23px' : '3px' }} />
              </span>
            </label>
          </div>
          {med.affectsBP && <div className="text-xs flex items-center gap-1" style={{ color: '#F5A623' }}><AlertTriangle size={12} /> BP-relevant medication</div>}
        </div>
      ))}

      <div className="text-center text-sm mt-8" style={{ color: '#8896A8' }}>
        Add your medications and Cor will factor them into your monitoring.
      </div>

      <button
        className="fixed bottom-20 right-6 w-12 h-12 rounded-full flex items-center justify-center text-2xl"
        style={{ background: '#00E5CC', color: '#0A0F1E' }}
        onClick={addMed}
      >+</button>
    </div>
  );
}
