import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../../features/auth/context/AuthContext';
import { GuestRoute } from '../../features/auth/guards/GuestRoute';
import {
  RoleMiddlewareRoute,
  RoleBasedDashboardRedirect,
} from '../../features/auth/guards/RoleMiddlewareRoute';
import { RootLayout } from '../layouts/RootLayout';
import { AdminLayout } from '../layouts/AdminLayout';
import { HomePage } from '../../features/home/HomePage';
import { AvailableCarsPage } from '../../pages/customer/AvailableCarsPage';
import { CarDetailsPage } from '../../pages/customer/CarDetailsPage';
import { InsurancePage } from '../../pages/customer/InsurancePage';
import { AboutUsPage } from '../../pages/customer/AboutUsPage';
import { AiInspectionPage } from '../../pages/customer/AiInspectionPage';
import { ContactUsPage } from '../../pages/customer/ContactUsPage';
import { LoginPage } from '../../features/auth/pages/LoginPage';
import { RegisterPage } from '../../features/auth/pages/RegisterPage';
import { ForgotPasswordPage } from '../../features/auth/pages/ForgotPasswordPage';
import { VerifyCodePage } from '../../features/auth/pages/VerifyCodePage';
import { ResetPasswordPage } from '../../features/auth/pages/ResetPasswordPage';
import { CustomerLayout } from '../layouts/CustomerLayout';
import { CustomerDashboardOverviewPage } from '../../features/customers/pages/CustomerDashboardOverviewPage';
import { CustomerCarsPage } from '../../features/customers/pages/CustomerCarsPage';
import { CustomerVehicleDetailPage } from '../../features/customers/pages/CustomerVehicleDetailPage';
import { CustomerCheckoutPage } from '../../features/customers/pages/CustomerCheckoutPage';
import { CustomerBookingsPage } from '../../features/customers/pages/CustomerBookingsPage';
import { CustomerBookingDetailPage } from '../../features/customers/pages/CustomerBookingDetailPage';
import { CustomerInspectionPage } from '../../features/customers/pages/CustomerInspectionPage';
import { CustomerPaymentsPage } from '../../features/customers/pages/CustomerPaymentsPage';
import { CustomerProfilePage } from '../../features/customers/pages/CustomerProfilePage';
import { CustomerDocumentsPage } from '../../features/customers/pages/CustomerDocumentsPage';
import { CustomerNotificationsPage } from '../../features/customers/pages/CustomerNotificationsPage';
import { CustomerSupportPage } from '../../features/customers/pages/CustomerSupportPage';
import { CustomerAssistantPage } from '../../features/customers/pages/CustomerAssistantPage';
import { CustomerRewardsPage } from '../../features/customers/pages/CustomerRewardsPage';
import { CustomerLocationsPage } from '../../features/customers/pages/CustomerLocationsPage';
import { CustomerHistoryPage } from '../../features/customers/pages/CustomerHistoryPage';
import { UnauthorizedPage } from '../../features/auth/pages/UnauthorizedPage';
import { NotFoundPage } from '../../pages/NotFoundPage';

// Fleet & Vehicle Management Pages (Matching Figma Screens)
import { AdminDashboardPage } from '../../features/dashboard/pages/AdminDashboardPage';
import { CarsDirectoryPage } from '../../features/fleet/pages/CarsDirectoryPage';
import { CarDetailPage } from '../../features/fleet/pages/CarDetailPage';
import { AddCarPage } from '../../features/fleet/pages/AddCarPage';
import { EditCarPage } from '../../features/fleet/pages/EditCarPage';
import { BrandsManagementPage } from '../../features/fleet/pages/BrandsManagementPage';
import { ModelsManagementPage } from '../../features/fleet/pages/ModelsManagementPage';
import { CategoriesManagementPage } from '../../features/fleet/pages/CategoriesManagementPage';

// Bookings & Calendar
import { BookingsListPage } from '../../features/bookings/pages/BookingsListPage';
import { CreateBookingPage } from '../../features/bookings/pages/CreateBookingPage';
import { BookingCalendarPage } from '../../features/bookings/pages/BookingCalendarPage';

// Rental Operations
import { RentalsListPage } from '../../features/rentals/pages/RentalsListPage';
import { HandoverVehiclePage } from '../../features/rentals/pages/HandoverVehiclePage';
import { ReturnVehiclePage } from '../../features/rentals/pages/ReturnVehiclePage';

// AI Computer Vision Inspections
import { InspectionsListPage } from '../../features/inspections/pages/InspectionsListPage';
import { NewInspectionPage } from '../../features/inspections/pages/NewInspectionPage';
import { InspectionDetailPage } from '../../features/inspections/pages/InspectionDetailPage';

// Staff, Administration, Branches, & Audit Trail
import { EmployeesListPage } from '../../features/employees/pages/EmployeesListPage';
import { BranchesListPage } from '../../features/branches/pages/BranchesListPage';
import { AuditLogsPage } from '../../features/audit-logs/pages/AuditLogsPage';
import { InquiriesListPage } from '../../features/inquiries/pages/InquiriesListPage';
import { UsersManagementPage } from '../../features/users/pages/UsersManagementPage';

