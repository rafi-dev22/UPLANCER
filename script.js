/* ═══════════════════════════════════════════════
   CONFIG
═══════════════════════════════════════════════ */
const GEMINI_KEY = "AIzaSyColZ6NXaY9D084s4odVUnQ-rPt65_C0II";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;

/* ═══════════════════════════════════════════════
   STATE
═══════════════════════════════════════════════ */
let S = {
  user: null,
  cvText: '', cvFileName: '',
  ghUser: '',
  ghData: null,
  aiScore: null, aiBreakdown: null,
  aiFeedback: null, aiStatus: null,
  skillGaps: [], improvements: [], jobMatches: [],
  flProfile: null,
  currentCat: null, currentSub: null,
};

function saveS(){ localStorage.setItem('up_s', JSON.stringify(S)); }
function loadS(){ const d = localStorage.getItem('up_s'); if(d) S = JSON.parse(d); }
function getUsers(){ return JSON.parse(localStorage.getItem('up_users')||'[]'); }
function saveUsers(u){ localStorage.setItem('up_users', JSON.stringify(u)); }
function getOrders(){ return JSON.parse(localStorage.getItem('up_orders')||'[]'); }
function saveOrders(o){ localStorage.setItem('up_orders', JSON.stringify(o)); }

/* ═══════════════════════════════════════════════
   NAVIGATION
═══════════════════════════════════════════════ */
function showPage(id, sub){
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if(id==='page-auth') toggleAuth(sub||'login');
  window.scrollTo(0,0);
}
function toggleAuth(tab){
  document.getElementById('auth-login').style.display = tab==='login' ? '' : 'none';
  document.getElementById('auth-register').style.display = tab==='register' ? '' : 'none';
}

/* ═══════════════════════════════════════════════
   TOAST
═══════════════════════════════════════════════ */
function toast(msg, type='info'){
  const el = document.getElementById('toast');
  const icons = {success:'✓', error:'✕', warn:'⚠', info:'ℹ'};
  el.innerHTML = `<span style="color:${type==='success'?'var(--green)':type==='error'?'var(--red)':type==='warn'?'var(--amber)':'var(--accent2)'}">${icons[type]||'ℹ'}</span> ${msg}`;
  el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'), 3200);
}

/* ═══════════════════════════════════════════════
   AUTH
═══════════════════════════════════════════════ */
function doLogin(){
  const email = document.getElementById('l-email').value.trim();
  const pass = document.getElementById('l-pass').value;
  if(!email||!pass) return toast('Isi email dan password','error');
  const users = getUsers();
  const u = users.find(u => u.email===email && u.pass===pass);
  if(!u) return toast('Email atau password salah','error');
  S.user = u; saveS(); routeUser();
}

function doRegister(){
  const name = document.getElementById('r-name').value.trim();
  const email = document.getElementById('r-email').value.trim();
  const pass = document.getElementById('r-pass').value;
  if(!name||!email||!pass) return toast('Lengkapi semua field','error');
  if(pass.length<6) return toast('Password minimal 6 karakter','error');
  const users = getUsers();
  if(users.find(u=>u.email===email)) return toast('Email sudah terdaftar','error');
  const u = {id:Date.now().toString(),name,email,pass,role:null,published:false,aiScore:null,flProfile:null,skillGaps:[],improvements:[]};
  users.push(u); saveUsers(users);
  S.user = u; saveS(); routeUser();
}

function doLogout(){
  S = {user:null,cvText:'',cvFileName:'',ghUser:'',ghData:null,aiScore:null,aiBreakdown:null,aiFeedback:null,aiStatus:null,skillGaps:[],improvements:[],jobMatches:[],flProfile:null,currentCat:null,currentSub:null};
  saveS(); showPage('page-landing'); toast('Berhasil logout','success');
}

function routeUser(){
  if(!S.user){ showPage('page-landing'); return; }
  // refresh from DB
  const users = getUsers();
  const fresh = users.find(u=>u.id===S.user.id);
  if(fresh) S.user = fresh;
  if(!S.user.role){
    document.getElementById('role-username').textContent = S.user.name;
    showPage('page-role');
  } else if(S.user.role==='client'){
    document.getElementById('client-uname').textContent = S.user.name;
    showPage('page-client');
    renderClientOrders();
  } else if(S.user.role==='freelancer'){
    if(!S.user.published){ showPage('page-fl-ob'); resetOnboarding(); }
    else { showPage('page-fl-dash'); renderFlDash(); }
  }
}

function selectRole(role){
  const users = getUsers();
  const i = users.findIndex(u=>u.id===S.user.id);
  users[i].role = role; saveUsers(users);
  S.user = users[i]; saveS(); routeUser();
}

/* ═══════════════════════════════════════════════
   ONBOARDING
═══════════════════════════════════════════════ */
function resetOnboarding(){
  for(let i=1;i<=5;i++){
    const el = document.getElementById('ob'+i);
    if(el) el.style.display = i===1?'':'none';
  }
  updateSteps(1);
  document.getElementById('ob3-loading').style.display='';
  document.getElementById('ob3-result').style.display='none';
  document.getElementById('ai-log').innerHTML='';
}

