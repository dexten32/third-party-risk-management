import { useOutletContext } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../utils/api';
import SummaryDashboard from '../../components/SummaryComponents/SummaryDashboard';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';
import { cacheGet, cacheSet, isCacheFresh } from '../../utils/cacheManager';

const CACHE_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes
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

  // ----------------- FETCH DATA WITH CACHE -----------------
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (selectedVendorId) {
          // -------- Vendor Info --------
          const vendorInfoKey = `${VENDOR_INFO_KEY_PREFIX}-${selectedVendorId}`;
          const cachedVendor = cacheGet(vendorInfoKey);
          if (cachedVendor && isCacheFresh(cachedVendor.timestamp, CACHE_EXPIRY_MS)) {
            setVendorInfo(cachedVendor.value);
          } else {
            const vendorRes = await fetch(`${API_BASE_URL}/api/company/vendor/${selectedVendorId}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            const vendorData = await vendorRes.json();
            setVendorInfo(vendorData);
            cacheSet(vendorInfoKey, vendorData);
          }

          // -------- Vendor Summary --------
          const vendorSummaryKey = `${VENDOR_SUMMARY_KEY_PREFIX}-${selectedVendorId}`;
          const cachedSummary = cacheGet(vendorSummaryKey);
          if (cachedSummary && isCacheFresh(cachedSummary.timestamp, CACHE_EXPIRY_MS)) {
            setSummaryText(cachedSummary.value);
          } else {
            const summaryRes = await fetch(`${API_BASE_URL}/api/shared/vendor-summary/${selectedVendorId}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            const summaryData = await summaryRes.json();
            const content = summaryData?.data?.content || '';
            setSummaryText(content);
            cacheSet(vendorSummaryKey, content);
          }
        } else {
          // -------- Company Stats --------
          const cachedStats = cacheGet(COMPANY_STATS_KEY);
          if (cachedStats && isCacheFresh(cachedStats.timestamp, CACHE_EXPIRY_MS)) {
            setCompanyStats(cachedStats.value);
          } else {
            const statsRes = await fetch(`${API_BASE_URL}/api/company/stats/`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            const statsData = await statsRes.json();
            const stats = statsData?.data || null;
            setCompanyStats(stats);
            cacheSet(COMPANY_STATS_KEY, stats);
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

  // ----------------- FILE PARSING HELPERS -----------------
  const extractPdfText = async (file) => {
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

  // ----------------- HANDLE FILE UPLOAD -----------------
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
        cacheSet(`${VENDOR_SUMMARY_KEY_PREFIX}-${selectedVendorId}`, extractedText); // update cache
      }

      // Upload to backend
      const formData = new FormData();
      formData.append('summary', file);

      const res = await fetch(`${API_BASE_URL}/api/company/vendor/${selectedVendorId}/summary`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (data?.data?.content) {
        setSummaryText(data.data.content);
        cacheSet(`${VENDOR_SUMMARY_KEY_PREFIX}-${selectedVendorId}`, data.data.content); // overwrite cache
      }
    } catch (err) {
      console.error('Error uploading file:', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* ----------------- COMPANY OVERVIEW ----------------- */}
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

      {/* ----------------- VENDOR SECTION ----------------- */}
      {selectedVendorId && (
        <>
          {/* Upload Section */}
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

          {/* Vendor Details */}
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

          {/* Summary Tab */}
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
