const express = require('express');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const { detectFace, compareFaces, loadModels } = require('./face-recognition');
const cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(cors());
app.use(express.static('public'));

// MySQL Connection Pool
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'attendance_system',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '7d';

// Initialize face recognition models
loadModels().then(() => {
  console.log('Face recognition models loaded');
}).catch(err => {
  console.error('Failed to load face recognition models:', err);
  process.exit(1);
});

// File upload configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Routes
app.post('/api/register', upload.single('faceImage'), async (req, res) => {
  try {
    const { email, password, fullName } = req.body;
    
    // Validate input
    if (!email || !password || !req.file) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if user exists
    const [users] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (users.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Process face image
    const tempImagePath = path.join(__dirname, 'temp', `${Date.now()}.jpg`);
    require('fs').writeFileSync(tempImagePath, req.file.buffer);
    const faceDescriptor = await detectFace(tempImagePath);
    require('fs').unlinkSync(tempImagePath);

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Store user in database
    await pool.query(
      'INSERT INTO users (email, password, full_name, face_encoding) VALUES (?, ?, ?, ?)',
      [email, hashedPassword, fullName, JSON.stringify(faceDescriptor)]
    );

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({ token, user: { email: user.email, fullName: user.full_name } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/attendance', authenticateToken, upload.single('faceImage'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { latitude, longitude } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'Face image required' });
    }

    // Process face image
    const tempImagePath = path.join(__dirname, 'temp', `${Date.now()}.jpg`);
    require('fs').writeFileSync(tempImagePath, req.file.buffer);
    const currentDescriptor = await detectFace(tempImagePath);
    require('fs').unlinkSync(tempImagePath);

    // Get stored face descriptor
    const [users] = await pool.query('SELECT face_encoding FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const storedDescriptor = JSON.parse(users[0].face_encoding);
    const isMatch = compareFaces(storedDescriptor, currentDescriptor);

    // Record attendance
    await pool.query(
      'INSERT INTO attendance (user_id, latitude, longitude, face_match) VALUES (?, ?, ?, ?)',
      [userId, latitude, longitude, isMatch]
    );

    res.json({ 
      success: true,
      faceMatch: isMatch,
      message: isMatch ? 'Attendance recorded' : 'Face verification failed'
    });
  } catch (error) {
    console.error('Attendance error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/history', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = 'SELECT * FROM attendance WHERE user_id = ?';
    const params = [req.user.id];

    if (startDate && endDate) {
      query += ' AND timestamp BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    query += ' ORDER BY timestamp DESC LIMIT 100';

    const [records] = await pool.query(query, params);
    res.json(records);
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// Middleware for JWT authentication
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const user = jwt.verify(token, JWT_SECRET);
    req.user = user;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(403).json({ error: 'Invalid or expired token' });
  }
}

// Create temp directory if not exists
const fs = require('fs');
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
