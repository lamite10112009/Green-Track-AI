// ============================================================
// CARBON ENGINE
// ============================================================
const EF = {
  transport: {motorbike:0.104,car:0.192,bus:0.089,bicycle:0,walk:0},
  electricity: 0.4935,
  elec_per_hour: 0.15,
  plastic: 0.082,
  food: {meat:3.3,vegetarian:1.7,vegan:0.9},
  water: 0.298/60
};

function calcCarbon(a) {
  const t = (EF.transport[a.transport]||0.104) * a.km;
  const e = EF.elec_per_hour * a.electricity * EF.electricity;
  const p = EF.plastic * a.plastic;
  const f = EF.food[a.food]||3.3;
  const w = EF.water * a.shower;
  const total = t+e+p+f+w;
  return {total:+total.toFixed(3), transport:+t.toFixed(3), electricity:+e.toFixed(3), plastic:+p.toFixed(3), food:+f.toFixed(3), water:+w.toFixed(3)};
}

function calcScore(kg) {
  const ratio = kg/8.0;
  return Math.max(0,Math.min(100,Math.round((1-ratio)*80+20)));
}

// ============================================================
// STATE
// ============================================================
const state = {
  form: {transport:'walk',km:5,electricity:3,food:'vegetarian',plastic:0,shower:8},
  history: [],
  userData: {name:'Lại Tùng Lâm',school:'THPT Lý Thái Tổ',grade:'11Q1'},
};

function genHistory() {
  const h = [];
  const now = new Date();
  const transports = ['motorbike','bicycle','walk','bus','motorbike'];
  const foods = ['meat','meat','vegetarian','vegan'];
  for(let i=30;i>0;i--) {
    const d = new Date(now);
    d.setDate(d.getDate()-i);
    const imp = i/30;
    const a = {
      transport:transports[Math.floor(Math.random()*transports.length)],
      km:+(2+Math.random()*13*(0.5+imp*0.5)).toFixed(1),
      electricity:+(2+Math.random()*4*(0.6+imp*0.4)).toFixed(1),
      food:foods[Math.floor(Math.random()*foods.length)],
      plastic:Math.floor(Math.random()*5),
      shower:5+Math.floor(Math.random()*15),
    };
    const carbon = calcCarbon(a);
    h.push({date:d.toLocaleDateString('vi-VN',{weekday:'short',day:'2-digit',month:'2-digit'}),dateShort:d.toLocaleDateString('vi-VN',{weekday:'short'}),carbon,score:calcScore(carbon.total),activity:a});
  }
  state.history = h;
}
genHistory();

// ============================================================
// NAVIGATION
// ============================================================
let currentView = 'home';
function go(view, btn, isMob=false) {
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.getElementById('view-'+view).classList.add('active');

  if(isMob) {
    document.querySelectorAll('.mob-btn').forEach(b=>b.classList.remove('active'));
  } else {
    document.querySelectorAll('.nav-item').forEach(b=>b.classList.remove('active'));
  }
  btn.classList.add('active');
  currentView = view;

  if(view==='news' && !newsLoaded) loadNews();
  if(view==='rank') loadRank();
  if(view==='profile') loadProfile();
}

// ============================================================
// GREETING
// ============================================================
function setGreeting() {
  const h = new Date().getHours();
  const g = h<12?'Chào buổi sáng ☀️':h<18?'Chào buổi chiều 🌤️':'Chào buổi tối 🌙';
  document.getElementById('hero-greeting').textContent = g;
}
setGreeting();

