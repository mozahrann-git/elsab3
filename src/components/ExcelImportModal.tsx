import { verifyCurrentPassword } from '../services/firebaseService';
import React, { useState, useRef } from 'react';
import { 
  FileSpreadsheet, 
  Upload, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  FileText, 
  Check, 
  RefreshCw, 
  Building, 
  Layers, 
  ChevronRight,
  Info,
  Database,
  Trash2,
  Lock,
  ShieldAlert,
  Eye,
  EyeOff
} from 'lucide-react';
import { Property } from '../types';
import { parseExcelFile, downloadExcelTemplate, exportPropertiesToExcel, SheetStat } from '../utils/excelHelper';
import { USER_EXCEL_PROPERTIES } from '../data/userProperties';
import { formatPrice } from '../utils/helpers';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProperties: Property[];
  onImportSuccess?: (importedProps: Property[], mode: 'append' | 'replace') => void;
  onImport?: (importedProps: Property[], mode: 'append' | 'replace') => void;
  onClearAllProperties?: () => Promise<void> | void;
  onRestoreDemoProperties?: () => Promise<void> | void;
  adminPassword?: string;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  currentProperties,
  onImportSuccess,
  onImport,
  onClearAllProperties,
  onRestoreDemoProperties,
  adminPassword = 'admin'
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [parsedProperties, setParsedProperties] = useState<Property[]>([]);
  const [sheetStats, setSheetStats] = useState<SheetStat[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [previewTab, setPreviewTab] = useState<'summary' | 'table'>('table');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Secure Admin Password Confirmation for Clear All
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isClearingInProgress, setIsClearingInProgress] = useState(false);

  if (!isOpen) return null;

  const triggerToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleLoadFullDefaultInventory = () => {
    setSelectedFile(new File([''], 'قاعدة_شقق_الهضبة_الوسطى_الكاملة.xlsx'));
    setParsedProperties([...USER_EXCEL_PROPERTIES]);
    setSheetStats([{ name: 'شقق الهضبة المعتمدة', count: USER_EXCEL_PROPERTIES.length }]);
    setErrorMessage(null);
  };

  const handleFileSelected = async (file: File) => {
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const fileName = file.name.toLowerCase();
    const isValid = validExtensions.some(ext => fileName.endsWith(ext));

    if (!isValid) {
      setErrorMessage('يرجى اختيار ملف إكسيل بصيغة (.xlsx أو .xls أو .csv)');
      setSelectedFile(null);
      setParsedProperties([]);
      setSheetStats([]);
      return;
    }

    setSelectedFile(file);
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const result = await parseExcelFile(file);
      setParsedProperties(result.properties);
      setSheetStats(result.sheetStats || []);
    } catch (err: any) {
      setErrorMessage(err.message || 'تعذر استخراج البيانات من ملف الإكسيل');
      setParsedProperties([]);
      setSheetStats([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteImport = () => {
    if (parsedProperties.length === 0) return;
    if (onImportSuccess) {
      onImportSuccess(parsedProperties, importMode);
    } else if (onImport) {
      onImport(parsedProperties, importMode);
    }
    onClose();
  };

  const resetSelection = () => {
    setSelectedFile(null);
    setParsedProperties([]);
    setSheetStats([]);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleConfirmClearWithPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    // التأكيد بباسوورد حساب الأدمن الحقيقي في Firebase، مش باسوورد مكتوب في الكود
    const ok = await verifyCurrentPassword(passwordInput);
    if (!ok) {
      setPasswordError('كلمة مرور الأدمن غير صحيحة! يرجى إدخال باسورد الأدمن الصحيح لإتمام مسح البيانات.');
      return;
    }

    setIsClearingInProgress(true);
    try {
      if (onClearAllProperties) {
        await onClearAllProperties();
      }
      setIsPasswordModalOpen(false);
      setPasswordInput('');
      triggerToast('تم مسح وتفريغ جميع الشقق بنجاح من المعرض وقاعدة البيانات');
    } catch (err: any) {
      console.error(err);
      setPasswordError('حدث خطأ أثناء تنفيذ عملية المسح');
    } finally {
      setIsClearingInProgress(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md">
      <div 
        className="relative w-full max-w-4xl max-h-[92vh] bg-[#141722] border border-amber-500/25 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-right text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Toast alert */}
        {successToast && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-60 bg-emerald-600 text-white px-5 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-4">
            <CheckCircle2 size={16} />
            <span>{successToast}</span>
          </div>
        )}

        {/* Header */}
        <div className="px-5 py-4 bg-[#1a1e2d] border-b border-stone-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl">
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:lg font-black text-white">إدارة شيت الإكسيل والبيانات (Excel & Database)</h2>
                <span className="bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 text-[10px] px-2 py-0.5 rounded-full font-bold">
                  نفس الأعمدة
                </span>
              </div>
              <p className="text-xs text-stone-400">
                استيراد وتصدير الشقق دفعة واحدة، تحميل النماذج، أو تفريغ المعرض بكلمة مرور الأدمن
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 bg-stone-800/80 hover:bg-stone-700 text-stone-300 hover:text-white rounded-xl transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="px-5 py-3 bg-[#11131c] border-b border-stone-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                downloadExcelTemplate();
                triggerToast('تم تحميل نموذج الإكسيل الفارغ بالأعمدة');
              }}
              className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              title="تحميل شيت إكسيل جاهز يحتوي على أسماء الأعمدة ونماذج بيانات مطابقة"
            >
              <Download size={14} />
              <span>تحميل نموذج إكسيل فارغ</span>
            </button>

            <button
              onClick={() => {
                exportPropertiesToExcel(currentProperties);
                triggerToast(`تم تصدير ${currentProperties.length} شقة إلى ملف إكسيل`);
              }}
              className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              title="تصدير جميع الشقق المعروضة حالياً إلى شيت إكسيل"
            >
              <FileSpreadsheet size={14} className="text-emerald-400" />
              <span>تصدير الشقق الحالية ({currentProperties.length})</span>
            </button>

            {onClearAllProperties && currentProperties.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setPasswordError(null);
                  setPasswordInput('');
                  setIsPasswordModalOpen(true);
                }}
                className="px-3 py-1.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/40 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                title="مسح وتفريغ كافة الشقق من المعرض وقاعدة البيانات بتأكيد باسورد الأدمن"
              >
                <Trash2 size={14} className="text-rose-400" />
                <span>مسح كل الشقق ({currentProperties.length})</span>
              </button>
            )}

            {onRestoreDemoProperties && currentProperties.length === 0 && (
              <button
                type="button"
                onClick={async () => {
                  if (onRestoreDemoProperties) {
                    await onRestoreDemoProperties();
                    triggerToast('تمت استعادة الشقق المعتمدة بنجاح');
                  }
                }}
                className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <RefreshCw size={13} />
                <span>استعادة الشقق المعتمدة</span>
              </button>
            )}

            <button
              onClick={handleLoadFullDefaultInventory}
              className="px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 rounded-lg font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              title="تحميل قاعدة بيانات شقق الهضبة الوسطى الجاهزة بالكامل (41 شقة معتمدة)"
            >
              <Database size={14} className="text-emerald-400" />
              <span>استيراد شقق الهضبة المجهزة (41 شقة)</span>
            </button>
          </div>

          <div className="text-[11px] text-stone-400 flex items-center gap-1.5">
            <Info size={13} className="text-amber-400 shrink-0" />
            <span>يدعم: .xlsx &bull; .xls &bull; .csv</span>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* File Upload Dropzone */}
          {!selectedFile ? (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3.5 ${
                dragActive
                  ? 'border-amber-400 bg-amber-500/10 scale-[1.01]'
                  : 'border-stone-700 hover:border-amber-500/60 bg-[#161a26]/60 hover:bg-[#161a26]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileInputChange}
                className="hidden"
              />

              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-lg">
                <Upload size={30} />
              </div>

              <div>
                <p className="text-sm sm:text-base font-bold text-white mb-1">
                  اسحب وأفلت شيت الإكسيل هنا، أو <span className="text-amber-400 underline underline-offset-4">تصفح من جهازك</span>
                </p>
                <p className="text-xs text-stone-300 max-w-md mx-auto leading-relaxed">
                  يتم استخراج وقراءة <strong className="text-amber-400 font-bold">نفس كود الشيت بدقة تامة</strong> (مثل H1612 أو أي كود مكتوب لديك في الشيت) دون أي بادئة أو تغيير.
                </p>
              </div>

              <div className="flex items-center gap-2 mt-2 pt-3 border-t border-stone-800 text-[11px] text-stone-400">
                <span className="px-2 py-0.5 rounded bg-stone-800 text-stone-300">أكواد الشيت الأصلية بالكامل</span>
                <span className="text-stone-600">&bull;</span>
                <span className="px-2 py-0.5 rounded bg-stone-800 text-stone-300">أعمدة عربية أو إنجليزية</span>
                <span className="text-stone-600">&bull;</span>
                <span className="px-2 py-0.5 rounded bg-stone-800 text-stone-300">قراءة تلقائية للأحياء والتشطيب</span>
              </div>
            </div>
          ) : (
            /* Selected File Summary & Controls */
            <div className="space-y-4">
              <div className="bg-[#191d2c] border border-stone-700 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                    <FileSpreadsheet size={28} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white max-w-xs truncate" title={selectedFile.name}>
                        {selectedFile.name}
                      </span>
                      <span className="text-[11px] text-stone-400 font-mono">
                        ({(selectedFile.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <p className="text-xs text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                      <CheckCircle2 size={13} />
                      <span>تم فحص الشيت بنجاح: تم استخراج كافة الشقق بالكامل ({parsedProperties.length} شقة صالحة للاستيراد)</span>
                    </p>
                    {sheetStats.length > 1 && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <span className="text-[11px] text-stone-400">تمت قراءة أوراق العمل:</span>
                        {sheetStats.map(s => (
                          <span key={s.name} className="px-2 py-0.5 bg-stone-800 text-stone-300 text-[10px] rounded-md font-mono border border-stone-700">
                            {s.name}: {s.count} شقة
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={resetSelection}
                  className="px-3 py-1.5 text-xs text-stone-400 hover:text-white bg-stone-800 hover:bg-stone-700 rounded-lg flex items-center gap-1 self-start sm:self-auto transition-all"
                >
                  <RefreshCw size={13} />
                  <span>اختيار ملف آخر</span>
                </button>
              </div>

              {/* Import Mode Radio selection */}
              <div className="bg-[#161a26] border border-stone-800 rounded-xl p-4">
                <h4 className="text-xs font-bold text-stone-300 mb-2.5">طريقة إضافة البيانات إلى المنصة:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label 
                    onClick={() => setImportMode('append')}
                    className={`p-3 rounded-xl border cursor-pointer flex items-start gap-3 transition-all ${
                      importMode === 'append'
                        ? 'bg-amber-500/10 border-amber-500/50 text-white shadow-md'
                        : 'bg-stone-900/60 border-stone-800 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    <input 
                      type="radio" 
                      name="importMode" 
                      checked={importMode === 'append'} 
                      onChange={() => setImportMode('append')}
                      className="mt-1 accent-amber-500" 
                    />
                    <div>
                      <div className="font-bold text-xs text-white">دمج وإضافة للشقق الحالية (موصى به)</div>
                      <p className="text-[11px] text-stone-400 mt-0.5 leading-relaxed">
                        يحتفظ بالشقق الحالية ({currentProperties.length}) ويضيف الشقق الجديدة. إذا وُجد نفس الكود يتم تحديث بياناته.
                      </p>
                    </div>
                  </label>

                  <label 
                    onClick={() => setImportMode('replace')}
                    className={`p-3 rounded-xl border cursor-pointer flex items-start gap-3 transition-all ${
                      importMode === 'replace'
                        ? 'bg-red-500/10 border-red-500/50 text-white shadow-md'
                        : 'bg-stone-900/60 border-stone-800 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    <input 
                      type="radio" 
                      name="importMode" 
                      checked={importMode === 'replace'} 
                      onChange={() => setImportMode('replace')}
                      className="mt-1 accent-red-500" 
                    />
                    <div>
                      <div className="font-bold text-xs text-red-400">استبدال كافة الشقق بالشيت الجديد</div>
                      <p className="text-[11px] text-stone-400 mt-0.5 leading-relaxed">
                        سيتم مسح الشقق القديمة واستبدالها بالكامل بالشقق الموجودة في هذا الشيت ({parsedProperties.length} شقة).
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Data Preview Table */}
              <div className="border border-stone-800 rounded-xl overflow-hidden bg-[#11131c]">
                <div className="px-4 py-2.5 bg-[#171a26] border-b border-stone-800 flex items-center justify-between text-xs">
                  <span className="font-bold text-stone-200">معاينة الشقق المقروءة من الإكسيل ({parsedProperties.length})</span>
                  <span className="text-[11px] text-stone-400 font-mono">عينة أول 10 شقق</span>
                </div>

                <div className="overflow-x-auto max-h-64">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-[#141722] text-stone-400 border-b border-stone-800 sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3 font-bold">Code</th>
                        <th className="py-2.5 px-3 font-bold">DISTRICT</th>
                        <th className="py-2.5 px-3 font-bold">finishing</th>
                        <th className="py-2.5 px-3 font-bold">Area</th>
                        <th className="py-2.5 px-3 font-bold">Total Price</th>
                        <th className="py-2.5 px-3 font-bold">Floor</th>
                        <th className="py-2.5 px-3 font-bold">Rooms</th>
                        <th className="py-2.5 px-3 font-bold">w/c</th>
                        <th className="py-2.5 px-3 font-bold">Location</th>
                        <th className="py-2.5 px-3 font-bold">Note</th>
                        <th className="py-2.5 px-3 font-bold">owner number</th>
                        <th className="py-2.5 px-3 font-bold">sales</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-800 text-stone-300">
                      {parsedProperties.slice(0, 10).map((prop, idx) => (
                        <tr key={idx} className="hover:bg-stone-800/40 transition-colors">
                          <td className="py-2 px-3 font-mono font-bold text-amber-400 text-[11px]">{prop.code}</td>
                          <td className="py-2 px-3 text-stone-300 whitespace-nowrap">{prop.neighborhood}</td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              prop.finishing === 'finished'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}>
                              {prop.finishing === 'finished' ? 'Fully Finished' : 'Semi Finished'}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-mono">{prop.area} م²</td>
                          <td className="py-2 px-3 font-bold text-emerald-400 font-mono">{formatPrice(prop.price)}</td>
                          <td className="py-2 px-3 text-stone-400 whitespace-nowrap">{prop.floor}</td>
                          <td className="py-2 px-3">{prop.bedrooms}</td>
                          <td className="py-2 px-3">{prop.bathrooms}</td>
                          <td className="py-2 px-3 text-stone-300 max-w-[140px] truncate" title={prop.location || prop.view}>{prop.location || prop.view || '—'}</td>
                          <td className="py-2 px-3 text-amber-300/80 max-w-[140px] truncate" title={prop.note}>{prop.note || '—'}</td>
                          <td className="py-2 px-3 font-mono text-[11px] text-stone-400">{prop.ownerPhone || '—'}</td>
                          <td className="py-2 px-3 text-stone-400">{prop.sales || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3.5 flex items-center gap-3 text-red-300 text-xs font-bold">
              <AlertCircle size={18} className="shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Guidelines info */}
          <div className="bg-[#12141e] border border-stone-800/80 rounded-xl p-4 text-xs text-stone-400 space-y-2.5">
            <div className="flex items-center justify-between">
              <h5 className="font-bold text-stone-200 flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-400" />
                <span>أعمدة الشيت المعتمدة (١٣ عموداً مطابقاً تماماً):</span>
              </h5>
              <span className="text-[10px] text-amber-400 font-mono bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                Exact Columns Match
              </span>
            </div>
            <div className="bg-black/40 p-2.5 rounded-lg font-mono text-[11px] text-emerald-300 border border-stone-800 overflow-x-auto whitespace-nowrap">
              Code &bull; DISTRICT &bull; finishing &bull; Area &bull; Total Price &bull; Floor &bull; Rooms &bull; w/c &bull; Details &bull; Location &bull; Note &bull; owner number &bull; sales
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-stone-400 leading-relaxed pr-4 list-disc">
              <li><strong>Code:</strong> كود الوحدة (مثل: H1612, H1404).</li>
              <li><strong>DISTRICT:</strong> الحي (الحي الأول حتى الثامن، أو تقسيم المباحث).</li>
              <li><strong>finishing:</strong> التشطيب (Fully Finished / Semi Finished أو سوبر لوكس / نصف تشطيب).</li>
              <li><strong>Area & Total Price:</strong> المساحة (م²) وإجمالي السعر (ج.م).</li>
              <li><strong>Floor:</strong> رقم الدور (0 للأرضي، 1، 2، 3 ...).</li>
              <li><strong>Rooms & w/c:</strong> عدد الغرف والحمامات.</li>
              <li><strong>Location & Note:</strong> موقع العقار الدقيق والملاحظات (أقساط، تسهيلات، إلخ).</li>
              <li><strong>owner number & sales:</strong> هاتف المالك ومسؤول المبيعات.</li>
            </ul>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-4 bg-[#1a1e2d] border-t border-stone-800 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white rounded-xl text-xs font-bold transition-all"
          >
            إلغاء
          </button>

          <div className="flex items-center gap-2.5">
            {selectedFile && (
              <button
                type="button"
                onClick={resetSelection}
                className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-bold transition-all"
              >
                تغيير الملف
              </button>
            )}

            <button
              type="button"
              disabled={!selectedFile || parsedProperties.length === 0 || isLoading}
              onClick={handleExecuteImport}
              className={`px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-lg cursor-pointer ${
                !selectedFile || parsedProperties.length === 0 || isLoading
                  ? 'bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-700'
                  : importMode === 'replace'
                  ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/30'
                  : 'gold-btn-gradient text-white shadow-amber-900/30'
              }`}
            >
              <CheckCircle2 size={16} />
              <span>
                {isLoading 
                  ? 'جاري التحليل...' 
                  : `تأكيد استيراد (${parsedProperties.length}) شقة إلى المنصة`}
              </span>
            </button>
          </div>
        </div>

        {/* SECURE ADMIN PASSWORD CONFIRMATION MODAL FOR CLEARING ALL PROPERTIES */}
        {isPasswordModalOpen && (
          <div className="fixed inset-0 z-70 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <div 
              className="bg-[#191d2c] border border-rose-500/40 rounded-3xl p-6 sm:p-7 max-w-md w-full text-center space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-white"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-16 h-16 bg-rose-500/15 text-rose-400 rounded-2xl flex items-center justify-center mx-auto border border-rose-500/30 shadow-lg">
                <ShieldAlert size={32} />
              </div>

              <div className="space-y-2 text-right">
                <h3 className="text-lg font-black text-white text-center flex items-center justify-center gap-2">
                  <Lock size={18} className="text-rose-400" />
                  <span>تأكيد مسح كافة الشقق بكلمة مرور الأدمن</span>
                </h3>
                <p className="text-xs text-stone-300 leading-relaxed text-center">
                  هل أنت متأكد من رغبتك في حذف وتفريغ جميع الشقق (<span className="text-amber-400 font-bold font-mono">{currentProperties.length}</span> شقة) نهائياً من المنصة وقاعدة البيانات؟
                  <br />
                  <span className="text-rose-400 font-bold block mt-1">
                    ⚠️ هذا الإجراء سيفرغ المعرض بالكامل لتتمكن من رفع شيت إكسيل جديد ونظيف.
                  </span>
                </p>
              </div>

              <form onSubmit={handleConfirmClearWithPassword} className="space-y-4 pt-1">
                <div className="space-y-1.5 text-right">
                  <label className="text-xs font-bold text-stone-200 block">
                    أدخل كلمة مرور الأدمن (Admin Password) للتأكيد:
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoFocus
                      required
                      value={passwordInput}
                      onChange={(e) => {
                        setPasswordInput(e.target.value);
                        setPasswordError(null);
                      }}
                      placeholder="أدخل كلمة مرور المدير..."
                      className="w-full bg-[#11131c] border border-stone-700 focus:border-rose-500 rounded-xl py-2.5 pr-4 pl-10 text-xs font-mono text-white placeholder:text-stone-500 focus:outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  {passwordError && (
                    <div className="text-[11px] text-rose-400 font-bold flex items-center gap-1.5 mt-1 animate-in fade-in">
                      <AlertCircle size={13} className="shrink-0" />
                      <span>{passwordError}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2 flex items-center gap-2.5">
                  <button
                    type="submit"
                    disabled={isClearingInProgress || !passwordInput}
                    className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 disabled:bg-stone-800 disabled:text-stone-500 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Trash2 size={15} />
                    <span>{isClearingInProgress ? 'جارٍ المسح والتفريغ...' : 'تأكيد المسح النهائي'}</span>
                  </button>
                  <button
                    type="button"
                    disabled={isClearingInProgress}
                    onClick={() => {
                      setIsPasswordModalOpen(false);
                      setPasswordInput('');
                      setPasswordError(null);
                    }}
                    className="py-2.5 px-4 bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
