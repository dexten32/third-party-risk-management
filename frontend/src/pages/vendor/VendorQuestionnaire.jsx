// src/pages/VendorQuestionnaire.jsx
import React, { useEffect, useState } from "react";
import QuestionnaireList from "../../components/questionnaireComponents/QuestionnaireList";
import { API_BASE_URL } from "../../utils/api";

export default function VendorQuestionnaire() {
  const [vendorId, setVendorId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submittedAnswers, setSubmittedAnswers] = useState([]);

  const token = localStorage.getItem("token");

  // Decode JWT payload
  const decodeToken = (token) => {
    if (!token) return null;
    try {
      return JSON.parse(atob(token.split(".")[1]));
    } catch (err) {
      console.error("Failed to decode token", err);
      return null;
    }
  };

  // ---------------- GET VENDOR ID FROM TOKEN ----------------
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    const decoded = decodeToken(token);
    const userId = decoded?.userId || null;
    setVendorId(userId);
    setLoading(false);
  }, [token]);

  // ---------------- FETCH VENDOR ANSWERS ----------------
  useEffect(() => {
    if (!vendorId || !token) return;

    const fetchAnswers = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/shared/vendor/${vendorId}/answers`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setSubmittedAnswers(data?.answers || []);
      } catch (err) {
        console.error("Failed to fetch submitted answers", err);
        setSubmittedAnswers([]);
      }
    };

    fetchAnswers();
  }, [vendorId, token]);

  // ---------------- RENDER ----------------
  if (loading) return <p>Loading your questionnaire...</p>;
  if (!vendorId) return <p>Unable to load your questionnaire. Please log in again.</p>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Your Questionnaire</h1>
      <QuestionnaireList
        userRole="VENDOR"
        vendorId={vendorId}
        token={token}
        initialAnswers={submittedAnswers}
      />
    </div>
  );
}
