import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Compass, 
  Building2, 
  Navigation, 
  ShoppingBag, 
  ShieldCheck, 
  ArrowLeft, 
  Edit3, 
  RotateCcw, 
  Check, 
  Image as ImageIcon,
  Sparkles,
  MapPin,
  TrendingUp,
  SlidersHorizontal,
  Layers,
  Plus,
  Save,
  Trash2
} from 'lucide-react';
import { HADABA_DISTRICTS_GUIDE, HADABA_HIGHWAYS_DATA, HADABA_LANDMARKS_CATEGORIES, HADABA_LEGAL_TIPS } from '../data/properties';
import { subscribeToGuideContent, saveGuideContent, GuideContent, DEFAULT_GUIDE } from '../services/guideContentService';
import { safeLocalStorageSet } from '../utils/storageHelper';
import { DistrictGuideInfo } from '../types';

interface DistrictGuideModalProps {
  properties?: { neighborhood: string; price: number; area: number; category?: string }[];
  isOpen: boolean;
  onClose: () => void;
  onSelectDistrict: (districtName: string) => void;
  isAdmin?: boolean;
}

const STORAGE_KEY = 'lion_hadaba_districts_custom_guide';

/* شريط التعديل: يظهر للأدمن فوق كل تبويب */
const EditorBar: React.FC<{
  editing: boolean; busy: boolean;
  onEdit: () => void; onCancel: () => void; onSave: () => void;
  onAdd: () => void; addLabel: string;
}> = ({ editing, busy, onEdit, onCancel, onSave, onAdd, addLabel }) => (
  <div className="flex flex-wrap items-center justify-between gap-2 bg-[#FBF8F1] border border-[#E8D3A6] rounded-2xl px-3 py-2">
    <p className="text-xs font-bold text-[#6E5418]">
      {editing ? 'بتعدّل دلوقتي — اكتب وبعدين احفظ' : 'المحتوى ده قابل للتعديل'}
    </p>
    <div className="flex items-center gap-2">
      {editing ? (
        <>
          <button onClick={onAdd} className="px-3 py-1.5 rounded-xl bg-white border border-[#DCD6CA] text-xs font-bold flex items-center gap-1">
            <Plus size={13} />{addLabel}
          </button>
          <button onClick={onCancel} className="px-3 py-1.5 rounded-xl bg-white border border-[#DCD6CA] text-xs font-bold">إلغاء</button>
          <button onClick={onSave} disabled={busy}
            className="px-4 py-1.5 rounded-xl bg-[#A07A26] text-white text-xs font-bold flex items-center gap-1 disabled:opacity-60">
            <Save size={13} />{busy ? 'بيحفظ...' : 'حفظ'}
          </button>
        </>
      ) : (
        <button onClick={onEdit} className="px-4 py-1.5 rounded-xl bg-[#141414] text-white text-xs font-bold flex items-center gap-1">
          <Edit3 size={13} />تعديل
        </button>
      )}
    </div>
  </div>
);

