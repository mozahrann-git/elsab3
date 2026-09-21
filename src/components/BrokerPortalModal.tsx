import React from 'react';
import { BrokerPortalPage } from './BrokerPortalPage';
import { Property, BrokerProfile, ViewingRequest } from '../types';

interface BrokerPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  properties?: Property[];
  onNotifyAdmin?: (message: string) => void;
  showToast?: (msg: string) => void;
  inspectBrokerId?: string | null;
  onExitInspection?: () => void;
  brokersList?: BrokerProfile[];
  onUpdateBrokersList?: (brokers: BrokerProfile[]) => void;
  onViewingCompleted?: (request: ViewingRequest, outcomeFeedback: string, viewingOutcome: string) => void;
}

export const BrokerPortalModal: React.FC<BrokerPortalModalProps> = ({
  isOpen,
  onClose,
  properties = [],
  onNotifyAdmin,
  showToast,
  inspectBrokerId,
  onExitInspection,
  brokersList,
  onUpdateBrokersList,
  onViewingCompleted
}) => {
  return (
    <BrokerPortalPage
      isOpen={isOpen}
      onClose={onClose}
      properties={properties}
      onNotifyAdmin={onNotifyAdmin}
      showToast={showToast}
      inspectBrokerId={inspectBrokerId}
      onExitInspection={onExitInspection}
      brokersList={brokersList}
      onUpdateBrokersList={onUpdateBrokersList}
      onViewingCompleted={onViewingCompleted}
    />
  );
};

export { BrokerPortalPage };
