(function(global){

  const FOV_H_BASE = 60;
  const FOV_V_BASE = 46;
  const FOV_ZOOM_MIN = 0.45;
  const FOV_ZOOM_MAX = 1.7;

  function curFovH(){ return FOV_H_BASE * fovZoom; }
  function curFovV(){ return FOV_V_BASE * fovZoom; }

  let videoEl, overlayEl, markerEl, crosshairEl, readoutEl, noteEl, closeBtn, edgeArrowEl;
  let otherMarkersLayer, voiceBtn;
  let skyMarkersLayer, skyBtn, skyCreditEl, skyStatusEl;
  let starMapSvg, starsBtn, compassTapeEl;
  let tapHintEl;
  let calibrationHintEl, calibrationHintTextEl, calibrationHintCloseBtn;
  let calibBtn, calibPanelEl, calibAzValueEl, calibElValueEl, calibResetBtn, calibCloseBtn;
  let spaceStarsEl, openingEl, openingSubtitleEl;
  const AR_OPENING_MIN_MS = 1100;
  let mediaStream = null;
  let rafId = null;
  let orientationHandlerAbsolute = null;
  let orientationHandlerRelative = null;
  let hasAbsoluteHeading = false;

  let deviceHeading = null;
  let devicePitch = null;

  let lastRawHeading = null;
  let headingJumpTimestamps = [];
  const HEADING_JUMP_THRESHOLD_DEG = 25;
  const HEADING_JUMP_WINDOW_MS = 4000;
  const HEADING_JUMP_COUNT_TRIGGER = 4;
  let calibrationHintVisible = false;
  let calibrationHintCooldownUntil = 0;
  const CALIBRATION_HINT_COOLDOWN_MS = 25000;
  let fovZoom = 1;

  const CALIB_STEP_DEG = 1;
  const CALIB_MAX_DEG = 30;
  let calibAzOffset = 0;
  let calibElOffset = 0;

  function loadCalibPref(){
    try{
      const az = parseFloat(localStorage.getItem('istrack_ar_calib_az'));
      const el = parseFloat(localStorage.getItem('istrack_ar_calib_el'));
      calibAzOffset = Number.isFinite(az) ? az : 0;
      calibElOffset = Number.isFinite(el) ? el : 0;
    }catch(e){
      calibAzOffset = 0;
      calibElOffset = 0;
    }
    updateCalibUI();
  }

  function saveCalibPref(){
    try{
      localStorage.setItem('istrack_ar_calib_az', String(calibAzOffset));
      localStorage.setItem('istrack_ar_calib_el', String(calibElOffset));
    }catch(e){  }
  }

  function fmtOffset(v){
    return (v > 0 ? '+' : '') + v + '°';
  }

  function updateCalibUI(){
    if(calibAzValueEl) calibAzValueEl.textContent = fmtOffset(calibAzOffset);
    if(calibElValueEl) calibElValueEl.textContent = fmtOffset(calibElOffset);
    if(calibBtn) calibBtn.classList.toggle('ar-calib-btn-active', calibAzOffset !== 0 || calibElOffset !== 0);
  }

  function stepCalib(axis, dir){
    if(axis === 'az'){
      calibAzOffset = Math.max(-CALIB_MAX_DEG, Math.min(CALIB_MAX_DEG, calibAzOffset + dir*CALIB_STEP_DEG));
    } else {
      calibElOffset = Math.max(-CALIB_MAX_DEG, Math.min(CALIB_MAX_DEG, calibElOffset + dir*CALIB_STEP_DEG));
    }
    saveCalibPref();
    updateCalibUI();
  }

  function resetCalib(){
    calibAzOffset = 0;
    calibElOffset = 0;
    saveCalibPref();
    updateCalibUI();
  }

  function updateCalibText(){
    const t = (k, fallback) => window.I18N ? I18N.t(k) : fallback;
    if(calibBtn){
      const label = t('ar.calibBtnLabel', 'Kalibrasi arah manual');
      calibBtn.setAttribute('aria-label', label);
      calibBtn.title = label;
    }
    const titleEl = overlayEl.querySelector('#arCalibTitle');
    if(titleEl) titleEl.textContent = t('ar.calibTitle', 'Kalibrasi arah manual');
    const descEl = overlayEl.querySelector('#arCalibDesc');
    if(descEl) descEl.textContent = t('ar.calibDesc', 'Kalau panah/marker konsisten meleset ke satu arah (banyak terjadi karena FOV kamera tiap HP beda-beda), geser sampai pas. Tersimpan otomatis di HP ini.');
    const azLabelEl = overlayEl.querySelector('#arCalibAzLabel');
    if(azLabelEl) azLabelEl.textContent = t('ar.calibAzLabel', 'Azimuth (kiri/kanan)');
    const elLabelEl = overlayEl.querySelector('#arCalibElLabel');
    if(elLabelEl) elLabelEl.textContent = t('ar.calibElLabel', 'Elevasi (atas/bawah)');
    if(calibResetBtn) calibResetBtn.textContent = t('ar.calibReset', 'Reset ke 0°');
    if(calibCloseBtn) calibCloseBtn.setAttribute('aria-label', t('ar.calibClose', 'Tutup'));
  }

  function toggleCalibPanel(){
    if(!calibPanelEl) return;
    calibPanelEl.classList.toggle('hidden');
  }

  function closeCalibPanel(){
    if(calibPanelEl) calibPanelEl.classList.add('hidden');
  }

  function effHeading(){
    if(deviceHeading === null) return null;
    return ((deviceHeading + calibAzOffset) % 360 + 360) % 360;
  }

  function effPitch(){
    return (devicePitch || 0) + calibElOffset;
  }
  let pinchStartDist = null;
  let pinchStartZoom = 1;
  let touchStartHandler = null, touchMoveHandler = null, touchEndHandler = null;
  let getSatrec = null;
  let getObserver = null;
  let getOtherSats = null;
  let getNightSkyBodies = null;
  let onClose = null;

  let otherMarkerEls = {};
  let skyMarkerEls = {};
  let issInFrame = false;
  let voiceEnabled = true;
  let skyEnabled = true;
  let starsEnabled = true;
  let issTrailPoints = [];
  let lastTrailUpdate = 0;
  let audioCtx = null;

  const SKY_BODY_META = {
    moon:    { label:'Bulan',     labelEn:'Moon',    colorCss:'#e8e8e8', img:'https://commons.wikimedia.org/wiki/Special:FilePath/FullMoon2010.jpg?width=120' },
    mercury: { label:'Merkurius', labelEn:'Mercury', colorCss:'#b7b0a6', img:'https://commons.wikimedia.org/wiki/Special:FilePath/Mercury_in_true_color.jpg?width=120' },
    venus:   { label:'Venus',     labelEn:'Venus',   colorCss:'#f5deb3', img:'https://commons.wikimedia.org/wiki/Special:FilePath/Venus-real_color.jpg?width=120' },
    mars:    { label:'Mars',      labelEn:'Mars',    colorCss:'#e2725b', img:'https://commons.wikimedia.org/wiki/Special:FilePath/OSIRIS_Mars_true_color.jpg?width=120' },
    jupiter: { label:'Jupiter',   labelEn:'Jupiter', colorCss:'#d9a066', img:'https://commons.wikimedia.org/wiki/Special:FilePath/PIA04866_modest.jpg?width=120' },
    saturn:  { label:'Saturnus',  labelEn:'Saturn',  colorCss:'#e8d19a', img:'https://commons.wikimedia.org/wiki/Special:FilePath/Saturn_during_Equinox.jpg?width=120' }
  };

  let skyBodyDataCache = {};
  let infoCardEl = null;
  let openInfoKey = null;

  function normalizeAngle180(deg){
    let d = deg % 360;
    if(d > 180) d -= 360;
    if(d < -180) d += 360;
    return d;
  }

  const HEADING_SMOOTHING = 0.28;

  function smoothHeadingTowards(prev, target){
    if(prev === null) return target;
    const delta = normalizeAngle180(target - prev);
    return ((prev + HEADING_SMOOTHING*delta) % 360 + 360) % 360;
  }

  function smoothPitchTowards(prev, target){
    if(prev === null) return target;
    return prev + HEADING_SMOOTHING*(target - prev);
  }

  function buildSpaceStars(){
    if(!spaceStarsEl) return;
    const layers = [
      { count: 70, size: 1.4, opLo: 0.15, opHi: 0.7,  minDur: 2.6, maxDur: 4.4 },
      { count: 34, size: 2.2, opLo: 0.25, opHi: 0.9,  minDur: 1.8, maxDur: 3.2 },
      { count: 12, size: 3,   opLo: 0.35, opHi: 1,    minDur: 2.2, maxDur: 3.8 }
    ];
    const frag = document.createDocumentFragment();
    layers.forEach(layer=>{
      for(let i=0;i<layer.count;i++){
        const dot = document.createElement('span');
        dot.className = 'ar-space-stars-layer';
        const x = Math.random()*100, y = Math.random()*100;
        const dur = layer.minDur + Math.random()*(layer.maxDur - layer.minDur);
        const delay = -Math.random()*dur;
        dot.style.left = x.toFixed(2) + '%';
        dot.style.top = y.toFixed(2) + '%';
        dot.style.width = layer.size + 'px';
        dot.style.height = layer.size + 'px';
        dot.style.setProperty('--ar-star-op-lo', layer.opLo);
        dot.style.setProperty('--ar-star-op-hi', layer.opHi);
        dot.style.animation = `ar-star-twinkle ${dur.toFixed(2)}s ease-in-out ${delay.toFixed(2)}s infinite`;
        frag.appendChild(dot);
      }
    });
    spaceStarsEl.appendChild(frag);
  }

  function buildDom(){
    if(overlayEl) return;
    overlayEl = document.createElement('div');
    overlayEl.className = 'ar-overlay hidden';
    overlayEl.id = 'arOverlay';
    overlayEl.innerHTML = `
      <video id="arVideo" autoplay playsinline muted></video>
      <div class="ar-space-scrim"></div>
      <div class="ar-space-stars" id="arSpaceStars"></div>
      <svg class="ar-starmap-svg" id="arStarMap"></svg>
      <div class="ar-crosshair"></div>
      <div class="ar-marker hidden" id="arMarker">
        <div class="ar-marker-dot"><i class="fa-solid fa-satellite"></i></div>
        <div class="ar-marker-label">ISS</div>
      </div>
      <div class="ar-edge-arrow hidden" id="arEdgeArrow"><i class="fa-solid fa-arrow-right"></i></div>
      <div class="ar-other-markers" id="arOtherMarkers"></div>
      <div class="ar-sky-markers" id="arSkyMarkers"></div>
      <div class="ar-compass-tape" id="arCompassTape"></div>
      <div class="ar-readout" id="arReadout">Az --° · El --°</div>
      <p class="ar-note" id="arNote"></p>
      <div class="ar-calibration-hint hidden" id="arCalibrationHint">
        <svg class="ar-calibration-figure8" viewBox="0 0 60 34" aria-hidden="true">
          <path d="M15,17 C15,8 25,8 30,17 C35,26 45,26 45,17 C45,8 35,8 30,17 C25,26 15,26 15,17 Z"/>
          <circle class="ar-calibration-dot" r="3"/>
        </svg>
        <span id="arCalibrationHintText"></span>
        <button class="ar-calibration-hint-close" id="arCalibrationHintClose" aria-label="Tutup"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <p class="ar-sky-status hidden" id="arSkyStatus"></p>
      <p class="ar-tap-hint hidden" id="arTapHint"></p>
      <p class="ar-sky-credit hidden" id="arSkyCredit"></p>
      <div class="ar-info-card hidden" id="arInfoCard"></div>
      <button class="ar-voice-btn ar-icon-btn" id="arVoiceBtn" aria-label="Alert suara"><i class="fa-solid fa-volume-high"></i></button>
      <button class="ar-sky-btn ar-icon-btn" id="arSkyBtn" aria-label="Bulan & planet"><i class="fa-solid fa-moon"></i></button>
      <button class="ar-stars-btn ar-icon-btn" id="arStarsBtn" aria-label="Peta bintang"><i class="fa-solid fa-star"></i></button>
      <button class="ar-calib-btn ar-icon-btn" id="arCalibBtn" aria-label="Kalibrasi arah manual"><i class="fa-solid fa-compass"></i></button>
      <div class="ar-calib-panel hidden" id="arCalibPanel">
        <div class="ar-calib-head">
          <span id="arCalibTitle">Kalibrasi arah manual</span>
          <button class="ar-calib-close" id="arCalibClose" aria-label="Tutup"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <p class="ar-calib-desc" id="arCalibDesc">Kalau panah/marker konsisten meleset ke satu arah (banyak terjadi karena FOV kamera tiap HP beda-beda), geser sampai pas. Tersimpan otomatis di HP ini.</p>
        <div class="ar-calib-row">
          <span id="arCalibAzLabel">Azimuth (kiri/kanan)</span>
          <div class="ar-calib-stepper">
            <button class="ar-calib-step" id="arCalibAzMinus" aria-label="Kurangi">−</button>
            <span class="ar-calib-value" id="arCalibAzValue">+0°</span>
            <button class="ar-calib-step" id="arCalibAzPlus" aria-label="Tambah">+</button>
          </div>
        </div>
        <div class="ar-calib-row">
          <span id="arCalibElLabel">Elevasi (atas/bawah)</span>
          <div class="ar-calib-stepper">
            <button class="ar-calib-step" id="arCalibElMinus" aria-label="Kurangi">−</button>
            <span class="ar-calib-value" id="arCalibElValue">+0°</span>
            <button class="ar-calib-step" id="arCalibElPlus" aria-label="Tambah">+</button>
          </div>
        </div>
        <button class="ar-calib-reset" id="arCalibReset">Reset ke 0°</button>
      </div>
      <button class="ar-close-btn ar-icon-btn" id="arCloseBtn" aria-label="Tutup"><i class="fa-solid fa-xmark"></i></button>
      <div class="ar-opening" id="arOpening">
        <img class="ar-opening-logo" src="assets/istrack-logo.png" alt="ISTrack">
        <div class="ar-opening-orbit"><span class="ar-opening-orbit-dot"></span></div>
        <p class="ar-opening-title">ISTrack</p>
        <p class="ar-opening-subtitle" id="arOpeningSubtitle">Menyiapkan mode AR…</p>
      </div>
    `;
    document.body.appendChild(overlayEl);

    videoEl = overlayEl.querySelector('#arVideo');
    markerEl = overlayEl.querySelector('#arMarker');
    crosshairEl = overlayEl.querySelector('.ar-crosshair');
    readoutEl = overlayEl.querySelector('#arReadout');
    noteEl = overlayEl.querySelector('#arNote');
    closeBtn = overlayEl.querySelector('#arCloseBtn');
    edgeArrowEl = overlayEl.querySelector('#arEdgeArrow');
    otherMarkersLayer = overlayEl.querySelector('#arOtherMarkers');
    voiceBtn = overlayEl.querySelector('#arVoiceBtn');
    skyMarkersLayer = overlayEl.querySelector('#arSkyMarkers');
    skyBtn = overlayEl.querySelector('#arSkyBtn');
    skyCreditEl = overlayEl.querySelector('#arSkyCredit');
    skyStatusEl = overlayEl.querySelector('#arSkyStatus');
    starMapSvg = overlayEl.querySelector('#arStarMap');
    starsBtn = overlayEl.querySelector('#arStarsBtn');
    compassTapeEl = overlayEl.querySelector('#arCompassTape');
    infoCardEl = overlayEl.querySelector('#arInfoCard');
    tapHintEl = overlayEl.querySelector('#arTapHint');
    calibrationHintEl = overlayEl.querySelector('#arCalibrationHint');
    calibrationHintTextEl = overlayEl.querySelector('#arCalibrationHintText');
    calibrationHintCloseBtn = overlayEl.querySelector('#arCalibrationHintClose');
    calibBtn = overlayEl.querySelector('#arCalibBtn');
    calibPanelEl = overlayEl.querySelector('#arCalibPanel');
    calibAzValueEl = overlayEl.querySelector('#arCalibAzValue');
    calibElValueEl = overlayEl.querySelector('#arCalibElValue');
    calibResetBtn = overlayEl.querySelector('#arCalibReset');
    calibCloseBtn = overlayEl.querySelector('#arCalibClose');
    spaceStarsEl = overlayEl.querySelector('#arSpaceStars');
    openingEl = overlayEl.querySelector('#arOpening');
    openingSubtitleEl = overlayEl.querySelector('#arOpeningSubtitle');

    buildSpaceStars();

    openingEl.addEventListener('click', close);

    closeBtn.addEventListener('click', close);
    voiceBtn.addEventListener('click', toggleVoice);
    skyBtn.addEventListener('click', toggleSky);
    starsBtn.addEventListener('click', toggleStars);
    calibrationHintCloseBtn.addEventListener('click', dismissCalibrationHint);
    calibBtn.addEventListener('click', toggleCalibPanel);
    calibCloseBtn.addEventListener('click', closeCalibPanel);
    calibResetBtn.addEventListener('click', resetCalib);
    overlayEl.querySelector('#arCalibAzMinus').addEventListener('click', ()=> stepCalib('az', -1));
    overlayEl.querySelector('#arCalibAzPlus').addEventListener('click', ()=> stepCalib('az', 1));
    overlayEl.querySelector('#arCalibElMinus').addEventListener('click', ()=> stepCalib('el', -1));
    overlayEl.querySelector('#arCalibElPlus').addEventListener('click', ()=> stepCalib('el', 1));
  }

  function showCalibrationHint(){
    if(calibrationHintVisible || !calibrationHintEl) return;
    if(Date.now() < calibrationHintCooldownUntil) return;
    calibrationHintVisible = true;
    calibrationHintTextEl.textContent = window.I18N
      ? I18N.t('ar.calibrationHint')
      : 'Kompas kelihatan ngaco - goyangkan HP membentuk pola angka 8 beberapa detik buat kalibrasi ulang.';
    calibrationHintCloseBtn.setAttribute('aria-label', window.I18N ? I18N.t('ar.calibrationDismiss') : 'Tutup hint kalibrasi');
    calibrationHintEl.classList.remove('hidden');
  }

  function hideCalibrationHint(){
    calibrationHintVisible = false;
    headingJumpTimestamps = [];
    if(calibrationHintEl) calibrationHintEl.classList.add('hidden');
  }

  function dismissCalibrationHint(){
    calibrationHintCooldownUntil = Date.now() + CALIBRATION_HINT_COOLDOWN_MS;
    hideCalibrationHint();
  }

  function loadVoicePref(){
    try{
      voiceEnabled = localStorage.getItem('istrack_ar_voice') !== 'off';
    }catch(e){
      voiceEnabled = true;
    }
    updateVoiceBtnUI();
  }

  function updateVoiceBtnUI(){
    if(!voiceBtn) return;
    voiceBtn.innerHTML = voiceEnabled ? '<i class="fa-solid fa-volume-high"></i>' : '<i class="fa-solid fa-volume-xmark"></i>';
    const label = window.I18N
      ? I18N.t(voiceEnabled ? 'ar.voiceOn' : 'ar.voiceOff')
      : (voiceEnabled ? 'Alert suara: aktif' : 'Alert suara: nonaktif');
    voiceBtn.setAttribute('aria-label', label);
    voiceBtn.title = label;
  }

  function toggleVoice(){
    voiceEnabled = !voiceEnabled;
    try{ localStorage.setItem('istrack_ar_voice', voiceEnabled ? 'on' : 'off'); }catch(e){}
    updateVoiceBtnUI();
    if(!voiceEnabled && 'speechSynthesis' in window){
      try{ speechSynthesis.cancel(); }catch(e){}
    }
  }

  function loadSkyPref(){
    try{
      skyEnabled = localStorage.getItem('istrack_ar_nightsky') !== 'off';
    }catch(e){
      skyEnabled = true;
    }
    updateSkyBtnUI();
  }

  function updateSkyBtnUI(){
    if(!skyBtn) return;
    skyBtn.innerHTML = skyEnabled ? '<i class="fa-solid fa-moon"></i>' : '<i class="fa-regular fa-moon"></i>';
    const label = window.I18N
      ? I18N.t(skyEnabled ? 'ar.nightSkyOn' : 'ar.nightSkyOff')
      : (skyEnabled ? 'Bulan & planet: tampil' : 'Bulan & planet: sembunyi');
    skyBtn.setAttribute('aria-label', label);
    skyBtn.title = label;
    if(skyCreditEl){

      skyCreditEl.textContent = window.I18N
        ? I18N.t('ar.skyCredit')
        : 'Foto: Bulan – G. Revera (CC BY-SA); Merkurius – NASA/JHU-APL/ASU/CIW; Venus – NASA/R. Nunes; Mars – ESA/Rosetta (OSIRIS); Jupiter & Saturnus – NASA/JPL/Space Science Institute. Via Wikimedia Commons.';
      skyCreditEl.classList.toggle('hidden', !skyEnabled);
    }
    if(tapHintEl){
      let hintSeen = false;
      try{ hintSeen = localStorage.getItem('istrack_ar_taphint_seen') === '1'; }catch(e){}
      tapHintEl.textContent = window.I18N ? I18N.t('ar.tapHint') : 'Tap foto Bulan/planet buat lihat detail';
      tapHintEl.classList.toggle('hidden', !skyEnabled || hintSeen);
    }
    if(!skyEnabled) removeStaleSkyMarkers(new Set());
  }

  function toggleSky(){
    skyEnabled = !skyEnabled;
    try{ localStorage.setItem('istrack_ar_nightsky', skyEnabled ? 'on' : 'off'); }catch(e){}
    updateSkyBtnUI();
  }

  function loadStarsPref(){
    try{
      starsEnabled = localStorage.getItem('istrack_ar_stars') !== 'off';
    }catch(e){
      starsEnabled = true;
    }
    updateStarsBtnUI();
  }

  function updateStarsBtnUI(){
    if(!starsBtn) return;
    starsBtn.innerHTML = starsEnabled ? '<i class="fa-solid fa-star"></i>' : '<i class="fa-regular fa-star"></i>';
    const label = window.I18N
      ? I18N.t(starsEnabled ? 'ar.starsOn' : 'ar.starsOff')
      : (starsEnabled ? 'Peta bintang: tampil' : 'Peta bintang: sembunyi');
    starsBtn.setAttribute('aria-label', label);
    starsBtn.title = label;
    if(!starsEnabled && starMapSvg) starMapSvg.innerHTML = '';
  }

  function toggleStars(){
    starsEnabled = !starsEnabled;
    try{ localStorage.setItem('istrack_ar_stars', starsEnabled ? 'on' : 'off'); }catch(e){}
    updateStarsBtnUI();
  }

  function playBeep(){
    try{
      if(!audioCtx){
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if(!Ctx) return;
        audioCtx = new Ctx();
      }
      if(audioCtx.state === 'suspended') audioCtx.resume();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.25, audioCtx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.36);
    }catch(e){  }
  }

  function speakIssInFrame(){
    try{
      if(!('speechSynthesis' in window)) return;
      const text = window.I18N ? I18N.t('ar.voiceAlertText') : 'PERINGATAN: ISS DAPAT DIDETEKSI';
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = window.I18N ? I18N.locale() : 'id-ID';
      utter.rate = 1.0;
      speechSynthesis.cancel();
      speechSynthesis.speak(utter);
    }catch(e){  }
  }

  function notifyIssDetected(){
    if(!('Notification' in window)) return;
    const title = window.I18N ? I18N.t('ar.voiceAlertText') : 'PERINGATAN: ISS DAPAT DIDETEKSI';
    const fire = () => {
      try{
        new Notification(title, { tag: 'iss-ar-detected' });
      }catch(e){  }
    };
    if(Notification.permission === 'granted'){
      fire();
    } else if(Notification.permission !== 'denied'){
      Notification.requestPermission().then(perm=>{ if(perm === 'granted') fire(); }).catch(()=>{});
    }
  }

  function triggerIssInFrameAlert(){
    if(!voiceEnabled) return;
    if(navigator.vibrate){
      try{ navigator.vibrate([120,60,120]); }catch(e){}
    }
    playBeep();
    speakIssInFrame();
    notifyIssDetected();
  }

  function computeCameraDirection(alphaDeg, betaDeg, gammaDeg){
    const d2r = Math.PI / 180;
    const a = alphaDeg * d2r, b = betaDeg * d2r, g = gammaDeg * d2r;
    const ca = Math.cos(a), sa = Math.sin(a);
    const cb = Math.cos(b), sb = Math.sin(b);
    const cg = Math.cos(g), sg = Math.sin(g);

    const m13 = ca * sg + cg * sa * sb;
    const m23 = sa * sg - ca * cg * sb;
    const m33 = cb * cg;

    const east = -m13;
    const north = -m23;
    const up = -m33;

    let azimuth = Math.atan2(east, north) / d2r;
    if(azimuth < 0) azimuth += 360;
    const elevation = Math.asin(Math.max(-1, Math.min(1, up))) / d2r;
    return { azimuth, elevation };
  }

  function handleOrientation(e, isAbsoluteSource){
    const hasCompassHeading = typeof e.webkitCompassHeading === 'number';
    if(isAbsoluteSource || hasCompassHeading){
      hasAbsoluteHeading = true;
    } else if(hasAbsoluteHeading){

      return;
    }

    if(typeof e.beta !== 'number' || typeof e.gamma !== 'number' || typeof e.alpha !== 'number'){
      return;
    }

    const dir = computeCameraDirection(e.alpha, e.beta, e.gamma);
    devicePitch = smoothPitchTowards(devicePitch, dir.elevation);

    const targetHeading = hasCompassHeading ? e.webkitCompassHeading : dir.azimuth;
    deviceHeading = smoothHeadingTowards(deviceHeading, targetHeading);

    checkHeadingJump(targetHeading);

    if(typeof e.webkitCompassAccuracy === 'number' && (e.webkitCompassAccuracy < 0 || e.webkitCompassAccuracy > 35)){
      registerHeadingJump();
    }
  }

  function registerHeadingJump(){
    const now = Date.now();
    headingJumpTimestamps.push(now);
    headingJumpTimestamps = headingJumpTimestamps.filter(t => now - t <= HEADING_JUMP_WINDOW_MS);
    if(headingJumpTimestamps.length >= HEADING_JUMP_COUNT_TRIGGER){
      showCalibrationHint();
    }
  }

  function checkHeadingJump(rawHeading){
    if(lastRawHeading !== null){
      const diff = Math.abs(normalizeAngle180(rawHeading - lastRawHeading));
      if(diff > HEADING_JUMP_THRESHOLD_DEG) registerHeadingJump();
    }
    lastRawHeading = rawHeading;
  }

  async function requestOrientationPermission(){
    if(typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function'){
      try{
        const res = await DeviceOrientationEvent.requestPermission();
        return res === 'granted';
      }catch(e){
        return false;
      }
    }
    return true;
  }

  function touchDist(touches){
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx*dx + dy*dy);
  }

  function attachPinchZoom(){
    touchStartHandler = (e)=>{
      if(e.touches.length === 2){
        pinchStartDist = touchDist(e.touches);
        pinchStartZoom = fovZoom;
      }
    };
    touchMoveHandler = (e)=>{
      if(e.touches.length === 2 && pinchStartDist){
        e.preventDefault();
        const dist = touchDist(e.touches);
        const ratio = dist / pinchStartDist;

        let z = pinchStartZoom / ratio;
        z = Math.max(FOV_ZOOM_MIN, Math.min(FOV_ZOOM_MAX, z));
        fovZoom = z;
      }
    };
    touchEndHandler = (e)=>{
      if(e.touches.length < 2) pinchStartDist = null;
    };
    overlayEl.addEventListener('touchstart', touchStartHandler, { passive:true });
    overlayEl.addEventListener('touchmove', touchMoveHandler, { passive:false });
    overlayEl.addEventListener('touchend', touchEndHandler, { passive:true });
    overlayEl.addEventListener('touchcancel', touchEndHandler, { passive:true });
  }

  function detachPinchZoom(){
    if(touchStartHandler) overlayEl.removeEventListener('touchstart', touchStartHandler);
    if(touchMoveHandler) overlayEl.removeEventListener('touchmove', touchMoveHandler);
    if(touchEndHandler){
      overlayEl.removeEventListener('touchend', touchEndHandler);
      overlayEl.removeEventListener('touchcancel', touchEndHandler);
    }
    touchStartHandler = touchMoveHandler = touchEndHandler = null;
    pinchStartDist = null;
    fovZoom = 1;
  }

  async function requestCamera(){
    try{
      mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false
      });
      videoEl.srcObject = mediaStream;
      return true;
    }catch(e){
      return false;
    }
  }

  function updateFrame(){
    if(!overlayEl || overlayEl.classList.contains('hidden')) return;

    const satrec = getSatrec ? getSatrec() : null;
    const observer = getObserver ? getObserver() : null;

    if(satrec && observer && global.ISSAstro){
      const look = global.ISSAstro.getLookAngles(satrec, observer.lat, observer.lon, observer.alt || 0, new Date());
      if(look){

        if(global.ISSAstro.applyRefractionDeg) look.elevationDeg = global.ISSAstro.applyRefractionDeg(look.elevationDeg);
        const dirLabel = global.ISSAstro.compassLabel(look.azimuthDeg * global.ISSAstro.DEG2RAD);
        const elText = look.elevationDeg >= 0 ? `+${look.elevationDeg.toFixed(1)}°` : `${look.elevationDeg.toFixed(1)}°`;
        readoutEl.textContent = `Az ${Math.round(look.azimuthDeg)}° (${dirLabel}) · El ${elText}`;

        if(deviceHeading === null){
          markerEl.classList.add('hidden');
          edgeArrowEl.classList.add('hidden');
          noteEl.textContent = window.I18N ? I18N.t('ar.noCompass') : 'Sensor kompas tidak terdeteksi - arahkan HP memakai angka azimuth di atas.';
          issInFrame = false;
        } else {

          const belowHorizon = look.elevationDeg < 0;
          const relAz = normalizeAngle180(look.azimuthDeg - effHeading());
          const relEl = look.elevationDeg - effPitch();

          const withinH = Math.abs(relAz) <= curFovH()/2;
          const withinV = Math.abs(relEl) <= curFovV()/2;
          const nowInFrame = !belowHorizon && withinH && withinV;

          if(nowInFrame){
            noteEl.textContent = '';
            markerEl.classList.remove('hidden');
            edgeArrowEl.classList.add('hidden');
            const xPct = 50 + (relAz / (curFovH()/2)) * 50;
            const yPct = 50 - (relEl / (curFovV()/2)) * 50;
            markerEl.style.left = xPct + '%';
            markerEl.style.top = yPct + '%';
          } else if(belowHorizon){
            markerEl.classList.add('hidden');
            edgeArrowEl.classList.add('hidden');
            noteEl.textContent = window.I18N ? I18N.t('ar.belowHorizon') : 'ISS sedang di bawah horizon dari lokasimu.';
          } else {
            markerEl.classList.add('hidden');
            edgeArrowEl.classList.remove('hidden');
            edgeArrowEl.classList.remove('ar-edge-arrow-below-horizon');
            edgeArrowEl.style.transform = `translate(-50%,-50%) rotate(${relAz}deg)`;
            noteEl.textContent = '';
          }

          if(nowInFrame && !issInFrame) triggerIssInFrameAlert();
          issInFrame = nowInFrame;
        }
      }
    }

    if(observer) updateOtherSatellites(observer);
    if(observer) updateNightSky(observer);
    if(observer) updateIssTrail(observer);
    renderSkyOverlaySvg(observer);
    updateCompassTape();

    rafId = requestAnimationFrame(updateFrame);
  }

  function ensureOtherMarkerEl(item){
    let entry = otherMarkerEls[item.key];
    if(entry) return entry;

    const wrap = document.createElement('div');
    wrap.className = 'ar-marker ar-marker-other hidden';
    const color = item.colorCss || '#5b9bff';
    wrap.innerHTML = `
      <div class="ar-marker-dot ar-marker-dot-other" style="filter:drop-shadow(0 0 8px ${color})">${item.flag || '<i class="fa-solid fa-satellite"></i>'}</div>
      <div class="ar-marker-label ar-marker-label-other" style="color:${color}">${item.label || item.key}</div>
    `;

    const arrow = document.createElement('div');
    arrow.className = 'ar-edge-arrow ar-edge-arrow-other hidden';
    arrow.style.color = color;
    arrow.innerHTML = '<i class="fa-solid fa-arrow-right"></i>';

    otherMarkersLayer.appendChild(wrap);
    otherMarkersLayer.appendChild(arrow);

    entry = { wrap, arrow };
    otherMarkerEls[item.key] = entry;
    return entry;
  }

  function removeStaleOtherMarkers(seenKeys){
    Object.keys(otherMarkerEls).forEach(key=>{
      if(seenKeys.has(key)) return;
      const entry = otherMarkerEls[key];
      entry.wrap.remove();
      entry.arrow.remove();
      delete otherMarkerEls[key];
    });
  }

  function updateOtherSatellites(observer){
    if(!otherMarkersLayer || !getOtherSats) return;
    const list = getOtherSats() || [];
    const seenKeys = new Set();

    list.forEach(item=>{
      if(!item || !item.satrec || !item.key) return;
      seenKeys.add(item.key);
      const entry = ensureOtherMarkerEl(item);

      const look = global.ISSAstro
        ? global.ISSAstro.getLookAngles(item.satrec, observer.lat, observer.lon, observer.alt || 0, new Date())
        : null;

      if(look && global.ISSAstro.applyRefractionDeg) look.elevationDeg = global.ISSAstro.applyRefractionDeg(look.elevationDeg);

      if(!look || deviceHeading === null){
        entry.wrap.classList.add('hidden');
        entry.arrow.classList.add('hidden');
        return;
      }

      const belowHorizon = look.elevationDeg < 0;
      const relAz = normalizeAngle180(look.azimuthDeg - effHeading());
      const relEl = look.elevationDeg - effPitch();
      const withinH = Math.abs(relAz) <= curFovH()/2;
      const withinV = Math.abs(relEl) <= curFovV()/2;
      const nowVisibleInFrame = !belowHorizon && withinH && withinV;

      if(nowVisibleInFrame){
        entry.wrap.classList.remove('hidden');
        entry.arrow.classList.add('hidden');
        const xPct = 50 + (relAz / (curFovH()/2)) * 50;
        const yPct = 50 - (relEl / (curFovV()/2)) * 50;
        entry.wrap.style.left = xPct + '%';
        entry.wrap.style.top = yPct + '%';
      } else if(belowHorizon){
        entry.wrap.classList.add('hidden');
        entry.arrow.classList.add('hidden');
      } else {
        entry.wrap.classList.add('hidden');
        entry.arrow.classList.remove('hidden');
        entry.arrow.classList.remove('ar-edge-arrow-below-horizon');
        entry.arrow.style.transform = `translate(-50%,-50%) rotate(${relAz}deg)`;
      }
    });

    removeStaleOtherMarkers(seenKeys);
  }

  function ensureSkyMarkerEl(key){
    let entry = skyMarkerEls[key];
    if(entry) return entry;

    const meta = SKY_BODY_META[key];
    const wrap = document.createElement('div');

    wrap.className = 'ar-marker ar-marker-sky ar-marker-tappable hidden';
    wrap.innerHTML = `
      <img class="ar-marker-photo" src="${meta.img}" alt="${meta.label}" loading="lazy">
      <div class="ar-marker-label ar-marker-label-other" style="color:${meta.colorCss}">${meta.label}</div>
    `;
    wrap.addEventListener('click', ()=> toggleInfoCard(key));

    const arrow = document.createElement('div');
    arrow.className = 'ar-edge-arrow-wrap ar-edge-arrow-tappable hidden';
    arrow.innerHTML = `
      <div class="ar-sky-arrow-glyph" style="color:${meta.colorCss}"><i class="fa-solid fa-arrow-right"></i></div>
      <div class="ar-edge-arrow-tag" style="color:${meta.colorCss}"></div>
    `;
    arrow.addEventListener('click', ()=> toggleInfoCard(key));
    const arrowGlyph = arrow.querySelector('.ar-sky-arrow-glyph');
    const arrowTag = arrow.querySelector('.ar-edge-arrow-tag');

    skyMarkersLayer.appendChild(wrap);
    skyMarkersLayer.appendChild(arrow);

    entry = { wrap, arrow, arrowGlyph, arrowTag };
    skyMarkerEls[key] = entry;
    return entry;
  }

  function formatDistance(item){
    const isEn = window.I18N && I18N.locale() === 'en-US';
    if(item.distanceKm == null) return '--';
    const kmText = item.distanceKm >= 1e6
      ? (item.distanceKm/1e6).toLocaleString(isEn?'en-US':'id-ID', {maximumFractionDigits:1}) + ' ' + (isEn?'million km':'juta km')
      : Math.round(item.distanceKm).toLocaleString(isEn?'en-US':'id-ID') + ' km';
    const auText = item.distanceAU != null ? ` (${item.distanceAU.toFixed(2)} SA)` : '';
    const avgTag = item.distanceIsAverage ? (isEn ? ' avg.' : ' rata-rata') : '';
    return kmText + auText + avgTag;
  }

  function formatMagnitude(item){
    if(item.magnitude == null || Number.isNaN(item.magnitude)) return '--';
    const sign = item.magnitude < 0 ? '' : '+';
    return `${sign}${item.magnitude.toFixed(1)}`;
  }

  function formatPhase(item){
    if(item.illumFraction == null) return '--';
    return Math.round(item.illumFraction * 100) + '%';
  }

  function renderInfoCard(key){
    if(!infoCardEl) return;
    const meta = SKY_BODY_META[key];
    const item = skyBodyDataCache[key];
    if(!meta || !item) return;

    const isEn = window.I18N && I18N.locale() === 'en-US';
    const t = (k, fallback) => window.I18N ? I18N.t(k) : fallback;
    const name = isEn ? meta.labelEn : meta.label;
    const elText = item.elevationDeg >= 0 ? `+${item.elevationDeg.toFixed(1)}°` : `${item.elevationDeg.toFixed(1)}°`;

    const rows = [];
    rows.push(`<div class="ar-info-row"><span>${t('ar.cardAzEl','Az / El')}</span><b>${Math.round(item.azimuthDeg)}° / ${elText}</b></div>`);
    rows.push(`<div class="ar-info-row"><span>${t('ar.cardDistance','Jarak')}</span><b>${formatDistance(item)}</b></div>`);
    if(item.magnitude != null){
      rows.push(`<div class="ar-info-row"><span>${t('ar.cardMagnitude','Magnitudo')}</span><b>${formatMagnitude(item)}</b></div>`);
    }
    if(item.illumFraction != null){
      rows.push(`<div class="ar-info-row"><span>${t('ar.cardPhase','Fase tersinari')}</span><b>${formatPhase(item)}</b></div>`);
    }

    const noteParts = [];
    if(key === 'moon') noteParts.push(t('ar.cardMoonNote','Jarak Bulan yang ditampilkan adalah rata-rata jangka panjang, bukan jarak real-time.'));
    if(key === 'saturn') noteParts.push(t('ar.cardSaturnNote','Magnitudo Saturnus dihitung dari piringannya saja, tidak termasuk cincin.'));

    infoCardEl.innerHTML = `
      <button class="ar-info-close" aria-label="${t('ar.cardClose','Tutup')}"><i class="fa-solid fa-xmark"></i></button>
      <div class="ar-info-head">
        <img class="ar-info-photo" src="${meta.img}" alt="${name}">
        <div class="ar-info-title" style="color:${meta.colorCss}">${name}</div>
      </div>
      <div class="ar-info-rows">${rows.join('')}</div>
      ${noteParts.length ? `<p class="ar-info-note">${noteParts.join(' ')}</p>` : ''}
    `;
    infoCardEl.querySelector('.ar-info-close').addEventListener('click', closeInfoCard);
  }

  function toggleInfoCard(key){
    if(openInfoKey === key){
      closeInfoCard();
      return;
    }
    openInfoKey = key;
    renderInfoCard(key);
    if(infoCardEl) infoCardEl.classList.remove('hidden');

    if(tapHintEl && !tapHintEl.classList.contains('hidden')){
      tapHintEl.classList.add('hidden');
      try{ localStorage.setItem('istrack_ar_taphint_seen', '1'); }catch(e){}
    }
  }

  function closeInfoCard(){
    openInfoKey = null;
    if(infoCardEl) infoCardEl.classList.add('hidden');
  }

  function removeStaleSkyMarkers(seenKeys){
    Object.keys(skyMarkerEls).forEach(key=>{
      if(seenKeys.has(key)) return;
      const entry = skyMarkerEls[key];
      entry.wrap.remove();
      entry.arrow.remove();
      delete skyMarkerEls[key];
    });
  }

  function updateSkyStatusText(belowHorizonKeys){
    if(!skyStatusEl) return;
    if(!skyEnabled || belowHorizonKeys.length === 0){
      skyStatusEl.classList.add('hidden');
      return;
    }
    const isEn = window.I18N && I18N.locale() === 'en-US';
    const names = belowHorizonKeys
      .map(key => isEn ? SKY_BODY_META[key].labelEn : SKY_BODY_META[key].label)
      .join(isEn ? ', ' : ', ');
    const text = window.I18N
      ? I18N.t('ar.skyBelowHorizon', { names })
      : `${names} sedang di bawah horizon sekarang.`;
    skyStatusEl.textContent = text;
    skyStatusEl.classList.remove('hidden');
  }

  function updateNightSky(observer){
    if(!skyMarkersLayer || !getNightSkyBodies) return;
    if(!skyEnabled){
      removeStaleSkyMarkers(new Set());
      updateSkyStatusText([]);
      skyBodyDataCache = {};
      if(openInfoKey) closeInfoCard();
      return;
    }

    const list = getNightSkyBodies(observer.lat, observer.lon, observer.alt || 0, new Date()) || [];
    const seenKeys = new Set();
    const belowHorizonKeys = [];
    const visiblePlacements = [];

    list.forEach(item=>{
      if(!item || !item.key || !SKY_BODY_META[item.key]) return;

      if(global.ISSAstro && global.ISSAstro.applyRefractionDeg){
        item.elevationDeg = global.ISSAstro.applyRefractionDeg(item.elevationDeg);
      }
      seenKeys.add(item.key);
      skyBodyDataCache[item.key] = item;
      if(openInfoKey === item.key) renderInfoCard(item.key);
      const entry = ensureSkyMarkerEl(item.key);
      const meta = SKY_BODY_META[item.key];

      const belowHorizon = item.elevationDeg < 0;
      if(belowHorizon) belowHorizonKeys.push(item.key);

      if(deviceHeading === null){

        entry.wrap.classList.add('hidden');
        entry.arrow.classList.add('hidden');
        return;
      }

      const relAz = normalizeAngle180(item.azimuthDeg - effHeading());
      const relEl = item.elevationDeg - effPitch();
      const withinH = Math.abs(relAz) <= curFovH()/2;
      const withinV = Math.abs(relEl) <= curFovV()/2;

      const nowVisibleInFrame = !belowHorizon && withinH && withinV;

      if(nowVisibleInFrame){
        entry.wrap.classList.remove('hidden');
        entry.arrow.classList.add('hidden');
        const xPct = 50 + (relAz / (curFovH()/2)) * 50;
        const yPct = 50 - (relEl / (curFovV()/2)) * 50;

        visiblePlacements.push({ key: item.key, entry, xPct, yPct });
      } else if(belowHorizon){

        entry.wrap.classList.add('hidden');
        entry.arrow.classList.add('hidden');
      } else {

        entry.wrap.classList.add('hidden');
        entry.arrow.classList.remove('hidden');
        entry.arrow.classList.remove('ar-edge-arrow-below-horizon');
        entry.arrowGlyph.style.transform = `rotate(${relAz}deg)`;
        const isEn = window.I18N && I18N.locale() === 'en-US';
        const name = isEn ? meta.labelEn : meta.label;
        const elText = `+${Math.round(item.elevationDeg)}°`;
        entry.arrowTag.textContent = `${name} ${elText}`;
      }
    });

    resolveSkyMarkerCollisions(visiblePlacements);

    removeStaleSkyMarkers(seenKeys);
    updateSkyStatusText(belowHorizonKeys);
  }

  function resolveSkyMarkerCollisions(placements){
    if(!placements.length) return;
    const rect = skyMarkersLayer.getBoundingClientRect();
    const w = rect.width || 1, h = rect.height || 1;
    const minDistPx = 52;
    const stepPct = (minDistPx / h) * 100;

    const priority = { moon:0, venus:1, mars:2, jupiter:3, saturn:4 };
    placements.sort((a,b)=> (priority[a.key] ?? 9) - (priority[b.key] ?? 9));

    const placed = [];
    placements.forEach(p=>{
      let yOffsetPct = 0;
      const xPx = (p.xPct/100) * w;
      let collided = true;
      let guard = 0;
      while(collided && guard < 8){
        collided = false;
        const yPx = ((p.yPct + yOffsetPct)/100) * h;
        for(let i=0;i<placed.length;i++){
          const dx = xPx - placed[i].xPx, dy = yPx - placed[i].yPx;
          if(Math.sqrt(dx*dx + dy*dy) < minDistPx){
            yOffsetPct += stepPct;
            collided = true;
            break;
          }
        }
        guard++;
      }
      const finalYPct = p.yPct + yOffsetPct;
      placed.push({ xPx, yPx: (finalYPct/100)*h });
      p.entry.wrap.style.left = p.xPct + '%';
      p.entry.wrap.style.top = finalYPct + '%';
      const offsetPx = (yOffsetPct/100) * h;
      p.entry.wrap.style.setProperty('--ar-leader-h', offsetPx + 'px');
      p.entry.wrap.classList.toggle('ar-marker-offset', yOffsetPct > 0);
    });
  }

  function updateIssTrail(observer){
    const now = Date.now();
    if(now - lastTrailUpdate < 1000) return;
    lastTrailUpdate = now;

    if(!getSatrec || !observer || !global.ISSAstro){ issTrailPoints = []; return; }
    const satrec = getSatrec();
    if(!satrec){ issTrailPoints = []; return; }

    const pts = [];
    const baseMs = Date.now();
    for(let i=-6;i<=18;i++){
      const t = new Date(baseMs + i*10000);
      const look = global.ISSAstro.getLookAngles(satrec, observer.lat, observer.lon, observer.alt || 0, t);
      if(look){

        if(global.ISSAstro.applyRefractionDeg) look.elevationDeg = global.ISSAstro.applyRefractionDeg(look.elevationDeg);
        if(look.elevationDeg > -8) pts.push({ azimuthDeg: look.azimuthDeg, elevationDeg: look.elevationDeg });
      }
    }
    issTrailPoints = pts;
  }

  function projectToSvg(azDeg, elDeg, w, h){
    const fovH = curFovH(), fovV = curFovV();
    const relAz = normalizeAngle180(azDeg - effHeading());
    const relEl = elDeg - effPitch();
    return { x: w/2 + (relAz/(fovH/2))*(w/2), y: h/2 - (relEl/(fovV/2))*(h/2) };
  }

  function renderSkyOverlaySvg(observer){
    if(!starMapSvg) return;
    if(deviceHeading === null || !observer){ starMapSvg.innerHTML = ''; return; }

    const w = overlayEl.clientWidth || window.innerWidth;
    const h = overlayEl.clientHeight || window.innerHeight;

    starMapSvg.setAttribute('viewBox', `0 0 ${w} ${h}`);

    const parts = [];
    const margin = Math.max(w,h) * 0.08;
    const inView = (p)=> p.x >= -margin && p.x <= w+margin && p.y >= -margin && p.y <= h+margin;

    if(starsEnabled && global.ISSStars && global.ISSAstro){
      const isEn = window.I18N && I18N.locale() === 'en-US';
      const pos = {};
      global.ISSStars.STAR_CATALOG.forEach(star=>{

        const look = global.ISSAstro.starLookAngles(star.raH, star.decDeg, new Date(), observer.lat, observer.lon);
        if(look.altitudeDeg < -2) return;
        const xy = projectToSvg(look.azimuthDeg, look.altitudeDeg, w, h);
        if(!inView(xy)) return;
        pos[star.id] = Object.assign({}, star, xy);
      });

      const lineParts = [];
      const dotParts = [];
      const labelParts = [];

      Object.keys(global.ISSStars.CONSTELLATIONS).forEach(key=>{
        const con = global.ISSStars.CONSTELLATIONS[key];
        const segs = [];
        for(let i=0;i<con.line.length-1;i++) segs.push([con.line[i], con.line[i+1]]);
        (con.extra||[]).forEach(seg=>segs.push(seg));

        let brightest = null;
        segs.forEach(([aId,bId])=>{
          const a = pos[aId], b = pos[bId];
          if(!a || !b) return;
          lineParts.push(`<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" class="ar-con-line"/>`);
          if(!brightest || a.mag < brightest.mag) brightest = a;
          if(!brightest || b.mag < brightest.mag) brightest = b;
        });
        if(brightest){
          const label = isEn ? con.name : (con.nameId || con.name);
          labelParts.push(`<text x="${brightest.x.toFixed(1)}" y="${(brightest.y-18).toFixed(1)}" class="ar-con-label">${label}</text>`);
        }
      });

      Object.values(pos).forEach(p=>{
        const r = Math.max(1.6, 6.2 - p.mag*1.5);
        const op = p.con ? 0.95 : 0.5;
        dotParts.push(`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${r.toFixed(1)}" class="ar-star-dot" opacity="${op}"/>`);
      });

      parts.push(...lineParts, ...dotParts, ...labelParts);
    }

    if(issTrailPoints.length >= 2){
      const trailPts = issTrailPoints.map(p=>projectToSvg(p.azimuthDeg, p.elevationDeg, w, h));
      const ptsStr = trailPts.map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
      parts.push(`<polyline points="${ptsStr}" class="ar-iss-trail"/>`);
    }

    starMapSvg.innerHTML = parts.join('');
  }

  const COMPASS_DIRS = {
    0:{id:'U',en:'N'}, 45:{id:'TL',en:'NE'}, 90:{id:'T',en:'E'}, 135:{id:'TG',en:'SE'},
    180:{id:'S',en:'S'}, 225:{id:'BD',en:'SW'}, 270:{id:'B',en:'W'}, 315:{id:'BL',en:'NW'}
  };

  function updateCompassTape(){
    if(!compassTapeEl) return;
    if(deviceHeading === null){ compassTapeEl.innerHTML = ''; return; }
    const isEn = window.I18N && I18N.locale() === 'en-US';
    const fovH = curFovH();
    const half = fovH/2 + 12;
    const parts = [];

    for(let deg=0; deg<360; deg+=15){
      const relAz = normalizeAngle180(deg - effHeading());
      if(Math.abs(relAz) > half) continue;
      const xPct = 50 + (relAz/(fovH/2))*50;
      const isMajor = deg % 90 === 0;
      const isInter = deg % 45 === 0 && !isMajor;
      const meta = COMPASS_DIRS[deg];
      const label = meta ? (isEn ? meta.en : meta.id) : '';
      const cls = isMajor ? 'ar-compass-major' : (isInter ? 'ar-compass-inter' : 'ar-compass-minor');
      parts.push(`<div class="ar-compass-tick ${cls}" style="left:${xPct.toFixed(2)}%">${label ? `<span>${label}</span>` : ''}</div>`);
    }
    compassTapeEl.innerHTML = parts.join('');
  }

  async function open(opts){
    buildDom();
    getSatrec = opts.getSatrec;
    getObserver = opts.getObserver;
    getOtherSats = opts.getOtherSats || null;
    getNightSkyBodies = opts.getNightSkyBodies || null;
    onClose = opts.onClose;
    loadVoicePref();
    loadSkyPref();
    loadStarsPref();
    loadCalibPref();
    updateCalibText();
    closeCalibPanel();
    if(!getNightSkyBodies && skyBtn) skyBtn.classList.add('hidden');
    else if(skyBtn) skyBtn.classList.remove('hidden');
    if(!global.ISSStars && starsBtn) starsBtn.classList.add('hidden');
    else if(starsBtn) starsBtn.classList.remove('hidden');
    issInFrame = false;
    hasAbsoluteHeading = false;
    fovZoom = 1;
    lastRawHeading = null;
    headingJumpTimestamps = [];
    calibrationHintCooldownUntil = 0;
    hideCalibrationHint();
    issTrailPoints = [];
    lastTrailUpdate = 0;
    skyBodyDataCache = {};
    openInfoKey = null;
    attachPinchZoom();
    noteEl.textContent = window.I18N ? I18N.t('ar.starting') : 'Menyiapkan mode AR…';
    overlayEl.classList.remove('hidden');

    const openingStartedAt = Date.now();
    if(openingEl){
      openingEl.classList.remove('ar-opening-hide');
      if(openingSubtitleEl){
        openingSubtitleEl.textContent = window.I18N ? I18N.t('ar.openingSubtitle') : 'Menyiapkan mode AR…';
      }
    }

    const orientOk = await requestOrientationPermission();
    if(!orientOk){
      noteEl.textContent = window.I18N ? I18N.t('ar.orientationDenied') : 'Izin sensor orientasi ditolak.';
    }

    const camOk = await requestCamera();
    if(!camOk){
      noteEl.textContent = window.I18N ? I18N.t('ar.cameraDenied') : 'Tidak bisa mengakses kamera. Menampilkan mode kompas saja.';
    }

    if(openingEl){
      const elapsed = Date.now() - openingStartedAt;
      const remaining = Math.max(0, AR_OPENING_MIN_MS - elapsed);
      setTimeout(()=>{ openingEl.classList.add('ar-opening-hide'); }, remaining);
    }

    orientationHandlerAbsolute = (e)=> handleOrientation(e, true);
    orientationHandlerRelative = (e)=> handleOrientation(e, e.absolute === true);
    window.addEventListener('deviceorientationabsolute', orientationHandlerAbsolute, true);
    window.addEventListener('deviceorientation', orientationHandlerRelative, true);

    rafId = requestAnimationFrame(updateFrame);
  }

  function close(){
    if(overlayEl) overlayEl.classList.add('hidden');
    if(rafId) cancelAnimationFrame(rafId);
    rafId = null;
    detachPinchZoom();
    issTrailPoints = [];
    if(starMapSvg) starMapSvg.innerHTML = '';
    if(compassTapeEl) compassTapeEl.innerHTML = '';
    if(orientationHandlerAbsolute){
      window.removeEventListener('deviceorientationabsolute', orientationHandlerAbsolute, true);
      orientationHandlerAbsolute = null;
    }
    if(orientationHandlerRelative){
      window.removeEventListener('deviceorientation', orientationHandlerRelative, true);
      orientationHandlerRelative = null;
    }
    if(mediaStream){
      mediaStream.getTracks().forEach(t=>t.stop());
      mediaStream = null;
    }

    if(videoEl) videoEl.srcObject = null;
    if(openingEl) openingEl.classList.add('ar-opening-hide');
    deviceHeading = null;
    devicePitch = null;
    hasAbsoluteHeading = false;
    issInFrame = false;
    lastRawHeading = null;
    headingJumpTimestamps = [];
    hideCalibrationHint();
    if('speechSynthesis' in window){
      try{ speechSynthesis.cancel(); }catch(e){}
    }
    removeStaleOtherMarkers(new Set());
    removeStaleSkyMarkers(new Set());
    closeInfoCard();
    closeCalibPanel();
    skyBodyDataCache = {};
    if(skyStatusEl) skyStatusEl.classList.add('hidden');
    if(onClose) onClose();
  }

  function isSupported(){
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  global.ISSAR = { open, close, isSupported };

})(window);
