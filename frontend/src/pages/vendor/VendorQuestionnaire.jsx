/* eslint-disable no-unused-vars */
import React, { useEffect, useState } from "react";
import QuestionnaireList from "../../components/questionnaireComponents/QuestionnaireList";
import { API_BASE_URL } from "../../utils/api";
import { cacheGet, cacheSet } from "../../utils/cacheManager";
import { getToken } from "../../utils/auth";

const ANSWERS_CACHE_KEY_PREFIX = 'vendor-answers';

export default function VendorQuestionnaire() {
  const [vendorId, setVendorId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submittedAnswers, setSubmittedAnswers] = useState([]);

  // Use a single useEffect for a cleaner flow
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    const fetchAnswers = async () => {
      try {
        const decodedToken = JSON.parse(atob(token.split(".")[1]));
        const userId = decodedToken?.userId || null;
        if (!userId) {
          setLoading(false);
          return;
        }

        const cacheKey = `${ANSWERS_CACHE_KEY_PREFIX}-${userId}`;
        const cached = cacheGet(cacheKey);
        const headers = { Authorization: `Bearer ${token}` };
        
        if (cached?.etag) {
          headers['If-None-Match'] = cached.etag;
        }
        
        const res = await fetch(`${API_BASE_URL}/shared/vendor/${userId}/answers`, {
          headers: headers,
        });
        
        if (res.status === 304 && cached) {
          setSubmittedAnswers(cached.value);
        } else if (res.ok) {
          const data = await res.json();
          const answers = data?.answers || [];
          const etag = res.headers.get('etag');

          setSubmittedAnswers(answers);
          cacheSet(cacheKey, answers, etag);
        } else {
          // Handle other response statuses, like 404, gracefully
          setSubmittedAnswers([]);
        }
      } catch (err) {
        console.error("Failed to fetch submitted answers", err);
        setSubmittedAnswers([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAnswers();
  }, []);

  if (loading) return <p>Loading your questionnaire...</p>;
  if (!vendorId) return <p>Unable to load your questionnaire. Please log in again.</p>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Your Questionnaire</h1>
      <QuestionnaireList
        userRole="VENDOR"
        vendorId={vendorId}
        token={getToken()}
        initialAnswers={submittedAnswers}
      />
    </div>
  );
}