// ============================================================
// DASHBOARD
// ============================================================
function loadDashboard() {
  const latest = state.history[state.history.length-1];
  const week = state.history.slice(-7);
  const prevWeek = state.history.slice(-14,-7);

  // Score ring
  const score = latest.score;
  setTimeout(()=>{
    document.getElementById('score-num').textContent = score;
    const circ = 207.35;
    document.getElementById('score-ring').style.strokeDashoffset = circ*(1-score/100);
  },200);

  // Impact numbers
  const totalSaved = Math.max(0,state.history.reduce((s,a)=>s+Math.max(0,8-a.carbon.total),0));
  const trees = (totalSaved/21.77).toFixed(2);
  document.getElementById('trees-num').textContent = trees;
  document.getElementById('co2-today').textContent = latest.carbon.total.toFixed(2);
  const plasticSaved = state.history.reduce((s,a)=>s+Math.max(0,3-(a.activity.plastic||3)),0);
  document.getElementById('plastic-saved').textContent = plasticSaved;
  document.getElementById('sidebar-streak').textContent = 12;

  // Chart
  const bars = document.getElementById('chart-bars');
  bars.innerHTML = '';
  const maxKg = Math.max(...week.map(a=>a.carbon.total));
  week.forEach((a,i) => {
    const pct = (a.carbon.total/maxKg)*100;
    const cls = a.score>=70?'good':a.score>=50?'ok':'bad';
    const isToday = i===week.length-1;
    bars.innerHTML += `<div class="bar-wrap"><div class="bar ${cls}${isToday?' today':''}" style="height:${pct}%" data-tip="${a.carbon.total}kg"></div><div class="bar-day">${a.dateShort}</div></div>`;
  });

  // Week comparison
  const wAvg = week.reduce((s,a)=>s+a.carbon.total,0)/7;
  const pAvg = prevWeek.reduce((s,a)=>s+a.carbon.total,0)/7;
  const pct = ((pAvg-wAvg)/pAvg*100).toFixed(1);
  document.getElementById('week-avg').textContent = `avg ${wAvg.toFixed(2)}kg`;
  document.getElementById('compare-pct').textContent = (pct>0?'+':'')+pct+'%';
  document.getElementById('compare-label').textContent = pct>0?'cải thiện so với tuần trước':'tệ hơn tuần trước';
  document.getElementById('trend-badge').textContent = pct>0?'↑ Cải thiện':'↓ Tệ hơn';
  document.getElementById('trend-badge').className = 'badge-pill '+(pct>0?'up':'down');
  document.getElementById('this-week-avg').textContent = wAvg.toFixed(1)+'kg';
  document.getElementById('last-week-avg').textContent = pAvg.toFixed(1)+'kg';

  // Goal
  const goalPct = Math.min(100, Math.max(0,+pct));
  document.getElementById('goal-pct').textContent = goalPct.toFixed(0)+'%';
  document.getElementById('goal-val').textContent = goalPct.toFixed(0)+'/20%';
  document.getElementById('goal-bar').style.width = Math.min(100,goalPct/20*100)+'%';
  document.getElementById('trees-progress').textContent = `${trees} cây xanh đã cứu!`;

  // Badges
  loadBadges();

  // Breakdown
  const bd = latest.carbon;
  const max = Math.max(bd.transport,bd.electricity,bd.food,bd.plastic,bd.water,0.1);
  document.getElementById('breakdown-list').innerHTML = [
    ['🚗','Di chuyển',bd.transport],
    ['⚡','Điện',bd.electricity],
    ['🍽️','Thực phẩm',bd.food],
    ['🛍️','Nhựa',bd.plastic],
    ['🚿','Nước',bd.water],
  ].map(([e,l,v])=>`
    <div class="breakdown-row">
      <span class="breakdown-emoji">${e}</span>
      <span class="breakdown-label">${l}</span>
      <div class="breakdown-bar"><div class="breakdown-fill" style="width:${(v/max*100).toFixed(0)}%"></div></div>
      <span class="breakdown-val">${v.toFixed(2)}kg</span>
    </div>`).join('');
}

function loadBadges() {
  const week = state.history.slice(-7);
  const badges = [];
  const plasticFree = week.filter(a=>a.activity.plastic===0).length;
  const greenDays = week.filter(a=>['bicycle','walk'].includes(a.activity.transport)).length;
  const avgScore = week.reduce((s,a)=>s+a.score,0)/7;

  if(plasticFree>=7) badges.push({icon:'♻️',name:'7 Ngày Không Nhựa',earned:true});
  else if(plasticFree>=3) badges.push({icon:'♻️',name:'3 Ngày Không Nhựa',earned:true});
  if(greenDays>=5) badges.push({icon:'🚲',name:'Người Đi Xanh',earned:true});
  if(avgScore>=75) badges.push({icon:'🏆',name:'Eco Champion',earned:true});
  badges.push({icon:'🥗',name:'Tuần Thuần Chay',earned:false});
  badges.push({icon:'⚡',name:'Zero Emission',earned:false});

  document.getElementById('badges-row').innerHTML = badges.map(b=>`
    <div class="badge-item">
      <div class="badge-icon ${b.earned?'earned':'locked'}">${b.icon}</div>
      <div class="badge-name">${b.name}</div>
    </div>`).join('');
}

