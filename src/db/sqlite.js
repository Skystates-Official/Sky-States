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

    // 8. Custom Student Reviews Table
    db.run(`
      CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        text TEXT NOT NULL,
        category TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 9. LinkedIn Screenshot Reviews Table
    db.run(`
      CREATE TABLE IF NOT EXISTS linkedin_reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        role TEXT DEFAULT '',
        text TEXT DEFAULT '',
        post_url TEXT NOT NULL,
        image_url TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, () => {
      db.run("ALTER TABLE linkedin_reviews ADD COLUMN role TEXT DEFAULT ''", () => {});
      db.run("ALTER TABLE linkedin_reviews ADD COLUMN text TEXT DEFAULT ''", () => {});
    });

    seedDefaultReviews();
    syncAdminFromEnv();
    console.log('Database tables verified/initialized successfully.');
  });
}

function seedDefaultReviews() {
  db.get('SELECT COUNT(*) AS count FROM reviews', (err, row) => {
    if (err || !row || row.count > 0) return;

    const initialReviews = [
      // Transitions
      { name: "Justin Reed", role: "Cloud Engineer", category: "Transitions", text: "Having six years in finance, I was not sure if moving into IT was possible. SkyStates' organized learning way and mentor support gave me the confidence to make the switch." },
      { name: "Megha Arora", role: "Cloud Solution Architect", category: "Transitions", text: "Sky States made my career change very easy. The instructors explained concepts smoothly, and the projects helped me understand how everything works in business environments." },
      { name: "Jason Miller", role: "IT Operations Manager", category: "Transitions", text: "I joined with no technical experience and expected the learning curve to be complex. Instead, every element was structured, and the mentors were always available whenever I required guidance." },
      { name: "Lauren Mitchell", role: "Project Manager", category: "Transitions", text: "Switching careers after nearly ten years was not easy at all, but Sky States helped me develop practical skills that employers actually look for. The placement assistance and resume guidance made a difference during my job search." },
      // DevOps
      { name: "Riya Kapoor", role: "DevOps Engineer", category: "DevOps", text: "The cloud labs were one of my favorite parts of the program. Everything we learned could be applied in real environments. I now work as a Junior DevOps Engineer." },
      { name: "Siddharth Tiwari", role: "Cloud Engineer", category: "DevOps", text: "The mentors shared practical situations instead of focusing only on theory. Working on CI/CD pipelines and cloud infrastructure projects gave me confidence during technical interviews." },
      { name: "Andrew Parker", role: "Site Reliability Engineer", category: "DevOps", text: "I had basic Linux knowledge before joining, but the SkyStates program helped me understand Docker, Kubernetes, and AWS in a proper way. The practical assignments were really useful." },
      { name: "Matthew Turner", role: "Cloud Infrastructure Engineer", category: "DevOps", text: "The curriculum remained updated with current cloud technologies, and every project felt familiar to industry expectations. I valued the detailed feedback provided after each assignment." },
      // CyberSecurity
      { name: "Olivia Parker", role: "Security Analyst", category: "CyberSecurity", text: "Cybersecurity always looked complicated until I joined Sky States. The instructors simplified every topic and encouraged practice through labs. It prepared me well for my first analyst role." },
      { name: "Nicholas Walker", role: "Cyber Security Associate", category: "CyberSecurity", text: "The ethical hacking labs were interactive. Instead of learning concepts, we learned how to find risks and think like security experts." },
      { name: "Brandon Scott", role: "SOC Analyst", category: "CyberSecurity", text: "Mock interviews and certification assistance were valuable as the technical training. The mentors genuinely wanted every learner to succeed in their career journeys." },
      { name: "Karan Malhotra", role: "Information Security Executive", category: "CyberSecurity", text: "I appreciated how the program maintained networking, functioning systems, and security concepts before moving into upgraded topics. It made learning manageable." },
      // DataScience
      { name: "Ananya Gupta", role: "Data Analyst", category: "DataScience", text: "The integration of Python, SQL, and machine learning projects helped me made a strong portfolio. I felt prepared when discussing my projects during interviews." },
      { name: "Gaurav Sharma", role: "Business Intelligence Analyst", category: "DataScience", text: "Every concept was supported with exercises, making even upgraded machine learning concepts easier to understand. The mentors always empowered questions." }
    ];

    const stmt = db.prepare('INSERT INTO reviews (name, role, category, text) VALUES (?, ?, ?, ?)');
    initialReviews.forEach(r => {
      stmt.run(r.name, r.role, r.category, r.text);
    });
    stmt.finalize();
    console.log('Seeded default reviews in SQLite.');
  });

  db.get('SELECT COUNT(*) AS count FROM linkedin_reviews', (err, row) => {
    if (err || !row || row.count > 0) return;

    const initialLinkedinReviews = [
      {
        name: "Dennis M. Law",
        role: "CISSP-Certified Cybersecurity Engineer / Analyst | Clearance: U.S. Treasury",
        text: "Hey LinkedIn fam. I recently completed the Executive Leadership in Cybersecurity and AI with SkyStates. It was a great experience. The relationship manager (@Ayush Sharma) and instructor were 'top-notch'. I learned a great deal about AI Assisted Cybersecurity and Cybersecurity for AI. I have already completed several AI Red Teaming projects. Please check them out at https://lnkd.in/eRMauBVr. I also intend to continue adding projects as I gain more Red Teaming experience. I am in the market for a role... scoop me up before you miss out!",
        post_url: "https://www.linkedin.com/posts/skystate_dmlawcareer-overview-activity-7481082190550827009-sOUr?utm_source=social_share_send&utm_medium=member_desktop_web&rcm=ACoAADCOaj8BU_G7UCn4Jo6nYJXG3dNYfpdAJBU",
        image_url: "/assets/reviews/dennis_law.png"
      },
      {
        name: "Justin Nkomezi",
        role: "Cybersecurity Analyst | SOC Analyst | SIEM Monitoring | Incident Response",
        text: "😇 Proudly succeeded in the cybersecurity and ethical hacking program from SkyStates\nThank you for your support and effort from the Sky Team and My Mentor, Jasdev Singh. One of the great experiences I had with you guys; highly recommend to people looking for a career in cybersecurity and Ethical hacking.\nSkyStates Jasdev Singh",
        post_url: "https://www.linkedin.com/posts/skystate_proudly-succeeded-in-the-cybersecurity-activity-7479925910440382464-Wv0p?utm_source=social_share_send&utm_medium=member_desktop_web&rcm=ACoAADCOaj8BU_G7UCn4Jo6nYJXG3dNYfpdAJBU",
        image_url: "/assets/reviews/justin_nkomezi.png"
      },
      {
        name: "Andry Drullard",
        role: "Computer Science & Data Science / AI Student",
        text: "There are people who make a lasting impact on your professional journey, and I believe it's important to recognize them publicly.\n\nI want to express my sincere appreciation to @Pranjali Jaiswal and the team at @SkyStates for the incredible support I've received throughout my learning journey.\n\nFrom day one, Pranjali has consistently gone above and beyond. She regularly checks in to see how I'm doing, asks if I need any help, and follows up without ever having to be reminded. Her responsiveness, patience, and genuine commitment to my success have made a significant difference in my experience.\n\nI also want to recognize my Computer Science instructor, whose professionalism and dedication have exceeded my expectations. Every class is well-organized, engaging, and filled with practical, in-depth knowledge. He takes the time to explain every concept and project step by step, encourages questions throughout the session, and ensures that every student has the support they need to succeed.\n\nAs someone working toward a career in technology, having a support team that truly cares and instructors who are passionate about teaching has given me confidence to continue growing.\n\nThank you to SkyStates, and my instructor for your dedication, encouragement, and commitment to helping students achieve their goals. I'm grateful to be part of this journey and look forward to what's ahead.",
        post_url: "https://www.linkedin.com/posts/andry-drullard-590096384_gratitude-careergrowth-technology-share-7478574097141067776-HLk-/?utm_source=share&utm_medium=member_desktop&rcm=ACoAAD-uYkcBZHr2lY-li_LIKu0fAD1iIYjabpM",
        image_url: "/assets/reviews/andry_drullard.png"
      },
      {
        name: "Yves Tchangou",
        role: "Cloud Engineer at Booz Allen Hamilton",
        text: "Hello everyone  i have been taking the course from SkyStates\nit has been a great journey so far and i am very happy with there services and support provided from my Hirirng Mentor Jasdev Singh who is helping me in this career growth\nThank you\nSkyStates sky-states Jasdev Singh",
        post_url: "https://www.linkedin.com/posts/yves-tchangou-219248291_hello-everyone-i-have-been-taking-the-course-share-7479196335011840000-513b/?utm_source=share&utm_medium=member_desktop&rcm=ACoAAD-uYkcBZHr2lY-li_LIKu0fAD1iIYjabpM",
        image_url: "/assets/reviews/yves_tchangou.png"
      },
      {
        name: "Corey Thompson",
        role: "Construction Supervisor | Jr. Data Scientist",
        text: "I started working at DTN as a Jr. DATA Scientist by the help of SkyStates I am looking for a better opportunity, I am happy with my current job role. Thanks for SkyStates for the support they have given me.",
        post_url: "https://www.linkedin.com/posts/corey-thompson-2565157_i-started-working-at-dtn-as-a-jr-data-scientist-share-7478859687346765824-PfcQ/?utm_source=share&utm_medium=member_desktop&rcm=ACoAAD-uYkcBZHr2lY-li_LIKu0fAD1iIYjabpM",
        image_url: "/assets/reviews/corey_thompson.png"
      },
      {
        name: "Onyeka Umeh",
        role: "Cyber Security Engineer / Analyst",
        text: "Enrolling in the Cyber Security program at SkyStates has been a game-changer. I started this journey with high expectations, and they have delivered on every front, giving me deep topic understanding, quality instruction, and excellent project experience.\n\nBeyond the curriculum, the placement support has been incredible. I want to give a special thanks to my Relationship Manager, Ujjwal Jaiswal, who has consistently motivated me and pushed me forward.\n\nThanks to the team, I am now actively interviewing. Every interview is a chance to implement the feedback I receive and keep growing. I’m incredibly optimistic about landing the right opportunity very soon!",
        post_url: "https://www.linkedin.com/posts/onyeka-umeh-5266392b_cybersecurity-careertransition-continuouslearning-share-7478223768213954560-PEoq/?utm_source=share&utm_medium=member_desktop&rcm=ACoAAD-uYkcBZHr2lY-li_LIKu0fAD1iIYjabpM",
        image_url: "/assets/reviews/onyeka_umeh.png"
      },
      {
        name: "Seun Atinmo",
        role: "ETL Developer / Data Engineer",
        text: "I just signed up for a Data Science and Ai classes with SkyStates . I participated in a few group sessions and then my mentor Shubham K. Kumar recommended one on one sessions based on my background experience. It has really helped to pick up the subject matter more quickly. As an ETL developer/ Data Engineer, today's job market certainly requires some knowledge of Ai, Data Science and especially leveraging machine learning. If you are interested in picking up such vital skills please reach out to Shubham K. Kumar .",
        post_url: "https://www.linkedin.com/posts/seun-atinmo-7a3479172_i-just-signed-up-for-a-data-science-and-ai-share-7477805602715656192-Br90/?utm_source=share&utm_medium=member_desktop&rcm=ACoAAD-uYkcBZHr2lY-li_LIKu0fAD1iIYjabpM",
        image_url: "/assets/reviews/seun_atinmo.png"
      }
    ];
    const stmt = db.prepare('INSERT INTO linkedin_reviews (name, role, text, post_url, image_url) VALUES (?, ?, ?, ?, ?)');
    initialLinkedinReviews.forEach(r => {
      stmt.run(r.name, r.role, r.text, r.post_url, r.image_url);
    });
    stmt.finalize();
    console.log('Seeded default LinkedIn reviews in SQLite.');
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
      bcrypt.hash(defaultPassword, 10, (hashErr, hash) => {
        if (hashErr) {
          console.error('Error hashing default admin password:', hashErr.message);
          return;
        }
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
    });
    return;
  }

  db.get('SELECT password_hash FROM users WHERE username = ?', [username], (err, row) => {
    if (err) {
      console.error('Error checking admin user:', err.message);
      return;
    }

    if (row) {
      // Check if password matches the current hash using async bcrypt.compare
      bcrypt.compare(password, row.password_hash, (compareErr, matches) => {
        if (compareErr) {
          console.error('Error comparing admin password:', compareErr.message);
          return;
        }
        if (matches) {
          // Password has not changed, do nothing!
          return;
        }
        // Password has changed, hash and update
        bcrypt.hash(password, 10, (hashErr, hash) => {
          if (hashErr) {
            console.error('Error hashing admin password:', hashErr.message);
            return;
          }
          db.run(
            'UPDATE users SET password_hash = ?, role = ? WHERE username = ?',
            [hash, 'admin', username],
            (updateErr) => {
              if (updateErr) {
                console.error('Error updating admin user:', updateErr.message);
              } else {
                console.log(`Super admin '${username}' password updated from environment.`);
              }
            }
          );
        });
      });
      return;
    }

    // User does not exist, hash and insert
    bcrypt.hash(password, 10, (hashErr, hash) => {
      if (hashErr) {
        console.error('Error hashing admin password:', hashErr.message);
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
  });
}

export default db;
