const API_BASE = '';

async function fetchJSON(path) {
  try {
    const res = await fetch(API_BASE + path);
    if (!res.ok) throw new Error('Failed to fetch');
    return await res.json();
  } catch (e) {
    console.warn('API fetch failed for', path, e);
    return null;
  }
}

async function loadDynamicContent() {
  await Promise.all([
    loadSettings(),
    loadAbout(),
    loadCoreValues(),
    loadTeamMembers(),
    loadServices(),
    loadPageantWinners(),
    loadPageantPackages(),
    loadSponsorPackages(),
    loadProjects(),
    loadGallery(),
    loadBlogPosts(),
    loadTrainingSchedule(),
  ]);
}

// ─── SITE SETTINGS ───
async function loadSettings() {
  const s = await fetchJSON('/api/settings');
  if (!s) return;
  
  if (s.hero_badge) document.querySelector('.hero-badge').textContent = s.hero_badge;
  if (s.company_name) {
    const title = document.querySelector('.hero-title');
    if (title) title.innerHTML = s.company_name.replace(/ /g, '<br>').replace('Universal', '<span class="gold">Universal</span>');
  }
  if (s.slogan) {
    const slogan = document.querySelector('.hero-slogan');
    if (slogan) slogan.innerHTML = `<em>${s.slogan}</em>`;
  }
  if (s.hero_description) {
    const desc = document.querySelector('.hero-desc');
    if (desc) desc.textContent = s.hero_description;
  }
  
  // Hero stats
  for (let i = 1; i <= 4; i++) {
    const num = s[`hero_stat_${i}_num`];
    const label = s[`hero_stat_${i}_label`];
    const stats = document.querySelectorAll('.hero-stat');
    if (stats[i - 1] && num && label) {
      stats[i - 1].querySelector('.num').textContent = num;
      stats[i - 1].querySelector('.label').textContent = label;
    }
  }

  // Contact
  if (s.contact_email) {
    document.querySelectorAll('a[href^="mailto:"]').forEach(a => { a.href = 'mailto:' + s.contact_email; a.textContent = s.contact_email; });
  }
  if (s.contact_phone) {
    const phoneLink = document.querySelector('a[href^="tel:"]');
    if (phoneLink) { phoneLink.href = 'tel:' + s.contact_phone.replace(/\s/g, ''); phoneLink.textContent = s.contact_phone; }
  }
  if (s.contact_location) {
    const locs = document.querySelectorAll('.contact-card p');
    locs.forEach(p => { if (p.textContent.includes('Taraba') || p.textContent.includes('Nigeria')) p.innerHTML = s.contact_location.replace(',', '<br>'); });
  }
  if (s.contact_whatsapp) {
    const wa = document.querySelector('a[href*="wa.me"]');
    if (wa) wa.href = 'https://wa.me/' + s.contact_whatsapp.replace(/[^0-9]/g, '');
  }
  if (s.social_instagram) {
    const ig = document.querySelector('a[href*="instagram.com/auslimited"]');
    if (ig) ig.href = s.social_instagram;
  }
  if (s.social_facebook) {
    const fb = document.querySelectorAll('a[href*="facebook.com"]');
    fb.forEach(a => { if (a.closest('.social-links') || a.closest('.footer-brand')) a.href = s.social_facebook; });
  }
  if (s.social_tiktok) {
    const tt = document.querySelectorAll('a[href*="tiktok.com"]');
    tt.forEach(a => a.href = s.social_tiktok);
  }
  if (s.social_youtube) {
    const yt = document.querySelectorAll('a[href*="youtube.com"]');
    yt.forEach(a => a.href = s.social_youtube);
  }
  if (s.footer_description) {
    const fb = document.querySelector('.footer-brand p');
    if (fb) fb.textContent = s.footer_description;
  }
}

// ─── ABOUT ───
async function loadAbout() {
  const items = await fetchJSON('/api/about');
  if (!items || items.length === 0) return;
  const a = items[0];
  const aboutSection = document.getElementById('about');
  if (!aboutSection) return;

  const title = aboutSection.querySelector('.section-title');
  if (title && a.section_title) title.innerHTML = a.section_title.replace('Better Future', '<span class="accent">Better Future</span>');

  const paragraphs = aboutSection.querySelectorAll('p[style]');
  if (paragraphs[0] && a.description) paragraphs[0].textContent = a.description;

  const blocks = aboutSection.querySelectorAll('[style*="border-left"]');
  if (blocks[0] && a.mission) {
    const p = blocks[0].querySelector('p');
    if (p) p.textContent = a.mission;
  }
  if (blocks[1] && a.vision) {
    const p = blocks[1].querySelector('p');
    if (p) p.textContent = a.vision;
  }

  const quote = aboutSection.querySelector('.about-visual-quote');
  if (quote && a.quote) quote.textContent = a.quote;

  const yearBadge = aboutSection.querySelector('.about-year-badge span:first-child');
  if (yearBadge && a.founded_year) yearBadge.textContent = a.founded_year;
}

