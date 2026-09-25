import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  writeBatch 
} from 'firebase/firestore';
import { db, cleanFirestoreData } from './firebaseService';
import { 
  PortalUser, 
  PortalRole, 
  GovernanceAuditLog, 
  GovernanceEventType,
  SalesAgent,
  Lead,
  ViewingRequest
} from '../types';

// ==========================================
// DEFAULT SEED USERS FOR THE 4 ISOLATED PORTALS
// ==========================================
export const DEFAULT_PORTAL_USERS: PortalUser[] = [
  // 1. الملاك (Landlords) - يدخل بإيميله ويرى فقط وحداته
  {
    id: 'user_landlord_tarek',
    email: 'eng.tarek@gmail.com',
    name: 'م/ طارق المنشاوي',
    phone: '01012345678',
    role: 'landlord',
    isActive: true,
    assignedPropertyCodes: ['SEBA-RSL-701', 'SEBA-RSL-702'],
    notes: 'مالك وحدتين متميزتين في الحي السابع والثاني',
    createdAt: '2026-01-10',
    passwordHint: 'owner2026'
  },
  {
    id: 'user_landlord_sameh',
    email: 'dr.sameh@gmail.com',
    name: 'د/ سامح عبد العزيز',
    phone: '01122334455',
    role: 'landlord',
    isActive: true,
    assignedPropertyCodes: ['MOK-MID-104'],
    notes: 'مالك دوبلكس الحي الرابع',
    createdAt: '2026-02-01',
    passwordHint: 'owner2026'
  },
  {
    id: 'user_landlord_hassan',
    email: 'hag.hassan@gmail.com',
    name: 'الحاج حسن الشناوي',
    phone: '01233445566',
    role: 'landlord',
    isActive: true,
    assignedPropertyCodes: ['SEBA-OFF-101'],
    notes: 'مالك بنتهاوس الحي الأول',
    createdAt: '2026-02-15',
    passwordHint: 'owner2026'
  },

  // 2. البروكرز (Brokers) - يدخل بإيميله ويرى تكليفاته ومعايناته فقط
  {
    id: 'user_broker_ahmed',
    email: 'ahmed.fouad@el-sabea.com',
    name: 'أحمد فؤاد',
    phone: '01099887766',
    role: 'broker',
    brokerId: 'broker_ahmed',
    isActive: true,
    notes: 'بروكر ميداني رئيسي معتمد للهضبة الوسطى',
    createdAt: '2026-01-01',
    passwordHint: 'broker2026'
  },
  {
    id: 'user_broker_karim',
    email: 'karim.gamal@el-sabea.com',
    name: 'كريم جمال',
    phone: '01155667788',
    role: 'broker',
    brokerId: 'broker_karim',
    isActive: true,
    notes: 'مدير مكتب إيليت هومز العقاري الشريك',
    createdAt: '2026-01-15',
    passwordHint: 'broker2026'
  },
  {
    id: 'user_broker_tamer',
    email: 'tamer.broker@el-sabea.com',
    name: 'تامر الصاوي',
    phone: '01222334411',
    role: 'broker',
    brokerId: 'broker_tamer',
    isActive: true,
    notes: 'بروكر متخصص في شقق إعادة البيع والاستلام الفوري',
    createdAt: '2026-02-01',
    passwordHint: 'broker2026'
  },

  // 3. مسؤولي المبيعات (Sales Agents) - يدخل بإيميله ويرى عملاءه وأنشطته
  {
    id: 'user_sales_fathy',
    email: 'm.fathy@el-sabea.com',
    name: 'محمود فتحي',
    phone: '01011122233',
    role: 'sales',
    salesAgentId: 'agent_1',
    isActive: true,
    notes: 'مستشار مبيعات أول - ليد تيم ليدر',
    createdAt: '2026-01-01',
    passwordHint: 'sales2026'
  },
  {
    id: 'user_sales_nour',
    email: 'nour.ibrahim@el-sabea.com',
    name: 'نور إبراهيم',
    phone: '01144455566',
    role: 'sales',
    salesAgentId: 'agent_2',
    isActive: true,
    notes: 'مستشارة عقارية متخصصة في الحي الأول والرابع',
    createdAt: '2026-01-10',
    passwordHint: 'sales2026'
  },
  {
    id: 'user_sales_ziad',
    email: 'ziad.tarek@el-sabea.com',
    name: 'زياد طارق',
    phone: '01277788899',
    role: 'sales',
    salesAgentId: 'agent_3',
    isActive: true,
    notes: 'مستشار مبيعات للمشاريع والريسيل',
    createdAt: '2026-02-01',
    passwordHint: 'sales2026'
  },

  // 4. الآدمن والقيادة العليا (Admin) - يدخل بإيميله ويحرر ويراقب كل شيء
  {
    id: 'user_admin_super',
    email: 'mo.zahrann@gmail.com',
    name: 'محمد زهران (الآدمن والمشرف العام)',
    phone: '01000000000',
    role: 'admin',
    isActive: true,
    notes: 'صلاحيات الحوكمة المطلقة والتحرير الشامل لكافة البوابات',
    createdAt: '2026-01-01',
    passwordHint: 'admin2026'
  },
  {
    id: 'user_admin_elseba',
    email: 'admin@elseba.com',
    name: 'إدارة السبع المركزية',
    phone: '01022233344',
    role: 'admin',
    isActive: true,
    notes: 'حساب إدارة العمليات المركزية',
    createdAt: '2026-01-01',
    passwordHint: 'admin2026'
  }
];

