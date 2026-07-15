function showSection(id) {
  document.querySelectorAll('section').forEach(s => {
    s.classList.remove('active');
    s.style.display = 'none';
  });
  const sec = document.getElementById(id);
  if (sec) { sec.style.display = 'block'; sec.classList.add('active'); }
  document.querySelectorAll('.nav-links a').forEach(a => {
    a.classList.toggle('active', a.dataset.sec === id);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
  return false;
}

function toggleMobile() {
  document.getElementById('mobileMenu').classList.toggle('open');
}

function filterProjects(cat, btn) {
  document.querySelectorAll('.projects-tabs .tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('#projectsGrid .project-card').forEach(c => {
    c.style.display = (cat === 'all' || c.dataset.cat === cat) ? '' : 'none';
  });
}

function filterGallery(cat, btn) {
  document.querySelectorAll('.gallery-filter .tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('#galleryGrid .gallery-item').forEach(i => {
    i.style.display = (cat === 'all' || i.dataset.cat === cat) ? '' : 'none';
  });
}

function submitForm() {
    
  showNotif('Thank you! We\'ll be in touch within 24 hours. 🎉');
}

function showNotif(msg) {
  const n = document.getElementById('notif');
  document.getElementById('notifText').textContent = msg || 'Message sent successfully!';
  n.classList.add('show');
  setTimeout(() => n.classList.remove('show'), 4000);
}

// Initialize — make sure only home is shown
document.querySelectorAll('section').forEach(s => {
  if (s.id !== 'home') s.style.display = 'none';
});

// Nav scroll effect
window.addEventListener('scroll', () => {
  document.getElementById('mainNav').style.background =
    window.scrollY > 20 ? 'rgba(10,22,40,0.98)' : 'rgba(10,22,40,0.96)';
});