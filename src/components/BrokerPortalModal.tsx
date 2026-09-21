import React from 'react';
import { BrokerPortalPage } from './BrokerPortalPage';
import { PortalAuthGate, PortalSessionBar } from './PortalAuthGate';
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
  // الأدمن وهو بيراجع بروكر معيّن من لوحة الإدارة مش محتاج بوابة الدخول
  if (inspectBrokerId) {
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
  }

  // البروكر بيدخل بإيميله، وبيشوف الوحدات المربوطة برقم البروكر بتاعه بس
  return (
    <PortalAuthGate isOpen={isOpen} role="broker" onClose={onClose}>
      {(access, logout) => {
        const mine =
          access.role === 'admin' || !access.brokerId
            ? properties
            : properties.filter((p) => (p as any).brokerId === access.brokerId);
        return (
          <>
            <PortalSessionBar access={access} onLogout={logout} />
            <BrokerPortalPage
              isOpen={isOpen}
              onClose={onClose}
              properties={mine}
              onNotifyAdmin={onNotifyAdmin}
              showToast={showToast}
              inspectBrokerId={access.brokerId || null}
              onExitInspection={onExitInspection}
              brokersList={brokersList}
              onUpdateBrokersList={onUpdateBrokersList}
              onViewingCompleted={onViewingCompleted}
            />
          </>
        );
      }}
    </PortalAuthGate>
  );
};

export { BrokerPortalPage };
