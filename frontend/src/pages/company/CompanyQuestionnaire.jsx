import React, { useEffect, useState } from 'react';
import QuestionnaireHeader from '../../components/questionnaireComponents/QuestionnaireHeader';
import QuestionnaireList from '../../components/questionnaireComponents/QuestionnaireList';
import { API_BASE_URL } from '../../utils/api';
import { getToken } from '../../utils/auth';
import { cacheGet, cacheSet, isCacheFresh } from '../../utils/cacheManager';

const USERS_CACHE_KEY = 'company-users';
const ANSWERS_CACHE_KEY_PREFIX = 'vendor-answers';
const CACHE_EXPIRY_MS = 30 * 60 * 1000;

const CompanyQuestionnairePage = () => {
  const [clients, setClients] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [allVendors, setAllVendors] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [questionnaireAnswers, setQuestionnaireAnswers] = useState([]);
  useEffect(() => {
    const fetchUsers = async () => {
      const cached = cacheGet(USERS_CACHE_KEY);
      if (cached && isCacheFresh(cached.timestamp, CACHE_EXPIRY_MS)) {
        const cachedUsers = cached.value;
        setClients(cachedUsers.filter(u => u.role === 'CLIENT'));
        setAllVendors(cachedUsers.filter(u => u.role === 'VENDOR'));
        return;
      }

      try {
        const token = getToken();
        if (!token) return;

        const res = await fetch(`${API_BASE_URL}/company/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        const usersArray = Array.isArray(data) ? data : data.data || [];

        const clientsList = usersArray.filter(u => u.role === 'CLIENT');
        const vendorsList = usersArray.filter(u => u.role === 'VENDOR');

        setClients(clientsList);
        setAllVendors(vendorsList);

        cacheSet(USERS_CACHE_KEY, usersArray);
      } catch (err) {
        console.error('Error fetching users:', err);
      }
    };

    fetchUsers();
  }, []);

  useEffect(() => {
    if (!selectedClient) {
      setVendors([]);
    } else {
      setVendors(allVendors.filter(v => v.clientId === selectedClient));
    }
    setSelectedVendor(null);
    setQuestionnaireAnswers([]);
  }, [selectedClient, allVendors]);

  useEffect(() => {
    if (!selectedVendor?.id) return;

    const fetchAnswers = async () => {
      const cacheKey = `${ANSWERS_CACHE_KEY_PREFIX}-${selectedVendor.id}`;
      const cached = cacheGet(cacheKey);
      if (cached && isCacheFresh(cached.timestamp, CACHE_EXPIRY_MS)) {
        setQuestionnaireAnswers(cached.value);
        return;
      }

      try {
        const token = getToken();
        if (!token) return;

        const res = await fetch(`${API_BASE_URL}/shared/vendor/${selectedVendor.id}/answers`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        const answers = Array.isArray(data) ? data : data.answers || [];

        setQuestionnaireAnswers(answers);
        cacheSet(cacheKey, answers);
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
