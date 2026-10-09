// المشروع بلا @types/react، فـ TypeScript يرجع لنطاق JSX العام؛ هنا نعرّفه بخاصية key
// حتى تقبل مكوّنات الرادار ذات الخصائص المحدّدة النوع مفتاح القوائم.
export {};
declare global {
  namespace JSX {
    interface IntrinsicAttributes {
      key?: string | number | null;
      // بدونها يصير النوع «ضعيفاً» فيرفض مكوّنات الأصناف غير المعرّفة الخصائص (ErrorBoundary).
      children?: unknown;
    }
  }
}
