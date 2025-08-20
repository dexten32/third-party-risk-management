/* eslint-disable no-unused-vars */
import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { API_BASE_URL } from '../utils/api';
import { getToken } from '../utils/auth';
import { cacheGet, cacheSet } from '../utils/cacheManager';

// Define cache keys for each API endpoint
const COMPANY_SIDEBAR_KEY = 'company-sidebar';
const CLIENT_SIDEBAR_KEY = 'client-sidebar';

export default function RightSidebar({ role, userId, selectedVendorId, setSelectedVendorId }) {
  const [collapsed, setCollapsed] = useState(false);
  const [clientsData, setClientsData] = useState([]);
  const [clientVendors, setClientVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSidebarData = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = getToken();
        if (!token) throw new Error("Authentication token not found.");

        let res, result, cacheKey, cachedData, headers = { Authorization: `Bearer ${token}` };

        if (role === 'COMPANY') {
          cacheKey = COMPANY_SIDEBAR_KEY;
          cachedData = cacheGet(cacheKey);
          if (cachedData?.etag) {
            headers['If-None-Match'] = cachedData.etag;
          }
          res = await fetch(`${API_BASE_URL}/company/vendors-by-client`, { headers });

          if (res.status === 304 && cachedData) {
            const data = Array.isArray(cachedData.value) ? cachedData.value : [];
            setClientsData(data);
            // New logic: set initial selected vendor
            const allVendors = data.flatMap(client => client.vendors);
            if (allVendors.length > 0 && selectedVendorId === null) {
              setSelectedVendorId(allVendors[0].id);
            }
          } else if (res.ok) {
            result = await res.json();
            const data = Array.isArray(result.data) ? result.data : [];
            const etag = res.headers.get('etag');
            setClientsData(data);
            cacheSet(cacheKey, data, etag);
            // New logic: set initial selected vendor
            const allVendors = data.flatMap(client => client.vendors);
            if (allVendors.length > 0 && selectedVendorId === null) {
              setSelectedVendorId(allVendors[0].id);
            }
          } else {
            throw new Error((await res.json()).error || "Failed to fetch company sidebar data");
          }

        } else if (role === 'CLIENT') {
          cacheKey = `${CLIENT_SIDEBAR_KEY}-${userId}`;
          cachedData = cacheGet(cacheKey);
          if (cachedData?.etag) {
            headers['If-None-Match'] = cachedData.etag;
          }
          res = await fetch(`${API_BASE_URL}/client/client-vendors`, { headers });

          if (res.status === 304 && cachedData) {
            const vendors = Array.isArray(cachedData.value) ? cachedData.value : [];
            setClientVendors(vendors);
            // New logic: set initial selected vendor
            if (vendors.length > 0 && selectedVendorId === null) {
              setSelectedVendorId(vendors[0].id);
            }
          } else if (res.ok) {
            result = await res.json();
            const vendors = Array.isArray(result.data) ? result.data : [];
            const etag = res.headers.get('etag');
            setClientVendors(vendors);
            cacheSet(cacheKey, vendors, etag);
            // New logic: set initial selected vendor
            if (vendors.length > 0 && selectedVendorId === null) {
              setSelectedVendorId(vendors[0].id);
            }
          } else {
            throw new Error((await res.json()).error || "Failed to fetch client's vendors");
          }
        }
      } catch (err) {
        console.error('Sidebar fetch error:', err);
        setError(`Failed to load sidebar: ${err.message}`);
        setClientsData([]);
        setClientVendors([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSidebarData();
  }, [role, userId, selectedVendorId, setSelectedVendorId]);

  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .trim()
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?';
  };

  if (loading) {
    return (
      <aside className="w-16 sm:w-64 bg-white border-l border-gray-200 flex flex-col items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </aside>
    );
  }

  const renderVendors = (vendors) =>
    vendors.map((vendor) => (
      <li
        key={vendor.id}
        onClick={() => setSelectedVendorId(vendor.id)}
        className={`flex items-center gap-2 cursor-pointer p-1 rounded ${
          selectedVendorId === vendor.id ? 'bg-blue-100 text-blue-800 font-medium' : 'hover:bg-gray-100'
        }`}
        title={collapsed ? vendor.name : ''}
      >
        {collapsed && (
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-200 text-blue-800 text-[10px] font-semibold">
            {getInitials(vendor.name)}
          </div>
        )}
        {!collapsed && <span className="text-sm text-gray-700">{vendor.name}</span>}
      </li>
    ));

  return (
    <aside
      className={`${
        collapsed ? 'w-16' : 'w-64'
      } bg-white border-l border-gray-200 transition-all duration-300 flex flex-col relative flex-shrink-0`}
    >
      <div className="p-3 border-b border-gray-200 flex items-center justify-between">
        {!collapsed && (
          <h3 className="text-sm font-semibold text-gray-700">
            {role === 'COMPANY' ? 'Clients & Vendors' : 'Your Vendors'}
          </h3>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 bg-gray-100 rounded-full hover:bg-gray-200 text-gray-600 hover:text-gray-800 transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
      {error && (
        <div className="p-2 text-red-700 bg-red-100 border border-red-200 text-xs rounded mx-2 mt-2">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-2 py-3">
        {role === 'COMPANY' &&
          (clientsData.length > 0 ? (
            clientsData.map((client) => (
              <div key={client.clientId} className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-200 text-gray-700 font-extrabold text-sm"
                    title={client.clientName}
                  >
                    {getInitials(client.clientName)}
                  </div>
                  {!collapsed && <h4 className="text-sm font-bold text-gray-800">{client.clientName}</h4>}
                </div>
                <ul className="ml-2 flex flex-col gap-1">{renderVendors(client.vendors)}</ul>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-sm p-2 text-center">No clients or vendors found.</p>
          ))}

        {role === 'CLIENT' &&
          (clientVendors.length > 0 ? (
            <ul className="flex flex-col gap-1">{renderVendors(clientVendors)}</ul>
          ) : (
            <p className="text-gray-500 text-sm p-2 text-center">No vendors associated with your account.</p>
          ))}
      </div>
    </aside>
  );
}