// ============================================================
// FORM
// ============================================================
function select(el, key, val) {
  const parent = el.closest('.opt-grid');
  parent.querySelectorAll('.opt-btn').forEach(b=>b.classList.remove('sel'));
  el.classList.add('sel');
  state.form[key] = val;
}

let plasticCount = 0;
function changeCount(delta) {
  plasticCount = Math.max(0, plasticCount+delta);
  document.getElementById('plastic-count').textContent = plasticCount;
}

async function submitLog() {
  const activity = {
    transport: state.form.transport,
    km: +document.getElementById('km-slider').value,
    electricity: +document.getElementById('elec-slider').value,
    food: state.form.food,
    plastic: plasticCount,
    shower: +document.getElementById('shower-slider').value,
  };

  const carbon = calcCarbon(activity);
  const score = calcScore(carbon.total);

  // Show modal
  document.getElementById('modal').classList.add('open');
  document.getElementById('modal-score-val').textContent = score;
  document.getElementById('modal-title').textContent = score>=80?'Hôm nay bạn sống rất xanh! 🌟':score>=60?'Bạn đang trên đà cải thiện 👍':'Mỗi bước nhỏ đều có ý nghĩa 🌱';
  document.getElementById('modal-msg').innerHTML = `<div class="tip-loading"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>`;

  // Breakdown
  document.getElementById('modal-breakdown').innerHTML = [
    ['🚗','Di chuyển',carbon.transport],
    ['⚡','Điện',carbon.electricity],
    ['🍽️','Thực phẩm',carbon.food],
    ['🛍️','Nhựa',carbon.plastic],
    ['🚿','Nước',carbon.water],
  ].map(([e,l,v])=>`
    <div class="bd-item">
      <span class="bd-emoji">${e}</span>
      <div><div class="bd-val">${v.toFixed(2)}kg</div><div class="bd-label">${l}</div></div>
    </div>`).join('');

  // Add to history
  const now = new Date();
  state.history.push({
    date:now.toLocaleDateString('vi-VN',{weekday:'short',day:'2-digit',month:'2-digit'}),
    dateShort:now.toLocaleDateString('vi-VN',{weekday:'short'}),
    carbon, score, activity
  });

  // AI feedback
  const feedback = await getAIFeedback(score, carbon, activity);
  document.getElementById('modal-msg').textContent = feedback;

  loadDashboard();
  toast('✅ Đã ghi nhật ký hôm nay!');
}

function closeModal() {
  document.getElementById('modal').classList.remove('open');
}

// ============================================================
// NEWS
// ============================================================
let newsLoaded = false;
const staticNews = [
  {title:'Việt Nam cam kết giảm 43.5% phát thải CO₂ vào 2030',summary:'Chính phủ VN công bố kế hoạch năng lượng tái tạo và giao thông xanh quy mô lớn.',source:'VnExpress',tag:'Chính sách',action:'Đi xe đạp hoặc đi bộ ít nhất 1 lần tuần này'},
  {title:'Rác nhựa đại dương đạt mức kỷ lục 170 nghìn tỷ mảnh',summary:'Nghiên cứu mới cho thấy lượng rác nhựa trong đại dương tăng gấp đôi trong 15 năm.',source:'BBC Earth',tag:'Đại dương',action:'Dùng bình nước cá nhân thay chai nhựa 7 ngày'},
  {title:'Rừng nhiệt đới Amazon mất 10.000 km² trong năm 2023',summary:'Tốc độ phá rừng vẫn ở mức đáng lo ngại dù đã giảm so với năm trước.',source:'NASA Climate',tag:'Rừng',action:'In 2 mặt giấy và hạn chế dùng giấy không cần thiết'},
  {title:'Điện mặt trời ở Việt Nam đạt 20GW – dẫn đầu Đông Nam Á',summary:'VN trở thành quốc gia có công suất điện mặt trời lớn nhất Đông Nam Á năm 2023.',source:'Tuổi Trẻ',tag:'Năng lượng',action:'Tắt điện và thiết bị điện khi không sử dụng'},
];