// ─── CORE VALUES ───
async function loadCoreValues() {
  const items = await fetchJSON('/api/core_values');
  if (!items || items.length === 0) return;
  const container = document.querySelector('.about-values');
  if (!container) return;
  container.innerHTML = items.map(v => `
    <div class="value-card">
      <div class="value-icon">${v.icon}</div>
      <h4>${v.title}</h4>
      <p>${v.description}</p>
    </div>
  `).join('');
}

// ─── TEAM ───
async function loadTeamMembers() {
  const items = await fetchJSON('/api/team_members');
  if (!items || items.length === 0) return;
  const container = document.querySelector('.team-grid');
  if (!container) return;
  container.innerHTML = items.map(m => `
    <div class="team-card">
      <div class="team-avatar">${m.initials}</div>
      <div class="team-info">
        <h4>${m.name}</h4>
        <div class="role">${m.role}</div>
        <p>${m.bio || ''}</p>
      </div>
    </div>
  `).join('');
}

// ─── SERVICES ───
async function loadServices() {
  const items = await fetchJSON('/api/services');
  if (!items || items.length === 0) return;
  const container = document.querySelector('.services-grid');
  if (!container) return;
  container.innerHTML = items.map(s => `
    <div class="service-card">
      <div class="service-num">${s.number}</div>
      <span class="service-icon">${s.icon}</span>
      <h3>${s.title}</h3>
      <p>${s.description}</p>
      <a href="#" class="service-link" onclick="showSection('${s.link_section || 'contact'}')">Learn More</a>
    </div>
  `).join('');
}

// ─── PAGEANT WINNERS ───
async function loadPageantWinners() {
  const items = await fetchJSON('/api/pageant_winners');
  if (!items || items.length === 0) return;
  const container = document.querySelector('.winners-grid');
  if (!container) return;
  container.innerHTML = items.map(w => `
    <div class="winner-card">
      <div class="winner-avatar">${w.initial}</div>
      <div class="year">${w.year}</div>
      <h4>${w.name}</h4>
      <p>${w.title}</p>
    </div>
  `).join('');
}

// ─── PAGEANT PACKAGES ───
async function loadPageantPackages() {
  const items = await fetchJSON('/api/pageant_packages');
  if (!items || items.length === 0) return;
  const container = document.querySelector('.pageant-packages');
  if (!container) return;
  container.innerHTML = items.map(p => `
    <div class="pkg-card${p.is_featured ? ' featured' : ''}">
      <div class="pkg-name">${p.name}</div>
      <div class="pkg-price">${p.price}</div>
      <ul class="pkg-features">
        ${(p.features || []).map(f => `<li>${f}</li>`).join('')}
      </ul>
    </div>
  `).join('');
}

// ─── SPONSOR PACKAGES ───
async function loadSponsorPackages() {
  const items = await fetchJSON('/api/sponsor_packages');
  if (!items || items.length === 0) return;
  const container = document.querySelector('.sponsor-packages');
  if (!container) return;
  container.innerHTML = items.map(p => `
    <div class="sponsor-pkg${p.is_highlighted ? ' highlight' : ''}">
      <span class="pkg-tier tier-${p.tier}">${p.name}</span>
      <div class="sponsor-pkg-price">${p.price}</div>
      <ul class="sponsor-pkg-features">
        ${(p.features || []).map(f => `<li>${f}</li>`).join('')}
      </ul>
      <a href="#" class="btn btn-gold" style="margin-top:1.5rem;width:100%;justify-content:center;font-size:14px;" onclick="showSection('contact')">${p.is_highlighted ? 'Become ' + p.tier.charAt(0).toUpperCase() + p.tier.slice(1) : 'Get Started'}</a>
    </div>
  `).join('');
}

// ─── PROJECTS ───
async function loadProjects() {
  const items = await fetchJSON('/api/projects');
  if (!items || items.length === 0) return;
  const container = document.getElementById('projectsGrid');
  if (!container) return;
  container.innerHTML = items.map(p => `
    <div class="project-card" data-cat="${p.cat_filter}">
      <div class="project-img">${p.icon}
        <span class="proj-status ${p.status === 'completed' ? 'status-done' : 'status-upcoming'}">${p.status === 'completed' ? 'Completed' : 'Upcoming'}</span>
      </div>
      <div class="project-body">
        <div class="project-cat">${p.category}</div>
        <h3>${p.title}</h3>
        <p>${p.description}</p>
        <div class="project-meta">
          <span>📅 ${p.meta_date || ''}</span>
          <span>👥 ${p.meta_info || ''}</span>
        </div>
      </div>
    </div>
  `).join('');
}

