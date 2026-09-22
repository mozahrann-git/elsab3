import React, { useRef, useState } from 'react';
import { Mic, Square } from 'lucide-react';
import { uploadFile } from '../../services/mediaStorage';

/* تسجيل فويس بزرار واحد ورفعه على Cloudinary */
export const VoiceRecorder: React.FC<{ folder: string; id: string; onDone: (url: string) => void }> = ({ folder, id, onDone }) => {
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const [state, setState] = useState<'idle' | 'rec' | 'up' | 'done' | 'err'>('idle');
  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(stream);
      chunks.current = [];
      r.ondataavailable = (e) => chunks.current.push(e.data);
      r.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setState('up');
        try {
          const type = r.mimeType || 'audio/webm';
          const file = new File([new Blob(chunks.current, { type })], `voice.${type.includes('mp4') ? 'm4a' : 'webm'}`, { type });
          onDone(await uploadFile(file, folder, id));
          setState('done');
        } catch { setState('err'); }
      };
      r.start(); rec.current = r; setState('rec');
    } catch { setState('err'); }
  };
  return (
    <button type="button" onClick={() => (state === 'rec' ? rec.current?.stop() : start())} disabled={state === 'up'}
      className={`w-full rounded-2xl py-4 text-base font-bold flex items-center justify-center gap-2 ${state === 'rec' ? 'bg-[#C2412D] text-white animate-pulse' : state === 'done' ? 'bg-[#EEF5F0] text-[#1E7A45]' : 'bg-[#141414] text-white'}`}>
      {state === 'rec' ? <><Square size={18} />وقّف التسجيل</> : state === 'up' ? 'جاري الرفع...' : state === 'done' ? '✓ الفويس اتسجل (دوس تسجّل تاني)' : state === 'err' ? 'مش قادر يسجل، اكتب بدلها' : <><Mic size={18} />سجّل فويس</>}
    </button>
  );
};
