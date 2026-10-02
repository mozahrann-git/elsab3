import {StrictMode, lazy, Suspense} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {ErrorBoundary} from './components/ErrorBoundary.tsx';
import './index.css';

// Manateq Radar: في الإنتاج يُخدَم /radar من radar.html بحزمته المستقلة (firebase.json)؛
// هذا الفرع يغطي خادم التطوير وأي استضافة تعيد كل المسارات إلى index.html.
const RadarApp = lazy(() => import('./radar/RadarApp.tsx'));
const isRadar = /^\/radar(\/|$)/.test(window.location.pathname);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      {isRadar ? (
        <Suspense fallback={<div style={{minHeight: '100vh', background: '#0b0b0c'}} />}>
          <RadarApp />
        </Suspense>
      ) : (
        <App />
      )}
    </ErrorBoundary>
  </StrictMode>,
);