function updateSteps(active){
  for(let i=1;i<=5;i++){
    const dot = document.getElementById('sd'+i);
    if(!dot) continue;
    dot.className='step-dot';
    if(i<active){ dot.className='step-dot done'; dot.textContent='✓'; }
    else if(i===active){ dot.className='step-dot active'; dot.textContent=i; }
    else { dot.textContent=i; }
    if(i<5){
      const ln = document.getElementById('sl'+i);
      if(ln) ln.className='step-line'+(i<active?' done':'');
    }
  }
}

function obGo(step){
  for(let i=1;i<=5;i++) document.getElementById('ob'+i).style.display = i===step?'':'none';
  updateSteps(step);
}

/* CV FILE UPLOAD */
function handleCvFile(e){
  const file = e.target.files[0];
  if(!file) return;
  if(file.size > 5*1024*1024) return toast('File terlalu besar (maks 5MB)','error');
  S.cvFileName = file.name;
  document.getElementById('cv-fn-text').textContent = file.name;
  document.getElementById('cv-filename').classList.add('show');

  const reader = new FileReader();
  reader.onload = function(ev){
    // For non-PDF: read as text; for PDF we'll use the filename + raw extraction note
    if(file.type==='text/plain'){
      S.cvText = ev.target.result;
      document.getElementById('cv-text').value = S.cvText;
    } else {
      // PDF/DOC — we can't parse binary in-browser without lib, so note the filename
      // and use whatever text the user also typed, plus we tell Gemini the filename
      S.cvText = `[File uploaded: ${file.name}]\n` + (document.getElementById('cv-text').value||'');
      if(!document.getElementById('cv-text').value){
        document.getElementById('cv-text').placeholder = `File "${file.name}" sudah di-upload. Tambahkan teks CV di sini jika ada info tambahan.`;
      }
    }
  };
  reader.readAsText(file);
  toast('File berhasil di-upload!','success');
}

function ob1Next(){
  const fileText = document.getElementById('cv-text').value.trim();
  const hasFile = S.cvFileName && S.cvFileName.length > 0;
  if(fileText.length < 30 && !hasFile) return toast('Tambahkan isi CV (minimal 30 karakter)','error');
  S.cvText = fileText.length > 0 ? (S.cvFileName ? `[File: ${S.cvFileName}]\n` + fileText : fileText) : S.cvText;
  saveS();
  obGo(2);
}

function ob2Next(){
  const gh = document.getElementById('gh-user').value.trim();
  if(!gh) return toast('Masukkan username GitHub','error');
  S.ghUser = gh; saveS();
  obGo(3);
  runAI();
}

/* ═══════════════════════════════════════════════
   GITHUB API
═══════════════════════════════════════════════ */
async function fetchGH(username){
  try {
    const [uRes, rRes] = await Promise.all([
      fetch(`https://api.github.com/users/${username}`),
      fetch(`https://api.github.com/users/${username}/repos?per_page=12&sort=updated`)
    ]);
    if(!uRes.ok) return null;
    return { user: await uRes.json(), repos: rRes.ok ? await rRes.json() : [] };
  } catch { return null; }
}

/* ═══════════════════════════════════════════════
   AI ANALYSIS ENGINE (GEMINI)
═══════════════════════════════════════════════ */
function addLog(msg, cls=''){
  const log = document.getElementById('ai-log');
  const p = document.createElement('p');
  if(cls) p.className = cls;
  p.textContent = msg;
  log.appendChild(p);
  log.scrollTop = log.scrollHeight;
}

