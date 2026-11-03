import { authClient } from '../../auth/api/authClient';

export interface CustomerProfile {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
  driverLicenseNumber?: string | null;
  isLicenseVerified: boolean;
  licenseExpiryDate?: string | null;
  preferredLanguage?: string;
}

export interface CustomerPortalStats {
  totalBookings: number;
  activeBookings: number;
  pendingBalanceTotal: number;
  rewardPoints: number;
  unreadNotificationsCount: number;
}

export interface ActionAlert {
  id: string;
  type: 'WARNING' | 'INFO' | 'SUCCESS';
  title: string;
  message: string;
  actionLabel: string;
  actionUrl: string;
}

export interface VehicleSummary {
  id: string;
  brand: string;
  model: string;
  year: number;
  transmission: string;
  fuelType: string;
  seats: number;
  categoryName: string;
  primaryImageUrl?: string | null;
}

export interface BranchInfo {
  id: string;
  name: string;
  code: string;
  address?: string | null;
  city: string;
  phone?: string | null;
  email?: string | null;
  openingHours?: string | null;
}

export interface CustomerBookingItem {
  id: string;
  bookingNumber: string;
  status: string;
  pricingMethod: string;
  dailyRate: number;
  totalDays: number;
  subtotal: number;
  taxAmount: number;
  depositAmount: number;
  totalAmount: number;
  currency: string;
  pickupDateTime: string;
  returnDateTime: string;
  pickupBranch: BranchInfo;
  returnBranch: BranchInfo;
  vehicle: VehicleSummary;
  hasRentalStarted: boolean;
  createdAt: string;
}

export interface CustomerBookingDetail extends CustomerBookingItem {
  notes?: string | null;
  breakdownItems: Array<{
    id: string;
    lineType: string;
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    taxAmount: number;
  }>;
  payments: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    provider: string;
    receiptUrl?: string | null;
    createdAt: string;
  }>;
  inspections: Array<{
    id: string;
    type: 'PICKUP' | 'RETURN' | 'ROUTINE';
    overallScore?: number | null;
    summary?: string | null;
    hasDamageDetected: boolean;
    createdAt: string;
    photos: Array<{ id: string; view: string; imageUrl: string }>;
    findings: Array<{
      id: string;
      damageType: string;
      severity: string;
      location: string;
      confidence: number;
      estimatedRepairCost: number;
      boundingBox?: string | null;
    }>;
  }>;
}

export interface PortalOverviewResponse {
  success: boolean;
  customer: CustomerProfile;
  stats: CustomerPortalStats;
  activeRental?: {
    id: string;
    pickedUpAt: string;
    startMileage: number;
    vehicle: VehicleSummary;
    booking: {
      id: string;
      bookingNumber: string;
      pickupBranch: BranchInfo;
      returnBranch: BranchInfo;
      returnDateTime: string;
    };
  } | null;
  nextUpcomingBooking?: CustomerBookingItem | null;
  upcomingBookings: CustomerBookingItem[];
  recentCompletedBookings: Array<{
    id: string;
    bookingNumber: string;
    status: string;
    totalAmount: number;
    returnDateTime: string;
    vehicle: { brand: string; model: string; primaryImageUrl?: string | null };
  }>;
  actionAlerts: ActionAlert[];
}

export interface CustomerDocumentItem {
  id: string;
  documentType: string;
  title: string;
  documentNumber?: string | null;
  fileUrl: string;
  fileName?: string | null;
  fileSize?: number | null;
  verificationStatus: 'PENDING_VERIFICATION' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';
  rejectionReason?: string | null;
  issuedAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
}

export interface DocumentChecklistItem {
  type: string;
  label: string;
  isUploaded: boolean;
  status: string;
  document: CustomerDocumentItem | null;
}

export interface CustomerPaymentSummary {
  summary: {
    totalPaid: number;
    totalOutstanding: number;
    securityDepositsHeld: number;
    currency: string;
  };
  transactions: Array<{
    id: string;
    bookingId: string;
    bookingNumber: string;
    amount: number;
    currency: string;
    status: string;
    provider: string;
    receiptUrl?: string | null;
    createdAt: string;
  }>;
  invoices: Array<{
    id: string;
    bookingId: string;
    bookingNumber: string;
    vehicleName: string;
    date: string;
    subtotal: number;
    taxAmount: number;
    totalAmount: number;
    paidAmount: number;
    balanceDue: number;
    status: 'PAID' | 'PARTIAL' | 'UNPAID';
  }>;
}

export interface CustomerNotificationItem {
  id: string;
  category: 'BOOKING' | 'PAYMENT' | 'INSPECTION' | 'DOCUMENT' | 'SYSTEM';
  title: string;
  message: string;
  actionUrl?: string | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
}

export interface SupportTicketItem {
  id: string;
  ticketNumber: string;
  bookingId?: string | null;
  subject: string;
  category: string;
  priority: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
  messages: Array<{
    id: string;
    senderType: 'CUSTOMER' | 'SUPPORT_AGENT' | 'SYSTEM';
    senderName: string;
    message: string;
    attachmentUrl?: string | null;
    createdAt: string;
  }>;
}

export interface RewardsSummary {
  tier: string;
  nextTier: string;
  progressPercent: number;
  pointsBalance: number;
  totalSpent: number;
  referralCode: string;
  referralBonusPoints: number;
  vouchers: Array<{
    code: string;
    discount: string;
    description: string;
    validUntil: string;
    isAvailable: boolean;
  }>;
}

