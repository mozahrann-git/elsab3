import React, { useState } from 'react';
import { Property, ClientProfile, ClientNotification } from '../types';
import { 
  Bell, 
  X, 
  Check, 
  CheckCheck, 
  Sparkles, 
  Flame, 
  MapPin, 
  Settings, 
  ArrowLeft,
  DollarSign
} from 'lucide-react';
import { formatPrice } from '../utils/helpers';

interface ClientNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: ClientNotification[];
  client: ClientProfile | null;
  onSelectPropertyByCode: (code: string) => void;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onOpenPreferences: () => void;
}

export const ClientNotificationModal: React.FC<ClientNotificationModalProps> = ({
  isOpen,
  onClose,
  notifications,
  client,
  onSelectPropertyByCode,
  onMarkAsRead,
  onMarkAllAsRead,
  onOpenPreferences
}) => {
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'new_listing' | 'price_drop'>('all');

  if (!isOpen) return null;

  const filteredNotifications = notifications.filter(n => {
    if (filterType === 'unread') return !n.isRead;
    if (filterType === 'new_listing') return n.type === 'new_listing';
    if (filterType === 'price_drop') return n.type === 'price_drop' || n.type === 'urgent_deal';
    return true;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs overflow-hidden font-ibm animate-in fade-in duration-150" dir="rtl">
      
      {/* Modal Card */}
      <div 
        className="relative w-full max-w-xl bg-[#F6F4EF] rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-right border border-[#ECE8DF]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <header className="px-6 py-4 bg-white border-b border-[#ECE8DF] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FAF4E5] border border-[#E9DFCA] text-[#A07A26] flex items-center justify-center relative shrink-0">
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-readex font-bold text-base text-[#141414]">مركز إشعارات الشقق</h3>
                {client && (
                  <span className="text-xs font-bold px-2.5 py-0.5 bg-[#FAF4E5] text-[#A07A26] border border-[#E9DFCA] rounded-xl">
                    {client.name}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#6B665C]">
                تنبيهات فورية بأحدث الشقق المضافة وتخفيضات الأسعار في أحيائك المفضلة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onOpenPreferences}
              className="p-2 text-[#6B665C] hover:text-[#141414] hover:bg-[#F6F4EF] rounded-xl transition-colors cursor-pointer"
              title="تعديل تفضيلات التنبيهات"
            >
              <Settings size={18} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-stone-800 hover:bg-[#F6F4EF] rounded-xl transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Filter Controls Bar */}
        <div className="px-6 py-3 bg-white border-b border-[#ECE8DF] flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                filterType === 'all'
                  ? 'bg-[#141414] text-white shadow-2xs'
                  : 'bg-[#F6F4EF] text-[#6B665C] hover:text-[#141414]'
              }`}
            >
              الكل ({notifications.length})
            </button>
            <button
              onClick={() => setFilterType('unread')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                filterType === 'unread'
                  ? 'bg-[#A07A26] text-white shadow-2xs'
                  : 'bg-[#F6F4EF] text-[#6B665C] hover:text-[#141414]'
              }`}
            >
              غير مقروءة ({unreadCount})
            </button>
            <button
              onClick={() => setFilterType('new_listing')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                filterType === 'new_listing'
                  ? 'bg-[#141414] text-white shadow-2xs'
                  : 'bg-[#F6F4EF] text-[#6B665C] hover:text-[#141414]'
              }`}
            >
              شقق جديدة
            </button>
            <button
              onClick={() => setFilterType('price_drop')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                filterType === 'price_drop'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'bg-[#F6F4EF] text-rose-700 hover:bg-rose-50'
              }`}
            >
              عروض لقطة
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={onMarkAllAsRead}
              className="text-xs font-bold text-[#A07A26] hover:text-[#8B681D] flex items-center gap-1 cursor-pointer"
            >
              <CheckCheck size={14} />
              <span>تحديد الكل كمقروء</span>
            </button>
          )}
        </div>

        {/* List of Notifications */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3 flex-1">
          {filteredNotifications.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 bg-[#FAF4E5] text-[#A07A26] border border-[#E9DFCA] rounded-2xl flex items-center justify-center mx-auto">
                <Bell size={22} />
              </div>
              <h4 className="font-readex font-bold text-sm text-[#141414]">لا توجد إشعارات جديدة في هذا القسم</h4>
              <p className="text-xs text-[#6B665C] max-w-sm mx-auto">
                فور نزول شقق جديدة مطابقة لتفضيلاتك في أحياء الهضبة الوسطى، ستصلك تنبيهات هنا مباشرة!
              </p>
            </div>
          ) : (
            filteredNotifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => {
                  if (!notif.isRead) onMarkAsRead(notif.id);
                }}
                className={`p-4 rounded-2xl border transition-all shadow-2xs ${
                  notif.isRead
                    ? 'bg-white border-[#ECE8DF] opacity-80 hover:opacity-100'
                    : 'bg-white border-[#A07A26] ring-1 ring-[#A07A26]/20'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      notif.type === 'price_drop'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : notif.type === 'urgent_deal'
                        ? 'bg-[#FAF4E5] text-[#A07A26] border border-[#E9DFCA]'
                        : 'bg-[#FAF4E5] text-[#A07A26] border border-[#E9DFCA]'
                    }`}>
                      {notif.type === 'price_drop' ? <DollarSign size={16} /> : notif.type === 'urgent_deal' ? <Flame size={16} /> : <Sparkles size={16} />}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-readex font-bold text-xs text-[#141414]">{notif.title}</span>
                        {!notif.isRead && (
                          <span className="w-2 h-2 rounded-full bg-[#A07A26]" />
                        )}
                        <span className="text-[10px] text-[#8C877D] mr-auto">
                          {notif.createdAt}
                        </span>
                      </div>

                      <p className="text-xs text-[#4A463F] leading-relaxed">
                        {notif.message}
                      </p>

                      <div className="flex items-center gap-2 pt-1.5 flex-wrap">
                        <span className="text-xs font-mono font-bold bg-[#141414] text-white px-2 py-0.5 rounded-lg">
                          #{notif.propertyCode}
                        </span>
                        <span className="text-xs font-bold text-[#A07A26]">
                          {formatPrice(notif.propertyPrice)}
                        </span>
                        <span className="text-xs text-[#6B665C] flex items-center gap-1">
                          <MapPin size={12} className="text-[#A07A26]" />
                          <span>{notif.propertyNeighborhood}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Open Property CTA */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!notif.isRead) onMarkAsRead(notif.id);
                      onSelectPropertyByCode(notif.propertyCode);
                      onClose();
                    }}
                    className="px-3.5 py-2 bg-[#141414] hover:bg-black text-white rounded-xl text-xs font-bold shrink-0 flex items-center gap-1 active:scale-95 transition-transform cursor-pointer shadow-2xs"
                  >
                    <span>عرض</span>
                    <ArrowLeft size={12} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <footer className="px-6 py-3.5 bg-white border-t border-[#ECE8DF] flex items-center justify-between text-xs text-[#6B665C]">
          <span>يتم تحديث الإشعارات تلقائياً مع كل شقة جديدة تضاف للنظام</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#F6F4EF] hover:bg-[#ECE8DF] text-[#141414] font-bold rounded-xl transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </footer>
      </div>
    </div>
  );
};