async function runAI(){
  document.getElementById('ob3-loading').style.display='';
  document.getElementById('ob3-result').style.display='none';
  const log = document.getElementById('ai-log');
  log.innerHTML='';

  addLog('> Memulai AI Analysis Engine...','run');
  addLog(`> Mengambil data GitHub: ${S.ghUser}...`,'run');

  const gh = await fetchGH(S.ghUser);
  if(!gh){
    addLog('⚠ GitHub user tidak ditemukan, analisis hanya berdasarkan CV.','warn');
  } else {
    S.ghData = gh;
    const langs = [...new Set(gh.repos.filter(r=>r.language).map(r=>r.language))].slice(0,6);
    addLog(`✓ GitHub: ${gh.user.public_repos} repos, ${gh.user.followers} followers`,'ok');
    addLog(`✓ Tech stack: ${langs.join(', ')||'tidak terdeteksi'}`,'ok');
    const stars = gh.repos.reduce((a,r)=>a+r.stargazers_count,0);
    addLog(`✓ Total stars: ${stars}`, 'ok');
    saveS();
  }

  addLog('> Mengirim data ke Gemini AI untuk analisis...','run');
  addLog('> Menjalankan Skill Gap Analysis...','run');

  const repoInfo = gh ? gh.repos.slice(0,10).map(r=>
    `- ${r.name} (${r.language||'?'}): stars=${r.stargazers_count}, fork=${r.forks_count}, desc="${r.description||''}", readme=${!r.has_wiki}`
  ).join('\n') : 'Tidak tersedia';

  const prompt = `Kamu adalah AI evaluator untuk platform freelance IT bernama UPLANCER AI.
Tugas: Evaluasi kesiapan global freelancer IT berdasarkan CV dan data GitHub.

=== DATA CV ===
${S.cvText}

=== DATA GITHUB ===
Username: ${S.ghUser}
${gh ? `Profile:
- Public Repos: ${gh.user.public_repos}
- Followers: ${gh.user.followers}
- Bio: ${gh.user.bio||'kosong'}
- Account created: ${gh.user.created_at}
Repositories:
${repoInfo}` : 'GitHub tidak tersedia'}

=== INSTRUKSI OUTPUT ===
Berikan evaluasi LENGKAP dalam format JSON (hanya JSON murni, tanpa markdown):
{
  "overall_score": <number 0-100>,
  "breakdown": {
    "skill_relevance": <number 0-100>,
    "portfolio_quality": <number 0-100>,
    "consistency": <number 0-100>
  },
  "category_fit": {
    "role": "Frontend / Backend / Full Stack / AI",
    "confidence": <percentage>
  },
  "status": "PASS" atau "FAIL",
  "strengths": [
    "<string>",
    "<string>"
  ],
  "skill_gaps": [
    "<string>",
    "<string>"
  ],
  "recommendations": [
    "<string>",
    "<string>"
  ]
}

Catatan penting:
- Score PASS: overall >= 70
- Jika GitHub tidak tersedia, kurangi score consistency secara signifikan`;

  try {
    addLog('> Menunggu response Gemini AI...','run');
    const res = await fetch(GEMINI_URL, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({
    contents:[{parts:[{text:prompt}]}],
    generationConfig: {
    responseMimeType: "application/json"
    }
    })
    });

    const data = await res.json();
    if(!res.ok) throw new Error(data.error?.message||'API error');
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text||'';
    const cleaned = raw.replace(/```json|```/g,'').trim();
    const result = JSON.parse(cleaned);
    addLog(`✓ Analisis selesai! Score: ${result.overall_score}/100`, 'ok');
    addLog(`✓ Status: ${result.status==='PASS'?'LOLOS ✓':'TIDAK LOLOS ✕'}`, result.status==='PASS'?'ok':'err');
    storeAIResult(result);
    setTimeout(()=>renderAIResult(result), 700);
  } catch(e) {
    addLog(`⚠ Gemini API error: ${e.message}`, 'warn');
    addLog('> Menggunakan fallback analysis...', 'run');
    const fallback = makeFallback();
    storeAIResult(fallback);
    setTimeout(()=>renderAIResult(fallback), 600);
  }
}

function makeFallback(){
  return {
    overall_score: 58,
    breakdown: {skill_relevance:62,portfolio_quality:52,consistency:55},
    category_fit: {role: "Frontend / Backend / Full Stack / AI", confidence: 60},
    status: 'FAIL',
    strengths: ['Potensi dasar IT baik', 'Motivasi belajar'],
    skill_gaps: [
      'Advanced JavaScript / TypeScript',
      'Real-World Project Portfolio',
      'README & Dokumentasi'
    ],
    recommendations: [
      'Buat 2 project portfolio berbasis API',
      'Tambahkan README profesional di semua repo',
      'Pelajari dan implementasikan TypeScript'
    ]
  };
}

function storeAIResult(r){
  S.aiScore = r.overall_score;
  S.aiBreakdown = r.breakdown;
  S.aiFeedback = null; // No longer returned by AI
  S.aiStatus = r.status;
  S.skillGaps = r.skill_gaps||[];
  S.improvements = r.recommendations||[];
  S.jobMatches = r.category_fit;
  saveS();
  // persist to user record
  const users = getUsers();
  const i = users.findIndex(u=>u.id===S.user.id);
  if(i>=0){
    users[i].aiScore = r.overall_score;
    users[i].skillGaps = r.skill_gaps||[];
    users[i].improvements = r.recommendations||[];
    saveUsers(users);
    S.user = users[i];
  }
}