export const DistrictGuideModal: React.FC<DistrictGuideModalProps> = ({
  properties = [],
  isOpen,
  onClose,
  onSelectDistrict,
  isAdmin = false,
}) => {
  const [activeTab, setActiveTab] = useState<'districts' | 'highways' | 'landmarks' | 'legal'>('districts');

  // محتوى المحاور والمعالم والنصايح: من Firestore، قابل للتعديل
  const [guide, setGuide] = useState<GuideContent>(DEFAULT_GUIDE);
  const [guideDraft, setGuideDraft] = useState<GuideContent>(DEFAULT_GUIDE);
  const [guideEdit, setGuideEdit] = useState(false);
  const [guideBusy, setGuideBusy] = useState(false);

  useEffect(() => {
    const unsub = subscribeToGuideContent((c) => {
      setGuide(c);
      setGuideDraft((prev) => (guideEditRef.current ? prev : c));
    });
    return () => unsub();
  }, []);

  const guideEditRef = useRef(false);
  useEffect(() => { guideEditRef.current = guideEdit; }, [guideEdit]);

  const saveGuide = async () => {
    setGuideBusy(true);
    try {
      await saveGuideContent(guideDraft);
      setGuide(guideDraft);
      setGuideEdit(false);
    } catch (err) {
      console.error('[Guide] الحفظ فشل:', err);
      window.alert('الحفظ مش قادر يوصل للسحابة — جرّب تاني');
    } finally {
      setGuideBusy(false);
    }
  };

  const setHighway = (i: number, key: 'name' | 'description' | 'destinations' | 'travelTime', v: string) =>
    setGuideDraft({ ...guideDraft, highways: guideDraft.highways.map((h, j) => (j === i ? { ...h, [key]: v } : h)) });

  const setCategory = (i: number, v: string) =>
    setGuideDraft({ ...guideDraft, landmarks: guideDraft.landmarks.map((c, j) => (j === i ? { ...c, category: v } : c)) });

  const setItem = (ci: number, ii: number, key: 'name' | 'district' | 'desc', v: string) =>
    setGuideDraft({
      ...guideDraft,
      landmarks: guideDraft.landmarks.map((c, j) =>
        j === ci ? { ...c, items: c.items.map((it, k) => (k === ii ? { ...it, [key]: v } : it)) } : c),
    });

  const addItem = (ci: number) =>
    setGuideDraft({
      ...guideDraft,
      landmarks: guideDraft.landmarks.map((c, j) =>
        j === ci ? { ...c, items: [...c.items, { name: '', district: '', desc: '' }] } : c),
    });

  const removeItem = (ci: number, ii: number) =>
    setGuideDraft({
      ...guideDraft,
      landmarks: guideDraft.landmarks.map((c, j) =>
        j === ci ? { ...c, items: c.items.filter((_, k) => k !== ii) } : c),
    });

  const setTip = (i: number, key: 'title' | 'description', v: string) =>
    setGuideDraft({ ...guideDraft, legalTips: guideDraft.legalTips.map((t, j) => (j === i ? { ...t, [key]: v } : t)) });

  const [selectedDistrictName, setSelectedDistrictName] = useState<string>('الحي الأول');
  
  // Custom Districts State with local storage persistence
  const [districts, setDistricts] = useState<DistrictGuideInfo[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error(e);
    }
    return HADABA_DISTRICTS_GUIDE;
  });

  // Editing state for a district
  const [editingDistrict, setEditingDistrict] = useState<DistrictGuideInfo | null>(null);
  const [editSuccessMsg, setEditSuccessMsg] = useState<string | null>(null);

  // Quick preset images for user convenience
  const PRESET_IMAGES = [
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
  ];

  const handleSaveDistrictEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDistrict) return;

    const updated = districts.map((d) =>
      d.name === editingDistrict.name ? editingDistrict : d
    );
    setDistricts(updated);
    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(updated));
    setEditSuccessMsg('تم حفظ تعديلات مقال وصورة الحي بنجاح');
    setTimeout(() => {
      setEditSuccessMsg(null);
      setEditingDistrict(null);
    }, 1200);
  };

  const handleResetToDefault = () => {
    if (window.confirm('هل تريد استعادة النصوص والصور الأصلية لدليل الأحياء؟')) {
      setDistricts(HADABA_DISTRICTS_GUIDE);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const currentActiveDistrict = districts.find(d => d.name === selectedDistrictName) || districts[0];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
      <div 
        className="relative w-full max-w-6xl bg-[#F6F4EF] border border-[#E4DFD4] rounded-none sm:rounded-3xl shadow-2xl text-right text-[#141414] h-[100dvh] sm:h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#141414] border-b border-black/10 flex items-center justify-between shrink-0 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#A07A26] text-white rounded-xl shadow-md">
              <Compass size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>مجلة ودليل أحياء الهضبة الوسطى المصور (1 - 8)</span>
                <span className="text-[10px] bg-[#A07A26]/20 text-[#D9B864] border border-[#A07A26]/40 px-2 py-0.5 rounded font-bold">
                  قابل للتعديل
                </span>
              </h2>
              <p className="text-xs text-[#A3A09A]">
                مقالات موجزة، صور معمارية، وأسعار المتر المحدثة لكل حي
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetToDefault}
              className="px-2.5 py-1.5 bg-[#1C1C1C] hover:bg-neutral-800 text-[#A3A09A] hover:text-white rounded-lg border border-white/10 text-xs font-bold transition-all flex items-center gap-1"
              title="استعادة البيانات الأصلية"
            >
              <RotateCcw size={13} />
              <span className="hidden sm:inline">استعادة الأصل</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-[#CFCBC2] hover:text-white rounded-lg border border-white/10 transition-all"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="bg-white border-b border-[#ECE8DF] px-4 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs shrink-0">
          <button
            onClick={() => setActiveTab('districts')}
            className={`px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 whitespace-nowrap transition-all ${
              activeTab === 'districts' ? 'bg-[#141414] text-white shadow-sm font-bold' : 'bg-[#F6F4EF] text-[#6B665C] hover:text-[#141414] border border-[#ECE8DF]'
            }`}
          >
            <Building2 size={14} />
            <span>مقالات الأحياء المصورة (1 - 8)</span>
          </button>

          <button
            onClick={() => setActiveTab('highways')}
            className={`px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 whitespace-nowrap transition-all ${
              activeTab === 'highways' ? 'bg-[#141414] text-white shadow-sm font-bold' : 'bg-[#F6F4EF] text-[#6B665C] hover:text-[#141414] border border-[#ECE8DF]'
            }`}
          >
            <Navigation size={14} />
            <span>المحاور والطرق السريعة</span>
          </button>

          <button
            onClick={() => setActiveTab('landmarks')}
            className={`px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 whitespace-nowrap transition-all ${
              activeTab === 'landmarks' ? 'bg-[#141414] text-white shadow-sm font-bold' : 'bg-[#F6F4EF] text-[#6B665C] hover:text-[#141414] border border-[#ECE8DF]'
            }`}
          >
            <ShoppingBag size={14} />
            <span>الجامعات والمعالم</span>
          </button>

          <button
            onClick={() => setActiveTab('legal')}
            className={`px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 whitespace-nowrap transition-all ${
              activeTab === 'legal' ? 'bg-[#141414] text-white shadow-sm font-bold' : 'bg-[#F6F4EF] text-[#6B665C] hover:text-[#141414] border border-[#ECE8DF]'
            }`}
          >
            <ShieldCheck size={14} />
            <span>نصائح الشراء القانونية</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4">

          {/* TAB 1: DISTRICTS (Compact Magazine Visual Story Format) */}
          {activeTab === 'districts' && (
            <div className="space-y-4">
              
              {/* Quick District Selector Carousel Bar */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                {districts.map((d) => (
                  <button
                    key={d.name}
                    onClick={() => setSelectedDistrictName(d.name)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-2 transition-all border ${
                      selectedDistrictName === d.name
                        ? 'bg-[#A07A26] text-white border-[#A07A26] font-bold shadow-md'
                        : 'bg-white text-[#6B665C] border-[#ECE8DF] hover:border-[#DCD6CA]'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${selectedDistrictName === d.name ? 'bg-black' : 'bg-[#A07A26]'}`} />
                    <span>{d.name}</span>
                  </button>
                ))}
              </div>

              {/* Spotlight Featured District Story Card (Editorial Compact Layout) */}
              <div className="bg-white border border-[#ECE8DF] rounded-2xl overflow-hidden shadow-sm grid grid-cols-1 md:grid-cols-12 gap-0">
                
                {/* Photo Column (5 cols) */}
                <div className="md:col-span-5 relative h-56 md:h-auto min-h-[220px] bg-neutral-950 overflow-hidden">
                  <img
                    src={currentActiveDistrict.imageUrl || PRESET_IMAGES[0]}
                    alt={currentActiveDistrict.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  
                  <div className="absolute top-3 right-3 bg-[#A07A26] text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow">
                    {currentActiveDistrict.name}
                  {/* أرقام حية من المعروض دلوقتي */}
                  {(() => {
                    const list = properties.filter((p) => p.category !== 'off_plan' && p.neighborhood === currentActiveDistrict.name && p.area > 0);
                    if (!list.length) return null;
                    const ppm = Math.round(list.reduce((a, p) => a + p.price / p.area, 0) / list.length);
                    const min = Math.min(...list.map((p) => p.price));
                    return (
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {[['متاح دلوقتي', `${list.length} شقة`], ['متوسط المتر', `${ppm.toLocaleString('en-US')} ج.م`], ['تبدأ من', `${(min / 1e6).toFixed(min % 1e6 ? 1 : 0)} مليون`]].map(([t, v]) => (
                          <div key={t} className="rounded-xl bg-black/40 border border-white/20 p-2.5 text-center backdrop-blur-sm">
                            <p className="text-sm font-bold text-[#D9B864] font-readex">{v}</p>
                            <p className="text-[10px] text-white/80">{t}</p>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                  </div>

                  <div className="absolute bottom-3 right-3 left-3 flex items-center justify-between text-xs">
                    <span className="bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/20 text-[#3A3731] font-bold">
                      📍 الهضبة الوسطى
                    </span>
                    <button
                      onClick={() => setEditingDistrict({ ...currentActiveDistrict })}
                      className="px-2.5 py-1 bg-white/90 hover:bg-[#A07A26] text-[#3A3731] hover:text-black rounded-lg border border-white/20 text-xs font-bold transition-all flex items-center gap-1 shadow"
                    >
                      <Edit3 size={13} />
                      <span>تعديل المقال والصورة</span>
                    </button>
                  </div>
                </div>

                {/* Article & Specs Column (7 cols) */}
                <div className="md:col-span-7 p-4 sm:p-5 flex flex-col justify-between space-y-3">
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-base sm:text-lg font-bold text-[#141414]">
                        {currentActiveDistrict.name} · <span className="text-[#A07A26] text-sm font-bold">{currentActiveDistrict.tagline}</span>
                      </h3>
                    </div>

                    {/* Compact Micro-Article */}
                    <p className="text-xs text-[#3A3731] leading-relaxed bg-[#F6F4EF] p-3 rounded-xl border border-[#ECE8DF]">
                      {currentActiveDistrict.desc}
                    </p>

                    {/* Fast Metadata Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="bg-[#F6F4EF] p-2.5 rounded-lg border border-[#ECE8DF] space-y-1">
                        <div className="text-[#6B665C] font-bold flex items-center gap-1">
                          <MapPin size={13} className="text-[#A07A26]" />
                          <span>الموقع والمداخل:</span>
                        </div>
                        <p className="text-[#3A3731] text-[11px] leading-snug">{currentActiveDistrict.locationDetails}</p>
                      </div>

                      <div className="bg-[#F6F4EF] p-2.5 rounded-lg border border-[#ECE8DF] space-y-1">
                        <div className="text-[#6B665C] font-bold flex items-center gap-1">
                          <TrendingUp size={13} className="text-[#A07A26]" />
                          <span>أهم المعالم:</span>
                        </div>
                        <p className="text-[#3A3731] text-[11px] leading-snug">{currentActiveDistrict.keyLandmarks.join(' · ')}</p>
                      </div>
                    </div>
                  </div>

                  {/* Price Bar & CTAs */}
                  <div className="pt-3 border-t border-[#ECE8DF] flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start bg-black/50 px-3 py-1.5 rounded-xl border border-[#ECE8DF]">
                      <div>
                        <span className="text-[10px] text-[#6B665C] block font-bold">المتر المتشطب:</span>
                        <span className="text-xs font-bold text-white font-mono">{currentActiveDistrict.avgMeterFinished}</span>
                      </div>
                      <div className="w-[1px] h-6 bg-white/10" />
                      <div>
                        <span className="text-[10px] text-[#6B665C] block font-bold">المتر نصف تشطيب:</span>
                        <span className="text-xs font-bold text-[#A07A26] font-mono">{currentActiveDistrict.avgMeterSemi}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        onSelectDistrict(currentActiveDistrict.name);
                        onClose();
                      }}
                      className="w-full sm:w-auto px-4 py-2 bg-[#A07A26] hover:bg-[#8B681D] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-95 whitespace-nowrap"
                    >
                      <span>استعراض شقق {currentActiveDistrict.name}</span>
                      <ArrowLeft size={14} />
                    </button>
                  </div>

                </div>

              </div>

              {/* All Districts Overview Grid (Compact Cards) */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-[#6B665C] flex items-center gap-1.5">
                    <Layers size={14} className="text-[#A07A26]" />
                    <span>بطاقات سريعة لكافة أحياء الهضبة (1 إلى 8):</span>
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {districts.map((dist) => (
                    <div
                      key={dist.name}
                      onClick={() => setSelectedDistrictName(dist.name)}
                      className={`group cursor-pointer p-3 rounded-xl border transition-all flex flex-col justify-between space-y-2.5 ${
                        selectedDistrictName === dist.name
                          ? 'bg-white border-[#A07A26] shadow-md ring-1 ring-[#A07A26]/50'
                          : 'bg-[#12141d] border-[#ECE8DF] hover:border-white/30'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="relative h-24 rounded-lg overflow-hidden bg-white">
                          <img
                            src={dist.imageUrl || PRESET_IMAGES[0]}
                            alt={dist.name}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                          <span className="absolute bottom-1.5 right-1.5 bg-black/80 text-[#A07A26] text-[10px] font-bold px-2 py-0.5 rounded border border-[#ECE8DF]">
                            {dist.name}
                          </span>
                        </div>

                        <h5 className="text-xs font-bold text-white line-clamp-1">{dist.tagline}</h5>
                        <p className="text-[11px] text-[#6B665C] line-clamp-2 leading-relaxed">{dist.desc}</p>
                      </div>

                      <div className="pt-1.5 border-t border-[#ECE8DF] flex items-center justify-between text-[10px] text-[#3A3731]">
                        <span className="font-mono text-[#A07A26] font-bold">{dist.avgMeterFinished}</span>
                        <span className="text-[#6B665C] underline group-hover:text-[#A07A26]">تفاصيل &larr;</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: المحاور — قابل للتعديل */}
          {activeTab === 'highways' && (
            <div className="space-y-3">
              {isAdmin && (
                <EditorBar
                  editing={guideEdit}
                  busy={guideBusy}
                  onEdit={() => setGuideEdit(true)}
                  onCancel={() => { setGuideDraft(guide); setGuideEdit(false); }}
                  onSave={saveGuide}
                  onAdd={() => setGuideDraft({ ...guideDraft, highways: [...guideDraft.highways, { name: '', description: '', destinations: '', travelTime: '' }] })}
                  addLabel="ضيف محور"
                />
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {(guideEdit ? guideDraft : guide).highways.map((h, i) => (
                  <div key={i} className="bg-white p-4 rounded-2xl border border-[#ECE8DF] space-y-2 shadow-sm">
                    {guideEdit ? (
                      <>
                        <div className="flex items-center gap-2">
                          <Navigation size={16} className="text-[#A07A26] shrink-0" />
                          <input value={h.name} onChange={(e) => setHighway(i, 'name', e.target.value)} placeholder="اسم المحور"
                            className="flex-1 rounded-lg bg-[#F6F4EF] border border-[#E4DFD4] px-2 py-1.5 text-sm font-bold" />
                          <button onClick={() => setGuideDraft({ ...guideDraft, highways: guideDraft.highways.filter((_, j) => j !== i) })}
                            className="p-1.5 text-[#C2412D]" aria-label="مسح"><Trash2 size={14} /></button>
                        </div>
                        <textarea rows={3} value={h.description} onChange={(e) => setHighway(i, 'description', e.target.value)} placeholder="وصف المحور"
                          className="w-full rounded-lg bg-[#F6F4EF] border border-[#E4DFD4] px-2 py-1.5 text-xs leading-6" />
                        <input value={h.destinations} onChange={(e) => setHighway(i, 'destinations', e.target.value)} placeholder="بيربط بإيه؟ افصل بـ ·"
                          className="w-full rounded-lg bg-[#F6F4EF] border border-[#E4DFD4] px-2 py-1.5 text-xs" />
                        <input value={h.travelTime} onChange={(e) => setHighway(i, 'travelTime', e.target.value)} placeholder="الوقت المستغرق"
                          className="w-full rounded-lg bg-[#F6F4EF] border border-[#E4DFD4] px-2 py-1.5 text-xs" />
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 text-[#141414] font-bold text-sm">
                          <Navigation size={16} className="text-[#A07A26]" />
                          <span>{h.name}</span>
                        </div>
                        <p className="text-xs text-[#3A3731] leading-relaxed">{h.description}</p>
                        <div className="pt-2 border-t border-[#F0ECE4] text-xs space-y-1 text-[#6B665C]">
                          <div><strong className="text-[#141414]">الربط:</strong> {h.destinations}</div>
                          <div className="text-[#A07A26] font-bold">⏱ {h.travelTime}</div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: الجامعات والمعالم — قابل للتعديل */}
          {activeTab === 'landmarks' && (
            <div className="space-y-4">
              {isAdmin && (
                <EditorBar
                  editing={guideEdit}
                  busy={guideBusy}
                  onEdit={() => setGuideEdit(true)}
                  onCancel={() => { setGuideDraft(guide); setGuideEdit(false); }}
                  onSave={saveGuide}
                  onAdd={() => setGuideDraft({ ...guideDraft, landmarks: [...guideDraft.landmarks, { category: '', items: [] }] })}
                  addLabel="ضيف قسم"
                />
              )}
              {(guideEdit ? guideDraft : guide).landmarks.map((cat, idx) => (
                <div key={idx} className="bg-white p-4 rounded-2xl border border-[#ECE8DF] space-y-3 shadow-sm">
                  {guideEdit ? (
                    <div className="flex items-center gap-2 pb-2 border-b border-[#F0ECE4]">
                      <input value={cat.category} onChange={(e) => setCategory(idx, e.target.value)} placeholder="اسم القسم"
                        className="flex-1 rounded-lg bg-[#F6F4EF] border border-[#E4DFD4] px-2 py-1.5 text-sm font-bold" />
                      <button onClick={() => setGuideDraft({ ...guideDraft, landmarks: guideDraft.landmarks.filter((_, j) => j !== idx) })}
                        className="p-1.5 text-[#C2412D]" aria-label="مسح القسم"><Trash2 size={14} /></button>
                    </div>
                  ) : (
                    <h3 className="text-sm font-bold text-[#141414] pb-1 border-b border-[#F0ECE4]">{cat.category}</h3>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {cat.items.map((it, i) => (
                      <div key={i} className="bg-[#F6F4EF] p-2.5 rounded-xl border border-[#ECE8DF] space-y-1">
                        {guideEdit ? (
                          <>
                            <div className="flex items-center gap-1.5">
                              <input value={it.name} onChange={(e) => setItem(idx, i, 'name', e.target.value)} placeholder="الاسم"
                                className="flex-1 rounded bg-white border border-[#E4DFD4] px-2 py-1 text-xs font-bold" />
                              <input value={it.district} onChange={(e) => setItem(idx, i, 'district', e.target.value)} placeholder="الحي"
                                className="w-24 rounded bg-white border border-[#E4DFD4] px-2 py-1 text-[11px]" />
                              <button onClick={() => removeItem(idx, i)} className="p-1 text-[#C2412D]" aria-label="مسح"><Trash2 size={12} /></button>
                            </div>
                            <input value={it.desc} onChange={(e) => setItem(idx, i, 'desc', e.target.value)} placeholder="وصف مختصر"
                              className="w-full rounded bg-white border border-[#E4DFD4] px-2 py-1 text-[11px]" />
                          </>
                        ) : (
                          <>
                            <div className="flex justify-between items-center text-xs gap-2">
                              <strong className="text-[#141414] font-bold">{it.name}</strong>
                              <span className="text-[10px] text-[#A07A26] font-mono shrink-0">{it.district}</span>
                            </div>
                            <p className="text-[11px] text-[#6B665C] leading-5">{it.desc}</p>
                          </>
                        )}
                      </div>
                    ))}
                    {guideEdit && (
                      <button onClick={() => addItem(idx)}
                        className="rounded-xl border-2 border-dashed border-[#DCD6CA] p-2.5 text-xs font-bold text-[#8C877D] flex items-center justify-center gap-1">
                        <Plus size={14} />ضيف مكان
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 4: النصايح القانونية — قابل للتعديل */}
          {activeTab === 'legal' && (
            <div className="space-y-3">
              {isAdmin && (
                <EditorBar
                  editing={guideEdit}
                  busy={guideBusy}
                  onEdit={() => setGuideEdit(true)}
                  onCancel={() => { setGuideDraft(guide); setGuideEdit(false); }}
                  onSave={saveGuide}
                  onAdd={() => setGuideDraft({ ...guideDraft, legalTips: [...guideDraft.legalTips, { title: '', description: '', iconType: 'shield' }] })}
                  addLabel="ضيف نصيحة"
                />
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {(guideEdit ? guideDraft : guide).legalTips.map((tip, idx) => (
                  <div key={idx} className="bg-white p-4 rounded-2xl border border-[#ECE8DF] space-y-2 shadow-sm">
                    {guideEdit ? (
                      <>
                        <div className="flex items-center gap-2">
                          <ShieldCheck size={16} className="text-[#A07A26] shrink-0" />
                          <input value={tip.title} onChange={(e) => setTip(idx, 'title', e.target.value)} placeholder="عنوان النصيحة"
                            className="flex-1 rounded-lg bg-[#F6F4EF] border border-[#E4DFD4] px-2 py-1.5 text-sm font-bold" />
                          <button onClick={() => setGuideDraft({ ...guideDraft, legalTips: guideDraft.legalTips.filter((_, j) => j !== idx) })}
                            className="p-1.5 text-[#C2412D]" aria-label="مسح"><Trash2 size={14} /></button>
                        </div>
                        <textarea rows={3} value={tip.description} onChange={(e) => setTip(idx, 'description', e.target.value)} placeholder="الشرح"
                          className="w-full rounded-lg bg-[#F6F4EF] border border-[#E4DFD4] px-2 py-1.5 text-xs leading-6" />
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 text-[#141414] font-bold text-xs sm:text-sm">
                          <ShieldCheck size={16} className="text-[#A07A26]" />
                          <span>{tip.title}</span>
                        </div>
                        <p className="text-xs text-[#3A3731] leading-relaxed">{tip.description}</p>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>

      {/* ------------------------------------------------------------------ */}
      {/* EDIT DISTRICT MODAL (Instant In-Place CMS for District Content) */}
      {/* ------------------------------------------------------------------ */}
      {editingDistrict && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/95 backdrop-blur-lg">
          <div 
            className="w-full max-w-lg bg-[#141722] border border-white/20 rounded-2xl p-5 shadow-2xl space-y-4 text-right text-white max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Edit3 size={18} className="text-[#D9B864]" />
                <h3 className="text-sm font-bold text-white">تعديل مقال وصورة: {editingDistrict.name}</h3>
              </div>
              <button
                onClick={() => setEditingDistrict(null)}
                className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-[#CFCBC2] rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            {editSuccessMsg && (
              <div className="p-2.5 bg-[#A07A26]/20 border border-[#A07A26]/40 rounded-xl text-xs text-[#D9B864] font-bold flex items-center gap-2">
                <Check size={15} />
                <span>{editSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveDistrictEdit} className="space-y-3 text-xs">
              
              {/* Tagline */}
              <div className="space-y-1">
                <label className="text-[#A3A09A] font-bold">الشعار والوصف المختصر:</label>
                <input
                  type="text"
                  required
                  value={editingDistrict.tagline}
                  onChange={(e) => setEditingDistrict({ ...editingDistrict, tagline: e.target.value })}
                  className="w-full bg-[#1C1C1C] border border-white/15 rounded-xl px-3 py-2 text-white outline-none focus:border-[#A07A26]"
                />
              </div>

              {/* Micro-Article Description */}
              <div className="space-y-1">
                <label className="text-[#A3A09A] font-bold">نص المقال الموجز (2-3 أسطر):</label>
                <textarea
                  rows={3}
                  required
                  value={editingDistrict.desc}
                  onChange={(e) => setEditingDistrict({ ...editingDistrict, desc: e.target.value })}
                  className="w-full bg-[#1C1C1C] border border-white/15 rounded-xl px-3 py-2 text-white outline-none focus:border-[#A07A26] leading-relaxed"
                />
              </div>

              {/* Image URL */}
              <div className="space-y-1.5">
                <label className="text-[#A3A09A] font-bold flex items-center justify-between">
                  <span>رابط صورة المقال (URL):</span>
                  <span className="text-[10px] text-neutral-500">unsplash أو رابط مباشر</span>
                </label>
                <input
                  type="url"
                  required
                  value={editingDistrict.imageUrl || ''}
                  onChange={(e) => setEditingDistrict({ ...editingDistrict, imageUrl: e.target.value })}
                  className="w-full bg-[#1C1C1C] border border-white/15 rounded-xl px-3 py-2 text-white outline-none focus:border-[#A07A26] font-mono text-[11px]"
                />

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                  <span className="text-[10px] text-[#A3A09A] whitespace-nowrap">صور مقترحة:</span>
                  {PRESET_IMAGES.map((imgUrl, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setEditingDistrict({ ...editingDistrict, imageUrl: imgUrl })}
                      className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-white/20 hover:border-[#A07A26]"
                    >
                      <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Prices */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[#A3A09A] font-bold">سعر المتر المتشطب:</label>
                  <input
                    type="text"
                    required
                    value={editingDistrict.avgMeterFinished}
                    onChange={(e) => setEditingDistrict({ ...editingDistrict, avgMeterFinished: e.target.value })}
                    className="w-full bg-[#1C1C1C] border border-white/15 rounded-xl px-3 py-2 text-white outline-none focus:border-[#A07A26]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[#A3A09A] font-bold">سعر المتر نصف تشطيب:</label>
                  <input
                    type="text"
                    required
                    value={editingDistrict.avgMeterSemi}
                    onChange={(e) => setEditingDistrict({ ...editingDistrict, avgMeterSemi: e.target.value })}
                    className="w-full bg-[#1C1C1C] border border-white/15 rounded-xl px-3 py-2 text-white outline-none focus:border-[#A07A26]"
                  />
                </div>
              </div>

              {/* Location details */}
              <div className="space-y-1">
                <label className="text-[#A3A09A] font-bold">الموقع والمداخل:</label>
                <input
                  type="text"
                  value={editingDistrict.locationDetails}
                  onChange={(e) => setEditingDistrict({ ...editingDistrict, locationDetails: e.target.value })}
                  className="w-full bg-[#1C1C1C] border border-white/15 rounded-xl px-3 py-2 text-white outline-none focus:border-[#A07A26]"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingDistrict(null)}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-[#CFCBC2] rounded-xl font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#A07A26] hover:bg-[#8B681D] text-white rounded-xl font-bold shadow-md flex items-center gap-1.5"
                >
                  <Check size={14} />
                  <span>حفظ التعديلات</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
