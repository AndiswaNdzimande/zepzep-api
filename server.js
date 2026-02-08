require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const app = express();
app.use(express.json());

// MongoDB Connection
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ========================
// AUTHENTICATION ENDPOINTS
// ========================

app.post("/api/v1/auth/register", async (req, res) => {
  try {
    const { phone_number, name } = req.body;

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000);

    res.json({
      success: true,
      message: "OTP sent to phone",
      otp: otp,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Registration failed" });
  }
});

app.post("/api/v1/auth/login", async (req, res) => {
  try {
    const { phone_number, otp } = req.body;

    // Generate JWT token
    const token = jwt.sign({ phone: phone_number }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      success: true,
      token: token,
      user: {
        phone: phone_number,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Login failed" });
  }
});

// =====================
// SHOP ENDPOINTS
// =====================

app.get("/api/v1/shops/nearby", async (req, res) => {
  try {
    const mockShops = [
      { id: 1, name: "Quick Mart", distance: "1.2km" },
      { id: 2, name: "Fresh Foods", distance: "2.5km" },
    ];
    res.json({ shops: mockShops });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch shops" });
  }
});

app.get("/api/v1/shops/:shopId/inventory", async (req, res) => {
  try {
    const mockProducts = [
      { id: 1, name: "Bread", price: 15 },
      { id: 2, name: "Milk", price: 25 },
    ];
    res.json({ products: mockProducts });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch inventory" });
  }
});

// =====================
// ORDER ENDPOINTS
// =====================

app.post("/api/v1/orders", async (req, res) => {
  try {
    const { customer_id, shop_id, items } = req.body;

    res.json({
      success: true,
      order_id: 12345,
      message: "Order placed successfully",
    });
  } catch (error) {
    res.status(500).json({ error: "Order placement failed" });
  }
});

app.get("/api/v1/orders/:orderId/track", async (req, res) => {
  try {
    res.json({
      order_id: req.params.orderId,
      status: "pending",
      estimated_time: "25-40 minutes",
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch order" });
  }
});

// =====================
// LOYALTY & TRUST SCORE
// =====================

app.post("/api/v1/loyalty/redeem", async (req, res) => {
  try {
    res.json({
      success: true,
      message: "Points redeemed successfully",
    });
  } catch (error) {
    res.status(500).json({ error: "Redemption failed" });
  }
});

app.get("/api/v1/users/me/trust-score", async (req, res) => {
  try {
    res.json({
      trust_score: 75,
      level: "Silver",
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to calculate trust score" });
  }
});

// Protected route
app.get("/api/v1/users/me", async (req, res) => {
  try {
    res.json({
      user: {
        id: 1,
        name: "Test User",
        phone: "+27123456789",
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// =====================
// START SERVER
// =====================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Zep Zep API server running on port ${PORT}`);
  console.log(`Available endpoints:`);
  console.log(`  POST   /api/v1/auth/register`);
  console.log(`  POST   /api/v1/auth/login`);
  console.log(`  GET    /api/v1/shops/nearby`);
  console.log(`  GET    /api/v1/shops/:id/inventory`);
  console.log(`  POST   /api/v1/orders`);
  console.log(`  GET    /api/v1/orders/:id/track`);
  console.log(`  POST   /api/v1/loyalty/redeem`);
  console.log(`  GET    /api/v1/users/me/trust-score`);
  console.log(`  GET    /api/v1/users/me (protected)`);
});
