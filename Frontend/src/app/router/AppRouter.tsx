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
import { LoginPage } from '../../features/auth/pages/LoginPage';
import { RegisterPage } from '../../features/auth/pages/RegisterPage';
import { ForgotPasswordPage } from '../../features/auth/pages/ForgotPasswordPage';
import { VerifyCodePage } from '../../features/auth/pages/VerifyCodePage';
import { ResetPasswordPage } from '../../features/auth/pages/ResetPasswordPage';
import { CustomerDashboardPage } from '../../features/customers/pages/CustomerDashboardPage';
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

// CRM, Administration, Branches, & Audit Trail
import { CustomersListPage } from '../../features/customers/pages/CustomersListPage';
import { EmployeesListPage } from '../../features/employees/pages/EmployeesListPage';
import { BranchesListPage } from '../../features/branches/pages/BranchesListPage';
import { AuditLogsPage } from '../../features/audit-logs/pages/AuditLogsPage';

export function AppRouter() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Main Website Layout */}
          <Route path="/" element={<RootLayout />}>
            <Route index element={<HomePage />} />
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
            path="/customer/dashboard"
            element={
              <RoleMiddlewareRoute allowedSection="customer">
                <CustomerDashboardPage />
              </RoleMiddlewareRoute>
            }
          />

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
            <Route path="customers" element={<CustomersListPage />} />
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
