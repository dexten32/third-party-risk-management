/* eslint-disable no-unused-vars */
import { Outlet, useLocation } from 'react-router-dom';
import { useState } from 'react';
import LeftSidebar from '../components/LeftSideBar';
import TopBar from '../components/TopBar';
import RightSidebar from '../components/RightSideBar';

export default function DashboardLayout({ user }) {
  const [selectedVendorId, setSelectedVendorId] = useState(null);
  const location = useLocation();

  const isCompany = user?.role === 'COMPANY';
  const isCompanySummary = isCompany && location.pathname === '/company/summary';

  return (
    <div className="flex flex-col h-screen">
      <TopBar user={user} />

      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar user={user} />

        <div className="flex-1 flex overflow-hidden">
          <main className="flex-1 overflow-y-auto p-4 bg-gray-50">
            <Outlet context={{ user, selectedVendorId, setSelectedVendorId }} />
          </main>

          {isCompanySummary && (
            <RightSidebar
              role={user.role}
              userId={user.userId}
              selectedVendorId={selectedVendorId}
              setSelectedVendorId={setSelectedVendorId}
            />
          )}
        </div>
      </div>
    </div>
  );
}
  