/* ═══════════════════════════════════════════════
   RENDER AI RESULT
═══════════════════════════════════════════════ */
function renderAIResult(r){
  document.getElementById('ob3-loading').style.display='none';
  document.getElementById('ob3-result').style.display='';
  updateSteps(3);

  // Animate score
  const numEl = document.getElementById('score-num');
  const arc = document.getElementById('score-arc');
  const C = 389.6;
  let cur = 0;
  const target = r.overall_score;
  const color = target>=70?'var(--green)':target>=50?'var(--amber)':'var(--red)';
  const timer = setInterval(()=>{
    cur = Math.min(cur+2,target);
    numEl.textContent = cur;
    numEl.style.color = color;
    arc.style.stroke = color;
    arc.style.strokeDashoffset = C - (C*cur/100);
    if(cur>=target) clearInterval(timer);
  },18);

  // Breakdown
  const bd = r.breakdown;
  const bdRows = [
    ['Skill Relevance', bd.skill_relevance, 'var(--accent)'],
    ['Portfolio Quality', bd.portfolio_quality, 'var(--accent2)'],
    ['Consistency', bd.consistency, 'var(--green)'],
  ];
  document.getElementById('score-breakdown').innerHTML = bdRows.map(([label,val,color])=>`
    <div style="margin-bottom:0.75rem">
      <div class="fb mb1"><span class="sm">${label}</span><span class="sm bold">${val}%</span></div>
      <div class="progress-bar"><div class="progress-fill" style="width:${val}%;background:${color}"></div></div>
    </div>`).join('');

  // Verdict
  const passed = r.status==='PASS';
  document.getElementById('score-verdict').innerHTML = passed
    ? `<div class="verdict-pass"><div class="verdict-icon">✅</div><div class="verdict-text" style="color:var(--green)">Memenuhi Standar Global</div><div class="verdict-sub muted">Kamu lolos verifikasi AI! Lanjutkan untuk setup profil.</div></div>`
    : `<div class="verdict-fail"><div class="verdict-icon">❌</div><div class="verdict-text" style="color:var(--red)">Belum Memenuhi Standar Global</div><div class="verdict-sub muted">"Anda belum memenuhi standar global freelancer pada platform ini. Pelajari skill gap di bawah dan coba lagi."</div></div>`;

  // Tabs
  document.getElementById('score-tabs').style.display='';

  // Tab: Feedback
  document.getElementById('tab-feedback').innerHTML = `
    <div class="card card-sm" style="background:var(--bg3)">
      <div class="xs muted bold mb1">Strengths:</div>
      <ul class="sm lh" style="padding-left:1.25rem;color:var(--text2)">
        ${(r.strengths||[]).map(s=>`<li>${s}</li>`).join('')}
      </ul>
    </div>`;

  // Tab: Skill Gap
  const sgEl = document.getElementById('tab-skillgap');
  if(r.skill_gaps && r.skill_gaps.length){
    sgEl.innerHTML = `<p class="sm muted mb2">AI mengidentifikasi ${r.skill_gaps.length} area yang perlu ditingkatkan:</p>` +
      r.skill_gaps.map(g=>`
        <div class="gap-item">
          <div class="gap-icon">⚠</div>
          <div class="gap-content">
            <div class="gap-title">${g}</div>
          </div>
        </div>`).join('');
  } else {
    sgEl.innerHTML = '<p class="sm muted">Tidak ada skill gap signifikan terdeteksi.</p>';
  }

  // Tab: Improvement
  const impEl = document.getElementById('tab-improvement');
  if(r.improvements && r.improvements.length){
    impEl.innerHTML = `<p class="sm muted mb2">Rencana pengembangan yang direkomendasikan AI:</p>` +
      r.improvements.map((imp,i)=>`
        <div class="imp-item">
          <div class="imp-num">${i+1}</div>
          <div class="imp-content">
            <div class="imp-title">${imp}</div>
          </div>
        </div>`).join('');
  } else {
    impEl.innerHTML = '<p class="sm muted">Tidak ada rekomendasi tambahan.</p>';
  }

  // Actions
  if(passed){
    document.getElementById('score-actions').innerHTML = `
      <button class="btn btn-success btn-lg btn-full" onclick="goToJobMatch()">Lanjut ke Job Matching →</button>`;
  } else {
    document.getElementById('score-actions').innerHTML = `
      <div class="card card-sm" style="background:var(--amber-bg);border-color:var(--amber-border);margin-bottom:1rem">
        <p class="sm" style="color:var(--amber)">💡 Pelajari Skill Gap & Improvement Plan di atas, kemudian update CV dan GitHub kamu, lalu submit ulang.</p>
      </div>
      <div class="flex gap2">
        <button class="btn btn-danger btn-lg" style="flex:1" onclick="resubmit()">🔄 Update & Coba Lagi</button>
      </div>`;
  }
}

function showScoreTab(tab){
  document.querySelectorAll('.stab').forEach(b=>b.classList.remove('active'));
  const tabs = ['feedback','skillgap','improvement'];
  tabs.forEach(t=>{
    const el = document.getElementById('tab-'+t);
    if(el) el.style.display = t===tab?'':'none';
  });
  // activate button
  event.target.classList.add('active');
}

async function goToJobMatch(){
  obGo(4);
  const el = document.getElementById('job-match-list');
  el.innerHTML = `<div class="card card-sm" style="text-align:center"><div class="spin" style="width:24px;height:24px;margin:0 auto 0.5rem"></div><p class="sm muted">Mencari pekerjaan yang sesuai...</p></div>`;

  const skills = extractSkills(S.cvText).join(', ') || 'General IT';
  const jobList = [
    'Frontend Developer (React)',
    'Backend Developer (Node.js)',
    'Full Stack Developer (MERN)',
    'AI/ML Engineer (Python)',
    'Data Scientist',
    'DevOps Engineer',
    'Mobile App Developer (Flutter)'
  ].join(', ');

  const prompt = `You are an AI job matching system.

INPUT:
Freelancer skills:
${skills}

Available jobs:
${jobList}

TASK:
Match freelancer to best roles.

OUTPUT (JSON):
{
  "best_match": "role",
  "confidence": <integer 0-100>,
  "recommended_jobs": [
    "job1",
    "job2"
  ]
}`;

  try {
    const res = await fetch(GEMINI_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:prompt}]}]})});
    const data = await res.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text||'';
    const match = JSON.parse(raw.replace(/```json|```/g,'').trim());
    
    el.innerHTML = `
      <div class="match-item">
        <div class="match-pct" style="color:${match.confidence>=70?'var(--green)':match.confidence>=50?'var(--accent2)':'var(--amber)'}">${match.confidence}%</div>
        <div class="match-info">
          <div class="match-name">${match.best_match}</div>
          <div class="progress-bar mt1">
            <div class="progress-fill" style="width:${match.confidence}%;background:${match.confidence>=70?'var(--green)':'var(--accent)'}"></div>
          </div>
          <div class="mt1" style="display:flex;gap:0.3rem;flex-wrap:wrap">
            <span class="xs muted" style="line-height:1.5">Rekomendasi lain: </span>
            ${(match.recommended_jobs||[]).map(j => `<span class="tag">${j}</span>`).join('')}
          </div>
        </div>
        <span class="badge ${match.confidence>=70?'badge-green':match.confidence>=50?'badge-accent':'badge-amber'}">${match.confidence>=70?'Best Fit':match.confidence>=50?'Good Fit':'Possible'}</span>
      </div>`;
      
      S.jobMatches = match; 
      saveS();
  } catch (e) {
      el.innerHTML = '<div class="card tc muted sm">Gagal memuat rekomendasi pekerjaan. Silakan coba lagi.</div>';
  }
}

