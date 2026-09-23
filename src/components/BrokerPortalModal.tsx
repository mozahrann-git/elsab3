import React from 'react';
import { Property } from '../types';
import { PortalAuthGate } from './PortalAuthGate';
import { PartnerPortal } from './portal/PartnerPortal';
import { StaffAccess, signOutToGuest } from '../services/firebaseService';

/* بوابة البروكر: نفس هيكل بوابة المالك، بأوامر البروكر */
interface Props {
  isOpen: boolean;
  onClose: () => void;
  properties: Property[];
  logoUrl?: string;
  onAddUnit?: () => void;
  inspectBrokerId?: string | null;   // الأدمن بيراجع بروكر معيّن
  onExitInspection?: () => void;
}

export const BrokerPortalModal: React.FC<Props> = ({ isOpen, onClose, properties, logoUrl, onAddUnit, inspectBrokerId, onExitInspection }) => {
  if (!isOpen) return null;

  // مراجعة الإدارة: بتدخل على بوابة البروكر من غير تسجيل دخول تاني
  if (inspectBrokerId) {
    const access: StaffAccess = { email: '', role: 'admin', name: `مراجعة الإدارة · ${inspectBrokerId}`, brokerId: inspectBrokerId, propertyCodes: [] };
    return (
      <PartnerPortal mode="broker" access={access} properties={properties} logoUrl={logoUrl}
        onClose={() => { onExitInspection?.(); onClose(); }}
        onLogout={() => { onExitInspection?.(); onClose(); }}
        onAddUnit={() => onAddUnit?.()} />
    );
  }

  return (
    <PortalAuthGate isOpen={isOpen} role="broker" onClose={onClose}>
      {(access) => (
        <PartnerPortal mode="broker" access={access} properties={properties} logoUrl={logoUrl}
          onClose={onClose}
          onLogout={() => { signOutToGuest().catch(() => {}); onClose(); }}
          onAddUnit={() => onAddUnit?.()} />
      )}
    </PortalAuthGate>
  );
};
