// ═══════════════════════════════
// FIREBASE + EMAILJS INIT
// ═══════════════════════════════
if (typeof emailjs !== 'undefined') {
  emailjs.init({ publicKey: 'kG6B7Cff-xvHUOkh7' });
}
const EMAILJS_SERVICE = 'service_vdbaisk';
const EMAILJS_TEMPLATE = 'template_gahxvgv';

const firebaseConfig = {
  apiKey: "AIzaSyChgH5tThYBcliCAWhPS1kMt6cW0B0b3S4",
  authDomain: "csk-automobiles.firebaseapp.com",
  projectId: "csk-automobiles",
  storageBucket: "csk-automobiles.firebasestorage.app",
  messagingSenderId: "67721711616",
  appId: "1:67721711616:web:4dc10c2da9c2091b98c8e5",
  measurementId: "G-YC983295Z9"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
const googleProvider = new firebase.auth.GoogleAuthProvider();

const ADMIN_EMAIL = "mahes2332005@gmail.com";
const ADMIN_PASSWORD = "7010099085";

let currentUser = null;
let darkMode = false;

const SERVICE_INTERVALS = {
  'Oil Change': 180, 'Full Service': 365, 'Tire Rotation': 90,
  'Battery Replacement': 365, 'Battery Check': 365, 'Brake Service': 180,
  'Engine Check': 180, 'AC Service': 180, 'Wheel Alignment': 180,
  'Clutch Repair': 365, 'Gear Box Repair': 365, 'Electrical Work': 365,
  'Painting': 730, 'Other': 365
};

// ═══════════════════════════════
// UTILITIES
// ═══════════════════════════════
function isEmail(v) { return /\S+@\S+\.\S+/.test(v); }
function isPhone(v) { return /^\d{10}$/.test(v); }
function validPassword(p) { return p.length >= 8 && /\d/.test(p); }
function setErr(id, show) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('show', show);
  const inp = document.getElementById(id.replace('-err',''));
  if (inp) inp.classList.toggle('error', show);
}
function clearErr(id) { setErr(id, false); }
function getVal(id) { return (document.getElementById(id)||{}).value?.trim() || ''; }
function generateUserID() { return `CU-${Math.floor(100000 + Math.random() * 900000)}`; }
function today() { return new Date().toISOString().split('T')[0]; }
function nowTime() { return new Date().toTimeString().slice(0,5); }
function fmtDate(d) { if (!d) return '—'; const dt = new Date(d); return dt.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}); }
function fmtDateTime(d,t) { return `${fmtDate(d)}${t?' at '+t:''}`; }
function addDays(dateStr, days) { const d = new Date(dateStr); d.setDate(d.getDate() + days); return d.toISOString().split('T')[0]; }
function daysDiff(d1, d2) { return Math.floor((new Date(d2) - new Date(d1)) / (1000*60*60*24)); }
function statusBadge(s) {
  if (!s) return '';
  if (s==='Pending') return '<span class="badge badge-gold">Pending</span>';
  if (s==='In Progress') return '<span class="badge badge-blue">In Progress</span>';
  if (s==='Completed') return '<span class="badge badge-green">Completed</span>';
  if (s==='Approved') return '<span class="badge badge-green">Approved</span>';
  if (s==='Rejected') return '<span class="badge badge-red">Rejected</span>';
  return `<span class="badge badge-gray">${s}</span>`;
}
function monthsSince(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const now = new Date();
  const months = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
  if (months < 1) return '<1 mo';
  return months + ' mo';
}
function computeReminders(services, includeAll) {
  const items = [];
  const grouped = {};
  services.forEach(s => {
    if (!grouped[s.workType] || new Date(s.date) > new Date(grouped[s.workType].date)) {
      grouped[s.workType] = s;
    }
  });
  Object.entries(grouped).forEach(([type, svc]) => {
    const interval = SERVICE_INTERVALS[type] || 365;
    const due = addDays(svc.date, interval);
    const daysUntil = daysDiff(today(), due);
    const overdue = daysUntil < 0;
    if (includeAll || daysUntil <= 30) {
      items.push({ service: type, due, daysUntil, overdue });
    }
  });
  return items.sort((a,b) => a.daysUntil - b.daysUntil);
}

