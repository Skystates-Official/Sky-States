import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

// Database path in the root workspace
const dbPath = path.resolve('data.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
  } else {
    console.log('Connected to SQLite database at:', dbPath);
    initializeDatabase();
  }
});

// Wrap sqlite3 methods in Promises
export const query = {
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }
};

function initializeDatabase() {
  db.serialize(() => {
    // 1. Users Table (Auth and RBAC)
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'editor',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Pages Table (Dynamic Routes and Content Blocks)
    db.run(`
      CREATE TABLE IF NOT EXISTS pages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        parent_id INTEGER,
        meta_title TEXT,
        meta_description TEXT,
        canonical_url TEXT,
        content_blocks TEXT, -- JSON string of page blocks
        status TEXT DEFAULT 'draft',
        published_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_id) REFERENCES pages (id) ON DELETE SET NULL
      )
    `);

    // 3. Media Table (Media Library Assets)
    db.run(`
      CREATE TABLE IF NOT EXISTS media (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        path TEXT UNIQUE NOT NULL,
        mime_type TEXT NOT NULL,
        size INTEGER NOT NULL,
        alt_text TEXT,
        title TEXT,
        caption TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 4. Jobs / Placements Table
    db.run(`
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        company TEXT NOT NULL,
        location TEXT NOT NULL,
        salary TEXT,
        tags TEXT, -- JSON string array
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 5. Global Settings Table
    db.run(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);

    // 6. Form Submissions Table
    db.run(`
      CREATE TABLE IF NOT EXISTS forms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        form_name TEXT NOT NULL,
        data TEXT NOT NULL, -- JSON stringified submission data
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 7. Audit Logs Table
    db.run(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        action TEXT NOT NULL,
        details TEXT,
        ip_address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
      )
    `);

    // 7. Coupons Table
    db.run(`
      CREATE TABLE IF NOT EXISTS coupons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        discount_amount REAL NOT NULL,
        description TEXT,
        active INTEGER DEFAULT 1,
        max_uses INTEGER,
        used_count INTEGER DEFAULT 0,
        expires_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run("UPDATE users SET role = 'admin' WHERE role = 'super_admin'");

    db.run(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_ref TEXT UNIQUE NOT NULL,
        customer_email TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        course_name TEXT NOT NULL,
        total_due REAL NOT NULL,
        amount_paid REAL DEFAULT 0,
        status TEXT DEFAULT 'open',
        checkout_mode TEXT,
        tier TEXT,
        coupon_code TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS order_payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_ref TEXT NOT NULL,
        stripe_session_id TEXT,
        amount REAL NOT NULL,
        payment_type TEXT DEFAULT 'full',
        payment_method TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_ref) REFERENCES orders (order_ref)
      )
    `);

    db.run(`ALTER TABLE order_payments ADD COLUMN payment_method TEXT`, (err) => {
      if (err && !String(err.message).includes('duplicate column')) {
        console.warn('order_payments.payment_method migration:', err.message);
      }
    });

    db.run(`
      CREATE TABLE IF NOT EXISTS email_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reference_id TEXT NOT NULL,
        email_type TEXT NOT NULL,
        recipient TEXT NOT NULL,
        sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(reference_id, email_type)
      )
    `);

    syncAdminFromEnv();
    console.log('Database tables verified/initialized successfully.');
  });
}

function syncAdminFromEnv() {
  const username = import.meta.env.ADMIN_USERNAME || process.env.ADMIN_USERNAME;
  const password = import.meta.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;


  if (!username || !password) {
    db.get('SELECT COUNT(*) AS count FROM users', (err, row) => {
      if (err || !row || row.count > 0) return;

      const defaultUsername = 'admin';
      const defaultPassword = 'Xziant@123';
      const hash = bcrypt.hashSync(defaultPassword, bcrypt.genSaltSync(10));
      db.run(
        'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
        [defaultUsername, hash, 'admin'],
        (insertErr) => {
          if (insertErr) {
            console.error('Error seeding default admin:', insertErr.message);
          } else {
            console.log(`Default admin user '${defaultUsername}' seeded successfully.`);
          }
        }
      );
    });
    return;
  }

  const hash = bcrypt.hashSync(password, bcrypt.genSaltSync(10));

  db.get('SELECT id FROM users WHERE username = ?', [username], (err, row) => {
    if (err) {
      console.error('Error checking admin user:', err.message);
      return;
    }

    if (row) {
      db.run(
        'UPDATE users SET password_hash = ?, role = ? WHERE username = ?',
        [hash, 'admin', username],
        (updateErr) => {
          if (updateErr) {
            console.error('Error updating admin user:', updateErr.message);
          } else {
            console.log(`Super admin '${username}' synced from environment.`);
          }
        }
      );
      return;
    }

    db.run(
      'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
      [username, hash, 'admin'],
      (insertErr) => {
        if (insertErr) {
          console.error('Error creating admin user:', insertErr.message);
        } else {
          console.log(`Super admin '${username}' created from environment.`);
        }
      }
    );
  });
}

export default db;
