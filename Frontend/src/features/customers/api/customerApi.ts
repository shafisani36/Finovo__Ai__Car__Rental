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

export interface CreateCustomerPayload {
  fullName: string;
  email: string;
  phone?: string;
  driverLicenseNumber?: string;
  licenseExpiryDate?: string;
  isLicenseVerified?: boolean;
}

export interface UpdateCustomerPayload {
  fullName?: string;
  email?: string;
  phone?: string;
  driverLicenseNumber?: string;
  licenseExpiryDate?: string;
  isLicenseVerified?: boolean;
}

export const customerApi = {
  async getCustomers(search?: string): Promise<{ success: boolean; customers: Customer[] }> {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return authClient.request<{ success: boolean; customers: Customer[] }>(`/customers${query}`);
  },

  async getCustomerById(id: string): Promise<{ success: boolean; customer: Customer }> {
    return authClient.request<{ success: boolean; customer: Customer }>(`/customers/${id}`);
  },

  async createCustomer(payload: CreateCustomerPayload): Promise<{ success: boolean; customer: Customer }> {
    return authClient.request<{ success: boolean; customer: Customer }>('/customers', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateCustomer(id: string, payload: UpdateCustomerPayload): Promise<{ success: boolean; customer: Customer }> {
    return authClient.request<{ success: boolean; customer: Customer }>(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async deleteCustomer(id: string): Promise<{ success: boolean; message: string }> {
    return authClient.request<{ success: boolean; message: string }>(`/customers/${id}`, {
      method: 'DELETE',
    });
  },

  async updateVerification(id: string, isLicenseVerified: boolean): Promise<{ success: boolean; customer: Customer }> {
    return authClient.request<{ success: boolean; customer: Customer }>(`/customers/${id}/verify`, {
      method: 'PATCH',
      body: JSON.stringify({ isLicenseVerified }),
    });
  },
};
