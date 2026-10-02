<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/92184113-996b-4f23-8983-d050baebe159

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Manateq Radar (`/radar`)

جهاز قياس للسوق العقاري: الخريطة والغيوم، نبض السوق، مربّعات المطوّرين، صفحة الوحدة (حكم مناطق + التكلفة الحقيقية + الترجمة الثلاثية)، الاستقبال، والشات بوت. الكود في `src/radar/` ومبني على نظام تصميم مناطق.

- محلياً: `npm run dev` ثم افتح `http://localhost:3000/radar`
- الاختبارات: `npm test`
- في الإنتاج يُخدَم `/radar` من `radar.html` بحزمة مستقلة (~100KB gzip) عبر `firebase.json`.
- البيانات المبدئية «عيّنة تجريبية» معلنة في كل ختم.
- **الحفظ المشترك:** زر «دخول الفريق» بنفس حسابات `staff_access`. بعد الدخول كل الأحداث والطابور والردود وزر الإيقاف على Firestore (`radar_events` · `radar_queue` · `radar_replies` · `radar_config`). القراءة: admin / sales / coordinator / company_owner / marketing — الكتابة: admin / sales / coordinator. الزائر من غير دخول بيشتغل محلياً على جهازه.
- **قواعد Firestore لازم تتنشر يدوياً** (الـ CI بينشر الاستضافة بس): `firebase deploy --only firestore:rules`
- للتطوير على المحاكيات: `VITE_RADAR_EMULATOR=127.0.0.1 npm run dev` مع `firebase emulators:start --only auth,firestore` (Firestore على 8089).
