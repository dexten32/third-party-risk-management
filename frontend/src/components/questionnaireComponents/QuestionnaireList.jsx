/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { API_BASE_URL } from "../../utils/api";
import {
  FaFileUpload, FaComment, FaSave, FaEdit, FaExchangeAlt,
  FaCheckCircle, FaTimesCircle
} from 'react-icons/fa';
const fixedQuestions = [
  { key: 'q1_company_profile', text: 'Q1. Provide your company profile.' },
  { key: 'q2_tax_compliance', text: 'Q2. Provide proof of tax compliance.' },
  { key: 'q3_business_license', text: 'Q3. Provide a copy of your business license.' },
  { key: 'q4_bank_details', text: 'Q4. Provide your bank details.' },
];

const QuestionnaireList = ({ vendorId, token, userRole, initialAnswers = [] }) => {
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [commentEditing, setCommentEditing] = useState({});

  useEffect(() => {
    const mapped = {};
    initialAnswers.forEach((ans) => {
      mapped[ans.questionKey] = ans;
    });
    setAnswers(mapped);
  }, [initialAnswers]);

  const handleFileChange = useCallback((questionKey, file) => {
    if (!file) return;
    const newFileUrl = URL.createObjectURL(file);
    setAnswers(prev => ({
      ...prev,
      [questionKey]: {
        ...prev[questionKey],
        file,
        fileUrl: newFileUrl,
        answerType: 'YES_FILE',
      }
    }));
  }, []);

  const handleCommentChange = useCallback((questionKey, comment) => {
    setAnswers(prev => ({
      ...prev,
      [questionKey]: {
        ...prev[questionKey],
        comment,
      }
    }));
  }, []);

  const handleAnswerSwitch = useCallback((questionKey, newAnswerType) => {
    setAnswers(prev => ({
      ...prev,
      [questionKey]: {
        ...prev[questionKey],
        answerType: newAnswerType,
        comment: newAnswerType === 'YES_FILE' ? null : prev[questionKey]?.comment,
        file: newAnswerType === 'NO_COMMENT' ? null : prev[questionKey]?.file,
        fileUrl: newAnswerType === 'NO_COMMENT' ? null : prev[questionKey]?.fileUrl,
      },
    }));
  }, []);

  const toggleEditMode = useCallback((questionKey) => {
    setCommentEditing(prev => ({ ...prev, [questionKey]: !prev[questionKey] }));
  }, []);

  const handleSubmit = useCallback(async () => {
    setLoading(true);
    try {
      const submissionPromises = Object.entries(answers).map(async ([key, ans]) => {
        if (!ans.answerType) return null;

        if (ans.answerType === 'YES_FILE' && ans.file) {
          const formData = new FormData();
          formData.append('file', ans.file);
          formData.append('questionKey', key);
          formData.append('answerType', 'YES_FILE');

          return fetch(`${API_BASE_URL}/vendor/questionnaire`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          });
        }

        if (ans.answerType === 'NO_COMMENT' && ans.comment) {
          return fetch(`${API_BASE_URL}/vendor/questionnaire`, {
            method: 'POST',
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              questionKey: key,
              comment: ans.comment,
              answerType: 'NO_COMMENT',
            }),
          });
        }

        return null;
      }).filter(Boolean);

      await Promise.all(submissionPromises);
      alert("All answers submitted successfully!");
    } catch (err) {
      console.error("Submission failed:", err);
      alert("Submission failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [answers, token]);

  return (
    <div className="p-4">
      {fixedQuestions.map(q => {
        const answer = answers[q.key] || {};
        const fileUploaded = !!answer.fileUrl;
        const isVendor = userRole === "VENDOR";

        return (
          <div key={q.key} className="mb-6 p-4 border rounded-lg shadow-sm bg-white">
            <div className="flex items-center mb-2">
              <h3 className="font-semibold text-lg text-gray-800 flex-grow">{q.text}</h3>

              {isVendor && !answer.answerType && (
                <div className="flex space-x-2">
                  <button
                    className="flex items-center p-2 text-sm text-blue-600 bg-blue-100 border border-blue-500 rounded"
                    onClick={() => handleAnswerSwitch(q.key, 'YES_FILE')}
                  >
                    <FaFileUpload className="mr-2" /> Upload
                  </button>
                  <button
                    className="flex items-center p-2 text-sm text-green-600 bg-green-100 border border-green-600 rounded"
                    onClick={() => handleAnswerSwitch(q.key, 'NO_COMMENT')}
                  >
                    <FaComment className="mr-2" /> Comment
                  </button>
                </div>
              )}
            </div>

            {answer.answerType === 'YES_FILE' && (
              <div className="mt-2">
                <div className="flex items-center space-x-4">
                  {fileUploaded ? (
                    <p className="text-gray-600 flex items-center">
                      <FaCheckCircle className="text-green-500 mr-2" /> File Uploaded:
                      <a
                        href={answer.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 text-blue-600 underline"
                      >
                        {answer.fileName || 'View File'}
                      </a>
                    </p>
                  ) : (
                    <p className="text-gray-500 flex items-center">
                      <FaTimesCircle className="text-red-500 mr-2" /> No file uploaded yet.
                    </p>
                  )}
                  {isVendor && (
                    <input
                      type="file"
                      onChange={(e) => handleFileChange(q.key, e.target.files[0])}
                      className="text-sm text-gray-700"
                    />
                  )}
                </div>

                {isVendor && (
                  <div className="mt-2 flex justify-end">
                    <button
                      className="flex items-center p-2 text-sm text-yellow-500 bg-yellow-100 border border-yellow-500 rounded"
                      onClick={() => handleAnswerSwitch(q.key, 'NO_COMMENT')}
                    >
                      <FaExchangeAlt className="mr-2" /> Change to Comment
                    </button>
                  </div>
                )}
              </div>
            )}

            {answer.answerType === 'NO_COMMENT' && (
              <div className="mt-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Comment:</label>
                {isVendor ? (
                  <>
                    <textarea
                      value={answer.comment || ""}
                      onChange={(e) => handleCommentChange(q.key, e.target.value)}
                      readOnly={!commentEditing[q.key]}
                      className="border border-gray-300 w-full p-2 rounded-md bg-white"
                      rows="3"
                      placeholder="Enter your comment here..."
                    />
                    <div className="mt-2 flex justify-end space-x-2">
                      <button
                        className="flex items-center p-2 text-blue-600 bg-blue-100 border-blue-600 rounded-md"
                        onClick={() => toggleEditMode(q.key)}
                      >
                        <FaEdit className="mr-1" /> {commentEditing[q.key] ? 'Done' : 'Edit'}
                      </button>
                      <button
                        className="flex items-center p-2 text-sm text-yellow-500 bg-yellow-100 border border-yellow-500 rounded"
                        onClick={() => handleAnswerSwitch(q.key, 'YES_FILE')}
                      >
                        <FaExchangeAlt className="mr-2" /> Change to File
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="text-gray-700 bg-gray-50 p-2 rounded-md border border-gray-200">
                    {answer.comment || "No comment provided"}
                  </p>
                )}
              </div>
            )}

            {!answer.answerType && (
              <p className="text-gray-500 italic mt-2">Please select an option to provide an answer.</p>
            )}
          </div>
        );
      })}

      <div className="mt-6 text-center">
        <button
          onClick={handleSubmit}
          disabled={userRole !== "VENDOR" || loading}
          className={`px-6 py-3 font-semibold rounded-lg border ${
            userRole === "VENDOR"
              ? "bg-red-100 text-red-600 border-red-600 hover:border-red-500"
              : "bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed"
          }`}
        >
          {loading ? "Submitting..." : "Submit To Review"}
        </button>
      </div>
    </div>
  );
};

export default QuestionnaireList;
