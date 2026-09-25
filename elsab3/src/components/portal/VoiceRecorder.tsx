import React, { useEffect, useRef, useState } from 'react';
import { Mic, Square, Play, Trash2, RotateCcw } from 'lucide-react';
import { uploadFile } from '../../services/mediaStorage';

const MAX_SECONDS = 60;

/* تسجيل فويس: سجّل ← اسمع ← ابعت. مع عدّاد وحد أقصى دقيقة. */
export const VoiceRecorder: React.FC<{ folder: string; id: string; onDone: (url: string) => void }> = ({ folder, id, onDone }) => {
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<number | null>(null);
  const [state, setState] = useState<'idle' | 'rec' | 'up' | 'done' | 'err'>('idle');
  const [err, setErr] = useState('');
  const [secs, setSecs] = useState(0);
  const [preview, setPreview] = useState('');

  useEffect(() => () => { if (timer.current) window.clearInterval(timer.current); }, []);

  const stopTimer = () => { if (timer.current) { window.clearInterval(timer.current); timer.current = null; } };

  const start = async () => {
    setErr(''); setPreview('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(stream);
      chunks.current = [];
      r.ondataavailable = (e) => chunks.current.push(e.data);
      r.onstop = async () => {
        stopTimer();
        stream.getTracks().forEach((t) => t.stop());
        setState('up');
        try {
          const type = r.mimeType || 'audio/webm';
          const blob = new Blob(chunks.current, { type });
          setPreview(URL.createObjectURL(blob));   // يسمع من غير ما يستنى الرفع
          const file = new File([blob], `voice.${type.includes('mp4') ? 'm4a' : 'webm'}`, { type });
          onDone(await uploadFile(file, folder, id));
          setState('done');
        } catch (e: any) {
          setErr(`الرفع فشل: ${e?.message || 'جرب تاني'}`);
          setState('err');
        }
      };
      r.start(); rec.current = r; setState('rec'); setSecs(0);
      timer.current = window.setInterval(() => {
        setSecs((v) => {
          if (v + 1 >= MAX_SECONDS) { try { r.stop(); } catch { /* اتقفل خلاص */ } return MAX_SECONDS; }
          return v + 1;
        });
      }, 1000);
    } catch {
      setErr('المتصفح مسمحش بالمايك — اسمح للميكروفون من إعدادات الموقع');
      setState('err');
    }
  };

  const stop = () => { try { rec.current?.stop(); } catch { /* اتقفل خلاص */ } };

  const clear = () => {
    setState('idle'); setPreview(''); setErr(''); setSecs(0);
    onDone('');
  };

  const mmss = (n: number) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;

  // بعد ما يتسجل: رسالة واضحة + مشغّل + إعادة وحذف
  if (state === 'done') {
    return (
      <div className="space-y-2 rounded-2xl border border-[#BFE0CB] bg-[#EEF5F0] p-3">
        <p className="text-sm font-bold text-[#1E7A45] text-center">✓ الفويس اتسجل ({mmss(secs)}) — اسمعه قبل ما تبعت</p>
        {preview && <audio src={preview} controls className="w-full" />}
        <div className="flex gap-2">
          <button type="button" onClick={start}
            className="flex-1 rounded-xl bg-white border border-[#D8D3C8] py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-[0.98] transition">
            <RotateCcw size={14} />سجّل تاني
          </button>
          <button type="button" onClick={clear}
            className="flex-1 rounded-xl bg-white border border-[#E8C2BA] text-[#C2412D] py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-[0.98] transition">
            <Trash2 size={14} />احذف الفويس
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <button type="button" onClick={() => (state === 'rec' ? stop() : start())} disabled={state === 'up'}
        className={`w-full rounded-2xl py-4 text-base font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition ${
          state === 'rec' ? 'bg-[#C2412D] text-white' : 'bg-[#141414] text-white'
        } disabled:opacity-60`}>
        {state === 'rec' ? <><Square size={18} />وقّف التسجيل · {mmss(secs)}</>
          : state === 'up' ? 'جاري الرفع...'
          : state === 'err' ? <><Mic size={18} />جرّب تسجّل تاني</>
          : <><Mic size={18} />سجّل فويس</>}
      </button>
      {state === 'rec' && (
        <p className="text-[11px] text-[#8C877D] text-center">
          بتسجّل دلوقتي · الحد الأقصى {MAX_SECONDS} ثانية
        </p>
      )}
      {state === 'err' && err && <p className="text-[11px] text-[#C2412D] font-bold text-center">{err}</p>}
      {preview && state !== 'rec' && <audio src={preview} controls className="w-full" />}
    </div>
  );
};
