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

function submitContactForm() {
  const data = {
    first_name: document.getElementById('contactFirstName').value,
    last_name: document.getElementById('contactLastName').value,
    email: document.getElementById('contactEmail').value,
    phone: document.getElementById('contactPhone').value,
    subject: document.getElementById('contactSubject').value,
    message: document.getElementById('contactMessage').value
  };
  fetch('/api/submissions/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(r => r.json()).then(d => {
    showNotif('Message sent successfully! We\'ll be in touch within 24 hours.');
    document.getElementById('contactFirstName').value = '';
    document.getElementById('contactLastName').value = '';
    document.getElementById('contactEmail').value = '';
    document.getElementById('contactPhone').value = '';
    document.getElementById('contactMessage').value = '';
  }).catch(() => showNotif('Something went wrong. Please try again.'));
}

function submitModelForm() {
  const form = new FormData();
  form.append('full_name', document.getElementById('modelName').value);
  form.append('email', document.getElementById('modelEmail').value);
  form.append('phone', document.getElementById('modelPhone').value);
  form.append('age', document.getElementById('modelAge').value);
  form.append('state', document.getElementById('modelState').value);
  form.append('about', document.getElementById('modelAbout').value);
  const photo = document.getElementById('modelPhoto').files[0];
  if (photo) form.append('image', photo);
  fetch('/api/submissions/models', {
    method: 'POST',
    body: form
  }).then(r => r.json()).then(d => {
    showNotif('Application submitted successfully! Good luck.');
    document.getElementById('modelName').value = '';
    document.getElementById('modelEmail').value = '';
    document.getElementById('modelPhone').value = '';
    document.getElementById('modelAge').value = '';
    document.getElementById('modelState').value = '';
    document.getElementById('modelAbout').value = '';
    document.getElementById('modelPhoto').value = '';
  }).catch(() => showNotif('Something went wrong. Please try again.'));
}

function submitPartnershipForm() {
  const data = {
    company_name: document.getElementById('partnerCompany').value,
    contact_person: document.getElementById('partnerContact').value,
    email: document.getElementById('partnerEmail').value,
    package_interest: document.getElementById('partnerInterest').value
  };
  fetch('/api/submissions/partnerships', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(r => r.json()).then(d => {
    showNotif('Partnership inquiry sent! We\'ll reach out soon.');
    document.getElementById('partnerCompany').value = '';
    document.getElementById('partnerContact').value = '';
    document.getElementById('partnerEmail').value = '';
    document.getElementById('partnerInterest').value = '';
  }).catch(() => showNotif('Something went wrong. Please try again.'));
}

function loadPartnershipOptions() {
  fetch('/api/sponsor_packages')
    .then(r => r.json())
    .then(pkgs => {
      const sel = document.getElementById('partnerInterest');
      if (!sel) return;
      sel.innerHTML = '<option value="">Select a package...</option>';
      const seen = {};
      pkgs.forEach(p => {
        if (seen[p.name]) return;
        seen[p.name] = true;
        sel.innerHTML += '<option value="' + p.name + '">' + p.name + ' — ' + p.price + '</option>';
      });
      sel.innerHTML += '<option value="Custom Package">Custom Package</option>';
    });
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

loadPartnershipOptions();

// Nav scroll effect
window.addEventListener('scroll', () => {
  document.getElementById('mainNav').style.background =
    window.scrollY > 20 ? 'rgba(10,22,40,0.98)' : 'rgba(10,22,40,0.96)';
});