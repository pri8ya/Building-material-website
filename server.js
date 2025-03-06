const express = require("express");
const session = require("express-session");
const mysql = require("mysql2");
const path = require("path");
const bcrypt = require("bcryptjs");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(express.static(path.join(__dirname, "../frontend")));

// Database connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "", // Add your MySQL password
  database: "cement_orders",
});

db.connect((err) => {
  if (err) {
    console.error("Error connecting to the database:", err.message);
    return;
  }
  console.log("Connected to MySQL database!");
});

// Session setup
app.use(
  session({
    secret: "your-secret-key",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }, // Set to true if using HTTPS
  })
);

// Routes
app.get("/", (req, res) => {
  if (req.session.user) return res.redirect("/index");
  res.sendFile(path.join(__dirname, "../frontend/mainpage.html"));
});

app.get("/index", (req, res) => {
  if (!req.session.user) return res.redirect("/");
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

app.get("/mainpage", (req, res) => {
  if (!req.session.user) return res.redirect("/");
  res.sendFile(path.join(__dirname, "../frontend/mainpage.html"));
});

// Signup route
app.post("/signup", async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) return res.status(400).json({ error: "All fields required" });

  try {
    const [userExists] = await db.promise().query("SELECT * FROM users WHERE username = ? OR email = ?", [username, email]);
    if (userExists.length > 0) return res.status(400).json({ error: "Username or email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.promise().query("INSERT INTO users (username, email, password) VALUES (?, ?, ?)", [username, email, hashedPassword]);

    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Login route
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  db.query("SELECT * FROM users WHERE username = ?", [username], (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (results.length === 0) return res.status(400).json({ error: "User not found" });

    const user = results[0];
    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) return res.status(500).json({ error: "Error comparing passwords" });
      if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

      req.session.user = user;
      res.redirect("/mainpage");
    });
  });
});

// Logout route
app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: "Failed to logout" });
    res.redirect("/");
  });
});

// Order submission route
app.post("/submitOrder", (req, res) => {
  console.log("Received order data:", req.body);
  const { full_name, phone_number, delivery_address, materials, transport_option } = req.body;
  if (!full_name || !phone_number || !delivery_address || !materials || !transport_option) {
    return res.status(400).json({ error: "All fields are required" });
  }

  const query = `INSERT INTO orders (full_name, phone_number, delivery_address, materials, transport_option) VALUES (?, ?, ?, ?, ?)`;
  db.query(query, [full_name, phone_number, delivery_address, materials.join(", "), transport_option], (err) => {
    if (err) return res.status(500).json({ error: "Failed to submit order" });
    res.status(200).json({ message: "Order submitted successfully" });
  });
});

// Fetch all orders
app.get("/api/orders", (req, res) => {
  db.query("SELECT * FROM orders", (err, result) => {
    if (err) return res.status(500).json({ message: "Database error" });
    res.json(result);
  });
});

// Approve order
app.put("/api/orders/:orderId", (req, res) => {
  const orderId = req.params.orderId;
  const { status } = req.body;
  if (status !== "Approved") return res.status(400).json({ message: "Invalid status" });

  db.query("UPDATE orders SET status = ? WHERE id = ?", [status, orderId], (err, result) => {
    if (err) return res.status(500).json({ message: "Database error" });
    if (result.affectedRows === 0) return res.status(404).json({ message: "Order not found" });
    res.status(200).json({ message: "Order approved successfully" });
  });
});


// Dashboard route
app.get('/dashboard', (req, res) => {
  const queryTotalOrders = 'SELECT COUNT(*) AS totalOrders FROM orders';
  const queryApprovedOrders = 'SELECT COUNT(*) AS approvedOrders FROM orders WHERE status = "Approved"';

  // Query to get total orders
  db.query(queryTotalOrders, (err, totalResult) => {
    if (err) {
      console.error('Error fetching total orders:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    // Query to get approved orders
    db.query(queryApprovedOrders, (err, approvedResult) => {
      if (err) {
        console.error('Error fetching approved orders:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      res.json({
        totalOrders: totalResult[0].totalOrders,
        approvedOrders: approvedResult[0].approvedOrders
      });
    });
  });
});






  // Update order status to Approved
  app.post('/update-order', (req, res) => {
    const { id, status } = req.body;
  
    // Update order status to Approved
    let query = `UPDATE orders SET status = ? WHERE id = ?`;
  
    db.query(query, [status, id], (err, result) => {
      if (err) {
        console.error('Error updating order:', err);
        return res.status(500).send('Failed to update order');
      }
  
      if (status === 'Approved') {
        console.log(`Order ${id} approved. Scheduling delivery update...`);
  
        setTimeout(() => {
          console.log("Auto-updating order to Delivered...");
  
          // Update status to 'Delivered' and set delivery_date to CURRENT_DATE
          let updateQuery = `UPDATE orders SET status = 'Delivered', delivery_date = CURRENT_DATE WHERE id = ?`;
          db.query(updateQuery, [id], (err, result) => {
            if (err) {
              console.error('Error auto-updating to Delivered:', err);
            } else {
              console.log(`Order ${id} auto-updated to Delivered.`);
            }
          });
        }, 24 * 60 * 60 * 1000); // Set to 24 hours (in milliseconds)
      }
  
      res.json({ message: "Order status updated successfully" });
    });
  });
  


// Admin login
app.post("/admin/login", (req, res) => {
  const { username, password } = req.body;
  if (username === "admin" && password === "admin123") {
    req.session.admin = true;
    return res.redirect("/Admin.html");
  }
  res.status(401).json({ error: "Invalid credentials" });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
