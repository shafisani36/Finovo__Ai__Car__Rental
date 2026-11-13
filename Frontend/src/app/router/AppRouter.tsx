import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../../features/auth/context/AuthContext';
import { GuestRoute } from '../../features/auth/guards/GuestRoute';
import {
  RoleMiddlewareRoute,
  RoleBasedDashboardRedirect,
} from '../../features/auth/guards/RoleMiddlewareRoute';
import { RootLayout } from '../layouts/RootLayout';
import { HomePage } from '../../features/home/HomePage';

// Fleet & Vehicle Management Pages (Matching Figma Screens)

// Bookings & Calendar

// Rental Operations

// AI Computer Vision Inspections

// Staff, Administration, Branches, & Audit Trail

import { LoadingState } from '../../components/common/LoadingState';
import { CanonicalUrlManager } from '../../components/seo/CanonicalUrlManager';
import { ScrollToTop } from '../../components/navigation/ScrollToTop';

// Pages are loaded on demand so the first visit only downloads the code it needs
const CustomerLayout = lazy(() => import('../layouts/CustomerLayout').then((module) => ({ default: module.CustomerLayout })));
const AdminLayout = lazy(() => import('../layouts/AdminLayout').then((module) => ({ default: module.AdminLayout })));
const AvailableCarsPage = lazy(() => import('../../pages/customer/AvailableCarsPage').then((module) => ({ default: module.AvailableCarsPage })));
const CarDetailsPage = lazy(() => import('../../pages/customer/CarDetailsPage').then((module) => ({ default: module.CarDetailsPage })));
const InsurancePage = lazy(() => import('../../pages/customer/InsurancePage').then((module) => ({ default: module.InsurancePage })));
const AboutUsPage = lazy(() => import('../../pages/customer/AboutUsPage').then((module) => ({ default: module.AboutUsPage })));
const AiInspectionPage = lazy(() => import('../../pages/customer/AiInspectionPage').then((module) => ({ default: module.AiInspectionPage })));
const ContactUsPage = lazy(() => import('../../pages/customer/ContactUsPage').then((module) => ({ default: module.ContactUsPage })));
const LegalPage = lazy(() => import('../../pages/customer/LegalPage').then((module) => ({ default: module.LegalPage })));
const CompareCarsPage = lazy(() => import('../../pages/customer/CompareCarsPage').then((module) => ({ default: module.CompareCarsPage })));
const LoginPage = lazy(() => import('../../features/auth/pages/LoginPage').then((module) => ({ default: module.LoginPage })));
const RegisterPage = lazy(() => import('../../features/auth/pages/RegisterPage').then((module) => ({ default: module.RegisterPage })));
const ForgotPasswordPage = lazy(() => import('../../features/auth/pages/ForgotPasswordPage').then((module) => ({ default: module.ForgotPasswordPage })));
const VerifyCodePage = lazy(() => import('../../features/auth/pages/VerifyCodePage').then((module) => ({ default: module.VerifyCodePage })));
const VerifyEmailPage = lazy(() => import('../../features/auth/pages/VerifyEmailPage').then((module) => ({ default: module.VerifyEmailPage })));
const ResetPasswordPage = lazy(() => import('../../features/auth/pages/ResetPasswordPage').then((module) => ({ default: module.ResetPasswordPage })));
const CustomerDashboardOverviewPage = lazy(() => import('../../features/customers/pages/CustomerDashboardOverviewPage').then((module) => ({ default: module.CustomerDashboardOverviewPage })));
const CustomerCarsPage = lazy(() => import('../../features/customers/pages/CustomerCarsPage').then((module) => ({ default: module.CustomerCarsPage })));
const CustomerVehicleDetailPage = lazy(() => import('../../features/customers/pages/CustomerVehicleDetailPage').then((module) => ({ default: module.CustomerVehicleDetailPage })));
const CustomerCheckoutPage = lazy(() => import('../../features/customers/pages/CustomerCheckoutPage').then((module) => ({ default: module.CustomerCheckoutPage })));
const CustomerBookingsPage = lazy(() => import('../../features/customers/pages/CustomerBookingsPage').then((module) => ({ default: module.CustomerBookingsPage })));
const CustomerBookingDetailPage = lazy(() => import('../../features/customers/pages/CustomerBookingDetailPage').then((module) => ({ default: module.CustomerBookingDetailPage })));
const CustomerInspectionPage = lazy(() => import('../../features/customers/pages/CustomerInspectionPage').then((module) => ({ default: module.CustomerInspectionPage })));
const CustomerPaymentsPage = lazy(() => import('../../features/customers/pages/CustomerPaymentsPage').then((module) => ({ default: module.CustomerPaymentsPage })));
const CustomerProfilePage = lazy(() => import('../../features/customers/pages/CustomerProfilePage').then((module) => ({ default: module.CustomerProfilePage })));
const CustomerDocumentsPage = lazy(() => import('../../features/customers/pages/CustomerDocumentsPage').then((module) => ({ default: module.CustomerDocumentsPage })));
const CustomerNotificationsPage = lazy(() => import('../../features/customers/pages/CustomerNotificationsPage').then((module) => ({ default: module.CustomerNotificationsPage })));
const CustomerSupportPage = lazy(() => import('../../features/customers/pages/CustomerSupportPage').then((module) => ({ default: module.CustomerSupportPage })));
const CustomerAssistantPage = lazy(() => import('../../features/customers/pages/CustomerAssistantPage').then((module) => ({ default: module.CustomerAssistantPage })));
const CustomerRewardsPage = lazy(() => import('../../features/customers/pages/CustomerRewardsPage').then((module) => ({ default: module.CustomerRewardsPage })));
const CustomerLocationsPage = lazy(() => import('../../features/customers/pages/CustomerLocationsPage').then((module) => ({ default: module.CustomerLocationsPage })));
const CustomerHistoryPage = lazy(() => import('../../features/customers/pages/CustomerHistoryPage').then((module) => ({ default: module.CustomerHistoryPage })));
const UnauthorizedPage = lazy(() => import('../../features/auth/pages/UnauthorizedPage').then((module) => ({ default: module.UnauthorizedPage })));
const NotFoundPage = lazy(() => import('../../pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })));
const AdminDashboardPage = lazy(() => import('../../features/dashboard/pages/AdminDashboardPage').then((module) => ({ default: module.AdminDashboardPage })));
const CarsDirectoryPage = lazy(() => import('../../features/fleet/pages/CarsDirectoryPage').then((module) => ({ default: module.CarsDirectoryPage })));
const CarDetailPage = lazy(() => import('../../features/fleet/pages/CarDetailPage').then((module) => ({ default: module.CarDetailPage })));
const AddCarPage = lazy(() => import('../../features/fleet/pages/AddCarPage').then((module) => ({ default: module.AddCarPage })));
const EditCarPage = lazy(() => import('../../features/fleet/pages/EditCarPage').then((module) => ({ default: module.EditCarPage })));
const BrandsManagementPage = lazy(() => import('../../features/fleet/pages/BrandsManagementPage').then((module) => ({ default: module.BrandsManagementPage })));
const ModelsManagementPage = lazy(() => import('../../features/fleet/pages/ModelsManagementPage').then((module) => ({ default: module.ModelsManagementPage })));
const CategoriesManagementPage = lazy(() => import('../../features/fleet/pages/CategoriesManagementPage').then((module) => ({ default: module.CategoriesManagementPage })));
const BookingsListPage = lazy(() => import('../../features/bookings/pages/BookingsListPage').then((module) => ({ default: module.BookingsListPage })));
const CreateBookingPage = lazy(() => import('../../features/bookings/pages/CreateBookingPage').then((module) => ({ default: module.CreateBookingPage })));
const BookingCalendarPage = lazy(() => import('../../features/bookings/pages/BookingCalendarPage').then((module) => ({ default: module.BookingCalendarPage })));
const RentalsListPage = lazy(() => import('../../features/rentals/pages/RentalsListPage').then((module) => ({ default: module.RentalsListPage })));
const HandoverVehiclePage = lazy(() => import('../../features/rentals/pages/HandoverVehiclePage').then((module) => ({ default: module.HandoverVehiclePage })));
const ReturnVehiclePage = lazy(() => import('../../features/rentals/pages/ReturnVehiclePage').then((module) => ({ default: module.ReturnVehiclePage })));
const InspectionsListPage = lazy(() => import('../../features/inspections/pages/InspectionsListPage').then((module) => ({ default: module.InspectionsListPage })));
const NewInspectionPage = lazy(() => import('../../features/inspections/pages/NewInspectionPage').then((module) => ({ default: module.NewInspectionPage })));
const InspectionDetailPage = lazy(() => import('../../features/inspections/pages/InspectionDetailPage').then((module) => ({ default: module.InspectionDetailPage })));
const EmployeesListPage = lazy(() => import('../../features/employees/pages/EmployeesListPage').then((module) => ({ default: module.EmployeesListPage })));
const BranchesListPage = lazy(() => import('../../features/branches/pages/BranchesListPage').then((module) => ({ default: module.BranchesListPage })));
const AuditLogsPage = lazy(() => import('../../features/audit-logs/pages/AuditLogsPage').then((module) => ({ default: module.AuditLogsPage })));
const InquiriesListPage = lazy(() => import('../../features/inquiries/pages/InquiriesListPage').then((module) => ({ default: module.InquiriesListPage })));
const UsersManagementPage = lazy(() => import('../../features/users/pages/UsersManagementPage').then((module) => ({ default: module.UsersManagementPage })));
const CustomersListPage = lazy(() => import('../../features/customers/pages/CustomersListPage').then((module) => ({ default: module.CustomersListPage })));

export function AppRouter() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <CanonicalUrlManager />
        <ScrollToTop />
        <Suspense fallback={<LoadingState minHeight="100vh" />}>
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
            <Route path="compare" element={<CompareCarsPage />} />
            <Route path="privacy" element={<LegalPage kind="privacy" />} />
            <Route path="terms" element={<LegalPage kind="terms" />} />
            <Route path="cookies" element={<LegalPage kind="cookies" />} />
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
          {/* Email verification link: works signed in or signed out */}
          <Route path="/verify-email" element={<VerifyEmailPage />} />
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
            <Route path="customers" element={<CustomersListPage />} />
            <Route path="users" element={<UsersManagementPage />} />
            <Route path="employees" element={<EmployeesListPage />} />
            <Route path="branches" element={<BranchesListPage />} />
            <Route path="audit-logs" element={<AuditLogsPage />} />
          </Route>

          {/* Security & Fallback Pages */}
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
