const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const session = require('express-session');
const path = require('path');
const cors = require('cors');


const app = express();
const port = 3000;

// Database connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'cement_orders',
});

db.connect((err) => {
  if (err) throw err;
  console.log('Connected to MySQL database');
});

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true,
  })
);

// Define the path to the frontend folder
const frontendPath = path.join(__dirname, '../frontend');

// Serve static files from the frontend folder
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Serve Mainpage.html when the root URL is accessed
app.get('/', (req, res) => {
  if (req.session.loggedIn) {
    // If user is logged in, serve Mainpage.html
    res.sendFile(path.join(__dirname, '..', 'frontend', 'Mainpage.html'));
  } else {
    // If not logged in, redirect to login page
    res.redirect('/login');
  }
});

// Serve login.html page
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'login.html'));
});

// Serve signup.html page
app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'signup.html'));
});
// Handle POST request to /signup
app.post('/signup', (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required' });
  }

  // Hash the password using bcrypt
  bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) {
      console.error('Error hashing password:', err);
      return res.status(500).json({ error: 'Failed to hash password' });
    }

    // Check if the email already exists in the database
    const checkEmailQuery = 'SELECT * FROM users WHERE email = ?';
    db.query(checkEmailQuery, [email], (err, result) => {
      if (err) {
        console.error('Error checking email:', err);
        return res.status(500).json({ error: 'Failed to check email' });
      }

      if (result.length > 0) {
        console.log('Email already registered');
        return res.status(400).json({ error: 'Email is already registered' });
      }

      // Insert new user into the database, including email
      const query = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';
      db.query(query, [username, email, hashedPassword], (err, result) => {
        if (err) {
          console.error('Error inserting user:', err);
          return res.status(500).json({ error: 'Failed to register user' });
        }
        console.log('User registered successfully');
        res.redirect('/login'); // Redirect to login page after successful signup
      });
    });
  });
});

// Handle POST request to /login
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Check if the user exists in the database (case-insensitive)
  const query = 'SELECT * FROM users WHERE username = ? COLLATE UTF8_GENERAL_CI';
  db.query(query, [username], (err, results) => {
    if (err) {
      return res.status(500).send(`
        <html>
          <body>
            <script type="text/javascript">
              alert("Error querying database. Please try again.");
              window.location.href = "/login";
            </script>
          </body>
        </html>
      `);
    }

    if (results.length > 0) {
      // Compare the provided password with the stored hashed password
      bcrypt.compare(password, results[0].password, (err, match) => {
        if (err) {
          return res.status(500).send(`
            <html>
              <body>
                <script type="text/javascript">
                  alert("Error comparing passwords. Please try again.");
                  window.location.href = "/login";
                </script>
              </body>
            </html>
          `);
        }

        if (match) {
          req.session.loggedIn = true; // Set session variable to indicate the user is logged in
          return res.send(`
            <html>
              <body>
                <script type="text/javascript">
                  alert("Login successful!");
                  window.location.href = "/Mainpage.html";
                </script>
              </body>
            </html>
          `); // Redirect to Mainpage.html with alert
        } else {
          return res.send(`
            <html>
              <body>
                <script type="text/javascript">
                  alert("Invalid credentials. Please check your username and password.");
                  window.location.href = "/login";
                </script>
              </body>
            </html>
          `); // Inform the user about invalid credentials
        }
      });
    } else {
      return res.send(`
        <html>
          <body>
            <script type="text/javascript">
              alert("User not found. Please check your username.");
              window.location.href = "/login";
            </script>
          </body>
        </html>
      `); // Inform the user if the user is not found
    }
  });
});

// API route to create a new order
app.use(cors());
app.post("/api/orders", (req, res) => {
  const { fullName, phoneNumber, deliveryAddress, materials, transport } = req.body;

  const query = `
    INSERT INTO orders (full_name, phone_number, delivery_address, materials, transport_option, status, created_at)
    VALUES (?, ?, ?, ?, ?, 'Pending', NOW())
  `;

  db.query(query, [fullName, phoneNumber, deliveryAddress, JSON.stringify(materials), transport], (err, result) => {
    if (err) {
      console.error("Error inserting order:", err.message);
      res.status(500).json({ error: "Failed to place the order." });
      return;
    }
    res.status(201).json({ message: "Order placed successfully!", orderId: result.insertId });
  });
});

// API route to get all orders (for admin)
app.get("/api/orders", (req, res) => {
  const query = "SELECT * FROM orders";

  db.query(query, (err, results) => {
    if (err) {
      console.error("Error retrieving orders:", err.message);
      res.status(500).json({ error: "Failed to retrieve orders." });
      return;
    }
    res.status(200).json(results);
  });
});

// PUT route to approve the order
app.put('/api/orders/:id', (req, res) => {
  const orderId = req.params.id;

  const query = 'UPDATE orders SET status = ? WHERE id = ?';

  db.query(query, ['Approved', orderId], (err, result) => {
    if (err) {
      console.error('Error updating order status:', err.message);
      return res.status(500).json({ error: 'Failed to approve the order.' });
    }

    if (result.affectedRows > 0) {
      res.status(200).json({ message: 'Order approved successfully' });
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  });
});

// Serve the admin page after successful login
app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;

  // Query to check the username and password
  const query = 'SELECT * FROM admin_users WHERE username = ? AND password = ?';
  db.query(query, [username, password], (err, results) => {
      if (err) {
          res.status(500).send('Database query error');
      } else if (results.length > 0) {
          // Login successful, redirect to admin.html
          res.sendFile(path.join(__dirname, '..', 'frontend', 'Admin.html'));  // Adjust path here
      } else {
          // Invalid credentials
          res.status(401).send('Invalid username or password');
      }
  });
});

// Other Routes (e.g., Order APIs, Signup, etc.)
app.post('/signup', (req, res) => {
  const { username, email, password } = req.body;

  bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) {
      console.error('Error hashing password:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    const query = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';
    db.query(query, [username, email, hashedPassword], (err, result) => {
      if (err) {
        console.error('Error inserting user:', err);
        return res.status(500).json({ error: 'Failed to register user' });
      }
      res.redirect('/login');
    });
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