export function AppRouter() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Main Website Layout */}
          <Route path="/" element={<RootLayout />}>
            <Route index element={<HomePage />} />
            <Route path="cars" element={<AvailableCarsPage />} />
            <Route path="cars/:id" element={<CarDetailsPage />} />
            <Route path="insurance" element={<InsurancePage />} />
            <Route path="about" element={<AboutUsPage />} />
            <Route path="ai-inspection" element={<AiInspectionPage />} />
            <Route path="contact" element={<ContactUsPage />} />
          </Route>

          {/* Guest Only Auth Routes */}
          <Route
            path="/login"
            element={
              <GuestRoute>
                <LoginPage />
              </GuestRoute>
            }
          />
          <Route
            path="/register"
            element={
              <GuestRoute>
                <RegisterPage />
              </GuestRoute>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <GuestRoute>
                <ForgotPasswordPage />
              </GuestRoute>
            }
          />
          <Route
            path="/verify-code"
            element={
              <GuestRoute>
                <VerifyCodePage />
              </GuestRoute>
            }
          />
          <Route
            path="/reset-password"
            element={
              <GuestRoute>
                <ResetPasswordPage />
              </GuestRoute>
            }
          />

          {/* Automatic Role-Based Dashboard Redirection (Resolves /dashboard to role-specific portal) */}
          <Route path="/dashboard" element={<RoleBasedDashboardRedirect />} />

          {/* Customer Portal (Direct Route: /customer/dashboard) */}
          <Route
            path="/customer"
            element={
              <RoleMiddlewareRoute allowedSection="customer">
                <CustomerLayout />
              </RoleMiddlewareRoute>
            }
          >
            <Route index element={<Navigate to="/customer/dashboard" replace />} />
            <Route path="dashboard" element={<CustomerDashboardOverviewPage />} />
            <Route path="cars" element={<CustomerCarsPage />} />
            <Route path="cars/:vehicleId" element={<CustomerVehicleDetailPage />} />
            <Route path="bookings" element={<CustomerBookingsPage />} />
            <Route path="bookings/new" element={<CustomerCheckoutPage />} />
            <Route path="bookings/:bookingId" element={<CustomerBookingDetailPage />} />
            <Route path="bookings/:bookingId/inspection" element={<CustomerInspectionPage />} />
            <Route path="payments" element={<CustomerPaymentsPage />} />
            <Route path="profile" element={<CustomerProfilePage />} />
            <Route path="settings" element={<CustomerProfilePage />} />
            <Route path="documents" element={<CustomerDocumentsPage />} />
            <Route path="notifications" element={<CustomerNotificationsPage />} />
            <Route path="support" element={<CustomerSupportPage />} />
            <Route path="assistant" element={<CustomerAssistantPage />} />
            <Route path="rewards" element={<CustomerRewardsPage />} />
            <Route path="locations" element={<CustomerLocationsPage />} />
            <Route path="history" element={<CustomerHistoryPage />} />
          </Route>

          {/* Admin Platform & Operations (Direct Route: /admin/dashboard with Role Guard) */}
          <Route
            path="/admin"
            element={
              <RoleMiddlewareRoute allowedSection="admin">
                <AdminLayout />
              </RoleMiddlewareRoute>
            }
          >
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboardPage />} />

            {/* Fleet */}
            <Route path="cars" element={<CarsDirectoryPage />} />
            <Route path="cars/new" element={<AddCarPage />} />
            <Route path="cars/:id" element={<CarDetailPage />} />
            <Route path="cars/:id/edit" element={<EditCarPage />} />
            <Route path="brands" element={<BrandsManagementPage />} />
            <Route path="models" element={<ModelsManagementPage />} />
            <Route path="categories" element={<CategoriesManagementPage />} />

            {/* Bookings & Calendar */}
            <Route path="bookings" element={<BookingsListPage />} />
            <Route path="bookings/new" element={<CreateBookingPage />} />
            <Route path="calendar" element={<BookingCalendarPage />} />

            {/* Rental Operations */}
            <Route path="rentals" element={<RentalsListPage />} />
            <Route path="rentals/handover/:bookingId" element={<HandoverVehiclePage />} />
            <Route path="rentals/return/:rentalId" element={<ReturnVehiclePage />} />

            {/* AI Computer Vision Damage Inspection */}
            <Route path="inspections" element={<InspectionsListPage />} />
            <Route path="inspections/new" element={<NewInspectionPage />} />
            <Route path="inspections/:id" element={<InspectionDetailPage />} />

            {/* Administration & Directory */}
            <Route path="inquiries" element={<InquiriesListPage />} />
            <Route path="users" element={<UsersManagementPage />} />
            <Route path="employees" element={<EmployeesListPage />} />
            <Route path="branches" element={<BranchesListPage />} />
            <Route path="audit-logs" element={<AuditLogsPage />} />
          </Route>

          {/* Security & Fallback Pages */}
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