// ==========================================
// INITIAL GOVERNANCE AUDIT LOGS (SAMPLE FEED)
// ==========================================
export const INITIAL_GOVERNANCE_LOGS: GovernanceAuditLog[] = [
  {
    id: 'gov_log_1',
    type: 'sarah_notified_broker',
    title: 'إشعار لبروكر من سارة حنفي',
    description: 'قامت سارة حنفي بإرسال تكليف معاينة فورية للبروكر أحمد فؤاد للشقة SEBA-RSL-701 للعميل م/ عمرو شريف.',
    timestamp: 'اليوم 05:30 م',
    timestampMs: Date.now() - 1000 * 60 * 45,
    actorName: 'سارة حنفي (تنسيق المواعيد)',
    actorEmail: 'sarah.hanafy@el-sabea.com',
    actorRole: 'sarah_hanafy',
    targetPropertyCode: 'SEBA-RSL-701',
    targetBrokerName: 'أحمد فؤاد',
    targetClientName: 'م/ عمرو شريف',
    severity: 'info'
  },
  {
    id: 'gov_log_2',
    type: 'landlord_paused_unit',
    title: 'مالك عمل إيقاف فقط للوحدة',
    description: 'قام المالك م/ طارق المنشاوي (eng.tarek@gmail.com) بتجميد عرض الشقة SEBA-RSL-702 مؤقتاً لوجود مفاوضات عائلية.',
    timestamp: 'اليوم 03:15 م',
    timestampMs: Date.now() - 1000 * 60 * 180,
    actorName: 'م/ طارق المنشاوي',
    actorEmail: 'eng.tarek@gmail.com',
    actorRole: 'landlord',
    targetPropertyCode: 'SEBA-RSL-702',
    severity: 'warning'
  },
  {
    id: 'gov_log_3',
    type: 'sales_logged_activity',
    title: 'سيلز سجل نشاط متابعة جادة',
    description: 'سجل المستشار محمود فتحي مكالمة تفاوض واتفاق على ميعاد دفعة مقدمة مع العميل د/ إبراهيم يونس للشقة MOK-MID-104.',
    timestamp: 'اليوم 02:40 م',
    timestampMs: Date.now() - 1000 * 60 * 220,
    actorName: 'محمود فتحي',
    actorEmail: 'm.fathy@el-sabea.com',
    actorRole: 'sales',
    targetPropertyCode: 'MOK-MID-104',
    targetClientName: 'د/ إبراهيم يونس',
    severity: 'success'
  },
  {
    id: 'gov_log_4',
    type: 'sales_slacking_alert',
    title: 'تنبيه: سيلز متخاذل / خامل عن المتابعة',
    description: 'رصد النظام عدم تسجيل أي نشاط أو تحديث لحالات العملاء من السيلز زياد طارق لأكثر من 48 ساعة مع وجود 3 ليدات معلقة.',
    timestamp: 'اليوم 01:10 م',
    timestampMs: Date.now() - 1000 * 60 * 300,
    actorName: 'نظام الرقابة الآلي (System AI)',
    actorRole: 'system',
    targetSalesAgentName: 'زياد طارق',
    severity: 'urgent'
  },
  {
    id: 'gov_log_5',
    type: 'viewing_comment_pending',
    title: 'كومنت على معاينة ما نزلت (متأخر)',
    description: 'انقضى موعد معاينة الشقة H1705 للبروكر تامر الصاوي منذ ساعتين ونصف ولم يتم تسجيل التقرير الميداني أو كومنت العميل بعد.',
    timestamp: 'اليوم 11:30 ص',
    timestampMs: Date.now() - 1000 * 60 * 420,
    actorName: 'نظام حوكمة المعاينات',
    actorRole: 'system',
    targetPropertyCode: 'H1705',
    targetBrokerName: 'تامر الصاوي',
    severity: 'warning'
  },
  {
    id: 'gov_log_6',
    type: 'viewing_comment_published',
    title: 'تم تسجيل ونشر كومنت المعاينة الميدانية',
    description: 'سجل البروكر أحمد فؤاد تقرير المعاينة للشقة SEBA-RSL-701: (العميل مهتم جداً ومستعد لكتابة العقد إذا وافق المالك على تنزيل 50 ألف).',
    timestamp: 'أمس 07:20 م',
    timestampMs: Date.now() - 1000 * 60 * 1440,
    actorName: 'أحمد فؤاد',
    actorEmail: 'ahmed.fouad@el-sabea.com',
    actorRole: 'broker',
    targetPropertyCode: 'SEBA-RSL-701',
    severity: 'success'
  }
];

