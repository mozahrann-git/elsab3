import React from 'react';
import { LandlordPortalPage } from './LandlordPortalPage';
import { PortalAuthGate, PortalSessionBar } from './PortalAuthGate';
import { Property } from '../types';

interface PartnerPortalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  properties: Property[];
  onUpdatePropertyPrice?: (propertyId: string, newPrice: number) => void;
  onTogglePropertyStatus?: (propertyId: string, isPaused: boolean) => void;
  onAddNewProperty?: (newProp: Property) => void;
  initialTab?: 'landlord' | 'broker';
  onOpenSubmitUnit?: () => void;
  onOpenValuation?: () => void;
}

/* المالك بيدخل بإيميله، وبيشوف الوحدات المربوطة بيه في staff_access بس */
export const PartnerPortalsModal: React.FC<PartnerPortalsModalProps> = (props) => (
  <PortalAuthGate isOpen={props.isOpen} role="owner" onClose={props.onClose}>
    {(access, logout) => {
      const codes = (access.propertyCodes || []).map((c) => c.toUpperCase());
      const mine =
        access.role === 'admin'
          ? props.properties
          : props.properties.filter((p) => codes.includes(String((p as any).code || p.id).toUpperCase()) || codes.includes(String(p.id).toUpperCase()));
      return (
        <>
          <PortalSessionBar access={access} onLogout={logout} />
          <LandlordPortalPage {...props} properties={mine} />
        </>
      );
    }}
  </PortalAuthGate>
);

export { LandlordPortalPage };