async function loadNews() {
  newsLoaded = true;
  const container = document.getElementById('news-list');
  
  // Show static articles with AI summary
  container.innerHTML = '';
  for(const article of staticNews) {
    const aiSummary = await getNewsAI(article.title, article.summary);
    const card = `
      <div class="news-card">
        <div class="news-tag-row">
          <span class="news-source">${article.source}</span>
          <span class="news-tag">${article.tag}</span>
        </div>
        <div class="news-title">${article.title}</div>
        <div class="news-summary">${article.summary}</div>
        <div class="news-ai">
          <div class="news-ai-label">🤖 AI tóm tắt cho học sinh</div>
          <div class="news-ai-text">${aiSummary}</div>
        </div>
        <div class="news-action">
          <div class="action-chip">🎯 ${article.action}</div>
        </div>
      </div>`;
    container.insertAdjacentHTML('beforeend', card);
  }
}

// ============================================================
// RANK
// ============================================================
function loadRank() {
  const names = ['Thanh Hà','Đức Anh','Thu Trang','Hoàng Nam','Linh Chi','Lại Tùng Lâm ','Văn Đức','Phương Thảo','Quang Huy','Ngọc Bích'];
  const rows = names.map((n,i)=>({
    rank:i+1,name:n,score:Math.max(40,95-i*5+(Math.random()*6-3|0)),
    isMe:n==='Lại Tùng Lâm',
    tip:i===0?'🚲 Đi xe đạp 5 ngày/tuần':null
  }));

  document.getElementById('rank-list').innerHTML = `
    <div class="card-head"><div class="card-title">Tháng này • 11A2</div><div class="badge-pill">42 học sinh</div></div>
    ${rows.map(r=>`
    <div class="rank-row${r.isMe?' me':''}">
      <div class="rank-n${r.rank===1?' g':r.rank===2?' s':r.rank===3?' b':''}">${r.rank===1?'🥇':r.rank===2?'🥈':r.rank===3?'🥉':r.rank}</div>
      <div class="rank-avatar">😊</div>
      <div class="rank-info">
        <div class="rank-name">${r.name}${r.isMe?' (bạn)':''}</div>
        ${r.tip?`<div class="rank-sub">${r.tip}</div>`:r.isMe?`<div class="rank-sub">Xếp hạng ${r.rank}/42 — top ${Math.round(r.rank/42*100)}%</div>`:''}
      </div>
      <div class="rank-score">${r.score}</div>
    </div>`).join('')}`;
}

// ============================================================
// PROFILE
// ============================================================
function loadProfile() {
  document.getElementById('profile-name').textContent = state.userData.name;
  document.getElementById('profile-school').textContent = `${state.userData.school} • ${state.userData.grade}`;
  
  const avgScore = (state.history.reduce((s,a)=>s+a.score,0)/state.history.length).toFixed(0);
  const totalSaved = Math.max(0,state.history.reduce((s,a)=>s+Math.max(0,8-a.carbon.total),0));
  const trees = (totalSaved/21.77).toFixed(1);
  
  document.getElementById('prof-score').textContent = avgScore;
  document.getElementById('prof-days').textContent = state.history.length;
  document.getElementById('prof-trees').textContent = trees;

  // 30-day breakdown totals
  const totals = {transport:0,electricity:0,food:0,plastic:0,water:0};
  state.history.forEach(a=>{
    Object.keys(totals).forEach(k=>totals[k]+=a.carbon[k]);
  });
  const max = Math.max(...Object.values(totals));
  ['transport','elec','food','plastic','water'].forEach((k,i) => {
    const key = ['transport','electricity','food','plastic','water'][i];
    const v = totals[key].toFixed(1);
    document.getElementById('pb-'+k).style.width = (totals[key]/max*100).toFixed(0)+'%';
    document.getElementById('pb-'+k+'-val').textContent = v+'kg';
  });
}

