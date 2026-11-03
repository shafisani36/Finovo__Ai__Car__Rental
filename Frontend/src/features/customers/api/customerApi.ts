import { authClient } from '../../auth/api/authClient';

export interface CustomerBookingSummary {
  id: string;
  bookingNumber: string;
  status: string;
  totalAmount: number;
  pickupDateTime: string;
  returnDateTime: string;
  vehicle: {
    brand: string;
    model: string;
  };
}

export interface Customer {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  driverLicenseNumber?: string;
  isLicenseVerified: boolean;
  licenseExpiryDate?: string;
  totalBookings: number;
  recentBookings: CustomerBookingSummary[];
  createdAt: string;
}

export const customerApi = {
  async getCustomers(search?: string): Promise<{ success: boolean; customers: Customer[] }> {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return authClient.request<{ success: boolean; customers: Customer[] }>(`/customers${query}`);
  },

  async getCustomerById(id: string): Promise<{ success: boolean; customer: Customer }> {
    return authClient.request<{ success: boolean; customer: Customer }>(`/customers/${id}`);
  },

  async updateVerification(id: string, isLicenseVerified: boolean): Promise<{ success: boolean; customer: Customer }> {
    return authClient.request<{ success: boolean; customer: Customer }>(`/customers/${id}/verify`, {
      method: 'PATCH',
      body: JSON.stringify({ isLicenseVerified }),
    });
  },
};
