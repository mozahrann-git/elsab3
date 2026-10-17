import { Property, SalesAgent } from '../types';
import { formatPrice } from './helpers';
import { DAILY_AD_THEMES, getPropertyWebsiteUrl } from './salesAdGenerator';

/*
  نصوص الإعلانات — نفس اللي كانت في «أدوات المستشار العقاري»
  (اتشالت ونصوصها بقت هنا عشان تتستخدم من جوه الـCRM).
*/
export type AdVariant = 'facebook_post' | 'short_story' | 'client_pitch' | 'urgent_deal';
export const AD_VARIANTS: { id: AdVariant; label: string }[] = [
  { id: 'facebook_post', label: 'منشور فيسبوك' },
  { id: 'short_story', label: 'ستوري قصيرة' },
  { id: 'client_pitch', label: 'رسالة لعميل' },
  { id: 'urgent_deal', label: 'فرصة عاجلة' },
];

export interface AdAgent { id: string; name: string; phone: string }

export function adText(property: Property, agentIn: AdAgent, variant: AdVariant): string {
  const agent = { id: agentIn.id || '', name: agentIn.name || 'السبع للعقارات', phone: agentIn.phone || '01021242871' };
  const fullShowcaseUrl = getPropertyWebsiteUrl(property, agent as SalesAgent);
  const locationLabel = property.neighborhood || 'موقع استراتيجي راقي';
  const plotInfo = property.plotNumber ? ` - قطعة ${property.plotNumber}` : '';
  const finishingLabel = property.finishingLabel || (property.finishing === 'finished' ? 'سوبر لوكس جاهزة' : 'نصف تشطيب');
  const isOffPlan = property.category === 'off_plan';
  const floorText = property.floor ? `الدور ${property.floor}` : 'دور متكرر مميز';
  const elevatorText = property.hasElevator ? '• أسانسير شغال ومصان' : '';
  switch (variant) {
    case 'facebook_post':
      return `🏢 **وحدة سكنية ممتازة للبيع بموقع راقي وتسهيلات مميزة** 🏢
كود الوحدة للبحث: [${property.code}]

لو تبحث عن شقة تجمع بين المساحة الممتازة، التقسيم الهندسي المريح، والموقع الهادئ القريب من كافة المحاور والخدمات:

📍 **الموقع الحيوي:** ${locationLabel}${plotInfo} - (${property.view || 'واجهة بحري وفيو مفتوح'})
📐 **المساحة الصافية:** ${property.area} م² صافي بتوزيع مثالي
🚪 **التقسيم الداخلي:** ${property.bedrooms} غرف نوم واسعة + ${property.bathrooms} حمام + ريسبشن رحب + مطبخ
🏢 **الدور:** ${floorText} ${elevatorText}
💎 **نوع التشطيب:** ${finishingLabel}
🚗 **المرافق والخدمات:** ${property.hasGarage ? 'يوجد مكان جراج مخصص' : 'شارع واسع ومريح'} + حصة مسجلة في الأرض وعدادات رسمية

💰 **السعر المطلوب:** ${formatPrice(property.price)}
🔑 **الاستلام:** ${isOffPlan ? 'وفقاً لجدول الاستلام المعتمد' : 'استلام فوري على المفتاح'}

🎯 **أبرز المميزات:**
1. موقع استراتيجي خطوات من المحاور الرئيسية والخدمات الحيوية.
2. تهوية بحري ممتازة وإضاءة طبيعية لكافة الغرف.
3. سعر متر تنافسي يوفر أعلى عائد استثماري وقيمة مالية.

📲 **لتحديد موعد معاينة على الطبيعة ومراجعة الأوراق:**
المستشار العقاري: ${agent.name}
📞 **اتصال هاتف أو واتساب:** ${agent.phone}
🌐 **ألبوم الصور الكامل ومواصفات الشقة على الرابط الرسمي:**
${fullShowcaseUrl}

#السبع_للعقارات #عقارات_مصر #شقق_للبيع #استثمار_عقاري #استلام_فوري`;

    case 'short_story':
      return `🔥 **لقطة اليوم العقارية | كود #${property.code}** 🔥
🏡 شقة ${property.area}م² بموقع استثنائي في ${locationLabel}
✨ ${property.bedrooms} غرف نوم واسعة + ${property.bathrooms} حمام + ريسبشن رحب
🏢 ${floorText} ${elevatorText}
💎 تشطيب: ${finishingLabel}
💰 السعر المطلوب: ${formatPrice(property.price)} ${isOffPlan ? '(تسهيلات سداد)' : '(كاش للجادين)'}
🔑 الاستلام: ${isOffPlan ? 'وفق جدول المشروع' : 'استلام فوري على المفتاح'}

📲 **للتواصل والمعاينة الفورية:**
المستشار العقاري: ${agent.name} 📞 ${agent.phone}
🔗 **ألبوم الصور والمعاينة الرقمية الكاملة:**
${fullShowcaseUrl}`;

    case 'client_pitch':
      return `مساء الخير يا فندم،
معاك ${agent.name} مستشارك العقاري من شركة السبع للعقارات.

بخصوص طلب حضرتك للبحث عن شقة مميزة بمواصفات ممتازة وموقع راقي، متاح حالياً وحدة استثنائية ومطابقة تماماً لطلبك:
🏷️ **كود الوحدة:** #${property.code}
📍 **الموقع:** ${locationLabel}${plotInfo}
📐 **المساحة:** ${property.area} م² (${property.bedrooms} غرف نوم + ${property.bathrooms} حمام + ريسبشن رحب)
🏢 **الدور:** ${floorText} ${elevatorText}
💎 **التشطيب:** ${finishingLabel}
💰 **السعر:** ${formatPrice(property.price)}

تقدر تطلع على كافة الصور والتفاصيل الهندسية من خلال هذا الرابط المباشر:
${fullShowcaseUrl}

لو حابب ننسق موعد لمعاينتها على الطبيعة، أنا متاح لخدمتك في أي وقت يناسبك!`;

    case 'urgent_deal':
      return `🚨 **فرصة عاجلة وسعر استثنائي لسرعة البيع** 🚨
كود الوحدة: \`#${property.code}\`
📍 **الموقع:** ${locationLabel}${plotInfo}
📐 **المساحة:** ${property.area} م² (${property.bedrooms} غرف + ${property.bathrooms} حمام)
🏢 **الدور:** ${floorText} ${elevatorText}
💎 **التشطيب:** ${finishingLabel}
💰 **السعر المطلوب:** ${formatPrice(property.price)} (أفضل سعر متاح للجادين)
🔑 **الاستلام:** فوري وجاهزة للسكن والتعاقد اللحظي

الوحدة جاهزة للمعاينة الفورية ومناسبة لمن لديه كاش جاهز للتعاقد السريع!
📲 **للتواصل المباشر وتنسيق المعاينة:**
${agent.name} 📞 ${agent.phone}
🔗 **رابط ألبوم الصور والبيانات الكاملة:**
${fullShowcaseUrl}`;
  }
  return '';
}

/** إعلان اليوم — صيغة متجددة حسب يوم الأسبوع */
export function dailyAdText(property: Property, agentIn: AdAgent, dayIndex = new Date().getDay(), group = 'المهتمين بالعقارات المميزة') {
  const agent = { id: agentIn.id || '', name: agentIn.name || 'السبع للعقارات', phone: agentIn.phone || '01021242871' } as SalesAgent;
  const theme = DAILY_AD_THEMES.find((t) => t.dayIndex === dayIndex) || DAILY_AD_THEMES[0];
  return { label: `إعلان ${theme.dayNameAr}`, badge: theme.badge, tip: theme.salesTip, text: theme.generateText(property, agent, group) };
}
