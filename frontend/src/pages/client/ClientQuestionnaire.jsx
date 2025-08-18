import React, { useEffect, useState } from 'react';
import QuestionnaireHeader from '../../components/questionnaireComponents/QuestionnaireHeader';
import QuestionnaireList from '../../components/questionnaireComponents/QuestionnaireList';
import { API_BASE_URL } from '../../utils/api';
import { getToken } from '../../utils/auth';
import { cacheGet, cacheSet, isCacheFresh } from '../../utils/cacheManager';

const CACHE_EXPIRY_MS = 30 * 60 * 1000;
const CLIENT_VENDORS_KEY = 'client-vendors';
const VENDOR_ANSWERS_KEY_PREFIX = 'vendor-answers';

const ClientQuestionnairePage = () => {
  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [questionnaireAnswers, setQuestionnaireAnswers] = useState([]);

  useEffect(() => {
    const fetchClientVendors = async () => {
      const cached = cacheGet(CLIENT_VENDORS_KEY);
      if (cached && isCacheFresh(cached.timestamp, CACHE_EXPIRY_MS)) {
        setVendors(cached.value);
        return;
      }

      try {
        const token = getToken();
        if (!token) return;

        const res = await fetch(`${API_BASE_URL}/api/client/client-vendors`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        const vendorsArray = Array.isArray(data) ? data : data.data;
        if (!Array.isArray(vendorsArray)) throw new Error('Invalid vendors data');
        setVendors(vendorsArray);
        cacheSet(CLIENT_VENDORS_KEY, vendorsArray);
      } catch (err) {
        console.error('Error fetching client vendors:', err);
      }
    };
    fetchClientVendors();
  }, []);

  useEffect(() => {
    if (!selectedVendor) {
      setQuestionnaireAnswers([]);
      return;
    }

    const fetchAnswers = async () => {
      const cacheKey = `${VENDOR_ANSWERS_KEY_PREFIX}-${selectedVendor.id}`;
      const cached = cacheGet(cacheKey);
      if (cached && isCacheFresh(cached.timestamp, CACHE_EXPIRY_MS)) {
        setQuestionnaireAnswers(cached.value);
        return;
      }

      try {
        const token = getToken();
        if (!token) return;

        const res = await fetch(`${API_BASE_URL}/api/shared/vendor/${selectedVendor.id}/answers`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        const answersArray = Array.isArray(data) ? data : data.answers || [];
        setQuestionnaireAnswers(answersArray);
        cacheSet(cacheKey, answersArray);
      } catch (err) {
        console.error('Error fetching questionnaire answers:', err);
      }
    };
    fetchAnswers();
  }, [selectedVendor]);

  return (
    <div className="flex flex-col w-full h-full px-6 py-4">
      <QuestionnaireHeader
        vendors={vendors}
        selectedVendor={selectedVendor}
        onVendorChange={setSelectedVendor}
        userRole="CLIENT"
      />
      <div className="mt-6">
        {selectedVendor && (
          <QuestionnaireList
            initialAnswers={questionnaireAnswers}
            vendorId={selectedVendor.id}
            token={getToken()}
            userRole="CLIENT"
          />
        )}
      </div>
    </div>
  );
};

export default ClientQuestionnairePage;
