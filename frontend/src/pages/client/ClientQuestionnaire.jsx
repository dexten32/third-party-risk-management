import React, { useEffect, useState } from 'react';
import QuestionnaireHeader from '../../components/questionnaireComponents/QuestionnaireHeader';
import QuestionnaireList from '../../components/questionnaireComponents/QuestionnaireList';
import { API_BASE_URL } from '../../utils/api';
import { getToken } from '../../utils/auth';
import { cacheGet, cacheSet } from '../../utils/cacheManager';

// Cache keys for API endpoints
const CLIENT_VENDORS_KEY = 'client-vendors';
const VENDOR_ANSWERS_KEY_PREFIX = 'vendor-answers';

const ClientQuestionnairePage = () => {
  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [questionnaireAnswers, setQuestionnaireAnswers] = useState([]);

  useEffect(() => {
    const fetchClientVendors = async () => {
      const token = getToken();
      if (!token) return;

      const cached = cacheGet(CLIENT_VENDORS_KEY);
      const headers = { Authorization: `Bearer ${token}` };
      if (cached?.etag) {
        headers['If-None-Match'] = cached.etag;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/client/client-vendors`, { headers });

        if (res.status === 304 && cached) {
          setVendors(cached.value);
        } else if (res.ok) {
          const data = await res.json();
          const vendorsArray = Array.isArray(data) ? data : data.data || [];
          if (!Array.isArray(vendorsArray)) throw new Error('Invalid vendors data');
          const etag = res.headers.get('etag');

          setVendors(vendorsArray);
          cacheSet(CLIENT_VENDORS_KEY, vendorsArray, etag);
        }
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
      const token = getToken();
      if (!token) return;

      const headers = { Authorization: `Bearer ${token}` };
      if (cached?.etag) {
        headers['If-None-Match'] = cached.etag;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/shared/vendor/${selectedVendor.id}/answers`, { headers });
        
        if (res.status === 304 && cached) {
          setQuestionnaireAnswers(cached.value);
        } else if (res.ok) {
          const data = await res.json();
          const answersArray = Array.isArray(data) ? data : data.answers || [];
          const etag = res.headers.get('etag');

          setQuestionnaireAnswers(answersArray);
          cacheSet(cacheKey, answersArray, etag);
        }
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