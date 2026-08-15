import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import CompanyDashboard from './pages/CompanyDashboard';
import PaymentPage from './pages/PaymentPage';

// Enterprise Admin & Super Admin Panel Components
import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import CompaniesPage from './pages/admin/CompaniesPage';
import PaymentsPage from './pages/admin/PaymentsPage';
import ReportsPage from './pages/admin/ReportsPage';
import PlacesPage from './pages/admin/PlacesPage';
import AccessControlPage from './pages/admin/AccessControlPage';
import MenuManagementPage from './pages/admin/MenuManagementPage';
import FooterManagementPage from './pages/admin/FooterManagementPage';
import SettingsPage from './pages/admin/SettingsPage';

import './styles/global.css';

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Public Website Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />

        {/* Incubated Company Dashboard & Payment Routes */}
        <Route path="/dashboard" element={<CompanyDashboard />} />
        <Route path="/company-dashboard" element={<CompanyDashboard />} />
        <Route path="/Novara_company" element={<CompanyDashboard />} />
        <Route path="/payment" element={<PaymentPage />} />
        <Route path="/payment/:invoiceId" element={<PaymentPage />} />

        {/* Dedicated Admin & Super Admin Login Gateway */}
        <Route path="/Novara_admin" element={<AdminLoginPage />} />

        {/* Admin & Super Admin Enterprise System Routes */}
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
        <Route path="/admin/companies" element={<CompaniesPage />} />
        <Route path="/admin/payments" element={<PaymentsPage />} />
        <Route path="/admin/reports" element={<ReportsPage />} />
        <Route path="/admin/places" element={<PlacesPage />} />
        <Route path="/admin/access-control" element={<AccessControlPage />} />
        <Route path="/admin/menu-management" element={<MenuManagementPage />} />
        <Route path="/admin/footer-management" element={<FooterManagementPage />} />
        <Route path="/admin/settings" element={<SettingsPage />} />

        {/* Catch-all fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
