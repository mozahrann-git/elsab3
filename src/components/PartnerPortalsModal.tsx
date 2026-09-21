import React from 'react';
import { LandlordPortalPage } from './LandlordPortalPage';
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

export const PartnerPortalsModal: React.FC<PartnerPortalsModalProps> = (props) => {
  return <LandlordPortalPage {...props} />;
};

export { LandlordPortalPage };
