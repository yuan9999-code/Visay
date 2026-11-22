/* =========================================================
   Visay · 消费者 APP 交互逻辑
   ========================================================= */
(function () {
  'use strict';
  const $ = (s, p = document) => p.querySelector(s);
  const $$ = (s, p = document) => Array.from(p.querySelectorAll(s));

  /* ---------- Toast / 时钟 ---------- */
  let toastTimer;
  function toast(msg) {
    const t = $('#toast'); t.textContent = tr(msg); t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
  }
  function tick() {
    const d = new Date();
    $('#sbTime').textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  tick(); setInterval(tick, 15000);

  /* ---------- 页面切换 ---------- */
  const pageMeta = {
    adapt: ['个人适应', '3 天校准 · 越用越懂你'],
    dialogue: ['对话', '看清每一句 · 不错过每一次交流'],
    care: ['关怀', '感知环境 · 及时提醒与抚慰'],
    profile: ['我的', '设备与偏好设置']
  };
  const enTitles = { adapt: 'Adaptation', dialogue: 'Conversation', care: 'Care', profile: 'Me' };
  const enSubs = {
    adapt: '3-Day Calibration · Adapts to You',
    dialogue: 'Catch Every Word · Never Miss a Conversation',
    care: 'Sense the Environment · Timely Alerts & Comfort',
    profile: 'Device & Preferences'
  };
  let currentPage = 'adapt';
  function switchPage(page) {
    currentPage = page;
    $$('.apage').forEach(p => p.classList.remove('active'));
    const el = $('#apage-' + page); if (el) el.classList.add('active');
    $$('.tab').forEach(t => t.classList.toggle('active', t.dataset.page === page));
    if (pageMeta[page]) {
      $('#ahTitle').textContent = (typeof currentLang !== 'undefined' && currentLang === 'en') ? enTitles[page] : pageMeta[page][0];
      $('#ahSub').textContent = (typeof currentLang !== 'undefined' && currentLang === 'en') ? (enSubs[page] || '') : pageMeta[page][1];
    }
    $('#appContent').scrollTop = 0;
    if (page === 'care') startAutoSense(); else stopAutoSense();
  }
  $$('.tab').forEach(t => t.addEventListener('click', () => switchPage(t.dataset.page)));

  /* ---------- 主题切换（白 / 黑） ---------- */
  $$('.theme-opt').forEach(btn => btn.addEventListener('click', () => {
    const theme = btn.dataset.theme;
    document.body.setAttribute('data-theme', theme);
    $$('.theme-opt').forEach(x => x.classList.toggle('active', x === btn));
    toast(theme === 'light' ? '已切换为白色主题' : '已切换为黑色主题');
  }));

  /* ============================================================
     个人适应：三天进度条 + 波形 + 反馈模式
     ============================================================ */
  const dayTargets = { 1: 20, 2: 30, 3: 40 };
  let appDay = 1, prog = { 1: 0, 2: 0, 3: 0 }, appTraining = false;
  function renderProgress() {
    const p = Math.round(prog[appDay]);
    $('#progPct').textContent = p + '%';
    $('#progBar').style.width = p + '%';
    $('#progTarget').textContent = dayTargets[appDay] + ' ' + tr('分钟');
    $('#progElapsed').textContent = tr('已用') + ' ' + Math.round(p / 100 * dayTargets[appDay]) + ' ' + tr('分钟');
    const allDone = Object.values(prog).every(v => v >= 100);
    if (allDone && !window.__continueShown) {
      window.__continueShown = true;
      $('#continueLocked').style.display = 'none';
      $('#continueReady').style.display = 'block';
      $('#continueHint').textContent = tr('3 天适应已完成 · 可自由选择');
      toast('3 天适应已完成，可选择是否继续调试');
    }
  }
  // 进度条随时间推进
  setInterval(() => {
    if (prog[appDay] < 100) { prog[appDay] = Math.min(100, prog[appDay] + 0.6); renderProgress(); }
  }, 2000);

  $('#appDayTabs').addEventListener('click', e => {
    const b = e.target.closest('.day-tab'); if (!b) return;
    $$('.day-tab').forEach(x => x.classList.remove('active')); b.classList.add('active');
    appDay = Number(b.dataset.day); renderProgress();
  });

  // 波形
  function setupMiniCv(cv) {
    const dpr = window.devicePixelRatio || 1, r = cv.getBoundingClientRect();
    cv.width = Math.max(1, r.width * dpr); cv.height = Math.max(1, r.height * dpr);
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w: r.width, h: r.height };
  }
  const eegCv = $('#appEeg'), emgCv = $('#appEmg');
  let eegCfg = setupMiniCv(eegCv), emgCfg = setupMiniCv(emgCv), ph1 = 0, ph2 = 0;
  function drawMini(cfg, isEeg, ref) {
    const { ctx, w, h } = cfg;
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = isEeg ? 'rgba(0,229,255,.85)' : 'rgba(138,108,255,.85)';
    ctx.lineWidth = 1.6; ctx.beginPath();
    for (let x = 0; x <= w; x += 2) {
      const p = x / w;
      let y = isEeg
        ? Math.sin(p * 14 + ref.v) * 9 + Math.sin(p * 30 + ref.v * 1.4) * 5 + (Math.random() - .5) * 2
        : (Math.random() - .5) * 5 + (Math.random() > .95 ? (Math.random() - .5) * 26 : 0);
      const py = h / 2 - y * (appTraining ? 1.7 : 1);
      x === 0 ? ctx.moveTo(x, py) : ctx.lineTo(x, py);
    }
    ctx.stroke(); ref.v += isEeg ? .11 : .18;
  }
  function miniLoop() {
    drawMini(eegCfg, true, { get v() { return ph1; }, set v(x) { ph1 = x; } });
    drawMini(emgCfg, false, { get v() { return ph2; }, set v(x) { ph2 = x; } });
    requestAnimationFrame(miniLoop);
  }
  requestAnimationFrame(miniLoop);
  window.addEventListener('resize', () => { eegCfg = setupMiniCv(eegCv); emgCfg = setupMiniCv(emgCv); });

  // 训练按钮：加速当日进度
  $('#appTrainBtn').addEventListener('click', () => {
    if (appTraining) return;
    if (prog[appDay] >= 100) { toast('Day ' + appDay + ' ' + tr('已达到最适使用时长')); return; }
    appTraining = true;
    const btn = $('#appTrainBtn'); btn.textContent = tr('训练进行中…');
    toast('正在采集神经信号，进度加速推进');
    const timer = setInterval(() => {
      prog[appDay] = Math.min(100, prog[appDay] + 2.2); renderProgress();
      if (prog[appDay] >= 100) {
        clearInterval(timer); appTraining = false; btn.textContent = tr('今日训练已完成');
        $('#appAcc').textContent = ({ 1: 73, 2: 87, 3: 95 })[appDay] + '%';
        $('#appVer').textContent = 'v' + (1 + appDay * 0.1).toFixed(1);
        const pv = $('#profileVer'); if (pv) pv.textContent = $('#appVer').textContent;
        toast('Day ' + appDay + ' ' + tr('训练完成，达到最适使用时长'));
        renderProgress();
      }
    }, 120);
  });

  /* ---------- 反馈模式 ---------- */
  const fbSamples = ['我想喝水', '请帮我拿一下药', '我有点不舒服', '我想出去走走', '能帮我接通电话吗'];
  let fbIndex = 0, lastFbSample = fbSamples[0], fbStatusType = '', fbStatusCustom = '';
  function paintFbResult() {
    $('#fbResult').textContent = currentLang === 'en'
      ? 'Recognized: "' + tr(lastFbSample) + '"'
      : '识别结果：「' + lastFbSample + '」';
  }
  function paintFbStatus() {
    const el = $('#fbStatus');
    if (fbStatusType === 'ok') el.textContent = tr('✓ 已确认识别准确，模型已记录本次样本。');
    else if (fbStatusType === 'custom') el.textContent = tr('已记录正确表达') + '「' + tr(fbStatusCustom) + '」' + tr('，模型正在针对性调试。');
    else el.textContent = '';
  }
  function nextFb() { lastFbSample = fbSamples[fbIndex % fbSamples.length]; paintFbResult(); fbIndex++; }
  $('#fbOk').addEventListener('click', () => {
    fbStatusType = 'ok'; paintFbStatus();
    toast('已确认识别准确'); setTimeout(nextFb, 700);
  });
  $('#fbNo').addEventListener('click', () => { $('#correctModal').classList.add('show'); $('#correctInput').value = ''; $('#correctInput').focus(); });
  $('#correctCancel').addEventListener('click', () => $('#correctModal').classList.remove('show'));
  $('#correctSave').addEventListener('click', () => {
    const v = $('#correctInput').value.trim();
    if (!v) { toast('请输入正确的表达内容'); return; }
    $('#correctModal').classList.remove('show');
    fbStatusType = 'custom'; fbStatusCustom = v; paintFbStatus();
    toast('已提交纠正，模型学习中'); setTimeout(nextFb, 800);
  });

  /* ============================================================
     对话：单人/多人 + 人脸主对象 + 导出纪要
     ============================================================ */
  const people = [
    { id: 'A', name: '林薇', skin: '#f0c9a8', hair: '#2d201a', bg: '#34405a' },
    { id: 'B', name: '陈浩', skin: '#d9a884', hair: '#1f1a18', bg: '#2c3d4d' },
    { id: 'C', name: '赵敏', skin: '#eec2a0', hair: '#4a2f24', bg: '#3a3450' },
    { id: 'D', name: '王磊', skin: '#c99170', hair: '#241b18', bg: '#293b45' },
    { id: 'E', name: '苏晴', skin: '#f2cdb0', hair: '#5a3a2a', bg: '#3d3a4d' },
    { id: 'F', name: '周杰', skin: '#d4a07d', hair: '#2a201c', bg: '#2f4152' },
    { id: 'G', name: '李娜', skin: '#eab995', hair: '#3d2a22', bg: '#383650' },
    { id: 'H', name: '张伟', skin: '#dfae8b', hair: '#332620', bg: '#313c52' }
  ];
  function faceSvg(p) {
    return '<svg viewBox="0 0 60 60"><defs><clipPath id="c' + p.id + '"><rect width="60" height="60" rx="8"/></clipPath></defs>' +
      '<g clip-path="url(#c' + p.id + ')"><rect width="60" height="60" fill="' + p.bg + '"/>' +
      '<circle cx="30" cy="60" r="25" fill="' + p.skin + '"/><ellipse cx="30" cy="27" rx="13" ry="15" fill="' + p.skin + '"/>' +
      '<path d="M16 26 Q30 3 44 26 Q40 14 30 13 Q20 14 16 26" fill="' + p.hair + '"/>' +
      '<circle cx="24.5" cy="27" r="1.5" fill="#2a2320"/><circle cx="35.5" cy="27" r="1.5" fill="#2a2320"/>' +
      '<path d="M25 34 Q30 37 35 34" fill="none" stroke="#9c6a58" stroke-width="1.4" stroke-linecap="round"/></g></svg>';
  }
  let dlgMode = 'multi', selectedFace = null;
  function renderFaces() {
    const list = dlgMode === 'multi' ? people : people.slice(0, 1);
    $('#faceHint').textContent = dlgMode === 'multi'
      ? tr('点击头像设为主对象 · 自动聚焦字幕')
      : tr('单人模式 · 仅显示一位说话人');
    $('#appFaceGrid').innerHTML = list.map(p =>
      '<div class="face-card' + (selectedFace === p.id ? ' selected' : '') + '" data-id="' + p.id + '">' +
      '<div class="face-thumb">' + faceSvg(p) + '</div><div class="face-name">' + tr(p.name) + '</div></div>'
    ).join('');
  }
  $('#appFaceGrid').addEventListener('click', e => {
    const c = e.target.closest('.face-card'); if (!c) return;
    selectedFace = c.dataset.id;
    $$('.face-card').forEach(x => x.classList.toggle('selected', x === c));
    focusSubtitle();
    const name = people.find(p => p.id === selectedFace).name;
    toast(tr('已将 ') + tr(name) + tr(' 设为主对象，字幕自动聚焦'));
  });

  const multiLines = [
    { id: 'A', text: '这版方案今晚必须交，不能再拖了。' },
    { id: 'B', text: '数据还没核对完，现在交风险太大。' },
    { id: 'C', text: '我们先确认还差哪些数据，再决定时间。' },
    { id: 'D', text: '我这边接口还有两个字段没对齐。' },
    { id: 'E', text: '客户那边明早就要看，时间确实很紧。' },
    { id: 'A', text: '那就快点，别浪费时间了。' },
    { id: 'F', text: '测试环境还有三个用例没跑完呢。' },
    { id: 'C', text: '这样，先把还差的数据列出来。' },
    { id: 'B', text: '我已经把清单发到群里了，大家看一下。' },
    { id: 'D', text: '收到，我这边十分钟内能补齐接口字段。' },
    { id: 'E', text: '那我们半小时后再碰一次，确认最终结果。' },
    { id: 'A', text: '好，就按这个来，半小时后见。' }
  ];
  const singleLines = [
    { id: 'A', text: '你好，请问现在几点了？' },
    { id: 'A', text: '我想预约明天上午的检查。' },
    { id: 'A', text: '请问这个检查需要空腹吗？' },
    { id: 'A', text: '我有点听不清，麻烦用文字告诉我。' },
    { id: 'A', text: '麻烦把结果用文字发给我，谢谢。' },
    { id: 'A', text: '请问报告什么时候可以取？' },
    { id: 'A', text: '好的，我明白了，谢谢你。' },
    { id: 'A', text: '再见，祝你工作顺利。' }
  ];
  let dlgTimers = [], dlgPlaying = false, shownLines = [], minutesMode = null;
  function paintSubtitle() {
    const box = $('#appSubtitle');
    if (!shownLines.length) {
      box.innerHTML = '<div class="sub-placeholder">' + tr('点击人脸选择主对象后开始') + '</div>';
      return;
    }
    box.innerHTML = shownLines.map(line => {
      const p = people.find(x => x.id === line.id) || people[0];
      const dim = selectedFace && selectedFace !== line.id ? ' dim' : '';
      return '<div class="sub-item' + dim + '" data-id="' + line.id + '">' +
        '<div class="sub-av">' + tr(p.name[0]) + '</div><div><div class="sub-meta">' + tr(p.name) + '</div>' +
        '<div class="sub-bubble">' + tr(line.text) + '</div></div></div>';
    }).join('');
    box.scrollTop = box.scrollHeight;
  }
  function addLine(line) { shownLines.push(line); paintSubtitle(); focusSubtitle(); }
  function focusSubtitle() {
    $$('.sub-item').forEach(el => el.classList.toggle('dim', !!selectedFace && el.dataset.id !== selectedFace));
  }
  $('#dlgMode').addEventListener('click', e => {
    const b = e.target.closest('.mode-btn'); if (!b) return;
    $$('.mode-btn').forEach(x => x.classList.remove('active')); b.classList.add('active');
    dlgMode = b.dataset.mode; selectedFace = null;
    dlgTimers.forEach(clearTimeout); dlgTimers = []; dlgPlaying = false;
    shownLines = []; minutesMode = null;
    $('#appPlayDlg').textContent = tr('播放对话');
    paintSubtitle();
    $('#appMinutes').textContent = tr('对话结束后自动生成纪要。');
    renderFaces(); toast(dlgMode === 'multi' ? '已切换为多人对话' : '已切换为单人对话');
  });
  function renderMinutesHTML(mode) {
    if (mode === 'multi') {
      return '<div class="m-title">' + tr('关键结论') + '</div><div class="mi">' + tr('先列出还差的数据，再决定是否今晚交付') + '</div>' +
        '<div class="m-title">' + tr('待办') + '</div><div class="mi">' + tr('林薇整理版本 · 陈浩核对数据 · 赵敏汇总缺口') + '</div>';
    }
    if (mode === 'single') {
      return '<div class="m-title">' + tr('沟通要点') + '</div><div class="mi">' + tr('对方希望预约检查，并要求把结果以文字形式发送') + '</div>';
    }
    return null;
  }
  $('#appPlayDlg').addEventListener('click', () => {
    if (dlgPlaying) return;
    dlgPlaying = true; dlgTimers.forEach(clearTimeout); dlgTimers = [];
    shownLines = []; minutesMode = null; paintSubtitle();
    $('#appMinutes').textContent = tr('对话进行中，结束后生成纪要…');
    $('#appPlayDlg').textContent = tr('对话播放中…');
    const lines = dlgMode === 'multi' ? multiLines : singleLines;
    lines.forEach((l, i) => dlgTimers.push(setTimeout(() => addLine(l), 300 + i * 750)));
    dlgTimers.push(setTimeout(() => {
      minutesMode = dlgMode;
      $('#appMinutes').innerHTML = renderMinutesHTML(minutesMode);
      dlgPlaying = false; $('#appPlayDlg').textContent = tr('重新播放');
      toast('对话结束，AI 纪要已生成');
    }, 300 + lines.length * 750 + 400));
  });

  /* ---------- 导出纪要：文本 / 音频 双选项卡 ---------- */
  let exportMode = 'text';
  function getMinutesText() {
    return currentLang === 'en'
      ? 'Visay Conversation Minutes\n\nKey Conclusions: List the missing data first, then decide whether to deliver tonight.\nAction Items: Lin Wei — finalize version; Chen Hao — verify data; Zhao Min — summarize gaps.'
      : 'Visay 对话纪要\n\n关键结论：先列出还差的数据，再决定是否今晚交付。\n待办：林薇整理版本；陈浩核对数据；赵敏汇总缺口。';
  }
  function renderExport() {
    const minutesText = getMinutesText();
    if (exportMode === 'text') {
      $('#exportBody').innerHTML = '<pre>' + minutesText + '</pre>';
    } else {
      $('#exportBody').innerHTML = '<div class="audio-view"><button class="audio-play" id="audioPlay">▶</button><div>' + tr('点击播放，用语音读出纪要') + '</div></div>';
      $('#audioPlay').addEventListener('click', () => {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance(minutesText.replace(/\n/g, '。'));
          u.lang = currentLang === 'en' ? 'en-US' : 'zh-CN';
          window.speechSynthesis.speak(u); toast('正在语音朗读纪要');
        } else toast('当前环境不支持语音合成');
      });
    }
  }
  $('#appExportBtn').addEventListener('click', () => { $('#exportModal').classList.add('show'); renderExport(); });
  $('#exportTabs').addEventListener('click', e => {
    const b = e.target.closest('.export-tab'); if (!b) return;
    $$('.export-tab').forEach(x => x.classList.toggle('active', x === b));
    exportMode = b.dataset.mode; renderExport();
  });
  function closeExport() {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    $('#exportModal').classList.remove('show');
  }
  $('#exportCancel').addEventListener('click', closeExport);
  $('#exportConfirm').addEventListener('click', () => {
    closeExport();
    toast(exportMode === 'text' ? '文本纪要已导出（演示）' : '音频纪要已生成（演示）');
  });

  /* ============================================================
     关怀：环境范围扩散（泛化 → 具体）
     ============================================================ */
  const envMap = {
    calm: { label: '平静', items: ['环境安静', '正常交谈', '无异常声响'] },
    conflict: { label: '冲突', items: ['周围有人争吵', '大声争执', '情绪激动的对话'] },
    danger: { label: '危险', items: ['突发巨响', '陌生人突然靠近', '车辆驶来', '走失风险', '跌倒无人协助', '被困呼救'] },
    disaster: { label: '灾害', items: ['火灾警报', '地震预警', '燃气泄漏', '建筑物摇晃'] }
  };
  const careMsgs = {
    '环境安静': ['一切平静', '周围环境暂无异常，请放心。', ''],
    '正常交谈': ['周围有人交谈', '附近有人在正常聊天，没有危险。', ''],
    '无异常声响': ['一切平静', '未检测到异常声音。', ''],
    '周围有人争吵': ['周围有人争吵', '别紧张，他们不是在针对你。可以先看文字，不必急着回应。', 'warn'],
    '大声争执': ['声源嘈杂', '声音很吵，可以先看文字，按你的节奏回应。', 'warn'],
    '情绪激动的对话': ['情绪激动', '对话情绪较激动，但没有人在等你回应。', 'warn'],
    '突发巨响': ['突发巨响！', '检测到突然的巨大声响，请环顾四周确认安全。', 'alert'],
    '陌生人突然靠近': ['陌生人靠近', '有人正快速靠近你，请留意并寻求同伴帮助。', 'alert'],
    '车辆驶来': ['车辆驶来！', '检测到车辆接近，请停在安全位置，注意避让。', 'alert'],
    '走失风险': ['注意方向', '你已偏离熟悉路线，建议打开定位并联系家人。', 'warn'],
    '跌倒无人协助': ['检测到跌倒', '你似乎跌倒了，已向紧急联系人发送提示。', 'alert'],
    '被困呼救': ['检测到呼救声', '附近有人呼救，已提示周围人员协助。', 'alert'],
    '火灾警报': ['火灾警报', '请跟随人群沿安全通道有序撤离，弯腰捂住口鼻。', 'alert'],
    '地震预警': ['地震警报', '请就近躲在坚固物体旁，护住头部，远离窗户。', 'alert'],
    '燃气泄漏': ['燃气泄漏警报', '请立即远离现场，到通风处并联系相关人员。', 'alert'],
    '建筑物摇晃': ['建筑摇晃', '请尽快撤离到空旷安全地带。', 'alert']
  };
  let lastDangerCat = null, lastCareKey = null;
  function bindDangerItems() {
    $$('.danger-item').forEach(b => b.addEventListener('click', () => {
      $$('.danger-item').forEach(x => x.classList.toggle('active', x === b));
      triggerCare(b.dataset.t);
    }));
  }
  function paintDanger(cat) {
    const info = envMap[cat]; if (!info) return;
    $('#dangerCard').style.display = 'block';
    $('#dangerTitle').textContent = tr(info.label);
    $('#dangerList').innerHTML = info.items.map(t => '<button class="danger-item" data-t="' + t + '">' + tr(t) + '</button>').join('');
    $('#radarCaption').textContent = tr('由泛化到具体：已展开「') + tr(info.label) + tr('」下的具体情境');
    bindDangerItems();
  }
  $$('.radar-node').forEach(n => n.addEventListener('click', () => {
    $$('.radar-node').forEach(x => x.classList.toggle('active', x === n));
    lastDangerCat = n.dataset.cat;
    paintDanger(lastDangerCat);
  }));
  function paintCare(key) {
    const m = careMsgs[key] || ['环境提示', key, 'warn'];
    const box = $('#appCareDisplay');
    box.classList.remove('warn', 'alert', 'shake');
    if (m[2]) box.classList.add(m[2]);
    $('#cdStatus').textContent = tr(m[0]); $('#cdMsg').textContent = tr(m[1]);
    $('#cdIcon').textContent = m[2] === 'alert' ? '⚠' : m[2] === 'warn' ? '⚡' : '◎';
    void box.offsetWidth; if (m[2] === 'alert') box.classList.add('shake');
  }
  function triggerCare(key) {
    lastCareKey = key;
    paintCare(key);
    const m = careMsgs[key] || ['环境提示', key, 'warn'];
    toast(tr('耳挂自动识别：') + tr(m[0]));
  }

  /* ---------- 耳挂自动感知环境（进入关怀页自动轮播） ---------- */
  const autoEvents = ['无异常声响', '正常交谈', '周围有人争吵', '突发巨响', '火灾警报', '走失风险', '环境安静'];
  let autoSenseTimer = null, autoSenseIdx = 0, autoEnabled = true;
  function startAutoSense() {
    if (autoSenseTimer) return;
    const banner = $('#autoToggle');
    if (banner) { banner.textContent = tr('自动识别中'); banner.style.color = 'var(--green)'; }
    const run = () => {
      if (!autoEnabled) return;
      const key = autoEvents[autoSenseIdx % autoEvents.length];
      autoSenseIdx++;
      triggerCare(key);
      // 根据识别到的类别高亮扩散图外圈
      const cat = key.indexOf('争吵') >= 0 ? 'conflict' : (key.indexOf('火灾') >= 0 || key.indexOf('地震') >= 0 ? 'disaster' : (key.indexOf('危险') >= 0 || key.indexOf('巨响') >= 0 || key.indexOf('走失') >= 0 ? 'danger' : 'calm'));
      const node = document.querySelector('.radar-node[data-cat="' + cat + '"]');
      if (node) { $$('.radar-node').forEach(x => x.classList.remove('active')); node.classList.add('active'); }
    };
    run();
    autoSenseTimer = setInterval(run, 5000);
  }
  function stopAutoSense() { if (autoSenseTimer) { clearInterval(autoSenseTimer); autoSenseTimer = null; } }
  const autoToggle = $('#autoToggle');
  if (autoToggle) autoToggle.addEventListener('click', () => {
    autoEnabled = !autoEnabled;
    autoToggle.textContent = tr(autoEnabled ? '自动识别中' : '已暂停');
    autoToggle.style.color = autoEnabled ? 'var(--green)' : 'var(--txt3)';
    if (autoEnabled) startAutoSense(); else stopAutoSense();
    toast(autoEnabled ? '耳挂自动识别已开启' : '已暂停自动识别');
  });

  /* ---------- 重置 ---------- */
  $('#resetAppBtn').addEventListener('click', () => {
    if (extraTimer) { clearInterval(extraTimer); extraTimer = null; }
    extraState = null; $('#startExtraTest').textContent = tr('开始自由调试');
    $('#extraBar').style.width = '0%';
    prog = { 1: 0, 2: 0, 3: 0 }; renderProgress();
    $('#appAcc').textContent = '61%'; $('#appVer').textContent = 'v1.0';
    const pv2 = $('#profileVer'); if (pv2) pv2.textContent = 'v1.0';
    fbStatusType = ''; fbStatusCustom = ''; $('#fbStatus').textContent = ''; fbIndex = 0; nextFb();
    lastCareKey = '环境安静'; lastDangerCat = null;
    $('#appCareDisplay').className = 'care-display';
    paintCare('环境安静');
    $('#dangerCard').style.display = 'none';
    $$('.radar-node').forEach(x => x.classList.remove('active'));
    toast('演示数据已重置');
  });

  /* ============================================================
     三天后：非强制继续调试
     ============================================================ */
  let extraMin = 10, extraTimer = null, extraState = null;
  function paintExtra() {
    if (!extraState) return;
    const { sec, total, done } = extraState;
    $('#extraTip').textContent = done
      ? tr('本次自由调试已完成，模型已更新。')
      : tr('调试进行中 ') + sec + ' / ' + total + tr(' 秒 · 数据将用于优化你的专属模型');
    $('#startExtraTest').textContent = tr(done ? '重新开始自由调试' : '停止调试');
  }
  $('#continueYes').addEventListener('click', () => {
    $('#continueExtra').style.display = 'block';
    toast('可自由选择测试时长，随时可停止');
  });
  $('#continueNo').addEventListener('click', () => {
    $('#continueReady').style.display = 'none';
    $('#continueLocked').style.display = 'block';
    $('#continueLocked').textContent = tr('已跳过自动调试，模型仍会在日常使用中持续优化。');
    toast('已跳过，模型将在使用过程中持续优化');
  });
  $('#testTimeSeg').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    $$('#testTimeSeg button').forEach(x => x.classList.remove('active')); b.classList.add('active');
    extraMin = Number(b.dataset.min);
  });
  $('#startExtraTest').addEventListener('click', () => {
    if (extraTimer) { clearInterval(extraTimer); extraTimer = null; extraState = null; $('#startExtraTest').textContent = tr('开始自由调试'); toast('已停止自由调试'); return; }
    let sec = 0; const total = extraMin * 60;
    extraState = { sec, total, done: false }; paintExtra();
    extraTimer = setInterval(() => {
      sec += 1;
      extraState = { sec, total, done: false };
      $('#extraBar').style.width = Math.min(100, sec / total * 100) + '%';
      paintExtra();
      if (sec >= total) {
        clearInterval(extraTimer); extraTimer = null;
        extraState = { sec, total, done: true }; paintExtra();
        toast('自由调试完成，模型已更新');
      }
    }, 1000);
    toast(tr('开始 ') + extraMin + tr(' 分钟自由调试'));
  });

  /* ============================================================
     我的：蓝牙 / 文档 / 语言 / 字体 / 快捷指令 / 反馈 / 账号
     ============================================================ */
  // 蓝牙连接（AirPods 风格选择按键）
  let btConnected = true;
  $('#btDeviceBtn').addEventListener('click', () => {
    btConnected = !btConnected;
    const btn = $('#btDeviceBtn');
    btn.classList.toggle('disconnected', !btConnected);
    $('#btSelect').textContent = btConnected ? '✓' : '';
    $('#btStatus').textContent = tr(btConnected ? '已连接 · 电量 82%' : '未连接 · 点击连接');
    toast(btConnected ? 'Visay Loop 已连接' : '已断开耳挂连接');
  });

  // 文档内容
  const docs = {
    privacy: {
      title: '隐私政策', titleEn: 'Privacy Policy',
      body:
        '<h4>一、我们收集的信息</h4><p>Visay 仅采集为您提供服务所必需的数据：耳周脑电（EEG）与面部肌电（EMG）信号、耳挂摄像头取景画面、麦克风声音，以及您在 App 中的确认与反馈。所有数据默认在设备端处理。</p>' +
        '<h4>二、数据使用</h4><p>采集的信号用于：个性化模型校准、情境与语言识别、多人对话字幕生成、环境安全提示。我们不会将您的生物信号用于广告或未经授权的场景。</p>' +
        '<h4>三、数据存储与安全</h4><p>生物特征数据加密存储于本地设备；云端同步需您明确授权，可随时关闭。您拥有数据的访问、更正与删除权。</p>' +
        '<h4>四、第三方共享</h4><p>除法律法规要求外，我们不会向第三方共享您的个人数据。语音合成等功能在设备本地完成。</p>' +
        '<h4>五、联系我们</h4><p>如对本政策有疑问，请通过「我的 - 反馈建议」联系我们。</p>',
      bodyEn:
        '<h4>1. Information We Collect</h4><p>Visay only collects data essential to providing our service: ear EEG and facial EMG signals, earhook camera views, microphone audio, and your confirmations and feedback in the app. All data is processed on-device by default.</p>' +
        '<h4>2. How We Use Data</h4><p>The signals are used for personal model calibration, context and language recognition, group conversation subtitles, and environment safety alerts. We never use your biometric signals for advertising or unauthorized purposes.</p>' +
        '<h4>3. Storage & Security</h4><p>Biometric data is encrypted and stored locally on your device. Cloud sync requires your explicit consent and can be turned off anytime. You have the right to access, correct, and delete your data.</p>' +
        '<h4>4. Third-Party Sharing</h4><p>We do not share your personal data with third parties, except as required by law. Features such as speech synthesis run locally on your device.</p>' +
        '<h4>5. Contact Us</h4><p>For questions about this policy, please contact us via Me - Feedback.</p>'
    },
    terms: {
      title: '用户协议', titleEn: 'Terms of Use',
      body:
        '<h4>一、服务说明</h4><p>Visay 是一套面向听障与言语障碍人士的双向沟通辅助工具，由耳挂式可穿戴设备与配套 App 组成。</p>' +
        '<h4>二、使用规范</h4><p>请按说明正确佩戴设备；在驾驶、操作机械等需要高度注意力的场景中，请勿依赖字幕提示替代安全判断。</p>' +
        '<h4>三、免责声明</h4><p>本产品的环境识别与提示为辅助功能，不能替代专业医疗建议或紧急救援。遇到危险请优先联系相关机构。</p>' +
        '<h4>四、账号与数据</h4><p>您应妥善保管账号信息，因个人原因导致的账号风险由用户自行承担。</p>',
      bodyEn:
        '<h4>1. Service Description</h4><p>Visay is a two-way communication aid for people with hearing and speech impairments, consisting of an earhook wearable device and a companion app.</p>' +
        '<h4>2. Usage Guidelines</h4><p>Wear the device correctly as instructed. Do not rely on subtitle alerts as a substitute for safety judgment when driving or operating machinery.</p>' +
        '<h4>3. Disclaimer</h4><p>Environment recognition and alerts are assistive features and do not replace professional medical advice or emergency services. In danger, please contact the relevant authorities first.</p>' +
        '<h4>4. Account & Data</h4><p>Please keep your account credentials safe. You are responsible for account risks caused by personal reasons.</p>'
    },
    guide: {
      title: '使用指南', titleEn: 'User Guide',
      body:
        '<h4>1. 佩戴与连接</h4><p>将耳挂戴于耳后，柔性传感层贴合面部。进入「我的 - 蓝牙设备」点击 Visay Loop 完成连接。</p>' +
        '<h4>2. 三天适应</h4><p>在「适应」中依次完成 Day1-3 训练，每天达到最适使用时长后模型准确度逐步提升。三天后可选择是否继续自由调试。</p>' +
        '<h4>3. 反馈调试</h4><p>当识别结果有误，点击「不准确，去调试」输入正确内容，模型会针对性学习。</p>' +
        '<h4>4. 对话</h4><p>选择多人或单人模式，点击人脸设为主对象后字幕自动聚焦；对话结束后可导出文本或音频纪要。</p>' +
        '<h4>5. 关怀</h4><p>耳挂自动感知环境，发现争吵、危险或灾害时，App 会以大字和振动提示，并给出文字抚慰。</p>',
      bodyEn:
        '<h4>1. Wear & Connect</h4><p>Wear the earhook behind your ear with the flexible sensor against your face. Go to Me - Bluetooth Device and tap Visay Loop to connect.</p>' +
        '<h4>2. 3-Day Adaptation</h4><p>Complete Day 1-3 training in Adaptation. Accuracy improves as you reach the optimal usage time each day. After three days you may choose whether to continue free tuning.</p>' +
        '<h4>3. Feedback Tuning</h4><p>If recognition is wrong, tap "Incorrect, Tune It" and enter the correct content. The model will learn from it.</p>' +
        '<h4>4. Conversation</h4><p>Choose group or one-on-one mode, tap a face to set the primary speaker and subtitles auto-focus. After the conversation, export text or audio minutes.</p>' +
        '<h4>5. Care</h4><p>The earhook senses the environment automatically. When it detects arguments, danger, or disasters, the app alerts you with large text and vibration, along with comforting words.</p>'
    },
    shortcut: {
      title: '快捷指令设置', titleEn: 'Shortcuts Setup',
      body:
        '<h4>添加快捷指令</h4><p>点击下方按钮添加 inFin 快捷指令，开启一键操作：inFin-Record（录音）、inFin-WebClipper（网页剪藏）、inFin-Notes（笔记）。</p>' +
        '<h4>设置方式一（iPhone 15 Pro 及以上）</h4><p>打开系统设置 →「Action Button」→ 控制中心 → 选择「快捷指令」→ 滑动切换到快捷指令，点击「选择快捷指令」绑定 inFin 指令。</p>' +
        '<h4>设置方式二（所有机型）</h4><p>打开系统设置 →「辅助功能」→「触控」→「轻点背面」→ 设置「双击」或「三击」打开的 inFin 快捷指令（如 inFin-Record / inFin-WebClipper）。</p>' +
        '<h4>使用</h4><p>设置完成后，轻点手机背面或按 Action 键即可快速启动对应功能。</p>',
      bodyEn:
        '<h4>Add Shortcuts</h4><p>Tap below to add inFin shortcuts for one-tap actions: inFin-Record, inFin-WebClipper, inFin-Notes.</p>' +
        '<h4>Option 1 (iPhone 15 Pro and later)</h4><p>Open Settings - Action Button - Control Center - Shortcuts, then bind your inFin shortcut.</p>' +
        '<h4>Option 2 (All models)</h4><p>Open Settings - Accessibility - Touch - Back Tap, and set Double Tap or Triple Tap to your inFin shortcut.</p>' +
        '<h4>Usage</h4><p>Once set up, tap the back of your phone or press the Action button to launch the feature.</p>'
    }
  };
  let currentDocKey = null;
  function openDoc(key) {
    const d = docs[key]; if (!d) return;
    currentDocKey = key;
    const en = currentLang === 'en';
    $('#docTitle').textContent = en ? d.titleEn : d.title;
    $('#docContent').innerHTML = en ? d.bodyEn : d.body;
    $('#docModal').classList.add('show');
  }
  $$('[data-doc]').forEach(b => b.addEventListener('click', () => openDoc(b.dataset.doc)));
  $('#docClose').addEventListener('click', () => $('#docModal').classList.remove('show'));

  /* ---------- 全局语言：中文 / 英文（整界面切换） ---------- */
  const i18n = {
    '个人适应': 'Adaptation', '对话': 'Conversation', '关怀': 'Care', '我的': 'Me',
    '3 天校准 · 越用越懂你': '3-Day Calibration · Adapts to You',
    '看清每一句 · 不错过每一次交流': 'Catch Every Word · Never Miss a Conversation',
    '感知环境 · 及时提醒与抚慰': 'Sense the Environment · Timely Alerts & Comfort',
    '设备与偏好设置': 'Device & Preferences',
    'Day 1': 'Day 1', 'Day 2': 'Day 2', 'Day 3': 'Day 3',
    '自动调试': 'Auto Tuning', '完成 3 天适应后开启': 'Unlocks after 3-day adaptation',
    '完成 3 天适应，即可自由选择继续调试数据。此步骤完全自愿。': 'After 3-day adaptation, you may freely continue tuning data. This step is completely optional.',
    '3 天适应已完成。是否继续自由调试、录入更多数据？可随时跳过，不影响正常使用。': '3-day adaptation complete. Continue free tuning and record more data? Skip anytime — normal use is unaffected.',
    '继续调试': 'Continue Tuning', '暂不需要': 'Not Now', '自由测试时长': 'Free Test Duration',
    '5 分钟': '5 min', '10 分钟': '10 min', '20 分钟': '20 min', '开始自由调试': 'Start Free Tuning',
    '可随时停止，数据将用于优化你的专属模型。': 'Stop anytime. Data helps optimize your personal model.',
    '重新开始自由调试': 'Restart Free Tuning', '停止调试': 'Stop Tuning',
    '今日使用进度': "Today's Usage Progress", '最适使用时间': 'Optimal Usage Time',
    '已用 0 分钟': 'Used 0 min', '分钟': 'min',
    '神经信号采集': 'Neural Signal Capture', '开始今日训练': 'Start Today\'s Training',
    '训练进行中…': 'Training in progress…', '今日训练已完成': "Today's Training Complete",
    '实时反馈模式': 'Real-time Feedback', '确认识别是否准确': 'Confirm recognition accuracy',
    '耳挂识别到你的表达，请确认识别结果是否正确。': 'The earhook recognized your expression. Please confirm if it is correct.',
    '准确': 'Correct', '不准确，去调试': 'Incorrect, Tune It',
    '识别准确度': 'Recognition Accuracy', '模型版本': 'Model Version',
    '多人对话': 'Group Conversation', '单人对话': 'One-on-One',
    '现场人脸': 'People Detected', '点击头像设为主对象 · 自动聚焦字幕': 'Tap a face as primary speaker · subtitles auto-focus',
    '单人模式 · 仅显示一位说话人': 'Solo mode · only one speaker shown',
    '实时字幕': 'Live Subtitles', '点击人脸选择主对象后开始': 'Tap a face to set primary speaker, then start',
    '播放对话': 'Play Conversation', '对话播放中…': 'Playing…', '重新播放': 'Replay',
    'AI 会议纪要': 'AI Meeting Minutes', '对话结束后自动生成纪要。': 'Minutes are generated after the conversation.',
    '对话进行中，结束后生成纪要…': 'Conversation in progress…', '导出纪要': 'Export Minutes',
    '耳挂正在自动感知环境 · 发现异常将自动提示': 'Earhook auto-sensing environment · alerts on anomalies',
    '自动识别中': 'Auto-sensing', '已暂停': 'Paused',
    '环境感知范围': 'Environment Sensing Range', '耳挂自动识别 · 由泛化到具体': 'Auto-sensed · from general to specific',
    '我': 'Me', '平静': 'Calm', '冲突': 'Conflict', '危险': 'Danger', '灾害': 'Disaster',
    '点击外圈类别，查看由泛化到具体的环境事件': 'Tap an outer category to view specific events',
    '针对残障人士的具体情境': 'Specific scenarios for people with disabilities',
    '一切平静': 'All Calm', '周围环境暂无异常，请放心。': 'No anomalies detected. You are safe.',
    '我的 Visay': 'My Visay', 'Visay Loop · 已连接': 'Visay Loop · Connected',
    '蓝牙设备': 'Bluetooth Device', '点击耳挂图标连接': 'Tap the earhook icon to connect',
    '已连接 · 电量 82%': 'Connected · 82% battery', '未连接 · 点击连接': 'Not connected · tap to connect',
    '关于我们': 'About Us', '隐私政策': 'Privacy Policy', '用户协议': 'Terms of Use', '使用指南': 'User Guide',
    '通用设置': 'General Settings', '系统语言': 'System Language', '字体大小': 'Font Size',
    'APP 主色调': 'App Theme', '中文': '中文', 'English': 'English',
    '小': 'Small', '标准': 'Standard', '大': 'Large', '白': 'Light', '黑': 'Dark',
    '反馈建议': 'Feedback', '账号设置': 'Account Settings', '登录帐号': 'Sign In', '更改密码': 'Change Password',
    '注销账号': 'Delete Account', '退出登录': 'Sign Out', '重置演示数据': 'Reset Demo Data',
    '请输入手机号与密码': 'Enter phone number and password', '请输入新密码并确认': 'Enter and confirm new password',
    '注销后数据将无法恢复，请输入帐号确认': 'This cannot be undone. Enter your account to confirm.',
    '手机号': 'Phone Number', '密码': 'Password', '新密码': 'New Password', '确认密码': 'Confirm Password',
    '帐号': 'Account', '确认注销': 'Confirm Delete', '取消': 'Cancel', '确认': 'Confirm',
    '我知道了': 'Got It', '关闭': 'Close', '导出': 'Export', '文本模式': 'Text Mode', '音频模式': 'Audio Mode',
    '调试识别结果': 'Tune Recognition', '耳挂识别有误，请输入正确的表达内容，帮助模型学习。': 'Recognition was incorrect. Enter the correct expression to help the model learn.',
    '请输入正确的语言内容…': 'Enter the correct expression…', '保存并调试': 'Save & Tune',
    '请输入': 'Enter here', '请再次输入': 'Enter again',
    '请先填写反馈内容': 'Please enter your feedback', '感谢你的反馈，我们已收到': 'Thanks for your feedback',
    '告诉我们你的使用体验或建议…': 'Tell us about your experience or suggestions…', '提交反馈': 'Submit Feedback',
    '识别结果：「我想喝水」': 'Recognized: "I want water"',
    // 人名
    '林薇': 'Lin Wei', '陈浩': 'Chen Hao', '赵敏': 'Zhao Min', '王磊': 'Wang Lei',
    '苏晴': 'Su Qing', '周杰': 'Zhou Jie', '李娜': 'Li Na', '张伟': 'Zhang Wei',
    // 头像首字
    '林': 'L', '陈': 'C', '赵': 'Z', '王': 'W', '苏': 'S', '周': 'Z', '李': 'L', '张': 'Z',
    // 对话文本
    '这版方案今晚必须交，不能再拖了。': 'This version must be delivered tonight, no more delays.',
    '数据还没核对完，现在交风险太大。': 'Data is not verified yet; delivering now is too risky.',
    '我们先确认还差哪些数据，再决定时间。': 'Let us first confirm what data is missing, then decide the timing.',
    '我这边接口还有两个字段没对齐。': 'I still have two API fields not aligned.',
    '客户那边明早就要看，时间确实很紧。': 'The client wants to see it tomorrow morning; time is tight.',
    '那就快点，别浪费时间了。': 'Then hurry up, do not waste time.',
    '测试环境还有三个用例没跑完呢。': 'There are still three test cases not finished.',
    '这样，先把还差的数据列出来。': 'Okay, let us list the missing data first.',
    '我已经把清单发到群里了，大家看一下。': 'I have sent the list to the group, please check.',
    '收到，我这边十分钟内能补齐接口字段。': 'Got it, I can fill the API fields within ten minutes.',
    '那我们半小时后再碰一次，确认最终结果。': 'Let us sync again in half an hour to confirm the final result.',
    '好，就按这个来，半小时后见。': 'Okay, let us do that, see you in half an hour.',
    '你好，请问现在几点了？': 'Hello, what time is it now?',
    '我想预约明天上午的检查。': 'I would like to schedule an exam for tomorrow morning.',
    '请问这个检查需要空腹吗？': 'Does this exam require fasting?',
    '我有点听不清，麻烦用文字告诉我。': 'I cannot hear clearly, please tell me in text.',
    '麻烦把结果用文字发给我，谢谢。': 'Please send me the result in text, thank you.',
    '请问报告什么时候可以取？': 'When can I get the report?',
    '好的，我明白了，谢谢你。': 'Okay, I understand, thank you.',
    '再见，祝你工作顺利。': 'Goodbye, wish you well.',
    // 纪要
    '关键结论': 'Key Conclusions', '待办': 'Action Items', '沟通要点': 'Key Points',
    '先列出还差的数据，再决定是否今晚交付': 'List the missing data first, then decide whether to deliver tonight',
    '林薇整理版本 · 陈浩核对数据 · 赵敏汇总缺口': 'Lin Wei: finalize version · Chen Hao: verify data · Zhao Min: summarize gaps',
    '对方希望预约检查，并要求把结果以文字形式发送': 'The caller wants to schedule an exam and requests the result in text',
    // 反馈样本
    '识别结果：「我想喝水」': 'Recognized: "I want water"', '我想喝水': 'I want water',
    '请帮我拿一下药': 'Please get my medicine', '我有点不舒服': 'I feel unwell',
    '我想出去走走': 'I want to go for a walk', '能帮我接通电话吗': 'Can you help me answer the phone',
    // 关怀事件
    '无异常声响': 'No abnormal sound', '正常交谈': 'Normal conversation',
    '周围有人争吵': 'People arguing nearby', '突发巨响': 'Sudden loud noise',
    '走失风险': 'Risk of getting lost', '环境安静': 'Environment quiet',
    '一切平静': 'All Calm', '周围环境暂无异常，请放心。': 'No anomalies detected. You are safe.',
    '附近有人在正常聊天，没有危险。': 'People nearby are chatting normally, no danger.',
    '未检测到异常声音。': 'No abnormal sound detected.',
    '别紧张，他们不是在针对你。可以先看文字，不必急着回应。': 'Do not worry, they are not targeting you. Read the text first; no need to respond.',
    '声音很吵，可以先看文字，按你的节奏回应。': 'It is noisy; you can read the text and respond at your own pace.',
    '对话情绪较激动，但没有人在等你回应。': 'The conversation is intense, but no one is waiting for your reply.',
    '检测到突然的巨大声响，请环顾四周确认安全。': 'A sudden loud noise was detected; look around to confirm safety.',
    '有人正快速靠近你，请留意并寻求同伴帮助。': 'Someone is approaching quickly; stay alert and seek help.',
    '检测到车辆接近，请停在安全位置，注意避让。': 'An approaching vehicle is detected; stay in a safe place and watch out.',
    '你已偏离熟悉路线，建议打开定位并联系家人。': 'You have left a familiar route; enable location and contact family.',
    '你似乎跌倒了，已向紧急联系人发送提示。': 'You seem to have fallen; an alert was sent to your emergency contact.',
    '附近有人呼救，已提示周围人员协助。': 'Someone nearby is calling for help; people around have been alerted.',
    '请跟随人群沿安全通道有序撤离，弯腰捂住口鼻。': 'Follow the crowd along the safe exit; bend down and cover your mouth and nose.',
    '请就近躲在坚固物体旁，护住头部，远离窗户。': 'Take cover near a sturdy object, protect your head, stay away from windows.',
    '请立即远离现场，到通风处并联系相关人员。': 'Leave the area immediately, move to a ventilated place and contact staff.',
    '请尽快撤离到空旷安全地带。': 'Evacuate to an open safe area as soon as possible.',
    // 提示
    '耳挂自动识别：': 'Earhook auto-sensed: ', '已触发：': 'Triggered: ',
    '请将耳机连接': 'Please connect the earhook',
    '已将 ': 'Set ', ' 设为主对象，字幕自动聚焦': ' as primary speaker; subtitles auto-focus',
    '已切换为多人对话': 'Switched to group conversation', '已切换为单人对话': 'Switched to one-on-one conversation',
    '对话结束，AI 纪要已生成': 'Conversation ended, AI minutes generated',
    '语言切换': 'Language switched', '字体大小已调整': 'Font size updated',
    '调试进行中 ': 'Tuning in progress ', ' 秒 · 数据将用于优化你的专属模型': ' sec · data helps optimize your model',
    '本次自由调试已完成，模型已更新。': 'Free tuning complete, model updated.',
    '自由调试完成，模型已更新': 'Free tuning complete, model updated',
    '开始 ': 'Start ', ' 分钟自由调试': ' min free tuning',
    '已跳过自动调试，模型仍会在日常使用中持续优化。': 'Skipped auto tuning; the model still improves through daily use.',
    '已跳过，模型将在使用过程中持续优化': 'Skipped; the model keeps improving with use',
    '3 天适应已完成，可选择是否继续调试': '3-day adaptation complete, you may continue tuning',
    '可自由选择测试时长，随时可停止': 'Choose test duration freely, stop anytime',
    '已停止自由调试': 'Free tuning stopped', '已暂停自动识别': 'Auto-sensing paused',
    '耳挂自动识别已开启': 'Earhook auto-sensing enabled', '自动识别已开启': 'Auto-sensing enabled',
    '请填写完整信息': 'Please complete all fields', '两次输入不一致': 'The two entries do not match',
    '登录成功': 'Signed in successfully', '密码已更新': 'Password updated', '注销申请已提交': 'Deletion request submitted',
    '已退出登录（演示）': 'Signed out (demo)', '已断开耳挂连接': 'Earhook disconnected',
    'Visay Loop 已连接': 'Visay Loop connected',
    '文本纪要已导出（演示）': 'Text minutes exported (demo)', '音频纪要已生成（演示）': 'Audio minutes generated (demo)',
    '当前环境不支持语音合成': 'Speech synthesis not supported in this environment',
    '正在语音朗读纪要': 'Reading minutes aloud', '请先播放对话': 'Please play the conversation first',
    '请先填写反馈内容': 'Please enter your feedback', '感谢你的反馈，我们已收到': 'Thanks for your feedback',
    '请输入正确的表达内容': 'Please enter the correct expression',
    '已记录正确表达': 'Recorded correct expression: ', '，模型正在针对性调试。': ', model is tuning specifically.',
    '已提交纠正，模型学习中': 'Correction submitted, model is learning',
    '✓ 已确认识别准确，模型已记录本次样本。': '✓ Recognition confirmed accurate; sample recorded.',
    '已确认识别准确': 'Recognition confirmed accurate',
    // 主题 / 重置
    '已切换为白色主题': 'Switched to Light theme', '已切换为黑色主题': 'Switched to Dark theme',
    '演示数据已重置': 'Demo data reset',
    '正在采集神经信号，进度加速推进': 'Capturing neural signals, progress accelerating',
    // 进度 / 训练片段
    '已用': 'Used', '已达到最适使用时长': 'has reached optimal usage time',
    '训练完成，达到最适使用时长': 'training complete, optimal usage time reached',
    '3 天适应已完成 · 可自由选择': '3-day adaptation complete · optional',
    // 导出纪要片段
    '点击播放，用语音读出纪要': 'Tap to play and read the minutes aloud',
    // 关怀事件标题
    '环境提示': 'Environment Alert',
    '周围有人交谈': 'People chatting nearby', '声源嘈杂': 'Noisy source',
    '情绪激动': 'Tense emotions', '突发巨响！': 'Sudden loud noise!',
    '陌生人靠近': 'Stranger approaching', '车辆驶来！': 'Vehicle approaching!',
    '注意方向': 'Watch your direction', '检测到跌倒': 'Fall detected',
    '检测到呼救声': 'Cry for help detected', '火灾警报': 'Fire alarm',
    '地震警报': 'Earthquake alert', '燃气泄漏警报': 'Gas leak alert',
    '建筑摇晃': 'Building shaking',
    // 关怀具体情境
    '大声争执': 'Loud argument', '情绪激动的对话': 'Heated conversation',
    '陌生人突然靠近': 'Stranger approaching quickly', '车辆驶来': 'Vehicle approaching',
    '跌倒无人协助': 'Fall with no assistance', '被困呼救': 'Trapped, calling for help',
    '地震预警': 'Earthquake warning', '燃气泄漏': 'Gas leak',
    '建筑物摇晃': 'Building shaking',
    // 扩散标题片段
    '由泛化到具体：已展开「': 'From general to specific: expanded ',
    '」下的具体情境': ' scenarios',
    // 页面标题 / 标签 / 按钮
    'Visay · 我的': 'Visay · Me', '适应': 'Adapt', '文档': 'Document',
    '✓ 准确': '✓ Correct', '✗ 不准确，去调试': '✗ Incorrect, Tune It',
    '个性化模型': 'Personal Model',
    '像连接 AirPods 一样：打开耳挂充电盒 → 靠近手机 → 点击上方设备完成连接。':
      'Just like AirPods: open the earhook case → bring it near your phone → tap the device above to connect.'
  };
  // 翻译函数：当前语言下返回对应文本
  function tr(zh) { return currentLang === 'en' ? (i18n[zh] || zh) : zh; }
  let currentLang = 'zh';
  function restoreZh(raw) {
    for (const k in i18n) { if (i18n[k] === raw) return k; }
    return null;
  }
  function applyLang(lang) {
    currentLang = lang;
    document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN';
    if (!window.__docTitle) window.__docTitle = document.title;
    document.title = lang === 'en' ? (i18n[window.__docTitle] || window.__docTitle) : window.__docTitle;
    // 遍历文本节点：首次翻译时记住原文，切回中文时精确还原
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(n => {
      const p = n.parentElement;
      if (p && /SCRIPT|STYLE/i.test(p.tagName)) return;
      const raw = n.textContent, key = raw.trim();
      if (!key) return;
      if (n.__zh === undefined) n.__zh = key;
      const zh = n.__zh;
      if (lang === 'en') {
        const en = i18n[zh] || i18n[restoreZh(key)];
        if (en) n.textContent = raw.replace(zh, en);
      } else {
        const target = /[\u4e00-\u9fa5]/.test(zh) ? zh : (restoreZh(key) || zh);
        if (key !== target) n.textContent = raw.replace(key, target);
      }
    });
    // placeholder 属性
    $$('[placeholder]').forEach(el => {
      const raw = el.getAttribute('placeholder'); if (!raw) return;
      if (el.__zhPh === undefined) el.__zhPh = raw;
      const zh = el.__zhPh;
      if (lang === 'en') {
        const en = i18n[zh]; if (en) el.setAttribute('placeholder', en);
      } else {
        el.setAttribute('placeholder', restoreZh(raw) || zh);
      }
    });
    // 重渲染动态区域，确保切换后立即生效
    renderFaces();
    updateDynamicText();
  }
  function updateDynamicText() {
    // 适应页
    renderProgress();
    const trainBtn = $('#appTrainBtn');
    trainBtn.textContent = appTraining ? tr('训练进行中…') : (prog[appDay] >= 100 ? tr('今日训练已完成') : tr('开始今日训练'));
    paintFbResult(); paintFbStatus(); paintExtra();
    // 对话页
    paintSubtitle();
    if (minutesMode) $('#appMinutes').innerHTML = renderMinutesHTML(minutesMode);
    // 关怀页
    if ($('#autoToggle')) $('#autoToggle').textContent = tr(autoEnabled ? '自动识别中' : '已暂停');
    if (lastDangerCat) paintDanger(lastDangerCat);
    if (lastCareKey) paintCare(lastCareKey);
    // 弹窗
    if ($('#exportModal').classList.contains('show')) renderExport();
    if (currentDocKey) openDoc(currentDocKey);
    if ($('#accountModal').classList.contains('show')) paintAcct();
  }
  $('#langSeg').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    $$('#langSeg button').forEach(x => x.classList.remove('active')); b.classList.add('active');
    const lang = b.dataset.lang;
    applyLang(lang);
    toast(lang === 'en' ? 'Language switched to English' : '已切换为中文');
  });

  // 字体大小：整体 APP 缩放（同时缩放间距，保持版式）
  $('#fontSeg').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    $$('#fontSeg button').forEach(x => x.classList.remove('active')); b.classList.add('active');
    document.body.setAttribute('data-font', b.dataset.font);
    toast(currentLang === 'en' ? 'Font size updated' : '字体大小已调整');
  });

  // 反馈建议
  $('#feedbackSubmit').addEventListener('click', () => {
    const v = $('#feedbackInput').value.trim();
    if (!v) { toast('请先填写反馈内容'); return; }
    $('#feedbackInput').value = ''; toast('感谢你的反馈，我们已收到');
  });

  // 账号设置弹窗
  let acctMode = '';
  const acctCfg = {
    login: { title: '登录帐号', desc: '请输入手机号与密码', p1: '手机号', p2: '密码' },
    pwd: { title: '更改密码', desc: '请输入新密码并确认', p1: '新密码', p2: '确认密码' },
    del: { title: '注销账号', desc: '注销后数据将无法恢复，请输入帐号确认', p1: '帐号', p2: '确认注销' }
  };
  function paintAcct() {
    const c = acctCfg[acctMode]; if (!c) return;
    $('#accountTitle').textContent = tr(c.title); $('#accountDesc').textContent = tr(c.desc);
    $('#acctInput1').placeholder = tr(c.p1); $('#acctInput2').placeholder = tr(c.p2);
  }
  function openAcct(mode) {
    acctMode = mode;
    $('#acctInput1').value = ''; $('#acctInput2').value = '';
    paintAcct();
    $('#accountModal').classList.add('show');
  }
  $('#accountLogin').addEventListener('click', () => openAcct('login'));
  $('#accountPwd').addEventListener('click', () => openAcct('pwd'));
  $('#accountDelete').addEventListener('click', () => openAcct('del'));
  $('#acctCancel').addEventListener('click', () => $('#accountModal').classList.remove('show'));
  $('#acctConfirm').addEventListener('click', () => {
    const v1 = $('#acctInput1').value.trim(), v2 = $('#acctInput2').value.trim();
    if (!v1 || !v2) { toast('请填写完整信息'); return; }
    if (v1 !== v2 && acctMode !== 'login') { toast('两次输入不一致'); return; }
    $('#accountModal').classList.remove('show');
    toast(({ login: '登录成功', pwd: '密码已更新', del: '注销申请已提交' })[acctMode]);
  });
  $('#logoutBtn').addEventListener('click', () => toast('已退出登录（演示）'));

  /* ---------- 初始化 ---------- */
  renderProgress(); renderFaces(); nextFb();
})();
