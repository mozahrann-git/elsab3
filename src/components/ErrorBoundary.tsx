import React from 'react';

/*
  حارس الأخطاء: بدل ما الشاشة تفضى بيضا لما حاجة تضرب،
  بيوقف الانهيار ويعرض رسالة الخطأ نفسها عشان نعرف السبب من غير ما نفتح الكونسول.
*/

interface Props { children: React.ReactNode }
interface State { error: Error | null; info: string }

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null, info: '' };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] الشاشة كانت هتفضى بسبب:', error, errorInfo);
    this.setState({ info: (errorInfo?.componentStack || '').split('\n').slice(0, 8).join('\n') });
  }

  private copyDetails = () => {
    const { error, info } = this.state;
    const text = `الخطأ: ${error?.message || ''}\n\nالمكان:\n${info}\n\nالتفاصيل:\n${error?.stack || ''}`;
    try {
      navigator.clipboard.writeText(text);
      window.alert('اتنسخ. البصه في أي مكان وابعتها.');
    } catch {
      window.prompt('انسخ النص ده وابعته:', text);
    }
  };

  render() {
    const { error, info } = this.state;
    if (!error) return this.props.children;

    return (
      <div
        dir="rtl"
        style={{
          minHeight: '100dvh',
          background: '#F6F4EF',
          color: '#141414',
          padding: '24px 16px',
          fontFamily: "'IBM Plex Sans Arabic', system-ui, sans-serif",
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ width: '100%', maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>حصلت مشكلة في الشاشة دي</h1>
            <p style={{ fontSize: 14, color: '#6B665C', margin: '6px 0 0' }}>
              الموقع شغال، الشاشة دي بس اللي وقفت. ابعت الرسالة اللي تحت ونصلّحها.
            </p>
          </div>

          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #E8C2BA',
              borderRadius: 16,
              padding: 16,
              fontSize: 13,
              lineHeight: 1.8,
              direction: 'ltr',
              textAlign: 'left',
              wordBreak: 'break-word',
              fontFamily: "'JetBrains Mono', monospace",
              color: '#C2412D',
            }}
          >
            {error.message || String(error)}
          </div>

          {info && (
            <details style={{ fontSize: 12, color: '#6B665C' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 700 }}>تفاصيل أكتر</summary>
              <pre
                style={{
                  direction: 'ltr',
                  textAlign: 'left',
                  whiteSpace: 'pre-wrap',
                  background: '#FFFFFF',
                  border: '1px solid #ECE8DF',
                  borderRadius: 12,
                  padding: 12,
                  marginTop: 8,
                  overflowX: 'auto',
                }}
              >
                {info}
              </pre>
            </details>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={this.copyDetails}
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: 14,
                border: '1px solid #DCD6CA',
                background: '#FFFFFF',
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              انسخ الرسالة
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: 14,
                border: 'none',
                background: '#141414',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              افتح الموقع من جديد
            </button>
          </div>
        </div>
      </div>
    );
  }
}
