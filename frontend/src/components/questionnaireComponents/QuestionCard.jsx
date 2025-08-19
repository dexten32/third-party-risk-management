import React from "react";
import { FiUpload, FiMessageSquare } from "react-icons/fi";

export default function QuestionCard({ question, answer, readOnly }) {
  const isFileType = question.answerType === "FILE";

  return (
    <div className="p-4 border rounded-lg bg-white shadow">
      <h3 className="font-semibold mb-3">{question.label}</h3>

      {answer ? (
        isFileType ? (
          <a
            href={answer.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline flex items-center gap-2"
          >
            <FiUpload className="text-lg" />
            {answer.fileName || "View File"}
          </a>
        ) : (
          <div className="p-2 border rounded bg-gray-100 text-gray-700 flex items-center gap-2">
            <FiMessageSquare className="text-gray-500" />
            {answer.comment}
          </div>
        )
      ) : (
        <div className="flex gap-3 justify-end mt-4">
          <button
            className={`flex items-center gap-2 px-3 py-1 rounded transition ${
              readOnly
                ? "bg-gray-600 text-gray-300 cursor-not-allowed"
                : "bg-blue-300 hover:bg-blue-300 text-blue-800"
            }`}
            
          >
            <FiUpload /> Upload
          </button>

          <button
            className={`flex items-center gap-2 px-3 py-1 rounded transition ${
              readOnly
                ? "bg-gray-300 text-gray-300 cursor-not-allowed"
                : "bg-green-300 hover:bg-green-300 hover:border-green-800 text-green-800"
            }`}
            disabled={readOnly}
          >
            <FiMessageSquare /> Comment
          </button>
        </div>
      )}
    </div>
  );
}
