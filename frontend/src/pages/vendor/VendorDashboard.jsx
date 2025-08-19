/* eslint-disable no-unused-vars */ 
import React, { useEffect, useState } from "react";
import { API_BASE_URL } from "../../utils/api";
import Loader from "../../components/Loader";
import SummaryDashboard from "../../components/SummaryComponents/SummaryDashboard";

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
        const vendorRes = await fetch(`${API_BASE_URL}/vendor/details`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const vendor = await vendorRes.json();
        setVendorData(vendor);

        const summaryRes = await fetch(`${API_BASE_URL}/vendor/vendor-summary`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const summaryData = await summaryRes.json();
        setSummary(summaryData.data?.content || "No summary available");


        const clientsRes = await fetch(`${API_BASE_URL}/shared/clients`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const clientsData = await clientsRes.json();
        if (Array.isArray(clientsData)) setClients(clientsData);
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

    setSelectedClient(vendorData.clientId || "");
    const hasClient =
      vendorData.clientId !== null &&
      vendorData.clientId !== undefined &&
      vendorData.clientId !== "";

    setShowClientModal(hasClient);
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
