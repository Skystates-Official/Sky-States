BEGIN TRANSACTION;
CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTO_INCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'editor',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      , email TEXT, reset_token TEXT, reset_token_expiry DATETIME);
INSERT INTO users VALUES(1,'admin','$2b$10$ga1ugvLo/zq3cjrAERfdie4MhZQxIdClQlHhlOLlLVDn3vvZnfATW','admin','2026-07-07 12:01:25',NULL,NULL,NULL);
INSERT INTO users VALUES(2,'support@skystates.us','$2b$10$ZydG..k4JS1UMIt0zwGGDuY4nrIN8UD4q9R4M5XZ7fohDtsKj7gkm','admin','2026-08-18 14:25:18',NULL,NULL,NULL);
CREATE TABLE pages (
        id INTEGER PRIMARY KEY AUTO_INCREMENT,
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
      );
CREATE TABLE media (
        id INTEGER PRIMARY KEY AUTO_INCREMENT,
        filename TEXT NOT NULL,
        path TEXT UNIQUE NOT NULL,
        mime_type TEXT NOT NULL,
        size INTEGER NOT NULL,
        alt_text TEXT,
        title TEXT,
        caption TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      , description TEXT, dimensions TEXT, uploaded_by INTEGER, access_level TEXT DEFAULT 'public', allowed_roles TEXT);