// ============================================================
// IMAGE ANALYSIS
// ============================================================
async function analyzeImage(input) {
  if(!input.files[0]) return;
  const file = input.files[0];
  const result = document.getElementById('analyze-result');
  result.classList.add('show');
  document.getElementById('result-cat').textContent = '🔍 Đang phân tích...';
  document.getElementById('result-detail').innerHTML = `<div class="tip-loading" style="justify-content:center;padding:16px"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>`;

  // Preview icon
  document.getElementById('upload-preview-icon').textContent = '✅';

  // Convert to base64
  const b64 = await new Promise(res => {
    const r = new FileReader();
    r.onload = ()=>res(r.result.split(',')[1]);
    r.readAsDataURL(file);
  });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        model:'claude-sonnet-4-20250514',
        max_tokens:400,
        system:'Bạn là chuyên gia phân loại rác thải. Phân tích ảnh và trả về JSON: {"category":"plastic|organic|paper|metal|other","emoji":"emoji phù hợp","co2_impact":số kg CO2,"tip":"mẹo tái chế bằng tiếng Việt","action":"hành động cụ thể học sinh có thể làm"}. Chỉ trả về JSON thuần.',
        messages:[{role:'user',content:[
          {type:'image',source:{type:'base64',media_type:file.type||'image/jpeg',data:b64}},
          {type:'text',text:'Phân loại loại rác trong ảnh này và đưa ra lời khuyên cho học sinh THPT.'}
        ]}]
      })
    });
    const data = await response.json();
    const text = data.content?.map(c=>c.text||'').join('').replace(/```json?|```/g,'').trim();
    const parsed = JSON.parse(text);
    
    const cats = {plastic:'♻️ Nhựa',organic:'🌿 Hữu cơ',paper:'📄 Giấy',metal:'🔩 Kim loại',other:'📦 Khác'};
    document.getElementById('result-cat').textContent = `${parsed.emoji||''} ${cats[parsed.category]||parsed.category}`;
    document.getElementById('result-detail').innerHTML = `
      <div class="breakdown-row"><span class="breakdown-emoji">💨</span><span class="breakdown-label">Tác động CO₂</span><span style="font-family:'Space Mono',monospace;font-weight:700;color:var(--canopy)">${parsed.co2_impact?.toFixed(3)||'0.082'}kg</span></div>
      <div style="background:linear-gradient(135deg,#f0fff5,var(--mist));border-left:3px solid var(--leaf);padding:12px;border-radius:0 10px 10px 0;margin-top:12px">
        <div style="font-size:10px;font-weight:700;color:var(--canopy);margin-bottom:4px;text-transform:uppercase;letter-spacing:.5px">💡 Mẹo tái chế</div>
        <div style="font-size:13px;color:var(--ink);line-height:1.6">${parsed.tip||''}</div>
      </div>
      <div style="background:var(--mist);border-radius:10px;padding:12px;margin-top:10px;font-size:13px;font-weight:600;color:var(--canopy)">🎯 ${parsed.action||''}</div>`;
  } catch(e) {
    // Fallback mock
    const mocks = [
      {emoji:'🍶',cat:'♻️ Nhựa',co2:'0.082',tip:'Bỏ chai nhựa vào thùng tái chế màu vàng. Rửa sạch trước khi tái chế.',action:'Dùng bình nước cá nhân thay chai nhựa dùng một lần'},
      {emoji:'🌿',cat:'🌿 Hữu cơ',co2:'0.012',tip:'Rác hữu cơ có thể ủ compost để bón cây hoặc bỏ vào thùng rác hữu cơ.',action:'Phân loại rác hữu cơ riêng để ủ phân bón cây'},
    ];
    const m = mocks[Math.floor(Math.random()*mocks.length)];
    document.getElementById('result-cat').textContent = m.cat;
    document.getElementById('result-detail').innerHTML = `
      <div class="breakdown-row"><span class="breakdown-emoji">💨</span><span class="breakdown-label">Tác động CO₂</span><span style="font-family:'Space Mono',monospace;font-weight:700;color:var(--canopy)">${m.co2}kg</span></div>
      <div style="background:linear-gradient(135deg,#f0fff5,var(--mist));border-left:3px solid var(--leaf);padding:12px;border-radius:0 10px 10px 0;margin-top:12px">
        <div style="font-size:10px;font-weight:700;color:var(--canopy);margin-bottom:4px;text-transform:uppercase;letter-spacing:.5px">💡 Mẹo tái chế</div>
        <div style="font-size:13px;color:var(--ink);line-height:1.6">${m.tip}</div>
      </div>
      <div style="background:var(--mist);border-radius:10px;padding:12px;margin-top:10px;font-size:13px;font-weight:600;color:var(--canopy)">🎯 ${m.action}</div>`;
  }
}

