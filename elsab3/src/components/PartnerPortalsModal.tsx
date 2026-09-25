import React from 'react';
import { Property } from '../types';
import { PortalAuthGate } from './PortalAuthGate';
import { PartnerPortal } from './portal/PartnerPortal';
import { signOutToGuest } from '../services/firebaseService';

/* بوابة المالك */
interface Props {
  isOpen: boolean;
  onClose: () => void;
  properties: Property[];
  logoUrl?: string;
  onAddUnit?: () => void;
}

export const PartnerPortalsModal: React.FC<Props> = ({ isOpen, onClose, properties, logoUrl, onAddUnit }) => (
  <PortalAuthGate isOpen={isOpen} role="owner" onClose={onClose}>
    {(access) => (
      <PartnerPortal mode="owner" access={access} properties={properties} logoUrl={logoUrl}
        onClose={onClose}
        onLogout={() => { signOutToGuest().catch(() => {}); onClose(); }}
        onAddUnit={() => onAddUnit?.()} />
    )}
  </PortalAuthGate>
);
