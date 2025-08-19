/* eslint-disable no-unused-vars */
import { useState, useEffect, useCallback } from "react";
import { API_BASE_URL } from "../../utils/api";
import Button from "../button";

export default function SummaryDashboard({ vendorId, role, vendorStatus, initialSummary }) {
  const [summary, setSummary] = useState(initialSummary || "");
  const [draft, setDraft] = useState(initialSummary || "");
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setSummary(initialSummary || "");
    setDraft(initialSummary || "");
  }, [initialSummary]);

  const handleSaveLocal = useCallback(() => {
    if (!vendorId) return;
    localStorage.setItem(`vendor_${vendorId}_summary`, draft);
    setSummary(draft);
    setIsEditing(false);
  }, [draft, vendorId]);


  const handleSubmit = useCallback(async () => {
    if (!vendorId) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/company/vendor/${vendorId}/summary`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ content: isEditing ? draft : summary }),
      });

      if (!res.ok) throw new Error("Failed to submit summary");

      const data = await res.json();
      setSummary(data.data.content);
      setDraft(data.data.content);
      setIsEditing(false);
    } catch (err) {
      console.error("Error submitting summary:", err);
    } finally {
      setSubmitting(false);
    }
  }, [vendorId, draft, summary, isEditing]);

  return (
    <div className="bg-white rounded-lg shadow border p-6 space-y-4">
      <h3 className="text-lg font-semibold">Summary</h3>


      {!isEditing ? (
        <div className="text-gray-700 whitespace-pre-wrap border rounded p-3 bg-gray-50">
          {summary || "No summary uploaded yet."}
        </div>
      ) : (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="w-full h-60 border rounded-lg bg-white p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          readOnly={role !== "COMPANY"} 
        />
      )}

      {role === "COMPANY" && (
        <div className="flex gap-3">
          {!isEditing ? (
            <Button
              className="bg-blue-100 text-blue-600 border-blue-600"
              onClick={() => setIsEditing(true)}
            >
              Edit
            </Button>
          ) : (
            <>
              <Button
                className="bg-yellow-100 text-yellow-500 border-yellow-500"
                onClick={handleSaveLocal}
              >
                Save (Local)
              </Button>
              <Button
                className="bg-red-100 text-red-500 border-red-500"
                onClick={() => {
                  setIsEditing(false);
                  setDraft(summary);
                }}
              >
                Cancel
              </Button>
            </>
          )}

          <Button
            className="bg-emerald-100 text-emerald-600 border-emerald-600"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? "Submitting..." : "Submit"}
          </Button>
        </div>
      )}
    </div>
  );
}
