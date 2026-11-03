import { authClient } from '../../auth/api/authClient';

export interface DashboardOverviewResponse {
  timestamp: string;
  fleet: {
    total: number;
    available: number;
    rented: number;
    maintenance: number;
    reserved: number;
    utilizationRate: number;
  };
  operations: {
    todaysPickups: number;
    todaysReturns: number;
    upcomingBookings: number;
    activeRentals: number;
    overdueRentals: number;
  };
  financials: {
    totalRevenue: number;
    monthlyRevenue: number;
    averageDailyRate: number;
    currency: string;
  };
  inspections: {
    total: number;
    damaged: number;
    pendingReviewFindings: Array<{
      id: string;
      damageType: string;
      severity: string;
      location: string;
      confidence: number;
      isHumanVerified: boolean;
      humanDecision: string;
      createdAt: string;
      vehicle: {
        id: string;
        name: string;
        registration: string;
        image: string | null;
      };
    }>;
  };
  categories: Array<{
    id: string;
    name: string;
    slug: string;
    baseRate: number;
    totalVehicles: number;
    available: number;
    rented: number;
    maintenance: number;
  }>;
  branches: Array<{
    id: string;
    name: string;
    code: string;
    city: string;
    totalVehicles: number;
    activeRented: number;
  }>;
  recentBookings: Array<{
    id: string;
    bookingNumber: string;
    customerName: string;
    customerEmail: string;
    vehicleName: string;
    vehicleCategory: string;
    vehicleImage: string | null;
    pickupDateTime: string;
    returnDateTime: string;
    pickupBranch: string;
    status: 'PENDING' | 'CONFIRMED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'REJECTED';
    totalAmount: number;
    dailyRate: number;
    currency: string;
  }>;
  recentActivity: Array<{
    id: string;
    event: string;
    user: string;
    metadata: Record<string, unknown> | null;
    timestamp: string;
  }>;
}

export const dashboardApi = {
  getOverview: async (): Promise<DashboardOverviewResponse> => {
    const res = await authClient.request<{ success: boolean; data: DashboardOverviewResponse }>(
      '/dashboard/overview'
    );
    return res.data;
  },
};
