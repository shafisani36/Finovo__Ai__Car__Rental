export const API_ENDPOINTS = {
  // Authentication & Identity
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout',
    ME: '/auth/me',
    FORGOT_PASSWORD: '/auth/forgot-password',
    VERIFY_CODE: '/auth/verify-code',
    RESET_PASSWORD: '/auth/reset-password',
  },

  // Sessions & Devices
  SESSIONS: {
    LIST: '/sessions',
    REVOKE: (id: string) => `/sessions/${id}`,
    REVOKE_ALL_OTHERS: '/sessions/revoke-others',
    CLEAR_ALL: '/sessions',
  },

  // Fleet & Vehicles
  VEHICLES: {
    LIST: '/vehicles',
    METRICS: '/vehicles/metrics',
    DASHBOARD_STATS: '/vehicles/dashboard-stats',
    CATEGORIES: '/vehicles/categories',
    UPLOAD_IMAGES: '/vehicles/upload-images',
    CREATE: '/vehicles',
    BY_ID: (id: string) => `/vehicles/${id}`,
    UPDATE: (id: string) => `/vehicles/${id}`,
    DELETE: (id: string) => `/vehicles/${id}`,
    ARCHIVE: (id: string) => `/vehicles/${id}/archive`,
    RESTORE: (id: string) => `/vehicles/${id}/restore`,
    AVAILABILITY: (id: string) => `/vehicles/${id}/availability`,
    // Sub-resources
    DOCUMENTS: (id: string) => `/vehicles/${id}/documents`,
    DOCUMENT_BY_ID: (id: string, docId: string) => `/vehicles/${id}/documents/${docId}`,
    MAINTENANCE: (id: string) => `/vehicles/${id}/maintenance`,
    MAINTENANCE_BY_ID: (id: string, maintId: string) => `/vehicles/${id}/maintenance/${maintId}`,
    DAMAGE_REPORTS: (id: string) => `/vehicles/${id}/damage-reports`,
    DAMAGE_REPORT_BY_ID: (id: string, damageId: string) => `/vehicles/${id}/damage-reports/${damageId}`,
    ODOMETER_LOGS: (id: string) => `/vehicles/${id}/odometer-logs`,
    LOCATIONS: (id: string) => `/vehicles/${id}/locations`,
    PRICING: (id: string) => `/vehicles/${id}/pricing`,
    PRICING_BY_ID: (id: string, tierId: string) => `/vehicles/${id}/pricing/${tierId}`,
    AUDIT_LOGS: (id: string) => `/vehicles/${id}/audit-logs`,
    BOOKINGS: (id: string) => `/vehicles/${id}/bookings`,
  },

  // Bookings & Quotes
  BOOKINGS: {
    LIST: '/bookings',
    BY_ID: (id: string) => `/bookings/${id}`,
    CREATE: '/bookings',
    UPDATE_STATUS: (id: string) => `/bookings/${id}/status`,
    QUOTE: '/bookings/quote',
    AVAILABILITY: '/bookings/availability',
    CALENDAR: '/bookings/calendar',
  },

  // Rentals Lifecycle (Handover / Return / Settlement)
  RENTALS: {
    LIST: '/rentals',
    BY_ID: (id: string) => `/rentals/${id}`,
    HANDOVER: '/rentals/handover',
    PREVIEW_SETTLEMENT: '/rentals/preview-settlement',
    RETURN: '/rentals/return',
  },

  // Inspections & AI Computer Vision
  INSPECTIONS: {
    LIST: '/inspections',
    BY_ID: (id: string) => `/inspections/${id}`,
    ANALYZE: '/inspections/analyze',
    REVIEW_FINDING: (findingId: string) => `/inspections/findings/${findingId}/review`,
  },

  // Customer Management
  CUSTOMERS: {
    LIST: '/customers',
    BY_ID: (id: string) => `/customers/${id}`,
    VERIFY: (id: string) => `/customers/${id}/verify`,
  },

  // Branches
  BRANCHES: {
    LIST: '/branches',
    BY_ID: (id: string) => `/branches/${id}`,
    CREATE: '/branches',
  },

  // Dashboard Aggregates
  DASHBOARD: {
    OVERVIEW: '/dashboard/overview',
  },

  // Public Inquiries
  INQUIRIES: {
    SUBMIT: '/inquiries',
  },

  // Admin Operations
  ADMIN: {
    USERS: '/admin/users',
    USER_BY_ID: (id: string) => `/admin/users/${id}`,
    AUDIT_LOGS: '/admin/audit-logs',
    INQUIRIES: '/admin/inquiries',
    INQUIRY_BY_ID: (id: string) => `/admin/inquiries/${id}`,
    INQUIRY_STATUS: (id: string) => `/admin/inquiries/${id}/status`,
    INQUIRY_REPLY: (id: string) => `/admin/inquiries/${id}/reply`,
  },
} as const;