export interface RentalHistoryItem {
  id: string;
  bookingNumber: string;
  pickupDate: string;
  returnDate: string;
  vehicle: {
    id: string;
    name: string;
    year: number;
    category: string;
    image?: string | null;
  };
  totalAmount: number;
  currency: string;
  odometerStart: number;
  odometerEnd: number;
  invoiceUrl: string;
  review?: {
    id: string;
    rating: number;
    comment?: string | null;
    createdAt: string;
  } | null;
}

export const customerPortalApi = {
  // 1. Overview
  async getOverview(): Promise<PortalOverviewResponse> {
    return authClient.request<PortalOverviewResponse>('/customers/portal/overview');
  },

  // 2. Bookings
  async listBookings(params?: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    success: boolean;
    bookings: CustomerBookingItem[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const q = new URLSearchParams();
    if (params?.status) q.append('status', params.status);
    if (params?.search) q.append('search', params.search);
    if (params?.page) q.append('page', String(params.page));
    if (params?.limit) q.append('limit', String(params.limit));
    const qs = q.toString() ? `?${q.toString()}` : '';
    return authClient.request(`/customers/portal/bookings${qs}`);
  },

  async getBookingById(id: string): Promise<{ success: boolean; booking: CustomerBookingDetail }> {
    return authClient.request(`/customers/portal/bookings/${id}`);
  },

  async cancelBooking(id: string, reason?: string): Promise<{ success: boolean; message: string }> {
    return authClient.request(`/customers/portal/bookings/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  async extendBooking(
    id: string,
    newReturnDateTime: string
  ): Promise<{ success: boolean; additionalCost: number }> {
    return authClient.request(`/customers/portal/bookings/${id}/extend`, {
      method: 'POST',
      body: JSON.stringify({ newReturnDateTime }),
    });
  },

  // 3. Payments & Invoices
  async getPaymentsSummary(): Promise<{ success: boolean } & CustomerPaymentSummary> {
    return authClient.request('/customers/portal/payments');
  },

  async processPayment(payload: {
    bookingId: string;
    amount: number;
    paymentMethod: string;
    cardNumberLast4?: string;
    cardBrand?: string;
    type?: string;
  }): Promise<{ success: boolean; payment: unknown }> {
    return authClient.request('/customers/portal/payments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // 4. Documents
  async listDocuments(): Promise<{
    success: boolean;
    documents: CustomerDocumentItem[];
    checklist: DocumentChecklistItem[];
  }> {
    return authClient.request('/customers/portal/documents');
  },

  async uploadDocument(payload: {
    documentType: string;
    title: string;
    documentNumber?: string;
    fileBase64?: string;
    fileName?: string;
    fileSize?: number;
    expiresAt?: string;
  }): Promise<{ success: boolean; document: CustomerDocumentItem }> {
    return authClient.request('/customers/portal/documents', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // 5. Profile & Settings
  async updateProfile(payload: {
    fullName?: string;
    phone?: string;
    driverLicenseNumber?: string;
    licenseExpiryDate?: string;
    preferredLanguage?: string;
    avatarUrl?: string;
  }): Promise<{ success: boolean; user: unknown; customer: CustomerProfile }> {
    return authClient.request('/customers/portal/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  // 6. Notifications
  async listNotifications(): Promise<{
    success: boolean;
    notifications: CustomerNotificationItem[];
    unreadCount: number;
  }> {
    return authClient.request('/customers/portal/notifications');
  },

  async markNotificationRead(id: string): Promise<{ success: boolean }> {
    return authClient.request(`/customers/portal/notifications/${id}/read`, {
      method: 'PATCH',
    });
  },

  async markAllNotificationsRead(): Promise<{ success: boolean }> {
    return authClient.request('/customers/portal/notifications/read-all', {
      method: 'PATCH',
    });
  },

  // 7. Support Tickets
  async listSupportTickets(): Promise<{ success: boolean; tickets: SupportTicketItem[] }> {
    return authClient.request('/customers/portal/support');
  },

  async createSupportTicket(payload: {
    subject: string;
    category: string;
    priority?: string;
    bookingId?: string;
    message: string;
  }): Promise<{ success: boolean; ticket: SupportTicketItem }> {
    return authClient.request('/customers/portal/support', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async replySupportTicket(
    ticketId: string,
    message: string
  ): Promise<{ success: boolean; message: unknown }> {
    return authClient.request(`/customers/portal/support/${ticketId}/reply`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  },

  // 8. AI Assistant
  async askAiAssistant(prompt: string): Promise<{
    success: boolean;
    reply: string;
    suggestedVehicles: Array<{
      id: string;
      name: string;
      category: string;
      price: number;
      image?: string | null;
    }>;
  }> {
    return authClient.request('/customers/portal/ai-assistant', {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    });
  },

  // 9. Rewards
  async getRewards(): Promise<{ success: boolean } & RewardsSummary> {
    return authClient.request('/customers/portal/rewards');
  },

  // 10. Rental History & Reviews
  async getRentalHistory(): Promise<{ success: boolean; history: RentalHistoryItem[] }> {
    return authClient.request('/customers/portal/history');
  },

  async submitReview(payload: {
    bookingId: string;
    vehicleId: string;
    rating: number;
    comment?: string;
  }): Promise<{ success: boolean; review: unknown }> {
    return authClient.request('/customers/portal/reviews', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
