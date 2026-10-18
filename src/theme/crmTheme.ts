/*
  ثيم غرفة العمليات — مكان واحد لكل الألوان.

  كل مرحلة ليها لون ثابت، والعين بتعرف المرحلة من اللون قبل ما تقرا:
  الأصفر = لسه في الأول، الأخضر = معاينة، النحاسي = تفاوض، الأسود = اتقفلت.
  والأحمر الصريح للمتأخر بس — أي كارت عدّى ميعاده بيقلب أحمر كله.
  الكلام على كل لون متحسوب عشان يتقري (أبيض على الغامق، أسود على الفاتح).

  مستقبلاً كل شركة بتاخد نسختها من الثيم ده (لوجو + لون هوية + مجموعة ألوان)
  من غير ما الشاشات نفسها تتغير.
*/
import { LeadStatus } from '../types';

export interface StageTone { bg: string; fg: string; soft: string; line: string; chip: string; dark: boolean }

export interface CrmTheme {
  ground: string; surface: string; ink: string; muted: string; line: string;
  accent: string; accentInk: string; late: string;
  stages: Record<LeadStatus, StageTone>;
}

const light = (bg: string): StageTone => ({ bg, fg: '#17150F', soft: 'rgba(23,21,15,.68)', line: 'rgba(23,21,15,.14)', chip: 'rgba(23,21,15,.08)', dark: false });
const dark = (bg: string): StageTone => ({ bg, fg: '#FFFFFF', soft: 'rgba(255,255,255,.78)', line: 'rgba(255,255,255,.22)', chip: 'rgba(255,255,255,.16)', dark: true });

export const ELSAB3_THEME: CrmTheme = {
  ground: '#F5F0E6', surface: '#FFFDF8', ink: '#17150F', muted: '#6F695D', line: '#E7DFCF',
  accent: '#A9842F', accentInk: '#FFFFFF', late: '#D3262B',
  stages: {
    new: light('#E9B949'),
    contacted: light('#F3DA94'),
    sent_details: light('#EFE3C4'),
    visit_requested: light('#B9D3BF'),
    visit_booked: dark('#2F6B4F'),
    visit_done: dark('#22483A'),
    negotiation: dark('#8C5A2E'),
    closed: dark('#17150F'),
    lost: light('#DCD6CA'),
  } as Record<LeadStatus, StageTone>,
};

export const crmTheme = ELSAB3_THEME;
/** الكارت المتأخر: أحمر صريح — لون واحد في السيستم كله معناه «اتأخرت» */
export const LATE_TONE: StageTone = { bg: '#D3262B', fg: '#FFFFFF', soft: 'rgba(255,255,255,.85)', line: 'rgba(255,255,255,.28)', chip: 'rgba(255,255,255,.2)', dark: true };

export const stageTone = (s?: string): StageTone => (crmTheme.stages as any)[s || 'new'] || crmTheme.stages.new;
