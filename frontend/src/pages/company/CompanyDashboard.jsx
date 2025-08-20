/* eslint-disable no-unused-vars */
import { useOutletContext } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../utils/api';
import SummaryDashboard from '../../components/SummaryComponents/SummaryDashboard';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';
import { cacheGet, cacheSet } from '../../utils/cacheManager'; // 'isCacheFresh' is not needed here

const CACHE_EXPIRY_MS = 30 * 60 * 1000;
const COMPANY_STATS_KEY = 'company-stats';
const VENDOR_INFO_KEY_PREFIX = 'vendor-info';
const VENDOR_SUMMARY_KEY_PREFIX = 'vendor-summary';

export default function CompanyDashboard() {
  const { user, selectedVendorId } = useOutletContext();
  const [vendorInfo, setVendorInfo] = useState(null);
  const [companyStats, setCompanyStats] = useState(null);
  const [summaryText, setSummaryText] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (selectedVendorId) {
          // ---- Vendor Info ----
          const vendorInfoKey = `${VENDOR_INFO_KEY_PREFIX}-${selectedVendorId}`;
          const cachedVendor = cacheGet(vendorInfoKey);

          let vendorHeaders = { Authorization: `Bearer ${token}` };
          if (cachedVendor?.etag) {
            vendorHeaders['If-None-Match'] = cachedVendor.etag;
          }

          const vendorRes = await fetch(`${API_BASE_URL}/company/vendor/${selectedVendorId}`, {
            headers: vendorHeaders,
          });

          if (vendorRes.status === 304 && cachedVendor) {
            // Correctly set state from cached value
            setVendorInfo(cachedVendor.value);
          } else if (vendorRes.ok) {
            const vendorData = await vendorRes.json();
            // Correctly cache the value and etag
            cacheSet(vendorInfoKey, vendorData, vendorRes.headers.get('etag'));
            setVendorInfo(vendorData);
          }

          // ---- Vendor Summary ----
          const vendorSummaryKey = `${VENDOR_SUMMARY_KEY_PREFIX}-${selectedVendorId}`;
          const cachedSummary = cacheGet(vendorSummaryKey);

          let summaryHeaders = { Authorization: `Bearer ${token}` };
          if (cachedSummary?.etag) {
            summaryHeaders['If-None-Match'] = cachedSummary.etag;
          }

          const summaryRes = await fetch(`${API_BASE_URL}/shared/vendor-summary/${selectedVendorId}`, {
            headers: summaryHeaders,
          });

          if (summaryRes.status === 304 && cachedSummary) {
            setSummaryText(cachedSummary.value);
          } else if (summaryRes.ok) {
            const summaryData = await summaryRes.json();
            const content = summaryData?.data?.content || '';
            setSummaryText(content);
            cacheSet(vendorSummaryKey, content, summaryRes.headers.get('etag'));
          }

        } else {
          // ---- Company Stats ----
          const cachedStats = cacheGet(COMPANY_STATS_KEY);

          let statsHeaders = { Authorization: `Bearer ${token}` };
          if (cachedStats?.etag) {
            statsHeaders['If-None-Match'] = cachedStats.etag;
          }

          const statsRes = await fetch(`${API_BASE_URL}/company/stats/`, {
            headers: statsHeaders,
          });

          if (statsRes.status === 304 && cachedStats) {
            setCompanyStats(cachedStats.value);
          } else if (statsRes.ok) {
            const statsData = await statsRes.json();
            const stats = statsData?.data || null;
            setCompanyStats(stats);
            cacheSet(COMPANY_STATS_KEY, stats, statsRes.headers.get('etag'));
          }
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedVendorId, token]);

  // ---- PDF Extract ----
  const extractPdfText = async (file) => {
    // ... (no changes here) ...
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((s) => s.str).join(' ') + '\n';
    }
    return text.trim();
  };

  // ---- File Upload ----
  const handleFileUpload = async (file) => {
    if (!file || !selectedVendorId) return;
    setUploading(true);
    try {
      let extractedText = '';
      const ext = file.name.split('.').pop().toLowerCase();

      if (ext === 'docx') {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        extractedText = result.value.trim();
      } else if (ext === 'pdf') {
        extractedText = await extractPdfText(file);
      }

      if (extractedText) {
        setSummaryText(extractedText);
        // Do not cache immediately, wait for the server response
      }

      const formData = new FormData();
      formData.append('summary', file);

      const res = await fetch(`${API_BASE_URL}/company/vendor/${selectedVendorId}/summary`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (data?.data?.content) {
        setSummaryText(data.data.content);
        // Correctly cache the response from the server
        cacheSet(`${VENDOR_SUMMARY_KEY_PREFIX}-${selectedVendorId}`, data.data.content, res.headers.get('etag'));
      }
    } catch (err) {
      console.error('Error uploading file:', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {!selectedVendorId && companyStats && (
        <div className="bg-white rounded-lg border shadow p-6 space-y-4">
          <h3 className="text-lg font-semibold">Company Overview</h3>
          <ul className="text-sm text-gray-700 space-y-1">
            <li><strong>Total Clients:</strong> {companyStats.verifiedClients}</li>
            <li><strong>Total Vendors:</strong> {companyStats.verifiedVendors}</li>
            <li><strong>Summaries Done:</strong> {companyStats.totalSummaries}</li>
            <li><strong>Pending Users:</strong> {companyStats.pendingUsers}</li>
          </ul>
        </div>
      )}
      {selectedVendorId && (
        <>
          <div className="bg-white rounded-lg shadow border p-6 space-y-4">
            <h3 className="text-lg font-semibold">Upload Summary Document</h3>
            <div
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-gray-50"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleFileUpload(e.dataTransfer.files[0]); }}
            >
              <input
                type="file"
                accept=".docx,.pdf"
                id="summary-upload"
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files[0])}
              />
              <label htmlFor="summary-upload" className="cursor-pointer text-blue-600">
                {uploading ? 'Uploading...' : 'Click or drag a .docx/.pdf file here to upload'}
              </label>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow border p-6 space-y-2">
            <h3 className="text-lg font-semibold">Vendor Details</h3>
            {loading ? (
              <p>Loading...</p>
            ) : (
              <ul className="text-sm text-gray-700 space-y-1">
                <li><strong>Vendor:</strong> {vendorInfo?.vendorName || '-'}</li>
                <li><strong>Client:</strong> {vendorInfo?.clientName || '-'}</li>
                <li>
                  <strong>Questionnaire Status:</strong>
                  <span
                    className={`ml-2 font-medium ${vendorInfo?.vendorQuestionnaireStatus === 'COMPLETED' ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {vendorInfo?.vendorQuestionnaireStatus || '-'}
                  </span>
                </li>
              </ul>
            )}
          </div>

          <SummaryDashboard
            vendorId={selectedVendorId}
            role={user.role}
            vendorStatus={vendorInfo?.vendorQuestionnaireStatus}
            initialSummary={summaryText}
          />
        </>
      )}
    </div>
  );
}