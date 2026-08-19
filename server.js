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

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + ext);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext.match(/\.(jpg|jpeg|png|gif|webp|webm|mp4|mov|avi)$/)) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed'), false);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }
});

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
      return res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
    }
    const resetToken = jwt.sign(
      { id: result.rows[0].id, email: result.rows[0].email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    res.json({ message: 'Reset token generated', resetToken });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;
    if (!resetToken || !newPassword) {
      return res.status(400).json({ error: 'Reset token and new password are required' });
    }
    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE admins SET password = $1 WHERE id = $2', [hashedPassword, decoded.id]);
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

  app.post(`/api/${tableName}`, authMiddleware, upload.single('image'), async (req, res) => {
    try {
      const cols = [];
      const vals = [];
      let idx = 1;

      Object.keys(req.body).forEach(k => {
        if (k === idField) return;
        cols.push(k);
        let v = req.body[k];
        if (v === 'true') v = true;
        else if (v === 'false') v = false;
        else if (!isNaN(v) && v !== '' && k !== 'features') v = Number(v);
        vals.push(v);
        idx++;
      });

      if (req.file) {
        const imageUrl = `/uploads/${req.file.filename}`;
        if (cols.includes('image_url')) {
          const imgIdx = cols.indexOf('image_url');
          vals[imgIdx] = imageUrl;
        } else {
          cols.push('image_url');
          vals.push(imageUrl);
        }
      }

      if (cols.length === 0) return res.status(400).json({ error: 'No fields to insert' });

      const placeholders = cols.map((_, i) => `$${i + 1}`);
      const result = await pool.query(
        `INSERT INTO ${tableName} (${cols.join(',')}) VALUES (${placeholders.join(',')}) RETURNING *`,
        vals
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put(`/api/${tableName}/:id`, authMiddleware, upload.single('image'), async (req, res) => {
    try {
      const updates = {};

      Object.keys(req.body).forEach(k => {
        if (k === idField) return;
        let v = req.body[k];
        if (v === 'true') v = true;
        else if (v === 'false') v = false;
        else if (!isNaN(v) && v !== '' && k !== 'features') v = Number(v);
        updates[k] = v;
      });

      if (req.file) {
        updates.image_url = `/uploads/${req.file.filename}`;
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      updates.updated_at = new Date();
      const setClause = Object.keys(updates).map((k, i) => `${k} = $${i + 1}`);
      const values = Object.values(updates);
      values.push(req.params.id);

      const result = await pool.query(
        `UPDATE ${tableName} SET ${setClause.join(', ')} WHERE ${idField} = $${values.length} RETURNING *`,
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
    await pool.query(
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
    await pool.query('UPDATE contact_submissions SET "read" = true WHERE id = $1', [req.params.id]);
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
    await pool.query(
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
    await pool.query('UPDATE model_applications SET "read" = true WHERE id = $1', [req.params.id]);
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
    await pool.query(
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
    await pool.query('UPDATE partnership_inquiries SET "read" = true WHERE id = $1', [req.params.id]);
    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DASHBOARD STATS ───
app.get('/api/dashboard', authMiddleware, async (req, res) => {
  try {
    const [contacts, models, partners, blogs, projects, gallery] = await Promise.all([
      pool.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE "read" = false) as unread FROM contact_submissions'),
      pool.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE "read" = false) as unread FROM model_applications'),
      pool.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE "read" = false) as unread FROM partnership_inquiries'),
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
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Admin panel: http://localhost:${PORT}/admin`);
});