// ─── GALLERY ───
async function loadGallery() {
  const items = await fetchJSON('/api/gallery_items');
  if (!items || items.length === 0) return;
  const container = document.getElementById('galleryGrid');
  if (!container) return;
  container.innerHTML = items.map(g => `
    <div class="gallery-item" data-cat="${g.cat_filter}">
      <span class="gallery-cat-badge">${g.category}</span>
      ${g.image_url ? `<img src="${g.image_url}" alt="${g.title}" style="width:100%;height:100%;object-fit:cover;">` : g.emoji}
      <div class="gallery-overlay"><span>${g.title}</span></div>
    </div>
  `).join('');
}

// ─── BLOG ───
async function loadBlogPosts() {
  const items = await fetchJSON('/api/blog_posts');
  if (!items || items.length === 0) return;
  const container = document.querySelector('.blog-grid');
  if (!container) return;
  container.innerHTML = items.filter(b => b.published).map(b => `
    <div class="blog-card">
      <div class="blog-img">${b.icon}
        <span class="blog-tag">${b.tag}</span>
      </div>
      <div class="blog-body">
        <div class="blog-meta"><span>${b.created_at ? new Date(b.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : ''}</span> · <span>${b.read_time || ''}</span></div>
        <h3>${b.title}</h3>
        <p>${b.excerpt || ''}</p>
        <a href="#" class="blog-read" onclick="viewBlogPost(${b.id})">Read Article</a>
      </div>
    </div>
  `).join('');
}

let currentBlogId = null;

function openBlogModal() {
  if (!currentBlogId) return;
  fetchJSON('/api/blog_posts/' + currentBlogId).then(item => {
    if (!item) {
      console.warn('Blog post not found:', currentBlogId);
      return;
    }
    const date = item.created_at ? new Date(item.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '';
    const readTime = item.read_time || '5 min read';
    const published = item.published ? 'Yes' : 'No';
    const tags = item.tag || '';
    const html = `
      <div style="font-size:16px; line-height: 1.8;">
        <p><strong>Title:</strong> ${item.title}</p>
        <p><strong>Tag:</strong> ${tags}</p>
        <p><strong>Published:</strong> ${published}</p>
        <p><strong>Read Time:</strong> ${readTime}</p>
        ${item.excerpt ? `<p><strong>Excerpt:</strong> ${item.excerpt}</p>` : ''}
        ${item.content ? `<p><strong>Full Content:</strong> ${item.content}</p>` : ''}
        <p><strong>Created:</strong> ${date}</p>
      </div>
    `;
    document.getElementById('blogModalTitle').textContent = 'Blog Post Details';
    document.getElementById('blogModalContent').innerHTML = `<div style="font-size:14px; line-height: 1.8; max-height: 80vh; overflow-y: auto;">${html}</div>`;
    document.getElementById('blogModal').classList.add('open');
  }).catch(e => console.warn('Error loading post', e));
}

function closeBlogModal() {
  document.getElementById('blogModal').classList.remove('open');
}

function viewBlogPost(id) {
  currentBlogId = id;
  openBlogModal();
}

// ─── TRAINING SCHEDULE ───
async function loadTrainingSchedule() {
  const items = await fetchJSON('/api/training_schedule');
  if (!items || items.length === 0) return;
  const container = document.querySelector('.training-schedule');
  if (!container) return;
  const header = container.querySelector('.schedule-header');
  const existingItems = container.querySelectorAll('.schedule-item');
  existingItems.forEach(el => el.remove());

  items.forEach(t => {
    const badgeClass = t.status === 'open' ? 'badge-open' : t.status === 'filling_fast' ? 'badge-soon' : 'badge-open';
    const badgeText = t.status === 'open' ? 'Open' : t.status === 'filling_fast' ? 'Filling Fast' : 'Full';
    const div = document.createElement('div');
    div.className = 'schedule-item';
    div.innerHTML = `
      <div class="sched-date"><div class="day">${t.day}</div><div class="mon">${t.month}</div></div>
      <div class="sched-info">
        <h4>${t.title}</h4>
        <p>${t.location || ''}</p>
      </div>
      <span class="sched-badge ${badgeClass}">${badgeText}</span>
    `;
    container.appendChild(div);
  });
}

// ─── FORM SUBMISSIONS ───
async function submitForm() {
  showNotif('Thank you! We\'ll be in touch within 24 hours. 🎉');
}

// ─── LOAD ON READY ───
document.addEventListener('DOMContentLoaded', loadDynamicContent);
