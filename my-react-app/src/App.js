import "./App.css";
import React, { useState } from "react";
import ShopList from "./components/ShopList";
import ProductList from "./components/ProductList";
import TrustScoreBadge from "./components/TrustScoreBadge";

function App() {
  const [selectedShop, setSelectedShop] = useState(null);
  const [cart, setCart] = useState([]);
  const [showAI, setShowAI] = useState(true);

  // Demo customer ID - replace with real user ID later
  const demoCustomerId = "user-001";

  const handleShopClick = (shop) => {
    setSelectedShop(shop);
  };

  const handleAddToCart = (product) => {
    const existingItem = cart.find((item) => item.id === product.id);

    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        ),
      );
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
    alert(`Added ${product.name} to cart!`);
  };

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-zepzep-blue text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Zep-Zep</h1>
              <p className="text-sm opacity-90">
                AI-Powered Township Marketplace
              </p>
            </div>
            <div className="flex gap-4 items-center">
              <button
                onClick={() => setShowAI(!showAI)}
                className="bg-purple-500 hover:bg-purple-600 px-4 py-2 rounded text-sm"
              >
                {showAI ? "🤖 AI: ON" : "🤖 AI: OFF"}
              </button>
              <div className="bg-white text-zepzep-blue px-4 py-2 rounded-lg">
                <span className="font-bold">Cart: R{cartTotal.toFixed(2)}</span>
                <span className="ml-2 bg-zepzep-blue text-white px-2 py-1 rounded-full text-xs">
                  {cart.length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {showAI && !selectedShop && (
          <TrustScoreBadge customerId={demoCustomerId} />
        )}

        {!selectedShop ? (
          <div>
            <h2 className="text-2xl font-bold mb-6 text-zepzep-dark">
              Browse Shops Near You
            </h2>
            <ShopList onShopClick={handleShopClick} />
          </div>
        ) : (
          <div>
            <button
              onClick={() => setSelectedShop(null)}
              className="mb-4 text-zepzep-blue hover:underline"
            >
              ← Back to Shops
            </button>
            <h2 className="text-2xl font-bold mb-6 text-zepzep-dark">
              {selectedShop.name}
            </h2>
            <ProductList
              shopId={selectedShop.id}
              onAddToCart={handleAddToCart}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-6 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p>Team Zep-Nebula | AI-Powered Commerce</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
