import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {ErrorBoundary} from './components/ErrorBoundary.tsx';
import './index.css';
import { isFirestoreCrash, recoverFromFirestoreCrash } from './utils/firestoreRecovery';

/* انهيار Firestore الداخلي ممكن يطلع بره React (من جوه الاشتراكات) — نمسكه هنا كمان */
window.addEventListener('error', (e) => { if (isFirestoreCrash(e.error || e.message)) recoverFromFirestoreCrash(); });
window.addEventListener('unhandledrejection', (e) => { if (isFirestoreCrash(e.reason)) recoverFromFirestoreCrash(); });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
