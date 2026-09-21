import { Property, SalesAgent } from '../types';
import { formatPrice } from './helpers';

export interface DailyAdTheme {
  dayIndex: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  dayName: string;
  dayNameAr: string;
  title: string;
  badge: string;
  targetAudience: string;
  salesTip: string;
  generateText: (property: Property, agent: SalesAgent, customGroup?: string) => string;
}

export function getPropertyWebsiteUrl(property: Property, agent?: SalesAgent): string {
  let origin = '';
  if (typeof window !== 'undefined') {
    origin = window.location.origin;
    const pathname = window.location.pathname || '';
    if (pathname && pathname !== '/') {
      origin = `${origin}${pathname.endsWith('/') ? pathname.slice(0, -1) : pathname}`;
    }
  }
  const cleanCode = (property.code || property.id || '').replace(/^#+/, '').trim();
  const agentId = agent?.id || 'agent_1';
  
  const separator = origin.includes('?') ? '&' : '?';
  return `${origin}${separator}property=${encodeURIComponent(cleanCode)}&agent=${encodeURIComponent(agentId)}`;
}

export const DAILY_AD_THEMES: DailyAdTheme[] = [
  // 0: الأحد (Sunday)
  {
    dayIndex: 0,
    dayName: 'Sunday',
    dayNameAr: 'الأحد',
    title: 'صفقة الأحد الاستثنائية | أعلى قيمة سعرية للشراء الفوري',
    badge: '⚡ صفقة الأحد الكبرى',
    targetAudience: 'المشترين الجادين وأصحاب الكاش الراغبين في صفقة سريعة وقيمة حقيقية',
    salesTip: 'ركز في حديثك مع العميل على أن تسعير الوحدة استثنائي وأقل من متوسط المنطقة، مع جاهزية الأوراق للتنازل المباشر.',
    generateText: (property: Property, agent: SalesAgent, customGroup: string = 'المهتمين بالعقارات المميزة') => {
      const showcaseUrl = getPropertyWebsiteUrl(property, agent);
      const loc = property.neighborhood || 'موقع راقي ومتميز';
      const plot = property.plotNumber ? ` - قطعة ${property.plotNumber}` : '';
      const finish = property.finishingLabel || (property.finishing === 'finished' ? 'سوبر لوكس جاهزة' : 'نصف تشطيب');
      const elevator = property.hasElevator ? '• أسانسير شغال ومصان' : '';
      const isOffPlan = property.category === 'off_plan';

      return `⚡ صفقة الأحد الاستثنائية | وحدة مميزة بأفضل سعر وموقع استراتيجي ⚡
      
📍 الموقع الحيوي: ${loc}${plot} (${property.view || 'واجهة بحري وفيو مفتوح'})
🏷️ كود الوحدة للبحث: [${property.code}]
📐 المساحة: ${property.area} م² صافي بتوزيع هندسي مثالي
🚪 التقسيم الداخلي: ${property.bedrooms} غرف نوم واسعة + ${property.bathrooms} حمام + ريسبشن رحب + مطبخ
🏢 الدور: ${property.floor || 'دور مميز'} ${elevator}
💎 نوع التشطيب: ${finish}
🚗 المزايا والمرافق: ${property.hasGarage ? 'يوجد مكان جراج مخصص' : 'حصة قانونية مسجلة بالأرض'} + عدادات رسمية وأوراق ملكية سليمة 100%

💰 السعر المطلوب: ${formatPrice(property.price)} ${isOffPlan ? '(بتسهيلات سداد مريحة)' : '(سعر لقطة للجادين)'}
🔑 الاستلام: ${isOffPlan ? 'وفق جدول التسليم المعتمد' : 'استلام فوري فوري على المفتاح'}

🎯 لماذا تعتبر هذه الوحدة فرصة استثنائية؟
1. موقع هادئ وراقي قريب من أهم المحاور والطرق الرئيسية والخدمات الحيوية.
2. سعر متر تنافسي يوفر لك أماناً مالياً ومكسباً مباشراً من اليوم الأول.
3. مستندات ملكية مسجلة وجاهزة للتعاقد ونقل الملكية فوراً بدون أي تعقيدات.

📲 للمعاينة المباشرة وتنسيق حجز موعد على الطبيعة:
المستشار العقاري المعتمد: ${agent.name}
📞 اتصال / واتساب: ${agent.phone}
🌐 لمشاهدة المعرض الرقمي والصور بدقة عالية:
${showcaseUrl}

#السبع_للعقارات #شقق_للبيع #عقارات_مصر #استثمار_عقاري #صفقة_الأسبوع #استلام_فوري`;
    }
  },

  // 1: الاثنين (Monday)
  {
    dayIndex: 1,
    dayName: 'Monday',
    dayNameAr: 'الاثنين',
    title: 'سكن العائلة الراقي والرفاهية | تقسيم واسع وخصوصية تامة',
    badge: '🏡 سكن عائلي راقي',
    targetAudience: 'العائلات التي تبحث عن الراحة، المساحات الواسعة، والهدوء والأمان لأطفالها',
    salesTip: 'أبرز للعميل جودة التقسيم الداخلي، الإضاءة الطبيعية، وراحة الحركة للأسرة وقربها من الخدمات والمؤسسات التعليمية.',
    generateText: (property: Property, agent: SalesAgent) => {
      const showcaseUrl = getPropertyWebsiteUrl(property, agent);
      const loc = property.neighborhood || 'أرقى الأحياء السكنية';
      const plot = property.plotNumber ? ` - قطعة ${property.plotNumber}` : '';
      const finish = property.finishingLabel || (property.finishing === 'finished' ? 'تشطيب سوبر لوكس فاخر' : 'نصف تشطيب');

      return `🏡 شقة عائلية متكاملة بموقع راقي وتصميم يلبي كل متطلبات الراحة والخصوصية 🏡

لو تبحث لأسرتك عن بيت العمر الذي يجمع بين الفخامة، سعة المساحة، والهدوء التام مع القرب من كافة الخدمات:

📍 الموقع: ${loc}${plot} (${property.view || 'فيو مفتوح وغير مجروح'})
🏷️ كود الوحدة: #${property.code}
📐 المساحة الإجمالية: ${property.area} م² بتوزيع مدروس
🚪 التقسيم: ${property.bedrooms} غرف نوم مريحة + ${property.bathrooms} حمام + ريسبشن عائلي مشرق
🏢 الدور: ${property.floor || 'دور متكرر مميز'} ${property.hasElevator ? '• أسانسير حديث ومدخل فندقي شيك' : ''}
💎 التشطيب: ${finish} (خامات ممتازة وجودة تنفيذ عالية)
🚗 الخدمات: ${property.hasGarage ? 'جراج خاص' : 'شوارع واسعة وأماكن انتظار مريحة'} + حصة بالأرض

💰 السعر الإجمالي: ${formatPrice(property.price)}
🔑 حالة الاستلام: استلام فوري جاهزة للسكن المباشر

✨ أهم مزايا المعيشة في هذا العقار:
✔️ بيئة راقية وهادئة توفر أعلى درجات الخصوصية والأمان للعائلة.
✔️ خطوات معدودة من المدارس والمراكز الخدمية والترفيهية.
✔️ تهوية بحري ممتازة وإطلالة مريحة تشرح الصدر.

📲 لتحديد موعد معاينة على الطبيعة برفقة عائلتك:
المستشار العقاري: ${agent.name}
📞 اتصال / واتساب: ${agent.phone}
🌐 تصفح ألبوم الصور والتفاصيل الكاملة:
${showcaseUrl}

#السبع_للعقارات #بيت_العمر #سكن_عائلي #عقارات_فاخرة #شقق_للبيع`;
    }
  },

  // 2: الثلاثاء (Tuesday)
  {
    dayIndex: 2,
    dayName: 'Tuesday',
    dayNameAr: 'الثلاثاء',
    title: 'فرصة الاستثمار العقاري الذكي | حفظ القيمة وأعلى عائد إيجاري',
    badge: '💼 استثمار رابح',
    targetAudience: 'المستثمرين والباحثين عن ملاذ آمن للسيولة النقدية وتأمين عائد دوري متزايد',
    salesTip: 'أكد للمستثمر أن العقار هو الدرع الأقوى ضد التضخم، وسهولة إعادة التأجير السريع أو إعادة البيع بربحية عالية.',
    generateText: (property: Property, agent: SalesAgent) => {
      const showcaseUrl = getPropertyWebsiteUrl(property, agent);
      const loc = property.neighborhood || 'موقع استثماري واعد';
      const finish = property.finishingLabel || (property.finishing === 'finished' ? 'سوبر لوكس' : 'نصف تشطيب');

      return `📈 استثمر مدخراتك في العقار الصحيح | فرصة استثمارية بعائد رأسمالي وإيجاري ممتاز 📈

العقار هو الملاذ الآمن والدرع الحقيقي لحماية وتنمية رأس المال، والوحدة الحالية تحقق لك المعادلة الاستثمارية الصعبة:

🏷️ كود الأصل العقاري: #${property.code}
📍 الموقع والمنطقة: ${loc} (${property.view || 'موقع حيوي مطلوب'})
📐 المساحة: ${property.area} م²
🚪 الغرف والمواصفات: ${property.bedrooms} غرف + ${property.bathrooms} حمام + ريسبشن واسع
🏢 الدور: ${property.floor || 'دور متكرر'} ${property.hasElevator ? '| يوجد مصعد كهربائي' : ''}
💎 حالة الوحدة: ${finish}
💰 السعر المطلوب: ${formatPrice(property.price)} (سعر متر استثماري لا يعوض)
🔑 الاستلام: فوري جاهزة للتأجير من اليوم التالي مباشرة

💡 المقومات الاستثمارية للوحدة:
1. إقبال إيجاري وطلب مستمر يضمن لك عائداً شهرياً مجزياً وتدفقات نقدية مستمرة.
2. نمو متسارع في القيمة الرأسمالية لسعر المتر في هذه المنطقة الحيوية.
3. مستندات ملكية قانونية كاملة وجاهزة للمعاينة والتعاقد الفوري.

📲 للاستشارات الاستثمارية وتنسيق المعاينة:
أ. ${agent.name} - مستشار التسويق والاستثمار العقاري
📞 هاتف / واتساب: ${agent.phone}
🌐 تفاصيل الوحدة والتقييم الاستثماري المباشر:
${showcaseUrl}

#السبع_للعقارات #استثمار_عقاري #عقارات_مصر #شقق_للبيع #عائد_استثماري`;
    }
  },

  // 3: الأربعاء (Wednesday)
  {
    dayIndex: 3,
    dayName: 'Wednesday',
    dayNameAr: 'الأربعاء',
    title: 'استلام فوري على المفتاح | وفر تكلفة الإيجار وأعباء التشطيب',
    badge: '🔑 جاهزة للسكن اللحظي',
    targetAudience: 'المشترين المستعجلين، العرسان، والمنتقلين الراغبين في السكن الفوري بدون انتظار',
    salesTip: 'العميل المستعجل يقدر الجاهزية التامة؛ طمئنه بشأن سلامة العدادات، المرافق، وسرعة إجراءات نقل الملكية.',
    generateText: (property: Property, agent: SalesAgent) => {
      const showcaseUrl = getPropertyWebsiteUrl(property, agent);
      const loc = property.neighborhood || 'موقع متميز قريب من كافة الخدمات';
      const finish = property.finishingLabel || (property.finishing === 'finished' ? 'سوبر لوكس جاهزة' : 'نصف تشطيب محارة وحلوق');

      return `🔑 شقة الأحلام جاهزة على المفتاح | استلم اليوم وابدأ حياتك الجديدة فوراً 🔑

وفر سنوات الانتظار وأعباء التشطيب وأسعار الخامات المتصاعدة واستلم شقتك بالكامل:

📍 الموقع: ${loc}
🏷️ كود الشقة: #${property.code}
📐 المساحة: ${property.area} متر مربع بتصميم مريح
🚪 التوزيع الداخلي: ${property.bedrooms} غرف نوم + ${property.bathrooms} حمام + ريسبشن كبير مشرق
🏢 الدور: ${property.floor || 'دور مميز'} ${property.hasElevator ? '(أسانسير شغال بالكامل)' : ''}
💎 التشطيب: ${finish}
🚗 المرافق والخدمات: ${property.hasGarage ? 'جراج خاص' : 'شارع واسع'} + حصة مسجلة في الأرض + كامل العدادات والمرافق

💰 السعر المطلوب: ${formatPrice(property.price)}
🔑 الاستلام: فوري ومباشر بمجرد التعاقد

🎁 لماذا تختار هذه الوحدة تحديداً؟
• عمارة ساكنة ومدخل فندقي راقي وجيران محترمين.
• موقع حيوي وسهل الوصول من وإلى أهم الطرق والمحاور الرئيسية.
• توفير كامل لوقتك وجهدك وأموالك مع استلام لحظي.

📲 للمعاينات وحجز موعد اليوم:
${agent.name} - شركة السبع للعقارات
📞 تليفون / واتساب: ${agent.phone}
🌐 رابط كتالوج الصور والبيانات الرسمية:
${showcaseUrl}

#السبع_للعقارات #شقق_استلام_فوري #سوبر_لوكس #عقارات_مصر #شقق_للبيع`;
    }
  },

  // 4: الخميس (Thursday)
  {
    dayIndex: 4,
    dayName: 'Thursday',
    dayNameAr: 'الخميس',
    title: 'جدول معاينات الويك إند المباشرة | احجز موعدك للجمعة والسبت',
    badge: '🚗 معاينات الويك إند',
    targetAudience: 'العملاء والراغبين في المعاينة على الطبيعة خلال العطلة الأسبوعية',
    salesTip: 'الخميس هو أفضل توقيت لتثبيت المواعيد. ادعُ العميل لتحديد ساعة محددة لضمان أسبقية المعاينة.',
    generateText: (property: Property, agent: SalesAgent) => {
      const showcaseUrl = getPropertyWebsiteUrl(property, agent);
      const loc = property.neighborhood || 'موقع حيوي راقي';
      const finish = property.finishingLabel || (property.finishing === 'finished' ? 'سوبر لوكس' : 'نصف تشطيب');

      return `🚗 جدول معاينات الويك إند مفتوح الآن (الجمعة والسبت) | وحدة ممتازة للمعاينة الفورية 🚗

لو تخطط لمعاينة أفضل الخيارات العقارية خلال عطلة نهاية الأسبوع، هذه الشقة يجب أن تكون أول محطة في جدولك:

📍 الموقع: ${loc}
🏷️ كود المعاينة: #${property.code}
📐 المساحة: ${property.area} م²
🚪 التقسيم: ${property.bedrooms} غرف نوم + ${property.bathrooms} حمام + ريسبشن رحب
🏢 الدور والإطلالة: ${property.floor || 'دور مميز'} (${property.view || 'فيو مفتوح'}) ${property.hasElevator ? '- أسانسير شغال' : ''}
💎 التشطيب: ${finish}
💰 السعر: ${formatPrice(property.price)} (قابل للتفاوض البسيط للجادين أثناء المعاينة)

📅 مواعيد المعاينات المتاحة للويك إند:
يومي الجمعة والسبت من الساعة 1:00 ظهراً حتى 7:00 مساءً (بالتنسيق المسبق).

📲 لحجز ميعاد المعاينة الخاصة بك برفقة المستشار العقاري:
المستشار: ${agent.name}
📞 تليفون / واتساب: ${agent.phone}
🌐 شاهد الصور والمواصفات مسبقاً قبل النزول للمعاينة:
${showcaseUrl}

#السبع_للعقارات #معاينات_الويك_إند #شقق_للبيع #عقارات_فاخرة #استثمار_عقاري`;
    }
  },

  // 5: الجمعة (Friday)
  {
    dayIndex: 5,
    dayName: 'Friday',
    dayNameAr: 'الجمعة',
    title: 'بركة الجمعة وقرار التملك الأفضل | راحة بال ومستقبل مضمون',
    badge: '✨ عرض الجمعة المباركة',
    targetAudience: 'العائلات المجتمعة والمقبلين على اتخاذ قرارات الشراء والتملك بروية',
    salesTip: 'يوم الجمعة تجتمع العائلات لمناقشة القرارات المصيرية. تحدث بنبرة دافئة توضح الأمان والضمانات القانونية.',
    generateText: (property: Property, agent: SalesAgent) => {
      const showcaseUrl = getPropertyWebsiteUrl(property, agent);
      const loc = property.neighborhood || 'أرقى المناطق السكنية';
      const finish = property.finishingLabel || (property.finishing === 'finished' ? 'سوبر لوكس' : 'نصف تشطيب');

      return `✨ جمعة مباركة | خطوة مباركة نحو بيت العمر وتأمين المستقبل العقاري لأسرتك ✨

أفضل قرار تتخذه لعائلتك هو تملك عقار راقي في موقع واعد يزداد قيمته يوماً بعد يوم:

📍 الموقع: ${loc} (${property.view || 'إطلالة بحري مميزة'})
🏷️ كود الوحدة: #${property.code}
📐 المساحة: ${property.area} م² بتوزيع ذكي يحقق أقصى استفادة من كل متر
🚪 التقسيم: ${property.bedrooms} غرف نوم + ${property.bathrooms} حمام + ريسبشن راقي
🏢 الدور: ${property.floor || 'دور متكرر'} ${property.hasElevator ? 'مع مصعد كهربائي حديث' : ''}
💎 التشطيب: ${finish}
🚗 المزايا: ${property.hasGarage ? 'مكان جراج خاص' : 'حصة قانونية مسجلة بالأرض'}

💰 السعر الإجمالي: ${formatPrice(property.price)}
🔑 الاستلام: فوري وجاهزة لكافة إجراءات التسجيل والتنازل

نحن في شركة السبع للعقارات نضمن لك وضوح المستندات، سلامة الإجراءات، وتقديم أفضل قيمة سعرية في السوق.

📲 تواصل معنا اليوم للاستفسار والمعاينة:
أ. ${agent.name}
📞 اتصال / واتساب مباشر: ${agent.phone}
🌐 تصفح معرض الصور الكامل للوحدة:
${showcaseUrl}

#السبع_للعقارات #جمعة_مباركة #بيت_العمر #شقق_للبيع #عقارات_مصر`;
    }
  },

  // 6: السبت (Saturday)
  {
    dayIndex: 6,
    dayName: 'Saturday',
    dayNameAr: 'السبت',
    title: 'انطلاقة الأسبوع وفرصة التملك الكبرى | موقع حيوي وعرض استثنائي',
    badge: '🚀 انطلاقة الأسبوع',
    targetAudience: 'الراغبين في بدء أسبوعهم بصفقة عقارية مدروسة واغتنام أفضل الفرص المتاحة',
    salesTip: 'شجع العميل على أن يكون أول من يحجز المعاينة قبل اكتمال طلبات الشراء على الوحدة.',
    generateText: (property: Property, agent: SalesAgent) => {
      const showcaseUrl = getPropertyWebsiteUrl(property, agent);
      const loc = property.neighborhood || 'موقع متميز وحيوي';
      const finish = property.finishingLabel || (property.finishing === 'finished' ? 'سوبر لوكس جاهزة' : 'نصف تشطيب');

      return `🚀 انطلاقة قوية للأسبوع مع واحدة من أميز الوحدات العقارية المتاحة للبيع 🚀

فرصة حقيقية بموقع مميز وتفاصيل دقيقة تلبي طموحاتك في السكن أو الاستثمار:

📍 الموقع: ${loc} (${property.view || 'واجهة بحري وفيو مفتوح'})
🏷️ كود الشقة: #${property.code}
📐 المساحة: ${property.area} متر مربع
🚪 التوزيع الداخلي: ${property.bedrooms} غرف نوم + ${property.bathrooms} حمام + ريسبشن كبير
🏢 الدور: ${property.floor || 'دور متكرر'} ${property.hasElevator ? '| أسانسير حديث' : ''}
💎 التشطيب: ${finish}
🚗 الأوراق والمزايا: ${property.hasGarage ? 'مكان بالجراج' : 'حصة بالأرض'} + جاهزة للتعاقد الفوري

💰 السعر المطلوب: ${formatPrice(property.price)}
🔑 الاستلام: فوري على المفتاح

📲 احجز أسبقية المعاينة وتفاصيل العنوان الدقيق:
المستشار العقاري: ${agent.name}
📞 تليفون / واتساب: ${agent.phone}
🌐 رابط تفاصيل وصور الشقة:
${showcaseUrl}

#السبع_للعقارات #عقارات_مصر #شقق_للبيع #ريلايستيت #فرص_عقارية`;
    }
  }
];

// Additional Style Variants for instant generation:
export type AdStyleVariant = 
  | 'daily' 
  | 'short_story' 
  | 'facebook_post' 
  | 'client_pitch' 
  | 'urgent_deal' 
  | 'telegram' 
  | 'whatsapp_broadcast';

export function generateSarahInspectionMessage(
  property: Property,
  agent: SalesAgent,
  proposedTime: string = 'في أقرب وقت متاح',
  clientNotes: string = '',
  clientName: string = '',
  clientPhone: string = ''
): string {
  const notesText = clientNotes.trim() || 'العميل مهتم وجاهز للمعاينة على الطبيعة';
  const timeText = proposedTime.trim() ? `\n⏰ الموعد المقترح للمعاينة: ${proposedTime.trim()}` : '';
  const clientInfo = (clientName.trim() || clientPhone.trim())
    ? `\n👤 العميل: ${clientName.trim() || 'عميل'} ${clientPhone.trim() ? `(${clientPhone.trim()})` : ''}`
    : '';
  const loc = property.neighborhood || 'موقع الوحدة';

  return `السلام عليكم أ/ سارة، معاك ${agent.name} من فريق المبيعات بشركة السبع للعقارات.
طلب تنسيق معاينة جديدة:
🏷️ كود الوحدة: #${property.code} (${loc} - ${property.area}م²)
${clientInfo}
📝 ملاحظات العميل: ${notesText}${timeText}

برجاء تأكيد الموعد مع المالك وتثبيته في جدول المعاينات. شكراً لكِ!`;
}

export function generateAdByVariant(
  variant: AdStyleVariant,
  property: Property,
  agent: SalesAgent,
  dayIndex: number = new Date().getDay(),
  customGroup?: string
): string {
  const showcaseUrl = getPropertyWebsiteUrl(property, agent);
  const isOffPlan = property.category === 'off_plan';
  const finish = property.finishingLabel || (property.finishing === 'finished' ? 'سوبر لوكس جاهزة' : 'نصف تشطيب (محارة وحلوق)');
  const floorText = property.floor ? `الدور ${property.floor}` : 'دور مميز';
  const elevatorText = property.hasElevator ? '• أسانسير شغال' : '';
  const plotText = property.plotNumber ? ` - قطعة ${property.plotNumber}` : '';
  const loc = property.neighborhood || 'موقع استراتيجي راقي';

  switch (variant) {
    case 'short_story':
      return `✨ لقطة اليوم | كود [${property.code}] ✨
📍 ${loc}${plotText} (${property.view || 'فيو مفتوح'})
📐 ${property.area} م² | ${property.bedrooms} غرف نوم | ${property.bathrooms} حمام
🏢 ${floorText} ${elevatorText}
💎 التشطيب: ${finish}
💰 السعر: ${formatPrice(property.price)} ${isOffPlan ? '(تسهيلات بالسداد)' : '(كاش)'}
🔑 الاستلام: ${isOffPlan ? 'حسب جدول المشروع' : 'فوري على المفتاح'}

📲 للمعاينة وحجز الموعد كلمني فوراً:
${agent.name} 📞 ${agent.phone}
🌐 صور وتفاصيل الشقة كاملة على الرابط:
${showcaseUrl}`;

    case 'facebook_post':
      return `🏢 وحدة سكنية ممتازة للبيع بموقع راقي وتسهيلات مميزة 🏢
كود الوحدة للبحث: [${property.code}]

لو تبحث عن شقة تجمع بين المساحة الممتازة، التقسيم الهندسي المريح، والموقع الهادئ القريب من كافة المحاور والخدمات:

📍 الموقع: ${loc}${plotText}
📐 المساحة: ${property.area} م² صافي
🚪 التقسيم الداخلي: ${property.bedrooms} غرف نوم مريحة + ${property.bathrooms} حمام + ريسبشن واسع + مطبخ
🏢 الدور: ${floorText} ${elevatorText}
💎 حالة التشطيب: ${finish}
🚗 المرافق والخدمات: ${property.hasGarage ? 'يوجد مكان جراج مخصص' : 'شارع واسع هادئ'} + حصة مسجلة في الأرض وعدادات رسمية

💰 السعر المطلوب: ${formatPrice(property.price)}
🔑 الاستلام: ${isOffPlan ? 'وفقاً لجدول الاستلام والمشروع' : 'فوري على المفتاح'}

🎯 أبرز المميزات:
1. موقع استراتيجي خطوات من المحاور والطرق الرئيسية والخدمات الحيوية.
2. تهوية بحري ممتازة وإضاءة طبيعية لكافة الغرف.
3. سعر متر تنافسي يوفر أعلى قيمة استثمارية.

📲 لتحديد موعد معاينة على الطبيعة ومراجعة الأوراق:
المستشار العقاري: ${agent.name}
📞 اتصال هاتف أو واتساب: ${agent.phone}
🌐 شاهد ألبوم الصور الكامل ومواصفات الشقة على الرابط الرسمي:
${showcaseUrl}

#السبع_للعقارات #شقق_للبيع #عقارات_مصر #شقق_تشطيب_فاخر #استثمار_عقاري`;

    case 'client_pitch':
      return `مساء الخير يا فندم،
معاك ${agent.name} مستشارك العقاري من شركة السبع للعقارات.

بخصوص طلب حضرتك للبحث عن شقة مميزة بمواصفات ممتازة، متاح حالياً وحدة استثنائية ومطابقة تماماً لطلبك:
🏷️ كود الوحدة: #${property.code}
📍 الموقع: ${loc}${plotText}
📐 المساحة: ${property.area} م² (${property.bedrooms} غرف نوم + ${property.bathrooms} حمام + ريسبشن رحب)
🏢 الدور: ${floorText} ${elevatorText}
💎 التشطيب: ${finish}
💰 السعر: ${formatPrice(property.price)}

تقدر تطلع على كافة الصور والتفاصيل من خلال هذا الرابط:
${showcaseUrl}

لو حابب ننسق موعد لمعاينتها على الطبيعة، أنا متاح لخدمتك في أي وقت يناسبك!`;

    case 'telegram':
      return `🏢 **وحدة جديدة معروضة للبيع - شركة السبع للعقارات**
▫️ **كود الوحدة:** \`${property.code}\`
▫️ **الموقع:** ${loc}${plotText} - ${property.view || 'واجهة بحري'}
▫️ **المساحة:** ${property.area} م² (${property.bedrooms} غرف + ${property.bathrooms} حمام)
▫️ **الدور:** ${floorText} ${elevatorText}
▫️ **التشطيب:** ${finish}
▫️ **السعر:** **${formatPrice(property.price)}**
▫️ **الاستلام:** ${isOffPlan ? 'تسهيلات بالسداد' : 'استلام فوري 🔑'}

📞 **للحجز والمعاينة المباشرة:**
المستشار: ${agent.name} - ${agent.phone}
🔗 **رابط المعاينة الرقمية وألبوم الصور:**
${showcaseUrl}`;

    case 'whatsapp_broadcast':
      return `السلام عليكم ورحمة الله وبركاته،
معاك ${agent.name} من شركة السبع للعقارات.

أود مشاركة هذه الفرصة العقارية المميزة التي نزلت اليوم في ${loc}:
🏷️ كود: #${property.code}
📐 مساحة: ${property.area} م² (${property.bedrooms} نوم + ${property.bathrooms} حمام)
🏢 ${floorText} ${elevatorText}
💎 تشطيب: ${finish}
💰 سعر: ${formatPrice(property.price)} (${isOffPlan ? 'تسهيلات سداد' : 'استلام فوري'})

يمكنك مشاهدة صور الشقة كاملة والتقسيم عبر الرابط:
${showcaseUrl}

لو ترغب في حجز ميعاد معاينة، تواصل معي مباشرة على نفس الرقم. تحياتي لك!`;

    case 'urgent_deal':
      return `🚨 فرصة عاجلة وسعر استثنائي لسرعة البيع 🚨
كود الوحدة: [${property.code}]
📍 الموقع: ${loc}${plotText}
📐 المساحة: ${property.area} م² (${property.bedrooms} غرف + ${property.bathrooms} حمام)
🏢 ${floorText} ${elevatorText}
💎 التشطيب: ${finish}
💰 السعر المطلوب: ${formatPrice(property.price)} (أفضل سعر متاح للجادين)
🔑 الاستلام: فوري وجاهزة للسكن والتعاقد اللحظي

الوحدة جاهزة للمعاينة الفورية ومناسبة لمن لديه كاش جاهز للتعاقد السريع!
📲 للتواصل المباشر والمعاينة:
${agent.name} 📞 ${agent.phone}
🌐 رابط ألبوم الصور والبيانات الكاملة:
${showcaseUrl}`;

    case 'daily':
    default: {
      const theme = DAILY_AD_THEMES.find((t) => t.dayIndex === dayIndex) || DAILY_AD_THEMES[0];
      return theme.generateText(property, agent, customGroup);
    }
  }
}