// ==========================================
// FIRESTORE SYNC: PORTAL USERS
// ==========================================

export async function fetchPortalUsersFromDb(): Promise<PortalUser[]> {
  try {
    const colRef = collection(db, 'portal_users');
    const snapshot = await getDocs(colRef);
    if (snapshot.empty) {
      return DEFAULT_PORTAL_USERS;
    }
    const users: PortalUser[] = [];
    snapshot.forEach(docSnap => {
      users.push(docSnap.data() as PortalUser);
    });
    return users;
  } catch (error) {
    console.warn('[PortalGovernance] Failed to fetch users from DB, fallback to local', error);
    try {
      const saved = localStorage.getItem('lion_portal_users');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_PORTAL_USERS;
  }
}

export function subscribeToPortalUsers(
  onUpdate: (users: PortalUser[]) => void,
  onError?: (error: Error) => void
): () => void {
  const colRef = collection(db, 'portal_users');
  return onSnapshot(
    colRef,
    (snapshot) => {
      if (snapshot.empty) {
        onUpdate(DEFAULT_PORTAL_USERS);
        return;
      }
      const users: PortalUser[] = [];
      snapshot.forEach(docSnap => {
        users.push(docSnap.data() as PortalUser);
      });
      onUpdate(users);
      try {
        localStorage.setItem('lion_portal_users', JSON.stringify(users));
      } catch {}
    },
    (error) => {
      console.warn('[PortalGovernance] Users subscription error, using fallback', error);
      if (onError) onError(error);
    }
  );
}

export async function savePortalUserToDb(user: PortalUser): Promise<void> {
  try {
    const userDoc = doc(db, 'portal_users', user.id);
    const sanitized = cleanFirestoreData(user);
    await setDoc(userDoc, sanitized, { merge: true });
  } catch (error) {
    console.error('[PortalGovernance] Error saving user to DB:', error);
  } finally {
    // Local storage fallback
    try {
      const saved = localStorage.getItem('lion_portal_users');
      const list: PortalUser[] = saved ? JSON.parse(saved) : DEFAULT_PORTAL_USERS;
      const index = list.findIndex(u => u.id === user.id);
      if (index >= 0) {
        list[index] = user;
      } else {
        list.push(user);
      }
      localStorage.setItem('lion_portal_users', JSON.stringify(list));
    } catch {}
  }
}

export async function deletePortalUserFromDb(userId: string): Promise<void> {
  try {
    const userDoc = doc(db, 'portal_users', userId);
    await deleteDoc(userDoc);
  } catch (error) {
    console.error('[PortalGovernance] Error deleting user:', error);
  } finally {
    try {
      const saved = localStorage.getItem('lion_portal_users');
      if (saved) {
        const list: PortalUser[] = JSON.parse(saved);
        const filtered = list.filter(u => u.id !== userId);
        localStorage.setItem('lion_portal_users', JSON.stringify(filtered));
      }
    } catch {}
  }
}

export async function seedPortalUsersToDb(initialUsers: PortalUser[] = DEFAULT_PORTAL_USERS): Promise<void> {
  try {
    const batch = writeBatch(db);
    for (const u of initialUsers) {
      const uDoc = doc(db, 'portal_users', u.id);
      batch.set(uDoc, cleanFirestoreData(u), { merge: true });
    }
    await batch.commit();
  } catch (err) {
    console.warn('[PortalGovernance] Could not seed portal users to DB:', err);
  }
}

// ==========================================
// FIRESTORE SYNC: GOVERNANCE AUDIT LOGS
// ==========================================

export async function fetchGovernanceLogsFromDb(): Promise<GovernanceAuditLog[]> {
  try {
    const colRef = collection(db, 'governance_audit_logs');
    const q = query(colRef, orderBy('timestampMs', 'desc'), limit(100));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return INITIAL_GOVERNANCE_LOGS;
    }
    const logs: GovernanceAuditLog[] = [];
    snapshot.forEach(docSnap => {
      logs.push(docSnap.data() as GovernanceAuditLog);
    });
    return logs;
  } catch (error) {
    console.warn('[PortalGovernance] Error fetching logs from DB, using fallback', error);
    try {
      const saved = localStorage.getItem('lion_governance_audit_logs');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_GOVERNANCE_LOGS;
  }
}

export function subscribeToGovernanceLogs(
  onUpdate: (logs: GovernanceAuditLog[]) => void,
  onError?: (error: Error) => void
): () => void {
  const colRef = collection(db, 'governance_audit_logs');
  const q = query(colRef, orderBy('timestampMs', 'desc'), limit(100));
  return onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        onUpdate(INITIAL_GOVERNANCE_LOGS);
        return;
      }
      const logs: GovernanceAuditLog[] = [];
      snapshot.forEach(docSnap => {
        logs.push(docSnap.data() as GovernanceAuditLog);
      });
      onUpdate(logs);
      try {
        localStorage.setItem('lion_governance_audit_logs', JSON.stringify(logs));
      } catch {}
    },
    (error) => {
      console.warn('[PortalGovernance] Logs subscription fallback', error);
      if (onError) onError(error);
    }
  );
}

