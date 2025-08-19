/* eslint-disable no-unused-vars */
import { useOutletContext } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../utils/api';
import { getToken } from '../../utils/auth';
import SummaryDashboard from '../../components/SummaryComponents/SummaryDashboard';
import RightSidebar from '../../components/RightSideBar';
import { cacheGet, cacheSet, isCacheFresh } from '../../utils/cacheManager';

const CACHE_EXPIRY_MS = 30 * 60 * 1000;
const VENDOR_INFO_KEY_PREFIX = 'vendor-info';
const VENDOR_SUMMARY_KEY_PREFIX = 'vendor-summary';

export default function ClientDashboard() {
  const { user } = useOutletContext();
  const [selectedVendorId, setSelectedVendorId] = useState(null);
  const [vendorInfo, setVendorInfo] = useState(null);
  const [summaryText, setSummaryText] = useState('');
  const [summaryCreatedAt, setSummaryCreatedAt] = useState(null);
  const [loadingVendorInfo, setLoadingVendorInfo] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchVendorInfo = async () => {
      if (!selectedVendorId) {
        setVendorInfo(null);
        return;
      }

      setLoadingVendorInfo(true);
      setError(null);

      const token = getToken();
      if (!token) return;

      const cacheKey = `${VENDOR_INFO_KEY_PREFIX}-${selectedVendorId}`;
      const cached = cacheGet(cacheKey);

      if (cached && isCacheFresh(cached.timestamp, CACHE_EXPIRY_MS)) {
        setVendorInfo(cached.value);
        setLoadingVendorInfo(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/company/vendor/${selectedVendorId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Failed to fetch vendor info: ${res.status}`);
        const data = await res.json();
        setVendorInfo(data);
        cacheSet(cacheKey, data);
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoadingVendorInfo(false);
      }
    };

    fetchVendorInfo();
  }, [selectedVendorId]);

  useEffect(() => {
    const fetchVendorSummary = async () => {
      if (!selectedVendorId) {
        setSummaryText('');
        setSummaryCreatedAt(null);
        return;
      }

      setLoadingSummary(true);
      setError(null);

      const token = getToken();
      if (!token) return;

      const cacheKey = `${VENDOR_SUMMARY_KEY_PREFIX}-${selectedVendorId}`;
      const cached = cacheGet(cacheKey);

      if (cached && isCacheFresh(cached.timestamp, CACHE_EXPIRY_MS)) {
        setSummaryText(cached.value.content);
        setSummaryCreatedAt(cached.value.createdAt);
        setLoadingSummary(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/shared/vendor-summary/${selectedVendorId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 404) {
          setSummaryText("No summary available for this vendor yet.");
          setSummaryCreatedAt(null);
        } else if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to fetch summary');
        } else {
          const data = await res.json();
          const content = data.data?.content || "No summary available for this vendor yet.";
          const createdAt = data.data?.createdAt || null;

          setSummaryText(content);
          setSummaryCreatedAt(createdAt);

          cacheSet(cacheKey, { content, createdAt });
        }
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoadingSummary(false);
      }
    };

    fetchVendorSummary();
  }, [selectedVendorId]);

  return (
    <div className="flex h-full bg-gray-100">
      <div className="flex-1 p-6 space-y-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Client Dashboard</h2>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Error:</strong>
            <span className="block sm:inline ml-2">{error}</span>
          </div>
        )}
        {selectedVendorId ? (
          <>
            <div className="bg-white rounded-lg shadow border p-6 space-y-2">
              <h3 className="text-lg font-semibold">Selected Vendor Details</h3>
              {loadingVendorInfo ? (
                <p>Loading vendor details...</p>
              ) : vendorInfo ? (
                <ul className="text-sm text-gray-700 space-y-1">
                  <li><strong>Vendor:</strong> {vendorInfo?.vendorName || 'N/A'}</li>
                  <li><strong>Email:</strong> {vendorInfo?.vendorEmail || 'N/A'}</li>
                  <li><strong>Client:</strong> {vendorInfo?.clientName || 'N/A'}</li>
                  <li>
                    <strong>Questionnaire Status:</strong>
                    <span className={`ml-2 font-medium ${vendorInfo?.status === 'COMPLETED' ? 'text-green-600' : 'text-red-600'}`}>
                      {vendorInfo?.vendorQuestionnaireStatus || 'N/A'}
                    </span>
                  </li>
                </ul>
              ) : (
                <p className="text-gray-600">Vendor details could not be loaded.</p>
              )}
            </div>

            <div className="bg-white rounded-lg shadow border">
              <SummaryDashboard
                vendorId={selectedVendorId}
                role={user?.role}
                vendorStatus={vendorInfo?.status}
                initialSummary={summaryText}
                summaryCreatedAt={summaryCreatedAt}
              />
            </div>
          </>
        ) : (
          <p className="text-center text-gray-600 mt-10">
            Please select a vendor from the sidebar to view their details and summary.
          </p>
        )}
      </div>

      <RightSidebar
        role={user?.role}
        userId={user?.id}
        selectedVendorId={selectedVendorId}
        setSelectedVendorId={setSelectedVendorId}
      />
    </div>
  );
}
