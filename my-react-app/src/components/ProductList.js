import React, { useState, useEffect } from "react";

import { productsAPI } from "../services/api";

function ProductList({ shopId, onAddToCart }) {
  const [products, setProducts] = useState([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (shopId) {
      loadProducts();
    }
  }, [shopId]);

  const loadProducts = async () => {
    try {
      setLoading(true);

      const response = await productsAPI.getByShop(shopId);

      setProducts(response.data.data);
    } catch (err) {
      console.error("Failed to load products:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading products...</div>;
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No products available
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {products.map((product) => (
        <div key={product.id} className="bg-white rounded-lg shadow p-4">
          <h4 className="font-bold text-lg mb-2">{product.name}</h4>

          <p className="text-gray-600 text-sm mb-2">{product.description}</p>

          <div className="flex justify-between items-center mb-3">
            <span className="text-xl font-bold text-zepzep-blue">
              R{product.price}
            </span>

            <span className="text-sm text-gray-500">
              Stock: {product.stock_quantity}
            </span>
          </div>

          <button
            onClick={() => onAddToCart(product)}
            className="w-full bg-zepzep-blue text-white py-2 rounded hover:bg-zepzep-dark transition-colors"
          >
            Add to Cart
          </button>
        </div>
      ))}
    </div>
  );
}

export default ProductList;
