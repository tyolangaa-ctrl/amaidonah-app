const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const path = require('path');
const multer = require('multer');
require('dotenv').config();

const app = express();
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer configuration for image uploads - store in uploads folder
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    // Accept images and videos
    if (ext.match(/.(jpg|jpeg|png|gif|webm|mp4|mov|avi)$/)) {
      cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    } else {
      // Reject non-image/video files
      cb(new Error('Only image and video files are allowed!'), false);
    }
  }
});

const upload = multer({ storage: storage, fileFilter: (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext.match(/.(jpg|jpeg|png|gif|webm|mp4|mov|avi)$/)) {
    cb(null, true);
  } else {
    cb(new Error('Only image and video files are allowed!'), false);
  }
}});
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.admin = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ─── AUTH ───
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM admins WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
    const admin = result.rows[0];
    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: admin.id, email: admin.email, name: admin.name }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, admin: { id: admin.id, email: admin.email, name: admin.name } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const existing = await pool.query('SELECT * FROM admins WHERE email = $1', [email]);
    if (existing.rows.length > 0) return res.status(400).json({ error: 'Email already registered' });
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO admins (email, password, name) VALUES ($1, $2, $3) RETURNING id, email, name',
      [email, hashedPassword, name || 'Admin']
    );
    const newAdmin = result.rows[0];
    const token = jwt.sign({ id: newAdmin.id, email: newAdmin.email, name: newAdmin.name }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, admin: { id: newAdmin.id, email: newAdmin.email, name: newAdmin.name } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, email, name FROM admins WHERE id = $1', [req.admin.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const result = await pool.query('SELECT * FROM admins WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      // Don't reveal if email exists or not for security
      return res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
    }
    // Generate a reset token
    const resetToken = jwt.sign({ id: result.rows[0].id, email: result.rows[0].email }, process.env.JWT_SECRET, { expiresIn: '1h' });
    // In a real app, you would send this via email
    // For now, we'll just return it (not secure for production but works for demo)
    res.json({ message: 'Reset token generated', resetToken });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/reset-password', authMiddleware, async (req, res) => {
  try {
    const { newPassword } = req.body;
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE admins SET password = $1 WHERE id = $2', [hashedPassword, req.admin.id]);
    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await pool.query('SELECT * FROM admins WHERE id = $1', [req.admin.id]);
    const valid = await bcrypt.compare(currentPassword, result.rows[0].password);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });
    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE admins SET password = $1 WHERE id = $2', [hashed, req.admin.id]);
    res.json({ message: 'Password updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── SITE SETTINGS ───
app.get('/api/settings', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM site_settings');
    const settings = {};
    result.rows.forEach(r => settings[r.key] = r.value);
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/settings', authMiddleware, async (req, res) => {
  try {
    const entries = Object.entries(req.body);
    for (const [key, value] of entries) {
      await pool.query(
        `INSERT INTO site_settings (key, value, updated_at) VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
        [key, value]
      );
    }
    res.json({ message: 'Settings updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GENERIC CRUD HELPER ───
function createCrudRoutes(tableName, idField = 'id', hasSortOrder = true) {
  app.get(`/api/${tableName}`, async (req, res) => {
    try {
      const orderBy = hasSortOrder ? 'ORDER BY sort_order ASC, id ASC' : 'ORDER BY id ASC';
      const result = await pool.query(`SELECT * FROM ${tableName} ${orderBy}`);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get(`/api/${tableName}/:id`, async (req, res) => {
    try {
      const result = await pool.query(`SELECT * FROM ${tableName} WHERE ${idField} = $1`, [req.params.id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST with optional image upload
  app.post(`/api/${tableName}`, authMiddleware, upload.single('image'), async (req, res) => {
    try {
      const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
      // Get all text fields from body, excluding the image field
      const textFields = Object.keys(req.body).filter(k => k !== 'image' && k !== idField);
      const values = textFields.map(k => req.body[k]);
      // If there's an image, add it as the first value (or specific field)
      let allValues = [];
      if (imageUrl) {
        // Find the image_url position in fields and insert it
        // We'll handle this by adding image_url separately
        const imageKey = Object.keys(req.body).find(k => k.includes('image') || k === 'image_url');
        if (imageKey) {
          allValues = [...values, imageUrl];
        } else {
          allValues = [imageUrl, ...values];
        }
      } else {
        allValues = values;
      }
      const placeholders = allValues.map((_, i) => `$${i + 1}`);
      const result = await pool.query(
        `INSERT INTO ${tableName} (${allValues.length > 0 ? Object.keys(req.body).filter(k => k !== 'image' && k !== idField).join(',') + ', image_url' : ''}) VALUES (${placeholders.join(',')}) RETURNING *`,
        allValues
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

app.put(`/api/${tableName}/:id`, authMiddleware, upload.single('image'), async (req, res) => {
    try {
      let imageUrl = null;
      if (req.file) {
        imageUrl = `/uploads/${req.file.filename}`;
      } else {
        // Keep existing image - fetch the current record
        const current = await pool.query(`SELECT image_url FROM ${tableName} WHERE ${idField} = $1`, [req.params.id]);
        if (current.rows.length > 0) {
          imageUrl = current.rows[0].image_url;
        }
      }
      // Update text fields from body (excluding image field)
      const updateData = {};
      Object.keys(req.body).forEach(k => {
        if (k !== 'image' && k !== idField) {
          updateData[k] = req.body[k];
        }
      });
      updateData.updated_at = new Date();
      
      const setClause = Object.keys(updateData).map((k, i) => `${k} = $${i + 1}`);
      const values = Object.values(updateData);
      values.push(req.params.id);
      
      const result = await pool.query(
        `UPDATE ${tableName} SET ${setClause.join(', ')}, updated_at = NOW() WHERE ${idField} = $${values.length} RETURNING *`,
        values
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete(`/api/${tableName}/:id`, authMiddleware, async (req, res) => {
    try {
      const result = await pool.query(`DELETE FROM ${tableName} WHERE ${idField} = $1 RETURNING *`, [req.params.id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json({ message: 'Deleted' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}

createCrudRoutes('about', 'id');
createCrudRoutes('core_values', 'id');
createCrudRoutes('team_members', 'id');
createCrudRoutes('services', 'id');
createCrudRoutes('pageant_winners', 'id');
createCrudRoutes('pageant_packages', 'id');
createCrudRoutes('sponsor_packages', 'id');
createCrudRoutes('projects', 'id');
createCrudRoutes('gallery_items', 'id');
createCrudRoutes('blog_posts', 'id', false);
createCrudRoutes('training_schedule', 'id');

// ─── FORM SUBMISSIONS ───
app.get('/api/submissions/contact', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM contact_submissions ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/submissions/contact', async (req, res) => {
  try {
    const { first_name, last_name, email, phone, subject, message } = req.body;
    const result = await pool.query(
      'INSERT INTO contact_submissions (first_name, last_name, email, phone, subject, message) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [first_name, last_name, email, phone, subject, message]
    );
    res.status(201).json({ message: 'Submitted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/submissions/contact/:id/read', authMiddleware, async (req, res) => {
  try {
    await pool.query('UPDATE contact_submissions SET read = true WHERE id = $1', [req.params.id]);
    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/submissions/models', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM model_applications ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/submissions/models', async (req, res) => {
  try {
    const { full_name, email, phone, age, state, about } = req.body;
    const result = await pool.query(
      'INSERT INTO model_applications (full_name, email, phone, age, state, about) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [full_name, email, phone, age, state, about]
    );
    res.status(201).json({ message: 'Application submitted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/submissions/models/:id/read', authMiddleware, async (req, res) => {
  try {
    await pool.query('UPDATE model_applications SET read = true WHERE id = $1', [req.params.id]);
    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/submissions/partnerships', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM partnership_inquiries ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/submissions/partnerships', async (req, res) => {
  try {
    const { company_name, contact_person, email, interest } = req.body;
    const result = await pool.query(
      'INSERT INTO partnership_inquiries (company_name, contact_person, email, interest) VALUES ($1,$2,$3,$4) RETURNING *',
      [company_name, contact_person, email, interest]
    );
    res.status(201).json({ message: 'Inquiry submitted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/submissions/partnerships/:id/read', authMiddleware, async (req, res) => {
  try {
    await pool.query('UPDATE partnership_inquiries SET read = true WHERE id = $1', [req.params.id]);
    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DASHBOARD STATS ───
app.get('/api/dashboard', authMiddleware, async (req, res) => {
  try {
    const [contacts, models, partners, blogs, projects, gallery] = await Promise.all([
      pool.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE read = false) as unread FROM contact_submissions'),
      pool.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE read = false) as unread FROM model_applications'),
      pool.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE read = false) as unread FROM partnership_inquiries'),
      pool.query('SELECT COUNT(*) as total FROM blog_posts'),
      pool.query('SELECT COUNT(*) as total FROM projects'),
      pool.query('SELECT COUNT(*) as total FROM gallery_items'),
    ]);
    res.json({
      contactSubmissions: { total: +contacts.rows[0].total, unread: +contacts.rows[0].unread },
      modelApplications: { total: +models.rows[0].total, unread: +models.rows[0].unread },
      partnershipInquiries: { total: +partners.rows[0].total, unread: +partners.rows[0].unread },
      blogPosts: +blogs.rows[0].total,
      projects: +projects.rows[0].total,
      galleryItems: +gallery.rows[0].total,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve admin panel
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📋 Admin panel: http://localhost:${PORT}/admin`);
});