function resubmit(){
  S.cvText=''; S.cvFileName=''; S.ghUser=''; S.ghData=null;
  S.aiScore=null; S.aiBreakdown=null; S.aiFeedback=null; S.aiStatus=null;
  saveS(); resetOnboarding();
  toast('Update CV & GitHub kamu, lalu coba submit lagi','warn');
}

/* ═══════════════════════════════════════════════
   PRICING AI CHECK
═══════════════════════════════════════════════ */
async function checkPricing(){
  const price = document.getElementById('fl-price').value;
  const cat = document.getElementById('fl-cat').value;
  const subcat = document.getElementById('fl-subcat').value;
  const role = subcat ? `${cat} - ${subcat}` : cat;
  if(!price||!cat) return toast('Isi kategori dan harga dulu','error');
  const resultEl = document.getElementById('pricing-result');
  resultEl.innerHTML = `<div class="card card-sm" style="text-align:center"><div class="spin" style="width:24px;height:24px;margin:0 auto 0.5rem"></div><p class="sm muted">Menganalisis harga...</p></div>`;
  const prompt = `You are an AI pricing advisor for a global freelance platform.

INPUT:
- Role: ${role}
- Experience: AI Assessed
- Skill Level: ${S.aiScore ? S.aiScore+'/100' : 'Unknown'}
- User Price: $${price}

TASK:
Analyze whether the price is:
- Too low
- Appropriate
- Too high

OUTPUT (JSON):
{
  "status": "LOW" | "OK" | "HIGH",
  "recommended_range": "$X - $Y",
  "reason": "short explanation"
}`;
  try {
    const res = await fetch(GEMINI_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:prompt}]}]})});
    const data = await res.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text||'';
    renderPricing(JSON.parse(raw.replace(/```json|```/g,'').trim()), price);
  } catch {
    renderPricing({status:'OK',reason:'Harga kamu berada di kisaran kompetitif untuk pasar global.',recommended_range:'$150 - $500'}, price);
  }
}

function renderPricing(r, inputPrice){
  const colors = {LOW:'var(--red)',OK:'var(--green)',HIGH:'var(--amber)'};
  const icons = {LOW:'💸 Terlalu Rendah',OK:'✅ Harga Sesuai',HIGH:'⚠️ Terlalu Tinggi'};
  const color = colors[r.status]||'var(--text)';
  document.getElementById('pricing-result').innerHTML = `
    <div class="pricing-box" style="border-color:${color}25">
      <div class="fb mb2">
        <span class="bold" style="color:${color}">${icons[r.status]||r.status}</span>
        <span class="xs muted">Input: $${inputPrice}</span>
      </div>
      <p class="sm lh muted mb2">${r.reason}</p>
      <div style="background:var(--bg4);border-radius:var(--rs);padding:0.75rem" class="mb1">
        <span class="xs muted">Rekomendasi harga global:</span>
        <span class="bold" style="color:var(--green);margin-left:0.5rem">${r.recommended_range}</span>
      </div>
    </div>`;
}

/* ═══════════════════════════════════════════════
   PUBLISH PROFILE
═══════════════════════════════════════════════ */
function toggleSubcat(){
  const cat = document.getElementById('fl-cat').value;
  document.getElementById('fl-subcat-wrap').style.opacity = cat==='Web Dev'?'1':'0.4';
}

function publishProfile(){
  const cat = document.getElementById('fl-cat').value;
  const subcat = document.getElementById('fl-subcat').value;
  const desc = document.getElementById('fl-desc').value.trim();
  const price = document.getElementById('fl-price').value;
  const pay = document.getElementById('fl-pay').value;
  if(!cat||!desc||!price) return toast('Lengkapi semua field','error');
  const profile = {
    category:cat, subcategory:subcat, description:desc,
    price:parseFloat(price), payment:pay,
    skills: extractSkills(S.cvText),
    aiScore: S.aiScore, ghUser: S.ghUser
  };
  const users = getUsers();
  const i = users.findIndex(u=>u.id===S.user.id);
  users[i].published=true; users[i].flProfile=profile;
  users[i].aiScore=S.aiScore;
  users[i].skillGaps=S.skillGaps; users[i].improvements=S.improvements;
  saveUsers(users); S.user=users[i]; saveS();
  toast('Profil berhasil dipublish ke marketplace! 🎉','success');
  setTimeout(()=>{ showPage('page-fl-dash'); renderFlDash(); },1000);
}