// ============================================================
// CLAUDE AI CALLS
// ============================================================
async function callClaude(system, userMsg, maxTokens=300) {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:maxTokens,system,messages:[{role:'user',content:userMsg}]})
    });
    const data = await res.json();
    return data.content?.map(c=>c.text||'').join('').trim();
  } catch {
    return null;
  }
}

async function loadAITip() {
  const week = state.history.slice(-7);
  const avgKg = (week.reduce((s,a)=>s+a.carbon.total,0)/7).toFixed(2);
  const topCategory = getTopCategory(week);
  
  const tip = await callClaude(
    'Bạn là trợ lý môi trường thân thiện cho học sinh THPT Việt Nam. Viết 1 câu tip ngắn gọn (tối đa 25 từ) cụ thể, thực tế để giảm CO₂ hôm nay.',
    `Học sinh có mức phát thải TB 7 ngày: ${avgKg}kg CO₂/ngày. Nguồn phát thải chính: ${topCategory}. Viết 1 tip cụ thể, ngắn, có thể thực hiện ngay.`
  );
  document.getElementById('tip-text').textContent = tip || '🚲 Thử đi xe đạp hoặc đi bộ đoạn đường ngắn hôm nay để tiết kiệm CO₂!';
}

async function getAIFeedback(score, carbon, activity) {
  const feedback = await callClaude(
    'Bạn là coach môi trường cho học sinh THPT VN. Viết 2 câu phản hồi cá nhân hóa: đánh giá ngắn và 1 gợi ý cụ thể để cải thiện ngày mai.',
    `Green Score hôm nay: ${score}/100. CO₂: ${carbon.total}kg. Hoạt động: ${activity.transport} ${activity.km}km, điện ${activity.electricity}h, ăn ${activity.food}, nhựa ${activity.plastic} item, tắm ${activity.shower} phút. Phần lớn từ: ${Object.entries(carbon).filter(([k])=>k!=='total').sort((a,b)=>b[1]-a[1])[0][0]}.`
  );
  return feedback || (score>=80?'🌟 Xuất sắc! Hôm nay bạn sống rất xanh. Tiếp tục duy trì thói quen tốt này nhé!':'🌱 Bạn đang cải thiện mỗi ngày. Thử giảm thêm 1 hoạt động gây phát thải cao nhé!');
}

async function getNewsAI(title, summary) {
  const result = await callClaude(
    'Bạn là nhà giáo dục môi trường. Tóm tắt tin tức trong 1-2 câu đơn giản cho học sinh THPT VN, thêm kết nối với hành động cá nhân.',
    `Tin tức: ${title}. Nội dung: ${summary}. Viết tóm tắt và kết nối hành động cho học sinh.`
  );
  return result || `🌍 ${summary.slice(0,100)}...`;
}

function getTopCategory(history) {
  const totals = {transport:0,electricity:0,food:0,plastic:0,water:0};
  history.forEach(a=>Object.keys(totals).forEach(k=>totals[k]+=a.carbon[k]));
  const map = {transport:'di chuyển',electricity:'điện',food:'thực phẩm',plastic:'nhựa',water:'nước'};
  return map[Object.entries(totals).sort((a,b)=>b[1]-a[1])[0][0]];
}

// ============================================================
// TOAST
// ============================================================
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'),3000);
}
