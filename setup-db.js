const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const schema = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Admin users
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL DEFAULT 'Admin',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Site settings (hero, contact info, social links, etc.)
CREATE TABLE IF NOT EXISTS site_settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- About section
CREATE TABLE IF NOT EXISTS about (
  id SERIAL PRIMARY KEY,
  section_title VARCHAR(255),
  description TEXT,
  mission TEXT,
  vision TEXT,
  quote TEXT,
  founded_year VARCHAR(10) DEFAULT '2024',
  image_url VARCHAR(500),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Core values
CREATE TABLE IF NOT EXISTS core_values (
  id SERIAL PRIMARY KEY,
  icon VARCHAR(10),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  image_url VARCHAR(500),
  sort_order INT DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Team members
CREATE TABLE IF NOT EXISTS team_members (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(255),
  initials VARCHAR(10),
  bio TEXT,
  image_url VARCHAR(500),
  sort_order INT DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Services
CREATE TABLE IF NOT EXISTS services (
  id SERIAL PRIMARY KEY,
  number VARCHAR(10),
  icon VARCHAR(10),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  link_section VARCHAR(100),
  image_url VARCHAR(500),
  sort_order INT DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Pageant winners
CREATE TABLE IF NOT EXISTS pageant_winners (
  id SERIAL PRIMARY KEY,
  year VARCHAR(20) NOT NULL,
  name VARCHAR(255) NOT NULL,
  title VARCHAR(255),
  initial VARCHAR(5),
  image_url VARCHAR(500),
  sort_order INT DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Sponsorship packages (pageant)
CREATE TABLE IF NOT EXISTS pageant_packages (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  price VARCHAR(50),
  features TEXT[],
  image_url VARCHAR(500),
  is_featured BOOLEAN DEFAULT FALSE,
  sort_order INT DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Sponsor partner packages
CREATE TABLE IF NOT EXISTS sponsor_packages (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  tier VARCHAR(50),
  price VARCHAR(100),
  features TEXT[],
  image_url VARCHAR(500),
  is_highlighted BOOLEAN DEFAULT FALSE,
  sort_order INT DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  icon VARCHAR(10),
  category VARCHAR(100),
  cat_filter VARCHAR(50),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'upcoming',
  meta_date VARCHAR(100),
  meta_info VARCHAR(100),
  sort_order INT DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Gallery items
CREATE TABLE IF NOT EXISTS gallery_items (
  id SERIAL PRIMARY KEY,
  image_url VARCHAR(500),
  emoji VARCHAR(10),
  title VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  cat_filter VARCHAR(50),
  sort_order INT DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Blog posts
CREATE TABLE IF NOT EXISTS blog_posts (
  id SERIAL PRIMARY KEY,
  icon VARCHAR(10),
  tag VARCHAR(100),
  title VARCHAR(255) NOT NULL,
  excerpt TEXT,
  content TEXT,
  read_time VARCHAR(50),
  published BOOLEAN DEFAULT TRUE,
  image_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Training schedule
CREATE TABLE IF NOT EXISTS training_schedule (
  id SERIAL PRIMARY KEY,
  day VARCHAR(5),
  month VARCHAR(10),
  title VARCHAR(255) NOT NULL,
  location VARCHAR(500),
  time_range VARCHAR(100),
  status VARCHAR(50) DEFAULT 'open',
  sort_order INT DEFAULT 0,
  image_url VARCHAR(500),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Contact form submissions
CREATE TABLE IF NOT EXISTS contact_submissions (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  subject VARCHAR(255),
  message TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Model applications
CREATE TABLE IF NOT EXISTS model_applications (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  age INT,
  state VARCHAR(100),
  about TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Partnership inquiries
CREATE TABLE IF NOT EXISTS partnership_inquiries (
  id SERIAL PRIMARY KEY,
  company_name VARCHAR(255),
  contact_person VARCHAR(255),
  email VARCHAR(255),
  interest VARCHAR(255),
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
`;

const seedSettings = `
INSERT INTO site_settings (key, value) VALUES
  ('company_name', 'Amaidonah Universal Solutions Ltd'),
  ('slogan', 'Innovating Solutions, Empowering People'),
  ('hero_description', 'A youth-focused organization dedicated to innovation, technology awareness, talent development, media, event management, and community empowerment across Nigeria and beyond.'),
  ('hero_badge', 'Established · Nigeria · 2024'),
  ('hero_stat_1_num', '500+'),
  ('hero_stat_1_label', 'Youth Empowered'),
  ('hero_stat_2_num', '30+'),
  ('hero_stat_2_label', 'Projects Completed'),
  ('hero_stat_3_num', '12+'),
  ('hero_stat_3_label', 'Partner Organizations'),
  ('hero_stat_4_num', '5'),
  ('hero_stat_4_label', 'CESI Pageants Held'),
  ('contact_email', 'auslimited14@gmail.com'),
  ('contact_phone', '+234 812 4770 340'),
  ('contact_location', 'Taraba State, Nigeria'),
  ('contact_whatsapp', '+2348145739311'),
  ('contact_hours', 'Mon–Sat · 8:00 AM – 6:00 PM WAT'),
  ('social_instagram', 'https://www.instagram.com/auslimited14'),
  ('social_facebook', 'https://www.facebook.com/iverentyo55/'),
  ('social_tiktok', 'https://www.tiktok.com/@auslimted'),
  ('social_youtube', 'https://youtube.com/@ausltd'),
  ('footer_description', 'A youth-focused organization dedicated to technology, talent, media, and community empowerment across Nigeria.')
ON CONFLICT (key) DO NOTHING;
`;

const seedAbout = `
INSERT INTO about (section_title, description, mission, vision, quote) VALUES
  ('Building a Better Future for Nigerian Youth',
   'Amaidonah Universal Solutions Ltd (AUS) was founded with a clear purpose: to be a transformative force for youth development in Nigeria. Since our founding, we have grown from a small community initiative into a multifaceted organization touching lives through technology, talent, media, and events. Our work spans cybersecurity training, youth empowerment workshops, the celebrated CESI Pageant, professional model training, and strategic community partnerships. We believe every young person deserves the opportunity to discover and develop their full potential.',
   'To empower youth through innovation, technology, talent development, and purposeful community engagement.',
   'To be Africa''s leading youth empowerment and solutions organization by 2030, recognized for impact and excellence.',
   'Every youth carries within them the power to transform their community. We simply help them find it.')
ON CONFLICT DO NOTHING;
`;

const seedTeam = `
INSERT INTO team_members (name, role, initials, bio, sort_order) VALUES
  ('Amaidonah C. E.', 'Founder & CEO', 'CE', 'Visionary leader driving AUS''s mission to empower Nigerian youth through innovation and technology.', 1),
  ('Operations Director', 'Director of Operations', 'OA', 'Oversees all program delivery, partnerships, and organizational strategy across all AUS initiatives.', 2),
  ('Tech Lead', 'Head of Technology', 'TL', 'Leads cybersecurity training programs and technology awareness campaigns across schools and communities.', 3),
  ('Creative Director', 'Head of Media & Events', 'CD', 'Directs the CESI Pageant, model training programs, and all media and promotional activities.', 4)
ON CONFLICT DO NOTHING;
`;

const seedServices = `
INSERT INTO services (number, icon, title, description, link_section, sort_order) VALUES
  ('01', '💻', 'Technology Awareness Programs', 'Bringing digital literacy and tech awareness to schools, youth groups, and communities across Nigeria. We break down barriers between youth and technology through engaging workshops and seminars.', 'contact', 1),
  ('02', '🔒', 'Cybersecurity Training', 'Practical cybersecurity education designed for students, young professionals, and businesses. Covering online safety, ethical hacking fundamentals, data protection, and digital responsibility.', 'contact', 2),
  ('03', '🌟', 'Youth Empowerment', 'Leadership development, mentorship programs, and life skills training. We work with schools and community organizations to build confident, capable, purpose-driven young people.', 'contact', 3),
  ('04', '🎪', 'Event Management', 'Professional planning and execution of corporate events, school programs, fashion shows, pageants, and community gatherings. From concept to delivery, we handle every detail.', 'contact', 4),
  ('05', '📸', 'Media & Promotion', 'Strategic media coverage, social media management, content creation, and brand promotion for organizations, events, and individuals seeking visibility and professional presence.', 'contact', 5),
  ('06', '🏆', 'Talent Development', 'Identifying, nurturing, and showcasing diverse talents through structured programs including runway modeling, public speaking, performing arts, and creative skills development.', 'models', 6)
ON CONFLICT DO NOTHING;
`;

const seedWinners = `
INSERT INTO pageant_winners (year, name, title, initial, sort_order) VALUES
  ('CESI 2024', 'Adaeze Okonkwo', 'Queen of Innovation', 'A', 1),
  ('CESI 2023', 'Fatima Abdullahi', 'Queen of Excellence', 'F', 2),
  ('CESI 2022', 'Chisom Eze', 'Queen of Community', 'C', 3),
  ('CESI 2021', 'Ngozi Musa', 'Inaugural Queen', 'N', 4)
ON CONFLICT DO NOTHING;
`;

const seedValues = `
INSERT INTO core_values (icon, title, description, sort_order) VALUES
  ('🚀', 'Innovation', 'We embrace creative thinking and cutting-edge approaches to solve real-world challenges facing youth.', 1),
  ('🌟', 'Excellence', 'We hold ourselves to the highest standards in every program, event, and engagement we undertake.', 2),
  ('🤝', 'Integrity', 'Transparency and honesty form the bedrock of our relationships with members, partners, and communities.', 3),
  ('💡', 'Empowerment', 'We equip individuals with skills, knowledge, and confidence to achieve lasting independence and impact.', 4),
  ('🌍', 'Community', 'Our strength lies in togetherness — building networks that lift individuals and transform communities.', 5)
ON CONFLICT DO NOTHING;
`;

const seedProjects = `
INSERT INTO projects (icon, category, cat_filter, title, description, status, meta_date, meta_info, sort_order) VALUES
  ('💻', 'Technology', 'tech', 'Cybersecurity in Schools Initiative', 'Delivered hands-on cybersecurity workshops to over 300 students across 8 secondary schools in Abuja, covering online safety and digital hygiene.', 'completed', 'March 2024', '300+ participants', 1),
  ('👑', 'Pageant', 'event', 'CESI Pageant 2024', 'Our flagship annual pageant celebrating excellence, beauty, and community leadership. 20 contestants, 500+ audience, 15 sponsors from across Nigeria.', 'completed', 'November 2024', '500+ attendees', 2),
  ('🌍', 'Community Outreach', 'community', 'Clean Community Drive — Gwagwalada', 'Youth-led community clean-up and environmental awareness campaign in collaboration with local schools and government officials.', 'completed', 'January 2024', '150 volunteers', 3),
  ('📱', 'Technology', 'tech', 'Digital Literacy Tour 2025', 'A 10-city technology awareness tour across Northern and Southern Nigeria, bringing digital literacy to underserved communities and schools.', 'upcoming', 'August 2025', '10 cities targeted', 4),
  ('✨', 'Fashion', 'event', 'CESI Fashion Week 2025', 'Nigeria''s most inclusive youth fashion show celebrating emerging designers, CESI Models, and the best of Nigerian fashion culture.', 'upcoming', 'October 2025', '50+ models', 5),
  ('📚', 'Empowerment', 'community', 'Youth Leadership Summit 2025', 'A full-day leadership development summit for students aged 15–25, featuring keynote speakers, workshops, and networking opportunities.', 'upcoming', 'September 2025', '500 youth target', 6)
ON CONFLICT DO NOTHING;
`;

const seedSchedule = `
INSERT INTO training_schedule (day, month, title, location, time_range, status, sort_order) VALUES
  ('15', 'Jul', 'Orientation & Runway Basics', 'National Stadium, Abuja · 10:00 AM – 2:00 PM', '10:00 AM – 2:00 PM', 'open', 1),
  ('22', 'Jul', 'Posing & Portfolio Session', 'AUS Studio, Abuja · 9:00 AM – 1:00 PM', '9:00 AM – 1:00 PM', 'open', 2),
  ('05', 'Aug', 'Brand & Social Media Workshop', 'Tech Hub, Wuse 2 · 11:00 AM – 3:00 PM', '11:00 AM – 3:00 PM', 'filling_fast', 3),
  ('20', 'Aug', 'Mock Runway & Presentation', 'Grand Hall, Garki · 12:00 PM – 6:00 PM', '12:00 PM – 6:00 PM', 'filling_fast', 4)
ON CONFLICT DO NOTHING;
`;

const seedBlog = `
INSERT INTO blog_posts (icon, tag, title, excerpt, read_time, published) VALUES
  ('🏆', 'Success Story', 'CESI 2024: How Adaeze Okonkwo Changed Her Community After Winning', 'A powerful story of how our 2024 pageant queen used her platform to launch a digital literacy program for 200 primary school children in Abuja.', '5 min read', true),
  ('💻', 'Tech', '5 Cybersecurity Habits Every Nigerian Student Must Develop', 'Our cybersecurity lead shares the most common digital threats facing students today and simple, actionable steps to stay safe online.', '4 min read', true),
  ('📣', 'Announcement', 'CESI Pageant 2025 — Registration Opens July 1st', 'Exciting news! Applications for the 5th edition of the CESI Pageant are now open. Here''s everything you need to know to apply.', '2 min read', true),
  ('🌍', 'Community', 'How Youth Empowerment Programs Are Reshaping Abuja Communities', 'An in-depth look at the measurable impact of AUS programs on youth unemployment, skills gaps, and community pride in the FCT.', '6 min read', true),
  ('✨', 'Fashion', 'From Zero to Runway: Inside the CESI Model Training Program', 'Meet three graduates of our model training program and hear their stories of transformation, confidence, and professional growth.', '3 min read', true),
  ('🤝', 'Partnership', 'AUS Announces New Partnership with Five Leading Tech Brands', 'We''re thrilled to welcome five new corporate sponsors to the AUS family ahead of an exciting 2025 events calendar.', '3 min read', true)
ON CONFLICT DO NOTHING;
`;

const seedPageantPkgs = `
INSERT INTO pageant_packages (name, price, features, is_featured, sort_order) VALUES
  ('Bronze', '₦50,000', ARRAY['Logo on event banner', 'Social media mention', '2 complimentary tickets'], false, 1),
  ('Silver', '₦150,000', ARRAY['All Bronze benefits', 'Stage acknowledgement', 'Brand display booth', '5 complimentary tickets'], false, 2),
  ('Gold — Most Popular', '₦300,000', ARRAY['All Silver benefits', 'Category sponsorship', 'Media interview slot', '10 complimentary tickets', 'Post-event report'], true, 3),
  ('Platinum', '₦500,000+', ARRAY['All Gold benefits', 'Title sponsorship rights', 'Co-branding everywhere', 'VIP table for 15', 'Year-round partnership'], false, 4)
ON CONFLICT DO NOTHING;
`;

const seedSponsorPkgs = `
INSERT INTO sponsor_packages (name, tier, price, features, is_highlighted, sort_order) VALUES
  ('Bronze Partner', 'bronze', '₦100,000 / yr', ARRAY['Logo on website', '1 event mention', 'Social media post', 'Certificate of partnership'], false, 1),
  ('Silver Partner', 'silver', '₦200,000 / yr', ARRAY['All Bronze benefits', '3 event mentions', 'Banner at events', 'Newsletter feature', '4 complimentary tickets'], false, 2),
  ('Gold Partner', 'gold', '₦350,000 / yr', ARRAY['All Silver benefits', 'Stage naming rights', 'Booth at all events', 'Blog feature article', '8 complimentary tickets', 'Semi-annual report'], false, 3),
  ('Platinum Partner', 'platinum', '₦500,000 / yr', ARRAY['All Gold benefits', 'Title sponsorship rights', 'Dedicated landing page', 'Year-round co-branding', 'VIP event access', 'Quarterly impact report'], true, 4)
ON CONFLICT DO NOTHING;
`;

const seedGallery = `
INSERT INTO gallery_items (emoji, title, category, cat_filter, sort_order) VALUES
  ('👑', 'CESI Pageant 2024', 'Pageant', 'pageant', 1),
  ('👗', 'Runway Show 2024', 'Fashion', 'fashion', 2),
  ('💻', 'Cybersecurity Workshop', 'Tech', 'tech', 3),
  ('🌍', 'Community Outreach', 'Community', 'community', 4),
  ('✨', 'Crowning Ceremony', 'Pageant', 'pageant', 5),
  ('👠', 'Model Training', 'Fashion', 'fashion', 6),
  ('🔒', 'Digital Safety Talk', 'Tech', 'tech', 7),
  ('🤝', 'Youth Summit', 'Community', 'community', 8),
  ('🎭', 'Talent Show', 'Pageant', 'pageant', 9),
  ('📸', 'Portfolio Shoot', 'Fashion', 'fashion', 10),
  ('📱', 'Tech Awareness Tour', 'Tech', 'tech', 11),
  ('🌱', 'Clean Environment Drive', 'Community', 'community', 12)
ON CONFLICT DO NOTHING;
`;

async function setup() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('Creating schema...');
    await client.query(schema);

    // Add image_url columns to existing tables (tables already existed from first setup)
    console.log('Adding image_url columns to existing tables...');
    await client.query(`ALTER TABLE about ADD COLUMN IF NOT EXISTS image_url VARCHAR(500)`);
    await client.query(`ALTER TABLE core_values ADD COLUMN IF NOT EXISTS image_url VARCHAR(500)`);
    await client.query(`ALTER TABLE team_members ADD COLUMN IF NOT EXISTS image_url VARCHAR(500)`);
    await client.query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS image_url VARCHAR(500)`);
    await client.query(`ALTER TABLE pageant_winners ADD COLUMN IF NOT EXISTS image_url VARCHAR(500)`);
    await client.query(`ALTER TABLE pageant_packages ADD COLUMN IF NOT EXISTS image_url VARCHAR(500)`);
    await client.query(`ALTER TABLE sponsor_packages ADD COLUMN IF NOT EXISTS image_url VARCHAR(500)`);
    // projects, gallery_items, blog_posts, training_schedule already had image_url from first run but let's ensure
    await client.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS image_url VARCHAR(500)`);
    await client.query(`ALTER TABLE gallery_items ADD COLUMN IF NOT EXISTS image_url VARCHAR(500)`);
    await client.query(`ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS image_url VARCHAR(500)`);
    await client.query(`ALTER TABLE training_schedule ADD COLUMN IF NOT EXISTS image_url VARCHAR(500)`);

    console.log('Seeding site settings...');
    await client.query(seedSettings);

    console.log('Seeding about section...');
    await client.query(seedAbout);

    console.log('Seeding team members...');
    await client.query(seedTeam);

    console.log('Seeding services...');
    await client.query(seedServices);

    console.log('Seeding pageant winners...');
    await client.query(seedWinners);

    console.log('Seeding core values...');
    await client.query(seedValues);

    console.log('Seeding projects...');
    await client.query(seedProjects);

    console.log('Seeding training schedule...');
    await client.query(seedSchedule);

    console.log('Seeding blog posts...');
    await client.query(seedBlog);

    console.log('Seeding pageant packages...');
    await client.query(seedPageantPkgs);

    console.log('Seeding sponsor packages...');
    await client.query(seedSponsorPkgs);

    console.log('Seeding gallery items...');
    await client.query(seedGallery);

    console.log('Creating admin user...');
    const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10);
    await client.query(
      `INSERT INTO admins (email, password, name) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING`,
      [process.env.ADMIN_EMAIL || 'admin@aus.com', hashedPassword, 'AUS Admin']
    );

    await client.query('COMMIT');
    console.log('\n✅ Database setup complete!');
    console.log(`   Admin login: ${process.env.ADMIN_EMAIL || 'admin@aus.com'} / ${process.env.ADMIN_PASSWORD || 'admin123'}`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Setup failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

setup();