function extractSkills(text){
  const kw=['JavaScript','TypeScript','React','Vue','Angular','Next.js','Node.js','Express','Python','Django','Flask','FastAPI','PHP','Laravel','Go','Java','Spring','MongoDB','PostgreSQL','MySQL','Redis','Docker','Kubernetes','AWS','GCP','Git','REST API','GraphQL','TensorFlow','PyTorch','Machine Learning','Deep Learning','NLP','Computer Vision','Flutter','Dart','Tailwind'];
  return kw.filter(s=>text.toLowerCase().includes(s.toLowerCase())).slice(0,7);
}

/* ═══════════════════════════════════════════════
   FREELANCER DASHBOARD
═══════════════════════════════════════════════ */
function renderFlDash(){
  const u = S.user;
  const fp = u.flProfile;
  document.getElementById('f-hello').textContent = `Halo, ${u.name} 👋`;
  document.getElementById('f-score').textContent = u.aiScore ? u.aiScore+'/100' : '—';
  document.getElementById('f-gaps').textContent = (u.skillGaps||[]).length;
  if(fp) renderFlPreview(fp, u);
}

function renderFlPreview(fp, u){
  const skills = fp.skills||[];
  document.getElementById('f-preview').innerHTML = `
    <div class="fl-head">
      <div class="fl-avatar">${u.name.charAt(0).toUpperCase()}</div>
      <div>
        <div class="fl-name">${u.name} <span style="color:var(--green);font-size:0.75rem">✓ Verified</span></div>
        <div class="fl-sub">${fp.category}${fp.subcategory?' · '+fp.subcategory:''}</div>
      </div>
    </div>
    <div class="fl-tags mt1">${skills.map(s=>`<span class="tag">${s}</span>`).join('')||'<span class="xs muted">Skills dari GitHub</span>'}</div>
    <p class="sm muted lh mt1">${fp.description}</p>
    <div class="fl-foot">
      <span class="fl-price">$${fp.price}/project</span>
      <span class="badge badge-accent">Score: ${u.aiScore}</span>
    </div>`;
}

function fTab(tab){
  ['overview','profile','skillgap','orders'].forEach(t=>{
    document.getElementById('f-'+t).style.display=t===tab?'':'none';
  });
  document.querySelectorAll('#page-fl-dash .sidebar ul a').forEach((a,i)=>{
    a.classList.toggle('active',i===['overview','profile','skillgap','orders'].indexOf(tab));
  });
  if(tab==='profile') renderFlProfile();
  if(tab==='skillgap') renderFlSkillInsights();
  if(tab==='orders') renderFlOrders();
}

function renderFlProfile(){
  const u = S.user;
  const fp = u.flProfile;
  if(!fp){ document.getElementById('f-profile-content').innerHTML='<p class="muted sm">Profil belum tersedia.</p>'; return; }
  document.getElementById('f-profile-content').innerHTML = `
    <div class="card">
      <div class="profile-hero">
        <div class="profile-av">${u.name.charAt(0).toUpperCase()}</div>
        <div>
          <h3 style="font-size:1.1rem;font-weight:800">${u.name}</h3>
          <p class="muted sm">${fp.category}${fp.subcategory?' · '+fp.subcategory:''}</p>
          <span class="badge badge-green mt1">✓ AI Verified</span>
        </div>
      </div>
      <hr>
      <div class="g2">
        <div><div class="xs muted">Email</div><div class="sm mt1">${u.email}</div></div>
        <div><div class="xs muted">GitHub</div><div class="sm mt1">${fp.ghUser||'—'}</div></div>
        <div><div class="xs muted">Harga</div><div class="sm mt1 bold" style="color:var(--green)">$${fp.price}/project</div></div>
        <div><div class="xs muted">Pembayaran</div><div class="sm mt1">${fp.payment}</div></div>
        <div><div class="xs muted">AI Score</div><div class="sm mt1 bold" style="color:var(--accent2)">${u.aiScore}/100</div></div>
      </div>
      <hr>
      <div class="xs muted bold mb1">Deskripsi Jasa</div>
      <p class="sm lh">${fp.description}</p>
      <hr>
      <div class="xs muted bold mb1">Skills Terdeteksi AI</div>
      <div class="fl-tags">${(fp.skills||[]).map(s=>`<span class="tag">${s}</span>`).join('')||'<span class="xs muted">—</span>'}</div>
    </div>`;
}

