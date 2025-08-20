import React, { useEffect, useState } from 'react';
import QuestionnaireHeader from '../../components/questionnaireComponents/QuestionnaireHeader';
import QuestionnaireList from '../../components/questionnaireComponents/QuestionnaireList';
import { API_BASE_URL } from '../../utils/api';
import { getToken } from '../../utils/auth';
import { cacheGet, cacheSet } from '../../utils/cacheManager';

// Cache keys for API endpoints
const USERS_CACHE_KEY = 'company-users';
const ANSWERS_CACHE_KEY_PREFIX = 'vendor-answers';

const CompanyQuestionnairePage = () => {
  const [clients, setClients] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [allVendors, setAllVendors] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [questionnaireAnswers, setQuestionnaireAnswers] = useState([]);

  // Fetch all clients and vendors
  useEffect(() => {
    const fetchUsers = async () => {
      const token = getToken();
      if (!token) return;

      const cached = cacheGet(USERS_CACHE_KEY);
      const headers = { Authorization: `Bearer ${token}` };
      if (cached?.etag) {
        headers['If-None-Match'] = cached.etag;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/company/users`, { headers });
        if (res.status === 304 && cached) {
          const cachedUsers = cached.value;
          setClients(cachedUsers.filter((u) => u.role === 'CLIENT'));
          setAllVendors(cachedUsers.filter((u) => u.role === 'VENDOR'));
        } else if (res.ok) {
          const data = await res.json();
          const usersArray = Array.isArray(data) ? data : data.data || [];
          const etag = res.headers.get('etag');

          const clientsList = usersArray.filter((u) => u.role === 'CLIENT');
          const vendorsList = usersArray.filter((u) => u.role === 'VENDOR');

          setClients(clientsList);
          setAllVendors(vendorsList);

          cacheSet(USERS_CACHE_KEY, usersArray, etag);
        }
      } catch (err) {
        console.error('Error fetching users:', err);
      }
    };

    fetchUsers();
  }, []);

  // Filter vendors based on selected client
  useEffect(() => {
    if (!selectedClient) {
      setVendors([]);
    } else {
      setVendors(allVendors.filter((v) => v.clientId === selectedClient));
    }
    setSelectedVendor(null);
    setQuestionnaireAnswers([]);
  }, [selectedClient, allVendors]);

  // Fetch questionnaire answers for the selected vendor
  useEffect(() => {
    if (!selectedVendor?.id) return;

    const fetchAnswers = async () => {
      const cacheKey = `${ANSWERS_CACHE_KEY_PREFIX}-${selectedVendor.id}`;
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
          const answers = Array.isArray(data) ? data : data.answers || [];
          const etag = res.headers.get('etag');

          setQuestionnaireAnswers(answers);
          cacheSet(cacheKey, answers, etag);
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
        clients={clients}
        vendors={vendors}
        selectedClient={selectedClient}
        selectedVendor={selectedVendor}
        onClientChange={setSelectedClient}
        onVendorChange={setSelectedVendor}
      />

      <div className="mt-6">
        {selectedVendor ? (
          <QuestionnaireList
            initialAnswers={questionnaireAnswers}
            vendorId={selectedVendor.id}
            token={getToken()}
            userRole="COMPANY"
          />
        ) : (
          <p className="text-gray-600 text-center italic">
            Please select a vendor to view the questionnaire.
          </p>
        )}
      </div>
    </div>
  );
};

export default CompanyQuestionnairePage;