export async function logGovernanceEvent(event: Omit<GovernanceAuditLog, 'id' | 'timestamp' | 'timestampMs'> & { timestamp?: string; timestampMs?: number }): Promise<GovernanceAuditLog> {
  const now = new Date();
  const timeFormatted = 'اليوم ' + now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  
  const fullLog: GovernanceAuditLog = {
    id: 'gov_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    timestamp: event.timestamp || timeFormatted,
    timestampMs: event.timestampMs || Date.now(),
    type: event.type,
    title: event.title,
    description: event.description,
    actorName: event.actorName,
    actorEmail: event.actorEmail,
    actorRole: event.actorRole,
    targetPropertyCode: event.targetPropertyCode,
    targetClientName: event.targetClientName,
    targetClientPhone: event.targetClientPhone,
    targetBrokerName: event.targetBrokerName,
    targetSalesAgentName: event.targetSalesAgentName,
    severity: event.severity || 'info',
    metadata: event.metadata,
    isResolved: false
  };

  try {
    const docRef = doc(db, 'governance_audit_logs', fullLog.id);
    await setDoc(docRef, cleanFirestoreData(fullLog));
  } catch (error) {
    console.warn('[PortalGovernance] Could not push log to Firestore:', error);
  } finally {
    // Local persistence
    try {
      const saved = localStorage.getItem('lion_governance_audit_logs');
      const list: GovernanceAuditLog[] = saved ? JSON.parse(saved) : INITIAL_GOVERNANCE_LOGS;
      list.unshift(fullLog);
      if (list.length > 200) list.pop();
      localStorage.setItem('lion_governance_audit_logs', JSON.stringify(list));
    } catch {}
  }

  return fullLog;
}

