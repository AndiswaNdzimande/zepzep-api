import React, { useState, useEffect } from "react";

import { shopsAPI } from "../services/api";

function ShopList({ onShopClick }) {
  const [shops, setShops] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  useEffect(() => {
    loadShops();
  }, []);

  const loadShops = async () => {
    try {
      setLoading(true);

      const response = await shopsAPI.getAll();

      setShops(response.data.data);

      setError(null);
    } catch (err) {
      setError("Failed to load shops. Please try again.");

      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zepzep-blue"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {shops.map((shop) => (
        <div
          key={shop.id}
          onClick={() => onShopClick(shop)}
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg cursor-pointer transition-shadow"
        >
          <h3 className="text-xl font-bold text-zepzep-dark mb-2">
            {shop.name}
          </h3>

          <p className="text-gray-600 mb-2">{shop.address}</p>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">
              📍 {shop.latitude?.toFixed(4)}, {shop.longitude?.toFixed(4)}
            </span>

            <span className="bg-zepzep-blue text-white px-3 py-1 rounded-full text-xs">
              {shop.subscription_tier}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default ShopList;