function renderFlSkillInsights(){
  const u = S.user;
  const gaps = u.skillGaps||[];
  const imps = u.improvements||[];
  const el = document.getElementById('f-skill-content');
  if(!gaps.length && !imps.length){
    el.innerHTML='<div class="card tc muted sm">Belum ada data insight. Selesaikan AI verification untuk melihat analisis skill kamu.</div>';
    return;
  }
  el.innerHTML = `
    <div class="g2" style="margin-bottom:1.5rem">
      <div class="card card-sm" style="background:var(--red-bg);border-color:var(--red-border)">
        <div class="xs muted bold mb1" style="color:var(--red)">Skill Gap Teridentifikasi</div>
        <div style="font-family:'Syne',sans-serif;font-size:1.6rem;font-weight:800;color:var(--red)">${gaps.length}</div>
      </div>
      <div class="card card-sm" style="background:var(--accent-bg);border-color:var(--accent-border)">
        <div class="xs muted bold mb1" style="color:var(--accent2)">Improvement Actions</div>
        <div style="font-family:'Syne',sans-serif;font-size:1.6rem;font-weight:800;color:var(--accent2)">${imps.length}</div>
      </div>
    </div>
    <div class="mb2">
      <h3 style="font-size:1rem;font-weight:700;margin-bottom:0.9rem">⚠ Skill Gap Analysis</h3>
      ${gaps.map(g=>`<div class="gap-item"><div class="gap-icon">⚠</div><div class="gap-content"><div class="gap-title">${g}</div></div></div>`).join('')}
    </div>
    <div>
      <h3 style="font-size:1rem;font-weight:700;margin-bottom:0.9rem">🛠 Improvement Roadmap</h3>
      ${imps.map((imp,i)=>`<div class="imp-item"><div class="imp-num">${i+1}</div><div class="imp-content"><div class="imp-title">${imp}</div></div></div>`).join('')}
    </div>`;
}

function renderFlOrders(){
  const orders = getOrders().filter(o=>o.freelancerId===S.user.id);
  const el = document.getElementById('f-orders-list');
  if(!orders.length){
    el.innerHTML='<div class="card tc muted sm">Belum ada order masuk</div>'; return;
  }
  el.innerHTML = orders.map(o=>`
    <div class="card card-sm card-hover mb2">
      <div class="fb mb1"><span class="bold sm">${o.clientName}</span><span class="badge badge-amber">Pending</span></div>
      <p class="sm muted lh">${o.message}</p>
      <div class="sm mt1" style="color:var(--green)">Budget: $${o.budget}</div>
    </div>`).join('');
}

/* ═══════════════════════════════════════════════
   CLIENT DASHBOARD
═══════════════════════════════════════════════ */
function cTab(tab){
  document.getElementById('c-browse').style.display=tab==='browse'?'':'none';
  document.getElementById('c-orders').style.display=tab==='orders'?'':'none';
  document.querySelectorAll('#page-client .sidebar ul a').forEach((a,i)=>{
    a.classList.toggle('active',i===['browse','orders'].indexOf(tab));
  });
  if(tab==='orders') renderClientOrders();
}

function cSelectCat(cat){
  S.currentCat=cat; S.currentSub=null;
  document.getElementById('c-bc').style.display='';
  document.getElementById('bc1').textContent = cat==='ai'?'AI / Machine Learning':'Web Development';
  document.getElementById('bc2').style.display='none';
  document.getElementById('bc3').textContent='';
  if(cat==='webdev'){
    document.getElementById('c-cats').style.display='none';
    document.getElementById('c-subcats').style.display='';
    document.getElementById('c-flist').style.display='none';
  } else {
    showFreelancers(cat, null);
  }
}

function cSelectSub(sub){
  S.currentSub=sub;
  document.getElementById('bc2').style.display='';
  document.getElementById('bc3').textContent={frontend:'Frontend',backend:'Backend',fullstack:'Full Stack'}[sub];
  showFreelancers('webdev',sub);
}

function cGoBack(){
  S.currentCat=null; S.currentSub=null;
  document.getElementById('c-bc').style.display='none';
  document.getElementById('c-cats').style.display='';
  document.getElementById('c-subcats').style.display='none';
  document.getElementById('c-flist').style.display='none';
}

function showFreelancers(cat, sub){
  document.getElementById('c-cats').style.display='none';
  document.getElementById('c-subcats').style.display='none';
  document.getElementById('c-flist').style.display='';
  let list = getAllFreelancers().filter(u=>{
    const fp=u.flProfile; if(!fp) return false;
    if(cat==='ai') return fp.category==='AI/ML';
    if(cat==='webdev'){
      if(!sub) return fp.category==='Web Dev';
      const m={frontend:'Frontend',backend:'Backend',fullstack:'Full Stack'};
      return fp.category==='Web Dev' && fp.subcategory===m[sub];
    }
    return false;
  }).map(u=>({...u.flProfile,name:u.name,id:u.id,aiScore:u.aiScore,real:true}));

  if(!list.length) list = getDemos(cat,sub);
  renderFreelancers(list);
}

function getAllFreelancers(){ return getUsers().filter(u=>u.role==='freelancer'&&u.published&&u.flProfile); }

