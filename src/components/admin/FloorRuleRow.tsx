import React from 'react';
import { AlertTriangle, CheckCircle2, HelpCircle } from 'lucide-react';
import { parseFloor, licensedFloors } from '../../services/floorRules';

/*
  بيقول للأدمن النظام فهم الدور إزاي وحكم عليه بإيه، وهو بيكتب.
  ولو الشقة مرخّصة فعلاً ومعاه ورقها، بيعلّم عليها فبتخرج من القاعدة.
*/

interface Props {
  floor: string;
  neighborhood?: string;
  exempt: boolean;
  onToggleExempt: (v: boolean) => void;
}

export const FloorRuleRow: React.FC<Props> = ({ floor, neighborhood, exempt, onToggleExempt }) => {
  const n = parseFloor(floor);
  const lic = licensedFloors(neighborhood);
  const violation = n !== null && n > lic;

  return (
    <div className="mt-1.5 space-y-1.5">
      {n === null ? (
        <p className="text-[11px] text-[#7A5E12] bg-[#FFF8E6] border border-[#EBD9A6] rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
          <HelpCircle size={12} className="shrink-0" />
          النظام مش فاهم الدور. اكتبه كده: «الدور الخامس» أو «5».
        </p>
      ) : violation && !exempt ? (
        <p className="text-[11px] text-[#9E2A1B] bg-[#FDF2F0] border border-[#E8C2BA] rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
          <AlertTriangle size={12} className="shrink-0" />
          دور {n} — مخالف (رخصة {neighborhood || 'الحي'}: أرضي + {lic})
        </p>
      ) : (
        <p className="text-[11px] text-[#1E7A45] bg-[#EEF5F0] border border-[#BFE0CC] rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
          <CheckCircle2 size={12} className="shrink-0" />
          دور {n} — داخل الرخصة (أرضي + {lic}){exempt && violation ? ' · مستثناة يدوياً' : ''}
        </p>
      )}

      {violation && (
        <label className="flex items-start gap-2 text-[11px] text-stone-700 cursor-pointer">
          <input
            type="checkbox"
            checked={exempt}
            onChange={(e) => onToggleExempt(e.target.checked)}
            className="accent-[#1E7A45] mt-0.5 shrink-0"
          />
          <span>
            <b>الشقة دي مرخّصة ومعايا ورقها</b> — علّم هنا والتنبيه هيتشال عنها هي بس.
          </span>
        </label>
      )}
    </div>
  );
};

export default FloorRuleRow;