// ==========================================
// CONVENIENT LOGGING HELPERS
// ==========================================

// 1. إشعار لبروكر من سارة
export function logSarahNotifiedBrokerHelper(
  brokerName: string,
  propertyCode: string,
  clientName?: string,
  preferredTime?: string
) {
  return logGovernanceEvent({
    type: 'sarah_notified_broker',
    title: `إشعار لبروكر من سارة (${brokerName})`,
    description: `قامت سارة حنفي بتحويل طلب معاينة ميدانية فوري للبروكر [${brokerName}] للشقة [${propertyCode}] ${clientName ? `للعميل [${clientName}]` : ''} في موعد [${preferredTime || 'عاجل اليوم'}].`,
    actorName: 'سارة حنفي',
    actorEmail: 'sarah.hanafy@el-sabea.com',
    actorRole: 'sarah_hanafy',
    targetPropertyCode: propertyCode,
    targetBrokerName: brokerName,
    targetClientName: clientName,
    severity: 'info'
  });
}

// 2. مالك عمل إيقاف فقط
export function logLandlordPausedUnitHelper(
  landlordName: string,
  landlordEmail: string,
  propertyCode: string,
  isPaused: boolean,
  reason?: string
) {
  return logGovernanceEvent({
    type: isPaused ? 'landlord_paused_unit' : 'landlord_resumed_unit',
    title: isPaused ? `مالك عمل إيقاف فقط للوحدة [${propertyCode}]` : `مالك أعاد تنشيط الوحدة [${propertyCode}]`,
    description: isPaused 
      ? `قام المالك [${landlordName}] (${landlordEmail}) بتجميد عرض الوحدة [${propertyCode}] ووقف المعاينات مؤقتاً.${reason ? ` السبب: ${reason}` : ''}`
      : `قام المالك [${landlordName}] (${landlordEmail}) بإلغاء التجميد وإعادة إتاحة الوحدة [${propertyCode}] للعرض العام وجدولة المعاينات.`,
    actorName: landlordName,
    actorEmail: landlordEmail,
    actorRole: 'landlord',
    targetPropertyCode: propertyCode,
    severity: isPaused ? 'warning' : 'success'
  });
}