function getDemos(cat,sub){
  const all=[
    {id:'d1',name:'Rani Kusuma',category:'Web Dev',subcategory:'Frontend',skills:['React','TypeScript','Tailwind','Next.js'],price:220,aiScore:86,description:'Frontend developer spesialis React & Next.js dengan pengalaman 3 tahun di startup SaaS.'},
    {id:'d2',name:'Fajar Andika',category:'Web Dev',subcategory:'Backend',skills:['Node.js','Express','PostgreSQL','Docker'],price:280,aiScore:79,description:'Backend engineer fokus pada API design, microservices, dan database optimization.'},
    {id:'d3',name:'Siti Nuraini',category:'Web Dev',subcategory:'Full Stack',skills:['React','Django','PostgreSQL','AWS'],price:380,aiScore:92,description:'Full stack developer dengan expertise Python/React dan pengalaman deploy ke cloud.'},
    {id:'d4',name:'Budi Prasetyo',category:'AI/ML',subcategory:'',skills:['Python','TensorFlow','PyTorch','NLP'],price:450,aiScore:89,description:'AI/ML engineer spesialis NLP dan Computer Vision, lulusan S1 Informatika.'},
    {id:'d5',name:'Dewi Lestari',category:'AI/ML',subcategory:'',skills:['Python','Scikit-learn','Pandas','MLflow'],price:380,aiScore:83,description:'Data scientist dengan portofolio di bidang prediksi dan analitik bisnis berbasis ML.'},
    {id:'d6',name:'Arif Maulana',category:'Web Dev',subcategory:'Frontend',skills:['Vue','Nuxt.js','SCSS','Figma'],price:190,aiScore:77,description:'Frontend developer dengan keahlian Vue ekosistem dan eye for design yang kuat.'},
  ];
  return all.filter(d=>{
    if(cat==='ai') return d.category==='AI/ML';
    if(cat==='webdev'){
      if(!sub) return d.category==='Web Dev';
      const m={frontend:'Frontend',backend:'Backend',fullstack:'Full Stack'};
      return d.category==='Web Dev'&&d.subcategory===m[sub];
    }
    return false;
  });
}

function renderFreelancers(list){
  const el = document.getElementById('flist-container');
  if(!list.length){
    el.innerHTML='<div class="card tc muted sm" style="grid-column:1/-1">Belum ada freelancer di kategori ini</div>'; return;
  }
  el.innerHTML = list.map(f=>`
    <div class="fl-card">
      <div class="fl-head">
        <div class="fl-avatar">${f.name.charAt(0).toUpperCase()}</div>
        <div>
          <div class="fl-name">${f.name} <span style="color:var(--green);font-size:0.72rem">✓</span></div>
          <div class="fl-sub">${f.category}${f.subcategory?' · '+f.subcategory:''}</div>
        </div>
      </div>
      <div class="fl-tags">${(f.skills||[]).map(s=>`<span class="tag">${s}</span>`).join('')}</div>
      <p class="sm muted lh">${f.description}</p>
      <div class="fl-foot">
        <span class="fl-price">$${f.price}/project</span>
        <div class="flex gap1">
          <span class="badge badge-accent">Score ${f.aiScore}</span>
          <button class="btn btn-success" onclick="openOrder('${f.id}','${f.name}',${f.price})">Hire</button>
        </div>
      </div>
    </div>`).join('');
}

/* ═══════════════════════════════════════════════
   ORDER FLOW
═══════════════════════════════════════════════ */
function openOrder(flId,flName,price){
  document.getElementById('orderContent').innerHTML=`
    <div class="card card-sm" style="background:var(--bg3);margin-bottom:1rem">
      <div class="bold sm">${flName}</div>
      <div class="muted xs">Harga mulai $${price}/project</div>
    </div>
    <div class="form-group"><label>Deskripsi Project</label><textarea id="o-msg" rows="4" placeholder="Jelaskan kebutuhan project kamu secara detail..."></textarea></div>
    <div class="form-group"><label>Budget (USD)</label><input type="number" id="o-budget" placeholder="${price}"></div>`;
  const m = document.getElementById('orderModal');
  m.dataset.flid=flId; m.dataset.flname=flName;
  m.classList.add('open');
}

function closeModal(){ document.getElementById('orderModal').classList.remove('open'); }

function confirmOrder(){
  const msg=document.getElementById('o-msg').value.trim();
  const budget=document.getElementById('o-budget').value;
  const m=document.getElementById('orderModal');
  if(!msg||!budget) return toast('Lengkapi semua field','error');
  const orders=getOrders();
  orders.push({
    id:Date.now().toString(),
    clientId:S.user.id, clientName:S.user.name,
    freelancerId:m.dataset.flid, freelancerName:m.dataset.flname,
    message:msg, budget, status:'pending',
    createdAt:new Date().toISOString()
  });
  saveOrders(orders);
  closeModal();
  toast(`Order berhasil dikirim ke ${m.dataset.flname}! 🎉`,'success');
}

function renderClientOrders(){
  const orders=getOrders().filter(o=>o.clientId===S.user.id);
  const el=document.getElementById('c-orders-list');
  if(!orders.length){ el.innerHTML='<div class="card tc muted sm">Belum ada order</div>'; return; }
  el.innerHTML=orders.map(o=>`
    <div class="card card-sm card-hover mb2">
      <div class="fb mb1">
        <span class="bold sm">→ ${o.freelancerName}</span>
        <span class="badge badge-amber">Pending</span>
      </div>
      <p class="sm muted lh">${o.message}</p>
      <div class="sm mt1" style="color:var(--green)">Budget: $${o.budget}</div>
    </div>`).join('');
}

/* ═══════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════ */
loadS();
if(S.user) routeUser();