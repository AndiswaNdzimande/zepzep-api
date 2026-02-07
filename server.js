const express = require('express');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
app.use(express.json());

// Database connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'zepzep_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// ========================
// AUTHENTICATION ENDPOINTS
// ========================

// 1. Phone Registration with OTP
app.post('/api/v1/auth/register', async (req, res) => {
  try {
    const { phone_number, name } = req.body;
    
    // Check if user already exists
    const [existing] = await pool.execute(
      'SELECT id FROM users WHERE phone_number = ?',
      [phone_number]
    );
    
    if (existing.length > 0) {
      return res.status(400).json({ 
        error: 'User already exists. Please login.' 
      });
    }
    
    // Generate OTP (in production, send via SMS)
    const otp = Math.floor(100000 + Math.random() * 900000);
    const otpExpiry = new Date(Date.now() + 10 * 60000); // 10 minutes
    
    // Create user (temporary, pending OTP verification)
    const [result] = await pool.execute(
      `INSERT INTO users (phone_number, name, otp, otp_expiry, role) 
       VALUES (?, ?, ?, ?, 'customer')`,
      [phone_number, name, otp, otpExpiry]
    );
    
    // In MVP: Return OTP (remove in production!)
    res.json({
      success: true,
      message: 'OTP sent to phone',
      otp: otp, // SMS service would send this
      user_id: result.insertId
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// 2. Verify OTP & Login
app.post('/api/v1/auth/login', async (req, res) => {
  try {
    const { phone_number, otp } = req.body;
    
    // Find user with valid OTP
    const [users] = await pool.execute(
      `SELECT id, phone_number, name, role, otp, otp_expiry 
       FROM users 
       WHERE phone_number = ? AND otp = ? AND otp_expiry > NOW()`,
      [phone_number, otp]
    );
    
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid OTP or expired' });
    }
    
    const user = users[0];
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        phone: user.phone_number,
        role: user.role 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );
    
    // Clear OTP after successful login
    await pool.execute(
      'UPDATE users SET otp = NULL, otp_expiry = NULL WHERE id = ?',
      [user.id]
    );
    
    res.json({
      success: true,
      token: token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone_number,
        role: user.role
      }
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// =====================
// SHOP ENDPOINTS
// =====================

// 3. Get Nearby Shops
app.get('/api/v1/shops/nearby', async (req, res) => {
  try {
    const { lat, lng, radius = 5 } = req.query;
    
    // If no location provided, return all shops
    let query = `
      SELECT t.*, u.location_lat, u.location_lng 
      FROM tenants t
      LEFT JOIN users u ON t.id = u.tenant_id
      WHERE t.type = 'shop'
    `;
    
    // Add distance calculation if coordinates provided
    if (lat && lng) {
      query = `
        SELECT t.*, u.location_lat, u.location_lng,
        (6371 * acos(
          cos(radians(?)) * cos(radians(u.location_lat)) 
          * cos(radians(u.location_lng) - radians(?)) 
          + sin(radians(?)) * sin(radians(u.location_lat))
        )) AS distance
        FROM tenants t
        LEFT JOIN users u ON t.id = u.tenant_id
        WHERE t.type = 'shop'
        HAVING distance < ?
        ORDER BY distance
        LIMIT 20
      `;
    }
    
    const [shops] = await pool.execute(
      query, 
      lat && lng ? [lat, lng, lat, radius] : []
    );
    
    res.json({ shops });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch shops' });
  }
});

// 4. Get Shop Inventory
app.get('/api/v1/shops/:shopId/inventory', async (req, res) => {
  try {
    const { shopId } = req.params;
    const { category } = req.query;
    
    let query = `
      SELECT p.*, i.quantity, i.selling_price 
      FROM products p
      JOIN inventory i ON p.id = i.product_id
      WHERE i.tenant_id = ?
      ${category ? 'AND p.category = ?' : ''}
      ORDER BY p.category, p.name
    `;
    
    const [products] = await pool.execute(
      query, 
      category ? [shopId, category] : [shopId]
    );
    
    res.json({ products });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

// =====================
// ORDER ENDPOINTS
// =====================

// 5. Place Order
app.post('/api/v1/orders', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const { 
      customer_id, 
      shop_id, 
      items, 
      delivery_address,
      payment_method = 'cash'
    } = req.body;
    
    // Calculate total amount
    let totalAmount = 0;
    for (const item of items) {
      const [product] = await connection.execute(
        `SELECT p.name, i.selling_price 
         FROM products p
         JOIN inventory i ON p.id = i.product_id
         WHERE p.id = ? AND i.tenant_id = ?`,
        [item.product_id, shop_id]
      );
      
      if (!product.length) {
        throw new Error(`Product ${item.product_id} not found`);
      }
      
      totalAmount += product[0].selling_price * item.quantity;
    }
    
    // Add delivery fee (R20 for MVP)
    const deliveryFee = 20;
    const finalTotal = totalAmount + deliveryFee;
    
    // Create order
    const [orderResult] = await connection.execute(
      `INSERT INTO orders 
       (customer_id, shop_id, status, total_amount, delivery_fee, 
        payment_method, payment_status, delivery_address) 
       VALUES (?, ?, 'pending', ?, ?, ?, 'pending', ?)`,
      [customer_id, shop_id, finalTotal, deliveryFee, payment_method, delivery_address]
    );
    
    const orderId = orderResult.insertId;
    
    // Add order items
    for (const item of items) {
      await connection.execute(
        `INSERT INTO order_items 
         (order_id, product_id, quantity, unit_price) 
         VALUES (?, ?, ?, 
           (SELECT selling_price FROM inventory 
            WHERE product_id = ? AND tenant_id = ?)
         )`,
        [orderId, item.product_id, item.quantity, item.product_id, shop_id]
      );
      
      // Update inventory
      await connection.execute(
        `UPDATE inventory 
         SET quantity = quantity - ? 
         WHERE product_id = ? AND tenant_id = ?`,
        [item.quantity, item.product_id, shop_id]
      );
    }
    
    // Calculate Zep Points (1 point per R10 spent)
    const zepPoints = Math.floor(finalTotal / 10);
    await connection.execute(
      `UPDATE users 
       SET zep_points = zep_points + ? 
       WHERE id = ?`,
      [zepPoints, customer_id]
    );
    
    await connection.commit();
    
    res.json({
      success: true,
      order_id: orderId,
      total_amount: finalTotal,
      delivery_fee: deliveryFee,
      zep_points_earned: zepPoints,
      message: 'Order placed successfully'
    });
    
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ 
      error: 'Order placement failed',
      details: error.message 
    });
  } finally {
    connection.release();
  }
});

// 6. Track Order
app.get('/api/v1/orders/:orderId/track', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const [orders] = await pool.execute(
      `SELECT o.*, 
              s.business_name as shop_name,
              d.name as driver_name,
              d.phone_number as driver_phone
       FROM orders o
       LEFT JOIN tenants s ON o.shop_id = s.id
       LEFT JOIN users d ON o.driver_id = d.id
       WHERE o.id = ?`,
      [orderId]
    );
    
    if (!orders.length) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const order = orders[0];
    
    // Get order items
    const [items] = await pool.execute(
      `SELECT oi.*, p.name as product_name 
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = ?`,
      [orderId]
    );
    
    res.json({
      order: order,
      items: items,
      estimated_time: '25-40 minutes' // Mock for MVP
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// =====================
// LOYALTY & TRUST SCORE
// =====================

// 7. Redeem Zep Points
app.post('/api/v1/loyalty/redeem', async (req, res) => {
  try {
    const { user_id, points, reward_type } = req.body;
    
    // Check available points
    const [users] = await pool.execute(
      'SELECT zep_points FROM users WHERE id = ?',
      [user_id]
    );
    
    if (!users.length) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (users[0].zep_points < points) {
      return res.status(400).json({ 
        error: 'Insufficient points' 
      });
    }
    
    // Deduct points
    await pool.execute(
      'UPDATE users SET zep_points = zep_points - ? WHERE id = ?',
      [points, user_id]
    );
    
    // Record redemption (you'd need a redemptions table)
    await pool.execute(
      `INSERT INTO redemptions (user_id, points, reward_type, status) 
       VALUES (?, ?, ?, 'pending')`,
      [user_id, points, reward_type]
    );
    
    res.json({
      success: true,
      message: `Redeemed ${points} points for ${reward_type}`,
      remaining_points: users[0].zep_points - points
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Redemption failed' });
  }
});

// 8. Get Trust Score
app.get('/api/v1/users/me/trust-score', async (req, res) => {
  try {
    const userId = req.query.user_id || req.user?.id;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }
    
    // Simple trust score calculation (MVP)
    const [orders] = await pool.execute(
      `SELECT 
         COUNT(*) as total_orders,
         SUM(total_amount) as lifetime_value,
         AVG(DATEDIFF(NOW(), created_at)) as avg_recency_days
       FROM orders 
       WHERE customer_id = ? AND status = 'delivered'`,
      [userId]
    );
    
    const stats = orders[0];
    let score = 0;
    
    // Frequency (40 points max)
    score += Math.min(stats.total_orders * 4, 40);
    
    // Monetary (30 points max)
    score += Math.min((stats.lifetime_value || 0) / 100, 30);
    
    // Recency (30 points max)
    if (stats.avg_recency_days) {
      score += Math.max(30 - (stats.avg_recency_days / 10), 0);
    }
    
    // Ensure score is between 0-100
    score = Math.max(0, Math.min(score, 100));
    
    // Update user's trust score
    await pool.execute(
      'UPDATE users SET zep_trust_score = ? WHERE id = ?',
      [score, userId]
    );
    
    res.json({
      trust_score: Math.round(score),
      breakdown: {
        frequency_score: Math.min(stats.total_orders * 4, 40),
        monetary_score: Math.min((stats.lifetime_value || 0) / 100, 30),
        recency_score: stats.avg_recency_days ? 
          Math.max(30 - (stats.avg_recency_days / 10), 0) : 0
      },
      level: score > 80 ? 'Gold' : score > 50 ? 'Silver' : 'Bronze'
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to calculate trust score' });
  }
});

// =====================
// MIDDLEWARE (Authentication)
// =====================

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  jwt.verify(
    token, 
    process.env.JWT_SECRET || 'your-secret-key',
    (err, user) => {
      if (err) {
        return res.status(403).json({ error: 'Invalid token' });
      }
      req.user = user;
      next();
    }
  );
};

// Protected route example
app.get('/api/v1/users/me', authenticateToken, async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT id, name, phone_number, role, zep_points, zep_trust_score FROM users WHERE id = ?',
      [req.user.id]
    );
    
    if (!users.length) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ user: users[0] });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch user' });
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