CREATE TABLE jobs (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        company TEXT NOT NULL,
        location TEXT NOT NULL,
        salary TEXT,
        tags TEXT, -- JSON string array
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
CREATE TABLE settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
CREATE TABLE forms (
        id INTEGER PRIMARY KEY AUTO_INCREMENT,
        form_name TEXT NOT NULL,
        data TEXT NOT NULL, -- JSON stringified submission data
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
INSERT INTO forms VALUES(1,'consultation','{"name":"Aditya Kumar","email":"adevraj934@gmail.com","phone":"9110169560","program":"Data Science & AI","query":"Emasil to test","clientIp":"::1","createdAt":"2026-07-08T15:56:40.926Z"}','2026-07-08 15:56:41');
INSERT INTO forms VALUES(2,'consultation','{"name":"Aditya Kumar","email":"aditya.kumar1.cs.2022@mitmeerut.ac.in","phone":"9110169560","program":"Data Science & AI","query":"Test a Emial","clientIp":"::1","createdAt":"2026-07-08T15:58:47.354Z"}','2026-07-08 15:58:47');
CREATE TABLE audit_logs (
        id INTEGER PRIMARY KEY AUTO_INCREMENT,
        user_id INTEGER,
        action TEXT NOT NULL,
        details TEXT,
        ip_address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
      );
INSERT INTO audit_logs VALUES(1,1,'login','User logged in successfully','unknown','2026-08-05 07:21:21');
INSERT INTO audit_logs VALUES(2,1,'login','User logged in successfully','unknown','2026-08-05 07:23:25');
INSERT INTO audit_logs VALUES(3,NULL,'failed_login','Failed login attempt for username: admin','unknown','2026-08-05 09:49:55');
INSERT INTO audit_logs VALUES(4,NULL,'failed_login','Failed login attempt for username: admin','unknown','2026-08-05 09:50:08');
INSERT INTO audit_logs VALUES(5,NULL,'failed_login','Failed login attempt for username: admin','unknown','2026-08-05 09:50:10');
INSERT INTO audit_logs VALUES(6,1,'login','User logged in successfully','unknown','2026-08-05 09:56:44');
INSERT INTO audit_logs VALUES(7,NULL,'upload_media','Uploaded file: 1785925383249_Blog_14_Convert_Large_Outlook_OST_Files_to_EML_Format_Without_Error__08_04_2026_.docx','unknown','2026-08-05 10:23:03');
INSERT INTO audit_logs VALUES(8,NULL,'create_blog','Created blog: Untitled Draft','unknown','2026-08-05 10:33:04');
INSERT INTO audit_logs VALUES(9,NULL,'create_blog','Created blog: Untitled Draft','unknown','2026-08-05 10:34:26');
INSERT INTO audit_logs VALUES(10,NULL,'create_blog','Created blog: Untitled Draft','unknown','2026-08-05 10:35:43');
INSERT INTO audit_logs VALUES(11,NULL,'create_blog','Created blog: Untitled Draft','unknown','2026-08-05 10:52:53');
INSERT INTO audit_logs VALUES(12,NULL,'create_blog','Created blog: Untitled Draft','unknown','2026-08-05 10:56:13');
INSERT INTO audit_logs VALUES(13,NULL,'status_changed_to_published','Changed status of ''Untitled Draft'' to ''published''','unknown','2026-08-05 10:56:26');
INSERT INTO audit_logs VALUES(14,NULL,'status_changed_to_draft','Changed status of ''Untitled Draft'' to ''draft''','unknown','2026-08-05 10:57:59');
INSERT INTO audit_logs VALUES(15,NULL,'create_blog','Created blog: Untitled Draft','unknown','2026-08-05 11:01:31');
INSERT INTO audit_logs VALUES(16,NULL,'create_blog','Created blog: Untitled Draft','unknown','2026-08-05 11:01:55');
INSERT INTO audit_logs VALUES(17,NULL,'create_blog','Created blog: Untitled Draft','unknown','2026-08-05 11:02:02');
INSERT INTO audit_logs VALUES(18,NULL,'create_blog','Created blog: Untitled Draft','unknown','2026-08-05 11:02:13');
INSERT INTO audit_logs VALUES(19,NULL,'create_blog','Created blog: Untitled Draft','unknown','2026-08-05 11:05:35');
INSERT INTO audit_logs VALUES(20,NULL,'create_blog','Created blog: Untitled Draft','unknown','2026-08-05 11:06:11');
INSERT INTO audit_logs VALUES(21,NULL,'create_blog','Created blog: Untitled Draft','unknown','2026-08-05 11:07:15');
INSERT INTO audit_logs VALUES(22,NULL,'status_changed_to_published','Changed status of ''Untitled Draft'' to ''published''','unknown','2026-08-05 11:10:34');
INSERT INTO audit_logs VALUES(23,NULL,'delete_blog','Deleted blog: Untitled Draft','unknown','2026-08-05 11:12:13');
INSERT INTO audit_logs VALUES(24,NULL,'delete_blog','Deleted blog: Untitled Draft','unknown','2026-08-05 11:12:15');
INSERT INTO audit_logs VALUES(25,NULL,'delete_blog','Deleted blog: Untitled Draft','unknown','2026-08-05 11:12:17');
INSERT INTO audit_logs VALUES(26,NULL,'delete_blog','Deleted blog: Untitled Draft','unknown','2026-08-05 11:12:20');
INSERT INTO audit_logs VALUES(27,NULL,'delete_blog','Deleted blog: Untitled Draft','unknown','2026-08-05 11:12:23');
INSERT INTO audit_logs VALUES(28,NULL,'delete_blog','Deleted blog: Untitled Draft','unknown','2026-08-05 11:12:25');
INSERT INTO audit_logs VALUES(29,NULL,'delete_blog','Deleted blog: Untitled Draft','unknown','2026-08-05 11:12:27');
INSERT INTO audit_logs VALUES(30,NULL,'delete_blog','Deleted blog: Untitled Draft','unknown','2026-08-05 11:12:28');
INSERT INTO audit_logs VALUES(31,NULL,'delete_blog','Deleted blog: Untitled Draft','unknown','2026-08-05 11:12:30');
INSERT INTO audit_logs VALUES(32,NULL,'delete_blog','Deleted blog: Untitled Draft','unknown','2026-08-05 11:12:32');
INSERT INTO audit_logs VALUES(33,NULL,'delete_blog','Deleted blog: Untitled Draft','unknown','2026-08-05 11:12:34');
INSERT INTO audit_logs VALUES(34,NULL,'delete_blog','Deleted blog: Untitled Draft','unknown','2026-08-05 11:12:35');
INSERT INTO audit_logs VALUES(35,NULL,'create_blog','Created blog: Untitled Draft','unknown','2026-08-05 11:12:57');
INSERT INTO audit_logs VALUES(36,NULL,'status_changed_to_published','Changed status of ''Untitled Draft'' to ''published''','unknown','2026-08-05 11:13:16');
INSERT INTO audit_logs VALUES(37,NULL,'delete_blog','Deleted blog: Untitled Draft','unknown','2026-08-05 11:14:59');
INSERT INTO audit_logs VALUES(38,NULL,'create_blog','Created blog: Untitled Draft','unknown','2026-08-05 11:16:15');
INSERT INTO audit_logs VALUES(39,NULL,'create_blog','Created blog: Untitled Draft','unknown','2026-08-05 11:16:17');
INSERT INTO audit_logs VALUES(40,NULL,'delete_blog','Deleted blog: Untitled Draft','unknown','2026-08-05 11:17:38');
INSERT INTO audit_logs VALUES(41,NULL,'delete_blog','Deleted blog: Untitled Draft','unknown','2026-08-05 11:17:40');
INSERT INTO audit_logs VALUES(42,NULL,'create_blog','Created blog: Untitled Draft','unknown','2026-08-05 11:18:15');
INSERT INTO audit_logs VALUES(43,NULL,'status_changed_to_published','Changed status of ''Untitled Draft'' to ''published''','unknown','2026-08-05 11:19:18');
INSERT INTO audit_logs VALUES(44,NULL,'delete_blog','Deleted blog: Untitled Draft','unknown','2026-08-05 11:22:39');
INSERT INTO audit_logs VALUES(45,NULL,'create_blog','Created blog: Untitled Draft','unknown','2026-08-05 11:22:57');
INSERT INTO audit_logs VALUES(46,1,'update_blog','Updated blog: Untitled Draft','unknown','2026-08-05 11:25:17');
INSERT INTO audit_logs VALUES(47,NULL,'status_changed_to_published','Changed status of ''Untitled Draft'' to ''published''','unknown','2026-08-05 11:25:17');
INSERT INTO audit_logs VALUES(48,NULL,'create_blog','Created blog: Untitled Draft','unknown','2026-08-05 11:25:21');
INSERT INTO audit_logs VALUES(49,NULL,'create_blog','Created blog: Untitled Draft','unknown','2026-08-05 11:25:34');
INSERT INTO audit_logs VALUES(50,NULL,'delete_blog','Deleted blog: Untitled Draft','unknown','2026-08-05 11:26:43');
INSERT INTO audit_logs VALUES(51,NULL,'delete_blog','Deleted blog: Untitled Draft','unknown','2026-08-05 11:26:46');
INSERT INTO audit_logs VALUES(52,NULL,'delete_blog','Deleted blog: Untitled Draft','unknown','2026-08-05 11:26:48');
CREATE TABLE coupons (
        id INTEGER PRIMARY KEY AUTO_INCREMENT,
        code TEXT UNIQUE NOT NULL,
        discount_amount REAL NOT NULL,
        description TEXT,
        active INTEGER DEFAULT 1,
        max_uses INTEGER,
        used_count INTEGER DEFAULT 0,
        expires_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
CREATE TABLE orders (
        id INTEGER PRIMARY KEY AUTO_INCREMENT,
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
      );
CREATE TABLE order_payments (
        id INTEGER PRIMARY KEY AUTO_INCREMENT,
        order_ref TEXT NOT NULL,
        stripe_session_id TEXT,
        amount REAL NOT NULL,
        payment_type TEXT DEFAULT 'full',
        payment_method TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_ref) REFERENCES orders (order_ref)
      );
CREATE TABLE email_log (
        id INTEGER PRIMARY KEY AUTO_INCREMENT,
        reference_id TEXT NOT NULL,
        email_type TEXT NOT NULL,
        recipient TEXT NOT NULL,
        sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(reference_id, email_type)
      );
CREATE TABLE blogs (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,

    title TEXT NOT NULL,

    slug TEXT UNIQUE NOT NULL,

    category TEXT NOT NULL,

    short_description TEXT,

    content TEXT NOT NULL,

    image TEXT,

    author TEXT,

    tags TEXT,

    seo_title TEXT,

    seo_description TEXT,

    status TEXT DEFAULT 'draft',

    views INTEGER DEFAULT 0,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  , seo_score INTEGER DEFAULT 0, subcategory TEXT, published_at DATETIME, seo_metadata TEXT, keywords TEXT, canonical TEXT);
CREATE TABLE reviews (
        id INTEGER PRIMARY KEY AUTO_INCREMENT,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        text TEXT NOT NULL,
        category TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
INSERT INTO reviews VALUES(1,'Justin Reed','Cloud Engineer','Having six years in finance, I was not sure if moving into IT was possible. SkyStates'' organized learning way and mentor support gave me the confidence to make the switch.','Transitions','2026-08-04 12:04:57');
INSERT INTO reviews VALUES(2,'Megha Arora','Cloud Solution Architect','Sky States made my career change very easy. The instructors explained concepts smoothly, and the projects helped me understand how everything works in business environments.','Transitions','2026-08-04 12:04:57');
INSERT INTO reviews VALUES(3,'Jason Miller','IT Operations Manager','I joined with no technical experience and expected the learning curve to be complex. Instead, every element was structured, and the mentors were always available whenever I required guidance.','Transitions','2026-08-04 12:04:57');
INSERT INTO reviews VALUES(4,'Lauren Mitchell','Project Manager','Switching careers after nearly ten years was not easy at all, but Sky States helped me develop practical skills that employers actually look for. The placement assistance and resume guidance made a difference during my job search.','Transitions','2026-08-04 12:04:57');
INSERT INTO reviews VALUES(5,'Riya Kapoor','DevOps Engineer','The cloud labs were one of my favorite parts of the program. Everything we learned could be applied in real environments. I now work as a Junior DevOps Engineer.','DevOps','2026-08-04 12:04:57');
INSERT INTO reviews VALUES(6,'Siddharth Tiwari','Cloud Engineer','The mentors shared practical situations instead of focusing only on theory. Working on CI/CD pipelines and cloud infrastructure projects gave me confidence during technical interviews.','DevOps','2026-08-04 12:04:57');
INSERT INTO reviews VALUES(7,'Andrew Parker','Site Reliability Engineer','I had basic Linux knowledge before joining, but the SkyStates program helped me understand Docker, Kubernetes, and AWS in a proper way. The practical assignments were really useful.','DevOps','2026-08-04 12:04:57');
INSERT INTO reviews VALUES(8,'Matthew Turner','Cloud Infrastructure Engineer','The curriculum remained updated with current cloud technologies, and every project felt familiar to industry expectations. I valued the detailed feedback provided after each assignment.','DevOps','2026-08-04 12:04:57');
INSERT INTO reviews VALUES(9,'Olivia Parker','Security Analyst','Cybersecurity always looked complicated until I joined Sky States. The instructors simplified every topic and encouraged practice through labs. It prepared me well for my first analyst role.','CyberSecurity','2026-08-04 12:04:57');
INSERT INTO reviews VALUES(10,'Nicholas Walker','Cyber Security Associate','The ethical hacking labs were interactive. Instead of learning concepts, we learned how to find risks and think like security experts.','CyberSecurity','2026-08-04 12:04:57');
INSERT INTO reviews VALUES(11,'Brandon Scott','SOC Analyst','Mock interviews and certification assistance were valuable as the technical training. The mentors genuinely wanted every learner to succeed in their career journeys.','CyberSecurity','2026-08-04 12:04:57');
INSERT INTO reviews VALUES(12,'Karan Malhotra','Information Security Executive','I appreciated how the program maintained networking, functioning systems, and security concepts before moving into upgraded topics. It made learning manageable.','CyberSecurity','2026-08-04 12:04:57');
INSERT INTO reviews VALUES(13,'Ananya Gupta','Data Analyst','The integration of Python, SQL, and machine learning projects helped me made a strong portfolio. I felt prepared when discussing my projects during interviews.','DataScience','2026-08-04 12:04:57');
INSERT INTO reviews VALUES(14,'Gaurav Sharma','Business Intelligence Analyst','Every concept was supported with exercises, making even upgraded machine learning concepts easier to understand. The mentors always empowered questions.','DataScience','2026-08-04 12:04:57');
CREATE TABLE linkedin_reviews (
        id INTEGER PRIMARY KEY AUTO_INCREMENT,
        name TEXT NOT NULL,
        role TEXT DEFAULT '',
        text TEXT DEFAULT '',
        post_url TEXT NOT NULL,
        image_url TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
INSERT INTO linkedin_reviews VALUES(1,'Dennis M. Law','CISSP-Certified Cybersecurity Engineer / Analyst | Clearance: U.S. Treasury','Hey LinkedIn fam. I recently completed the Executive Leadership in Cybersecurity and AI with SkyStates. It was a great experience. The relationship manager (@Ayush Sharma) and instructor were ''top-notch''. I learned a great deal about AI Assisted Cybersecurity and Cybersecurity for AI. I have already completed several AI Red Teaming projects. Please check them out at https://lnkd.in/eRMauBVr. I also intend to continue adding projects as I gain more Red Teaming experience. I am in the market for a role... scoop me up before you miss out!','https://www.linkedin.com/posts/skystate_dmlawcareer-overview-activity-7481082190550827009-sOUr?utm_source=social_share_send&utm_medium=member_desktop_web&rcm=ACoAADCOaj8BU_G7UCn4Jo6nYJXG3dNYfpdAJBU','/assets/reviews/dennis_law.png','2026-08-04 12:04:57');
INSERT INTO linkedin_reviews VALUES(2,'Justin Nkomezi','Cybersecurity Analyst | SOC Analyst | SIEM Monitoring | Incident Response',unistr('=ƒÿç Proudly succeeded in the cybersecurity and ethical hacking program from SkyStates\u000aThank you for your support and effort from the Sky Team and My Mentor, Jasdev Singh. One of the great experiences I had with you guys; highly recommend to people looking for a career in cybersecurity and Ethical hacking.\u000aSkyStates Jasdev Singh'),'https://www.linkedin.com/posts/skystate_proudly-succeeded-in-the-cybersecurity-activity-7479925910440382464-Wv0p?utm_source=social_share_send&utm_medium=member_desktop_web&rcm=ACoAADCOaj8BU_G7UCn4Jo6nYJXG3dNYfpdAJBU','/assets/reviews/justin_nkomezi.png','2026-08-04 12:04:57');
INSERT INTO linkedin_reviews VALUES(3,'Andry Drullard','Computer Science & Data Science / AI Student',unistr('There are people who make a lasting impact on your professional journey, and I believe it''s important to recognize them publicly.\u000a\u000aI want to express my sincere appreciation to @Pranjali Jaiswal and the team at @SkyStates for the incredible support I''ve received throughout my learning journey.\u000a\u000aFrom day one, Pranjali has consistently gone above and beyond. She regularly checks in to see how I''m doing, asks if I need any help, and follows up without ever having to be reminded. Her responsiveness, patience, and genuine commitment to my success have made a significant difference in my experience.\u000a\u000aI also want to recognize my Computer Science instructor, whose professionalism and dedication have exceeded my expectations. Every class is well-organized, engaging, and filled with practical, in-depth knowledge. He takes the time to explain every concept and project step by step, encourages questions throughout the session, and ensures that every student has the support they need to succeed.\u000a\u000aAs someone working toward a career in technology, having a support team that truly cares and instructors who are passionate about teaching has given me confidence to continue growing.\u000a\u000aThank you to SkyStates, and my instructor for your dedication, encouragement, and commitment to helping students achieve their goals. I''m grateful to be part of this journey and look forward to what''s ahead.'),'https://www.linkedin.com/posts/andry-drullard-590096384_gratitude-careergrowth-technology-share-7478574097141067776-HLk-/?utm_source=share&utm_medium=member_desktop&rcm=ACoAAD-uYkcBZHr2lY-li_LIKu0fAD1iIYjabpM','/assets/reviews/andry_drullard.png','2026-08-04 12:04:57');
INSERT INTO linkedin_reviews VALUES(4,'Yves Tchangou','Cloud Engineer at Booz Allen Hamilton',unistr('Hello everyone  i have been taking the course from SkyStates\u000ait has been a great journey so far and i am very happy with there services and support provided from my Hirirng Mentor Jasdev Singh who is helping me in this career growth\u000aThank you\u000aSkyStates sky-states Jasdev Singh'),'https://www.linkedin.com/posts/yves-tchangou-219248291_hello-everyone-i-have-been-taking-the-course-share-7479196335011840000-513b/?utm_source=share&utm_medium=member_desktop&rcm=ACoAAD-uYkcBZHr2lY-li_LIKu0fAD1iIYjabpM','/assets/reviews/yves_tchangou.png','2026-08-04 12:04:57');
INSERT INTO linkedin_reviews VALUES(5,'Corey Thompson','Construction Supervisor | Jr. Data Scientist','I started working at DTN as a Jr. DATA Scientist by the help of SkyStates I am looking for a better opportunity, I am happy with my current job role. Thanks for SkyStates for the support they have given me.','https://www.linkedin.com/posts/corey-thompson-2565157_i-started-working-at-dtn-as-a-jr-data-scientist-share-7478859687346765824-PfcQ/?utm_source=share&utm_medium=member_desktop&rcm=ACoAAD-uYkcBZHr2lY-li_LIKu0fAD1iIYjabpM','/assets/reviews/corey_thompson.png','2026-08-04 12:04:57');
INSERT INTO linkedin_reviews VALUES(6,'Onyeka Umeh','Cyber Security Engineer / Analyst',unistr('Enrolling in the Cyber Security program at SkyStates has been a game-changer. I started this journey with high expectations, and they have delivered on every front, giving me deep topic understanding, quality instruction, and excellent project experience.\u000a\u000aBeyond the curriculum, the placement support has been incredible. I want to give a special thanks to my Relationship Manager, Ujjwal Jaiswal, who has consistently motivated me and pushed me forward.\u000a\u000aThanks to the team, I am now actively interviewing. Every interview is a chance to implement the feedback I receive and keep growing. IGÇÖm incredibly optimistic about landing the right opportunity very soon!'),'https://www.linkedin.com/posts/onyeka-umeh-5266392b_cybersecurity-careertransition-continuouslearning-share-7478223768213954560-PEoq/?utm_source=share&utm_medium=member_desktop&rcm=ACoAAD-uYkcBZHr2lY-li_LIKu0fAD1iIYjabpM','/assets/reviews/onyeka_umeh.png','2026-08-04 12:04:57');
INSERT INTO linkedin_reviews VALUES(7,'Seun Atinmo','ETL Developer / Data Engineer','I just signed up for a Data Science and Ai classes with SkyStates . I participated in a few group sessions and then my mentor Shubham K. Kumar recommended one on one sessions based on my background experience. It has really helped to pick up the subject matter more quickly. As an ETL developer/ Data Engineer, today''s job market certainly requires some knowledge of Ai, Data Science and especially leveraging machine learning. If you are interested in picking up such vital skills please reach out to Shubham K. Kumar .','https://www.linkedin.com/posts/seun-atinmo-7a3479172_i-just-signed-up-for-a-data-science-and-ai-share-7477805602715656192-Br90/?utm_source=share&utm_medium=member_desktop&rcm=ACoAAD-uYkcBZHr2lY-li_LIKu0fAD1iIYjabpM','/assets/reviews/seun_atinmo.png','2026-08-04 12:04:57');
CREATE TABLE file_versions (
        id INTEGER PRIMARY KEY AUTO_INCREMENT,
        media_id INTEGER,
        filename TEXT NOT NULL,
        path TEXT NOT NULL,
        size INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (media_id) REFERENCES media (id) ON DELETE CASCADE
      );
INSERT INTO file_versions VALUES(1,1,'1785925383249_Blog_14_Convert_Large_Outlook_OST_Files_to_EML_Format_Without_Error__08_04_2026_.docx','/uploads/1785925383249_Blog_14_Convert_Large_Outlook_OST_Files_to_EML_Format_Without_Error__08_04_2026_.docx',1677529,'2026-08-05 10:24:15');
CREATE TABLE blog_comments (
        id INTEGER PRIMARY KEY AUTO_INCREMENT,
        blog_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        status TEXT DEFAULT 'open',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (blog_id) REFERENCES blogs(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
CREATE TABLE notifications (
        id INTEGER PRIMARY KEY AUTO_INCREMENT,
        user_id INTEGER NOT NULL,
        message TEXT NOT NULL,
        link TEXT,
        is_read INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
CREATE TABLE blog_versions (
        id INTEGER PRIMARY KEY AUTO_INCREMENT,
        blog_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        seo_metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (blog_id) REFERENCES blogs(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      );
INSERT INTO blog_versions VALUES(1,17,1,'Untitled Draft','',NULL,'2026-08-05 11:25:17');
CREATE TABLE blog_attachments (
        id INTEGER PRIMARY KEY AUTO_INCREMENT,
        blog_id INTEGER NOT NULL,
        media_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (blog_id) REFERENCES blogs(id) ON DELETE CASCADE,
        FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE
      );
CREATE TABLE redirect_rules (
        id INTEGER PRIMARY KEY AUTO_INCREMENT,
        from_url TEXT UNIQUE NOT NULL,
        to_url TEXT NOT NULL,
        status_code INTEGER DEFAULT 301,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
CREATE TABLE analytics_cache (
        id INTEGER PRIMARY KEY AUTO_INCREMENT,
        date TEXT NOT NULL, -- e.g., '2023-10-25'
        data TEXT NOT NULL, -- JSON string of analytics metrics
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
INSERT INTO sqlite_sequence VALUES('users',2);
INSERT INTO sqlite_sequence VALUES('forms',2);
INSERT INTO sqlite_sequence VALUES('reviews',14);
INSERT INTO sqlite_sequence VALUES('linkedin_reviews',7);
INSERT INTO sqlite_sequence VALUES('audit_logs',52);
INSERT INTO sqlite_sequence VALUES('media',2);
INSERT INTO sqlite_sequence VALUES('file_versions',1);
INSERT INTO sqlite_sequence VALUES('blogs',19);
INSERT INTO sqlite_sequence VALUES('blog_versions',1);
COMMIT;