// ═══════════════════════════════
// TOAST
// ═══════════════════════════════
function toast(msg, type='info', duration=3500) {
  const icons = { success:'✅', error:'❌', info:'ℹ️' };
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${icons[type]}</span><span>${msg}</span>`;
  document.getElementById('toast-container').appendChild(t);
  setTimeout(() => t.remove(), duration);
}

// ═══════════════════════════════
// DARK MODE
// ═══════════════════════════════
function toggleDark() {
  darkMode = !darkMode;
  if (darkMode) { document.body.setAttribute('data-dark',''); localStorage.setItem('csk-dark','1'); }
  else { document.body.removeAttribute('data-dark'); localStorage.setItem('csk-dark','0'); }
}
function restoreDark() {
  if (localStorage.getItem('csk-dark') === '1') { darkMode = true; document.body.setAttribute('data-dark',''); }
}

// ═══════════════════════════════
// TOPBAR
// ═══════════════════════════════
function setTopbar(name, uid, role) {
  document.getElementById('topbar').classList.remove('hidden');
  document.getElementById('topbar-name').textContent = name;
  document.getElementById('topbar-avatar').textContent = name.charAt(0).toUpperCase();
  const roleColors = { admin:'badge-red', worker:'badge-blue', customer:'badge-green' };
  document.getElementById('topbar-badge').innerHTML = `<span class="badge ${roleColors[role]||'badge-gray'}" style="margin-left:8px;">${role.toUpperCase()}</span>`;
}

function handleLogout() {
  auth.signOut().catch(()=>{});
  localStorage.removeItem('csk_role');
  localStorage.removeItem('csk_user');
  window.location.href = 'index.html';
}

// ═══════════════════════════════
// LOADER
// ═══════════════════════════════
function hideLoader() {
  const loader = document.getElementById('app-loader');
  if (loader) {
    loader.style.opacity = '0';
    setTimeout(() => loader.style.display = 'none', 500);
  }
}

function populateYearDropdowns(ids) {
  const cur = new Date().getFullYear();
  (ids || []).forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = '<option value="">Year</option>';
    for (let y = cur; y >= 1990; y--) el.innerHTML += `<option value="${y}">${y}</option>`;
  });
}

// ═══════════════════════════════
// FORGOT PASSWORD (shared modal)
// ═══════════════════════════════
let fpOTP = '', fpRole = '', fpDocId = '';

function openForgotPassword(role) {
  fpRole = role; fpOTP = ''; fpDocId = '';
  document.getElementById('fp-step1').classList.remove('hidden');
  document.getElementById('fp-step2').classList.add('hidden');
  document.getElementById('fp-email').value = '';
  document.getElementById('forgot-pw-modal').classList.remove('hidden');
}

async function sendForgotOTP() {
  const email = getVal('fp-email');
  if (!isEmail(email)) { toast('Enter a valid email', 'error'); return; }
  const collection = fpRole === 'worker' ? 'workers' : 'customers';
  try {
    const snap = await db.collection(collection).where('email', '==', email).get();
    if (snap.empty) { toast('No account found with this email', 'error'); return; }
    fpDocId = snap.docs[0].id;
    fpOTP = String(Math.floor(100000 + Math.random() * 900000));
    await emailjs.send(EMAILJS_SERVICE, EMAILJS_TEMPLATE, {
      to_email: email,
      to_name: snap.docs[0].data().name || 'User',
      user_email: email, otp_code: fpOTP,
      user_name: snap.docs[0].data().name || 'User',
      user_id: snap.docs[0].data().userId || snap.docs[0].id
    });
    toast('OTP sent to ' + email, 'success');
    document.getElementById('fp-step1').classList.add('hidden');
    document.getElementById('fp-step2').classList.remove('hidden');
  } catch (e) { toast('Error sending OTP: ' + (e.text || e.message || JSON.stringify(e)), 'error'); console.error(e); }
}

async function verifyOTPAndReset() {
  const otp = getVal('fp-otp'), newPass = getVal('fp-newpass'), confirmPass = getVal('fp-confirmpass');
  if (otp !== fpOTP) { toast('Invalid OTP', 'error'); return; }
  if (!validPassword(newPass)) { toast('Password must be min 8 chars with a number', 'error'); return; }
  if (newPass !== confirmPass) { toast('Passwords do not match', 'error'); return; }
  const collection = fpRole === 'worker' ? 'workers' : 'customers';
  try {
    await db.collection(collection).doc(fpDocId).update({ password: newPass });
    toast('Password reset successfully! You can now log in.', 'success');
    document.getElementById('forgot-pw-modal').classList.add('hidden');
  } catch (e) { toast('Error: ' + (e.text || e.message || JSON.stringify(e)), 'error'); }
}
