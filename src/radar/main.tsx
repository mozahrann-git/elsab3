// نقطة دخول مستقلة لـ /radar في الإنتاج: حزمة صغيرة بلا الموقع الأساسي ولا Firebase.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import RadarApp from './RadarApp';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RadarApp />
  </StrictMode>,
);
