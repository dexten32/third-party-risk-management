/* eslint-disable no-unused-vars */
import React, { useEffect, useState } from "react";
import { API_BASE_URL } from "../../utils/api";
import Loader from "../../components/Loader";
import SummaryDashboard from "../../components/SummaryComponents/SummaryDashboard";
import { cacheGet, cacheSet } from "../../utils/cacheManager";
import { getAuthHeader } from "../../utils/auth";

// Define cache keys for each API endpoint
const VENDOR_DETAILS_KEY = "vendor-details";
const VENDOR_SUMMARY_KEY = "vendor-summary";
const SHARED_CLIENTS_KEY = "shared-clients";

export default function VendorDashboard() {
  const [loading, setLoading] = useState(true);
  const [vendorData, setVendorData] = useState(null);
  const [summary, setSummary] = useState("");
  const [clients, setClients] = useState([]);
  const [showClientModal, setShowClientModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(
    localStorage.getItem("selectedClient") || ""
  );

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) return alert("Authentication required");

      try {
        // ---- Fetch Vendor Details (with ETag caching) ----
        const vendorDetailsCached = cacheGet(VENDOR_DETAILS_KEY);
        const vendorDetailsHeaders = getAuthHeader();
        if (vendorDetailsCached?.etag) {
          vendorDetailsHeaders["If-None-Match"] = vendorDetailsCached.etag;
        }

        const vendorRes = await fetch(`${API_BASE_URL}/vendor/details`, {
          headers: vendorDetailsHeaders,
        });

        if (vendorRes.status === 304 && vendorDetailsCached) {
          setVendorData(vendorDetailsCached.value);
        } else if (vendorRes.ok) {
          const vendor = await vendorRes.json();
          setVendorData(vendor);
          cacheSet(VENDOR_DETAILS_KEY, vendor, vendorRes.headers.get("etag"));
        }

        // ---- Fetch Vendor Summary (with ETag caching) ----
        const vendorSummaryCached = cacheGet(VENDOR_SUMMARY_KEY);
        const vendorSummaryHeaders = getAuthHeader();
        if (vendorSummaryCached?.etag) {
          vendorSummaryHeaders["If-None-Match"] = vendorSummaryCached.etag;
        }

        const summaryRes = await fetch(`${API_BASE_URL}/vendor/vendor-summary`, {
          headers: vendorSummaryHeaders,
        });

        if (summaryRes.status === 304 && vendorSummaryCached) {
          setSummary(vendorSummaryCached.value);
        } else if (summaryRes.ok) {
          const summaryData = await summaryRes.json();
          const content = summaryData.data?.content || "No summary available";
          setSummary(content);
          cacheSet(VENDOR_SUMMARY_KEY, content, summaryRes.headers.get("etag"));
        } else {
          setSummary("No summary available"); // Handle non-304/200 responses gracefully
        }

        // ---- Fetch Shared Clients (with ETag caching) ----
        const clientsCached = cacheGet(SHARED_CLIENTS_KEY);
        const clientsHeaders = getAuthHeader();
        if (clientsCached?.etag) {
          clientsHeaders["If-None-Match"] = clientsCached.etag;
        }

        const clientsRes = await fetch(`${API_BASE_URL}/shared/clients`, {
          headers: clientsHeaders,
        });

        if (clientsRes.status === 304 && clientsCached) {
          setClients(clientsCached.value);
        } else if (clientsRes.ok) {
          const clientsData = await clientsRes.json();
          const clientsArray = Array.isArray(clientsData) ? clientsData : clientsData.data || [];
          if (Array.isArray(clientsArray)) {
            setClients(clientsArray);
            cacheSet(SHARED_CLIENTS_KEY, clientsArray, clientsRes.headers.get("etag"));
          }
        }
      } catch (err) {
        console.error("Error loading vendor dashboard:", err);
        alert("Failed to load vendor dashboard. Please refresh.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (!vendorData) return;
    const hasClient =
      vendorData.clientId !== null &&
      vendorData.clientId !== undefined &&
      vendorData.clientId !== "";
    setShowClientModal(!hasClient);
    if (hasClient) {
      localStorage.setItem("selectedClient", vendorData.clientId);
    }
  }, [vendorData]);

  const handleClientSelect = async () => {
    if (!selectedClient) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/vendor/set-client`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ clientId: selectedClient }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to set client");

      // Invalidate the cache for vendor details and clients after a change
      // so the next fetch will get the fresh data.
      cacheSet(VENDOR_DETAILS_KEY, null, null);
      cacheSet(SHARED_CLIENTS_KEY, null, null);

      setVendorData((prev) => ({
        ...prev,
        clientId: selectedClient,
        clientName: clients.find((c) => c.id === selectedClient)?.name || "",
      }));
      localStorage.setItem("selectedClient", selectedClient);
      setShowClientModal(false);
    } catch (err) {
      console.error("Error setting client:", err);
      alert("Failed to save client. Please try again.");
    }
  };

  if (loading) return <Loader />;

  const getAssignedClientName = () =>
    vendorData?.clientName || clients.find((c) => c.id === vendorData?.clientId)?.name || "Not Assigned";

  return (
    <div className="p-6 space-y-6">
      {showClientModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-sm">
            <h2 className="text-lg font-semibold mb-4">Select Your Client</h2>
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="w-full border rounded px-3 py-2 mb-4"
            >
              <option value="">-- Select a Client --</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleClientSelect}
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
            >
              Confirm
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow p-4">
        <h2 className="text-lg font-semibold mb-4">Vendor Details</h2>
        {vendorData ? (
          <div className="space-y-2">
            <p><strong>Vendor Name:</strong> {vendorData.vendorName}</p>
            <p><strong>Email:</strong> {vendorData.vendorEmail}</p>
            <p><strong>Role:</strong> {vendorData.vendorRole}</p>
            <p><strong>Client:</strong> {getAssignedClientName()}</p>
            <p><strong>Questionnaire Status:</strong> {vendorData.vendorQuestionnaireStatus}</p>
          </div>
        ) : (
          <p className="text-gray-500">No vendor details available.</p>
        )}
      </div>

      <SummaryDashboard
        vendorId={vendorData?.vendorId}
        role="VENDOR"
        vendorStatus={vendorData?.vendorQuestionnaireStatus}
        initialSummary={summary}
      />
    </div>
  );
}