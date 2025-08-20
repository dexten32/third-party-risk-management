/* eslint-disable no-unused-vars */
import { useOutletContext } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../utils/api';
import { getToken } from '../../utils/auth';
import SummaryDashboard from '../../components/SummaryComponents/SummaryDashboard';
import RightSidebar from '../../components/RightSideBar';
import { cacheGet, cacheSet } from '../../utils/cacheManager';

const VENDOR_INFO_KEY_PREFIX = 'vendor-info';
const VENDOR_SUMMARY_KEY_PREFIX = 'vendor-summary';

export default function ClientDashboard() {
  const { user } = useOutletContext();
  const [selectedVendorId, setSelectedVendorId] = useState(null);
  const [vendorInfo, setVendorInfo] = useState(null);
  const [summaryText, setSummaryText] = useState('');
  const [summaryCreatedAt, setSummaryCreatedAt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log(`[ClientDashboard - useEffect] Triggered. selectedVendorId: ${selectedVendorId}`);

    const fetchData = async () => {
      if (!selectedVendorId) {
        console.log('[ClientDashboard - fetchData] No vendor selected, returning early.');
        setVendorInfo(null);
        setSummaryText('');
        setSummaryCreatedAt(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      const token = getToken();
      if (!token) {
        console.error('[ClientDashboard - fetchData] Authentication token not found.');
        setLoading(false);
        return;
      }

      try {
        // ---- Fetch Vendor Info ----
        const vendorInfoKey = `${VENDOR_INFO_KEY_PREFIX}-${selectedVendorId}`;
        const cachedVendorInfo = cacheGet(vendorInfoKey);
        const vendorInfoHeaders = { Authorization: `Bearer ${token}` };

        if (cachedVendorInfo && cachedVendorInfo.etag) {
          vendorInfoHeaders['If-None-Match'] = cachedVendorInfo.etag;
          console.log(`[ClientDashboard - VendorInfo] Sending If-None-Match: ${cachedVendorInfo.etag}`);
        }

        console.log(`[ClientDashboard - VendorInfo] Fetching for vendor: ${selectedVendorId}`);
        const vendorRes = await fetch(`${API_BASE_URL}/company/vendor/${selectedVendorId}`, {
          headers: vendorInfoHeaders,
        });

        console.log(`[ClientDashboard - VendorInfo] Response Status: ${vendorRes.status}`);
        if (vendorRes.status === 304 && cachedVendorInfo) {
          console.log(`[ClientDashboard - VendorInfo] 304 Not Modified, using cached data.`);
          setVendorInfo(cachedVendorInfo.value);
        } else if (vendorRes.ok) {
          const data = await vendorRes.json();
          console.log(`[ClientDashboard - VendorInfo] Fetched fresh data:`, data);
          setVendorInfo(data);
          cacheSet(vendorInfoKey, data, vendorRes.headers.get('etag'));
        } else {
          const errMessage = `Failed to fetch vendor info: ${vendorRes.status}`;
          console.error(`[ClientDashboard - VendorInfo] Error: ${errMessage}`);
          throw new Error(errMessage);
        }

        // ---- Fetch Vendor Summary ----
        const summaryKey = `${VENDOR_SUMMARY_KEY_PREFIX}-${selectedVendorId}`;
        const cachedSummary = cacheGet(summaryKey);
        const summaryHeaders = { Authorization: `Bearer ${token}` };

        if (cachedSummary && cachedSummary.etag) {
          summaryHeaders['If-None-Match'] = cachedSummary.etag;
          console.log(`[ClientDashboard - Summary] Sending If-None-Match: ${cachedSummary.etag}`);
        }

        console.log(`[ClientDashboard - Summary] Fetching summary for vendor: ${selectedVendorId}`);
        const summaryRes = await fetch(`${API_BASE_URL}/shared/vendor-summary/${selectedVendorId}`, {
          headers: summaryHeaders,
        });

        console.log(`[ClientDashboard - Summary] Response Status: ${summaryRes.status}`);
        if (summaryRes.status === 304) {
          if (cachedSummary) {
            console.log(`[ClientDashboard - Summary] 304 Not Modified, using cached data.`);
            setSummaryText(cachedSummary.value.content);
            setSummaryCreatedAt(cachedSummary.value.createdAt);
          } else {
            console.warn("[ClientDashboard - Summary] 304 received but no cached summary exists, falling back.");
            setSummaryText('No summary available for this vendor yet.');
            setSummaryCreatedAt(null);
          }
        } else if (summaryRes.ok) {
          const data = await summaryRes.json();
          console.log(`[ClientDashboard - Summary] Fetched fresh data:`, data);
          const content = data.data?.content || 'No summary available for this vendor yet.';
          const createdAt = data.data?.createdAt || null;
          setSummaryText(content);
          setSummaryCreatedAt(createdAt);
          cacheSet(summaryKey, { content, createdAt }, summaryRes.headers.get('etag'));
        } else if (summaryRes.status === 404) {
          console.log(`[ClientDashboard - Summary] 404 Not Found: No summary available.`);
          setSummaryText('No summary available for this vendor yet.');
          setSummaryCreatedAt(null);
        } else {
          let errMessage;
          try {
            const errData = await summaryRes.json();
            errMessage = errData.error;
          } catch {
            errMessage = `Failed to fetch summary: ${summaryRes.status}`;
          }
          console.error(`[ClientDashboard - Summary] Error: ${errMessage}`);
          throw new Error(errMessage);
        }
      } catch (err) {
        console.error(`[ClientDashboard] Caught error during fetchData:`, err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedVendorId, user.id]);

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
              {loading ? (
                <p>Loading vendor details...</p>
              ) : vendorInfo ? (
                <ul className="text-sm text-gray-700 space-y-1">
                  <li><strong>Vendor:</strong> {vendorInfo?.vendorName || 'N/A'}</li>
                  <li><strong>Email:</strong> {vendorInfo?.vendorEmail || 'N/A'}</li>
                  <li><strong>Client:</strong> {vendorInfo?.clientName || 'N/A'}</li>
                  <li>
                    <strong>Questionnaire Status:</strong>
                    <span className={`ml-2 font-medium ${vendorInfo?.vendorQuestionnaireStatus === 'COMPLETED' ? 'text-green-600' : 'text-red-600'}`}>
                      {vendorInfo?.vendorQuestionnaireStatus || 'N/A'}
                    </span>
                  </li>
                </ul>
              ) : (
                <p className="text-gray-600">Vendor details could not be loaded.</p>
              )}
            </div>

            <div className="bg-white rounded-lg shadow border">
              {loading ? (
                <p className="p-6">Loading summary...</p>
              ) : (
                <SummaryDashboard
                  vendorId={selectedVendorId}
                  role={user?.role}
                  vendorStatus={vendorInfo?.vendorQuestionnaireStatus}
                  initialSummary={summaryText}
                  summaryCreatedAt={summaryCreatedAt}
                />
              )}
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