// 3. سيلز سجل نشاط أو عميل جديد
export function logSalesActivityHelper(
  agentName: string,
  agentEmail: string,
  activityTitle: string,
  clientName?: string,
  propertyCode?: string
) {
  return logGovernanceEvent({
    type: 'sales_logged_activity',
    title: `سيلز سجل نشاط: ${agentName}`,
    description: `سجل المستشار [${agentName}] حركة مبيعات جديدة: (${activityTitle})${clientName ? ` مع العميل [${clientName}]` : ''}${propertyCode ? ` للشقة [${propertyCode}]` : ''}.`,
    actorName: agentName,
    actorEmail: agentEmail,
    actorRole: 'sales',
    targetClientName: clientName,
    targetPropertyCode: propertyCode,
    targetSalesAgentName: agentName,
    severity: 'info'
  });
}

export function logSalesNewLeadHelper(
  agentName: string,
  agentEmail: string,
  clientName: string,
  clientPhone: string,
  propertyCode?: string
) {
  return logGovernanceEvent({
    type: 'sales_new_lead',
    title: `سيلز سجل عميل جديد: ${clientName}`,
    description: `قام المستشار [${agentName}] بتسجيل عميل جديد مهتم [${clientName}] (${clientPhone})${propertyCode ? ` بالشقة [${propertyCode}]` : ''} وإدخاله في الـ CRM.`,
    actorName: agentName,
    actorEmail: agentEmail,
    actorRole: 'sales',
    targetClientName: clientName,
    targetClientPhone: clientPhone,
    targetPropertyCode: propertyCode,
    targetSalesAgentName: agentName,
    severity: 'success'
  });
}

// 4. سيلز متخاذل / خامل
export function logSlackingSalesAlertHelper(
  agentName: string,
  agentEmail: string,
  pendingLeadsCount: number,
  hoursSinceLastActivity: number
) {
  return logGovernanceEvent({
    type: 'sales_slacking_alert',
    title: `رادار المتابعة: سيلز متخاذل (${agentName})`,
    description: `تنبيه حوكمة: المستشار [${agentName}] لم يسجل أي نشاط منذ أكثر من ${hoursSinceLastActivity} ساعة، ولديه (${pendingLeadsCount}) عملاء في انتظار المتابعة!`,
    actorName: 'نظام الرقابة والحوكمة',
    actorRole: 'system',
    targetSalesAgentName: agentName,
    severity: 'urgent',
    metadata: { pendingLeadsCount, hoursSinceLastActivity }
  });
}

// 5. كومنت على معاينة ما نزلت
export function logPendingViewingCommentHelper(
  brokerName: string,
  propertyCode: string,
  clientName?: string,
  hoursPassed: number = 2
) {
  return logGovernanceEvent({
    type: 'viewing_comment_pending',
    title: `تنبيه: كومنت على معاينة ما نزلت [${propertyCode}]`,
    description: `معاينة الشقة [${propertyCode}] المكلف بها البروكر [${brokerName}] انتهى موعدها منذ قرابة ${hoursPassed} ساعات ولم يقم البروكر بتسجيل الكومنت والتقرير الميداني بعد.`,
    actorName: 'نظام متابعة المعاينات',
    actorRole: 'system',
    targetPropertyCode: propertyCode,
    targetBrokerName: brokerName,
    targetClientName: clientName,
    severity: 'warning'
  });
}

// 6. كومنت معاينة نزل وسُجل
export function logViewingCommentPublishedHelper(
  brokerName: string,
  propertyCode: string,
  outcome: string,
  comment: string,
  clientName?: string
) {
  return logGovernanceEvent({
    type: 'viewing_comment_published',
    title: `تم تسجيل كومنت المعاينة الميدانية [${propertyCode}]`,
    description: `قام البروكر [${brokerName}] بتسجيل تقرير المعاينة رسميـاً: [${outcome}] - "${comment}". أصبح الكومنت متاحاً للمالك في بوابته وللسيلز في الـ CRM.`,
    actorName: brokerName,
    actorRole: 'broker',
    targetPropertyCode: propertyCode,
    targetBrokerName: brokerName,
    targetClientName: clientName,
    severity: 'success'
  });
}
