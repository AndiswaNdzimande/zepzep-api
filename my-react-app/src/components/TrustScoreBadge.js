import React, { useState, useEffect } from "react";
import { customersAPI } from "../services/api";

function TrustScoreBadge({ customerId }) {
  const [trustData, setTrustData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrustScore();
  }, [customerId]);

  const loadTrustScore = async () => {
    try {
      const response = await customersAPI.getTrustScore(customerId);
      setTrustData(response.data.data);
    } catch (error) {
      console.error("Failed to load trust score:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading trust score...</div>;
  if (!trustData) return null;

  const getScoreColor = (score) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-blue-500";
    if (score >= 40) return "bg-yellow-500";
    return "bg-gray-500";
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-4">
      <h3 className="text-lg font-bold mb-2">Your Trust Score</h3>

      <div className="flex items-center gap-4">
        <div
          className={`${getScoreColor(trustData.trustScore)} rounded-full w-20 h-20 flex items-center justify-center`}
        >
          <span className="text-3xl font-bold text-white">
            {trustData.trustScore}
          </span>
        </div>

        <div className="flex-1">
          <div className="text-xl font-bold text-gray-800">
            {trustData.level}
          </div>
          <div className="text-sm text-gray-600">{trustData.explanation}</div>
          {trustData.suggestedCreditLimit > 0 && (
            <div className="mt-2 bg-green-100 text-green-800 px-3 py-1 rounded inline-block text-sm">
              ✓ Eligible for R{trustData.suggestedCreditLimit} shop credit
            </div>
          )}
        </div>
      </div>

      <div className="mt-4">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`${getScoreColor(trustData.trustScore)} h-2 rounded-full transition-all duration-500`}
            style={{ width: `${trustData.trustScore}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>New</span>
          <span>Fair</span>
          <span>Good</span>
          <span>Excellent</span>
        </div>
      </div>
    </div>
  );
}

export default TrustScoreBadge;
