import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { getToken, getUserFromToken, logoutUser } from './utils/auth';

import PrivateRoute from './routes/PrivateRoute';
import DashboardLayout from './layouts/DashboardLayout';
import CompanyDashboard from './pages/company/CompanyDashboard';
import ClientDashboard from './pages/client/ClientDashboard';
import VendorDashboard from './pages/vendor/VendorDashboard';
import CompanyUserApproval from './pages/company/CompanyUserApproval';
import CompanyQuestionnaire from './pages/company/CompanyQuestionnaire';
import LoginPage from './pages/LoginPage';
import useInactivityLogout from './utils/useInactivityLogout';
import VendorQuestionnaire from './pages/vendor/VendorQuestionnaire';
import ClientQuestionnaire from './pages/client/ClientQuestionnaire';

export default function App() {
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState(null);

  const resetInactivityTimer = useInactivityLogout();

  useEffect(() => {
    const token = getToken();
    if (token) {
      const payload = getUserFromToken();
      if (payload?.exp * 1000 > Date.now()) {
        setUser(payload);
        resetInactivityTimer();
      } else {
        logoutUser();
        setUser(null);
        Navigate("/login"); 
      }
    }
    setAuthChecked(true);
  }, [resetInactivityTimer]);

  if (!authChecked) return <div>Loading...</div>;

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<PrivateRoute user={user} />}>
        <Route path="/company" element={<DashboardLayout user={user} />}>
          <Route path='summary' element={<CompanyDashboard />} />
          <Route path="approval" element={<CompanyUserApproval />} />
          <Route path="questionnaire" element={<CompanyQuestionnaire />} />
          <Route index element={<Navigate to="summary" replace />} />
        </Route>

        <Route path="/client" element={<DashboardLayout user={user} />}>
          <Route path='summary' element={<ClientDashboard />} />
          <Route path='questionnaire' element={<ClientQuestionnaire />} />
        </Route>

        <Route path="/vendor" element={<DashboardLayout user={user} />}>
          <Route path='summary' element={<VendorDashboard />} />
          <Route path='questionnaire' element={<VendorQuestionnaire />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to={user ? `/${user.role.toLowerCase()}/summary` : "/login"} />} />
    </Routes>
  );
}