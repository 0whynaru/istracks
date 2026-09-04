(function(global){

  let scene, camera, renderer, world, canvas;
  let issMesh, trailGroup, futureLine, observerMesh;
  let dragging = false, lastX=0, lastY=0;
  let rotY = 0.5, rotX = -0.25;
  let autoRotate = true;
  let raf = null;

  let otherSatMeshes = {};
  let historyLine = null;
  let playbackMesh = null;
  let gridGroup = null;
  let glowMesh = null;
  let globeMat = null;
  let nightEnabled = true;

  let lastSubsolarLat, lastSubsolarLon;
  let lastGlowPct = 60;

  let raycaster = null;
  let downX = 0, downY = 0;
  let markerSelectCb = null;
  let selectedMesh = null;
  let labelUpdateCb = null;
  let _labelWorldPos, _labelProjPos;

  const READY_FALLBACK_MS = 4500;
  let readyFired = false;
  let readyCallbacks = [];
  let readyFallbackTimer = null;

  function fireReady(){
    if(readyFired) return;
    readyFired = true;
    if(readyFallbackTimer){ clearTimeout(readyFallbackTimer); readyFallbackTimer = null; }
    readyCallbacks.forEach(cb=>{ try{ cb(); }catch(e){} });
    readyCallbacks = [];
  }

  function onReady(cb){
    if(typeof cb !== 'function') return;
    if(readyFired) cb();
    else readyCallbacks.push(cb);
  }

  const COLOR = {
    sphere: 0x0b1122,
    grid: 0x1c2744,
    gridStrong: 0x2a3a63,
    ember: 0xff7a45,
    cyan: 0x5fd3c4,
    violet: 0xb98bf0,
  };

  const EARTH_RADIUS_KM = 6371;
  const SAT_MIN_ALT_KM = 300;
  const SAT_MAX_ALT_KM = 23300;
  const SAT_MIN_RADIUS = 1.02;
  const SAT_MAX_RADIUS = 2.15;

  function altToRadius(altKm){
    if(typeof altKm !== 'number' || !isFinite(altKm)) return SAT_MIN_RADIUS;
    const clamped = Math.max(SAT_MIN_ALT_KM, Math.min(SAT_MAX_ALT_KM, altKm));
    const t = (clamped - SAT_MIN_ALT_KM) / (SAT_MAX_ALT_KM - SAT_MIN_ALT_KM);
    const eased = Math.sqrt(t);
    return SAT_MIN_RADIUS + eased * (SAT_MAX_RADIUS - SAT_MIN_RADIUS);
  }

  function latLonToVec3(lat, lon, radius){
    const phi = (90-lat) * Math.PI/180;
    const theta = (lon+180) * Math.PI/180;
    return new THREE.Vector3(
      -radius * Math.sin(phi) * Math.cos(theta),
       radius * Math.cos(phi),
       radius * Math.sin(phi) * Math.sin(theta)
    );
  }

  function buildGridLines(radius){
    const group = new THREE.Group();
    const segs = 64;

    for(let lat=-60; lat<=60; lat+=30){
      const pts = [];
      for(let i=0;i<=segs;i++){
        const lon = -180 + (360*i/segs);
        pts.push(latLonToVec3(lat, lon, radius));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({color: lat===0?COLOR.gridStrong:COLOR.grid, transparent:true, opacity: lat===0?0.9:0.5});
      group.add(new THREE.Line(geo, mat));
    }

    for(let lon=-180; lon<180; lon+=30){
      const pts = [];
      for(let i=0;i<=segs;i++){
        const lat = -90 + (180*i/segs);
        pts.push(latLonToVec3(lat, lon, radius));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({color: lon===0?COLOR.gridStrong:COLOR.grid, transparent:true, opacity: lon===0?0.9:0.5});
      group.add(new THREE.Line(geo, mat));
    }

    return group;
  }

  function init(canvasEl){
    canvas = canvasEl;
    scene = new THREE.Scene();

    const w = canvas.clientWidth || 600, h = canvas.clientHeight || 450;
    camera = new THREE.PerspectiveCamera(42, w/h, 0.1, 100);
    camera.position.set(0,0,3.1);

    renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:true});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, 2));
    renderer.setSize(w, h, false);

    world = new THREE.Group();
    scene.add(world);

    const sphereGeo = new THREE.SphereGeometry(1, 64, 48);
    const placeholderMat = new THREE.MeshBasicMaterial({color: COLOR.sphere, transparent:true, opacity:0.92});
    const sphereMesh = new THREE.Mesh(sphereGeo, placeholderMat);
    world.add(sphereMesh);

    const DAY_TEXTURE_URL = 'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-day.jpg';
    const NIGHT_TEXTURE_URL = 'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-night.jpg';
    let dayTex = null, nightTex = null;

    function prepTex(tex){
      if(tex.encoding !== undefined) tex.encoding = THREE.sRGBEncoding;
      tex.anisotropy = 4;
      return tex;
    }

    function trySwapToDayNightShader(){
      if(!dayTex || !nightTex || globeMat) return;
      globeMat = new THREE.ShaderMaterial({
        uniforms: {
          dayMap: { value: dayTex },
          nightMap: { value: nightTex },
          sunDir: { value: new THREE.Vector3(0, 0, 1) },
          dayNightOn: { value: 1.0 },
          nightBoost: { value: 0.5 }
        },
        vertexShader: `
          varying vec3 vNormal;
          varying vec2 vUv;
          void main(){
            vNormal = normalize(position);
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D dayMap;
          uniform sampler2D nightMap;
          uniform vec3 sunDir;
          uniform float dayNightOn;
          uniform float nightBoost;
          varying vec3 vNormal;
          varying vec2 vUv;
          void main(){
            vec3 dayColor = texture2D(dayMap, vUv).rgb;
            vec3 nightColor = texture2D(nightMap, vUv).rgb;
            float lit = dot(normalize(vNormal), normalize(sunDir));
            float terminator = smoothstep(-0.12, 0.12, lit);
            float mixAmt = mix(1.0, terminator, dayNightOn);
            vec3 nightSide = nightColor * (0.15 + nightBoost) + vec3(0.015, 0.03, 0.06);
            vec3 color = mix(nightSide, dayColor, mixAmt);
            gl_FragColor = vec4(color, 1.0);
          }
        `
      });
      sphereMesh.material = globeMat;
      placeholderMat.dispose();

      applyGlowUniform();
      applyDayNightUniform();
      fireReady();
    }

    new THREE.TextureLoader().load(DAY_TEXTURE_URL, (tex)=>{ dayTex = prepTex(tex); trySwapToDayNightShader(); }, undefined, ()=>{});
    new THREE.TextureLoader().load(NIGHT_TEXTURE_URL, (tex)=>{ nightTex = prepTex(tex); trySwapToDayNightShader(); }, undefined, ()=>{});

    gridGroup = buildGridLines(1.001);
    world.add(gridGroup);

    const glowGeo = new THREE.SphereGeometry(1.05, 48, 32);
    const glowMat = new THREE.MeshBasicMaterial({color: COLOR.cyan, transparent:true, opacity:0.06, side: THREE.BackSide});
    glowMesh = new THREE.Mesh(glowGeo, glowMat);
    world.add(glowMesh);

    const issGeo = new THREE.SphereGeometry(0.028, 16, 12);
    const issMat = new THREE.MeshBasicMaterial({color: COLOR.ember});
    issMesh = new THREE.Mesh(issGeo, issMat);
    issMesh.userData = { type: 'iss' };
    world.add(issMesh);

    const haloGeo = new THREE.SphereGeometry(0.06, 16, 12);
    const haloMat = new THREE.MeshBasicMaterial({color: COLOR.ember, transparent:true, opacity:0.18});
    const issHalo = new THREE.Mesh(haloGeo, haloMat);
    issHalo.userData = issMesh.userData;
    issMesh.add(issHalo);

    const issHitGeo = new THREE.SphereGeometry(0.11, 12, 8);
    const issHitMat = new THREE.MeshBasicMaterial({transparent:true, opacity:0});
    const issHit = new THREE.Mesh(issHitGeo, issHitMat);
    issHit.userData = issMesh.userData;
    issMesh.add(issHit);

    trailGroup = new THREE.Group();
    world.add(trailGroup);

    futureLine = new THREE.Line(
      new THREE.BufferGeometry(),
      new THREE.LineDashedMaterial({color: COLOR.ember, transparent:true, opacity:0.35, dashSize:0.04, gapSize:0.03})
    );
    world.add(futureLine);

    world.rotation.x = rotX;
    world.rotation.y = rotY;

    raycaster = new THREE.Raycaster();
    _labelWorldPos = new THREE.Vector3();
    _labelProjPos = new THREE.Vector3();

    canvas.style.touchAction = 'none';
    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    animate();

    requestAnimationFrame(()=>{ requestAnimationFrame(()=>{ canvas.classList.add('globe-ready'); }); });

    readyFallbackTimer = setTimeout(fireReady, READY_FALLBACK_MS);
  }

  function onPointerDown(e){
    dragging = true; autoRotate = false;
    lastX = e.clientX; lastY = e.clientY;
    downX = e.clientX; downY = e.clientY;
  }
  function onPointerMove(e){
    if(!dragging) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    rotY += dx * 0.006;
    rotX = Math.max(-1.3, Math.min(1.3, rotX + dy * 0.006));
  }
  function onPointerUp(e){
    dragging = false;

    if(Math.abs(e.clientX-downX) < 6 && Math.abs(e.clientY-downY) < 6){
      pickAndSelectMarkerAt(e.clientX, e.clientY);
    }
  }

  function pickAndSelectMarkerAt(clientX, clientY){
    if(!raycaster || !camera || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    if(rect.width===0 || rect.height===0) return;
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    raycaster.setFromCamera(ndc, camera);

    const targets = [issMesh];
    Object.values(otherSatMeshes).forEach(entry=>{
      if(entry.mesh.visible) targets.push(entry.mesh);
    });
    const hits = raycaster.intersectObjects(targets, true);

    let picked = null, pickedMesh = null;
    for(const h of hits){
      let obj = h.object;
      while(obj && !(obj.userData && obj.userData.type)) obj = obj.parent;
      if(obj && obj.userData && obj.userData.type){ picked = obj.userData; pickedMesh = obj; break; }
    }

    highlightMesh(pickedMesh);
    if(markerSelectCb) markerSelectCb(picked);
  }

  function highlightMesh(mesh){
    if(selectedMesh && selectedMesh !== mesh) selectedMesh.scale.set(1,1,1);
    selectedMesh = mesh || null;
    if(selectedMesh) selectedMesh.scale.set(1.7,1.7,1.7);
  }

  function clearMarkerSelection(){
    highlightMesh(null);
  }

  function onMarkerSelect(cb){
    markerSelectCb = cb;
  }

  function onLabelUpdate(cb){
    labelUpdateCb = cb;
  }

  function projectMarker(mesh, type, id){
    mesh.getWorldPosition(_labelWorldPos);
    const front = _labelWorldPos.z > -0.03;
    _labelProjPos.copy(_labelWorldPos).project(camera);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const x = (_labelProjPos.x * 0.5 + 0.5) * w;
    const y = (-_labelProjPos.y * 0.5 + 0.5) * h;
    return { type, id, x, y, visible: front && _labelProjPos.z < 1 };
  }

  function collectLabelMarkers(){
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if(!w || !h) return [];
    const out = [];
    if(issMesh && issMesh.visible) out.push(projectMarker(issMesh, 'iss', null));
    Object.keys(otherSatMeshes).forEach(id=>{
      const entry = otherSatMeshes[id];
      if(entry.mesh.visible) out.push(projectMarker(entry.mesh, 'other', id));
    });
    return out;
  }

  function setISSPosition(lat, lon){
    const p = latLonToVec3(lat, lon, 1.02);
    issMesh.position.copy(p);
  }

  function setTrail(trailArr){
    trailGroup.clear();
    if(trailArr.length < 2) return;
    const groups = 4;
    const chunk = Math.ceil(trailArr.length/groups);
    for(let g=0; g<groups; g++){
      const slice = trailArr.slice(g*chunk, g*chunk+chunk+1);
      if(slice.length < 2) continue;
      const pts = slice.map(p => latLonToVec3(p.lat, p.lon, 1.015));
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const opacity = 0.12 + (g/(groups-1))*0.55;
      const mat = new THREE.LineBasicMaterial({color: COLOR.ember, transparent:true, opacity});
      trailGroup.add(new THREE.Line(geo, mat));
    }
  }

  function setFuturePath(points){
    if(!points || points.length < 2) return;
    const pts = points.map(p => latLonToVec3(p.lat, p.lon, 1.015));
    futureLine.geometry.dispose();
    futureLine.geometry = new THREE.BufferGeometry().setFromPoints(pts);
    futureLine.computeLineDistances();
  }

  function setOtherSatellites(list){
    if(!Array.isArray(list)) return;
    const seen = new Set();
    list.forEach(sat=>{
      seen.add(sat.id);
      let entry = otherSatMeshes[sat.id];
      if(!entry){
        const geo = new THREE.SphereGeometry(0.024, 14, 10);
        const mat = new THREE.MeshBasicMaterial({color: sat.color});
        const mesh = new THREE.Mesh(geo, mat);
        mesh.userData = { type: 'other', id: sat.id };
        const haloGeo = new THREE.SphereGeometry(0.05, 14, 10);
        const haloMat = new THREE.MeshBasicMaterial({color: sat.color, transparent:true, opacity:0.2});
        const halo = new THREE.Mesh(haloGeo, haloMat);
        halo.userData = mesh.userData;
        mesh.add(halo);

        const hitGeo = new THREE.SphereGeometry(0.095, 10, 8);
        const hitMat = new THREE.MeshBasicMaterial({transparent:true, opacity:0});
        const hit = new THREE.Mesh(hitGeo, hitMat);
        hit.userData = mesh.userData;
        mesh.add(hit);
        world.add(mesh);
        entry = { mesh };
        otherSatMeshes[sat.id] = entry;
      }
      entry.mesh.visible = sat.visible !== false;
      if(!entry.mesh.visible && selectedMesh === entry.mesh){

        highlightMesh(null);
        if(markerSelectCb) markerSelectCb(null);
      }
      if(typeof sat.lat === 'number' && typeof sat.lon === 'number'){
        const r = altToRadius(sat.altKm);
        entry.mesh.position.copy(latLonToVec3(sat.lat, sat.lon, r));

        if(!entry.tether){
          const tetherGeo = new THREE.BufferGeometry().setFromPoints([
            latLonToVec3(sat.lat, sat.lon, 1.001), entry.mesh.position.clone()
          ]);
          const tetherMat = new THREE.LineBasicMaterial({color: sat.color, transparent:true, opacity:0.22});
          entry.tether = new THREE.Line(tetherGeo, tetherMat);
          world.add(entry.tether);
        } else {
          entry.tether.geometry.dispose();
          entry.tether.geometry = new THREE.BufferGeometry().setFromPoints([
            latLonToVec3(sat.lat, sat.lon, 1.001), entry.mesh.position.clone()
          ]);
        }
        entry.tether.visible = entry.mesh.visible;
      }
    });

    Object.keys(otherSatMeshes).forEach(id=>{
      if(!seen.has(id)){
        otherSatMeshes[id].mesh.visible = false;
        if(otherSatMeshes[id].tether) otherSatMeshes[id].tether.visible = false;
      }
    });
  }

  function setHistoryPath(points){
    if(historyLine){
      world.remove(historyLine);
      historyLine.geometry.dispose();
      historyLine = null;
    }
    if(!points || points.length < 2) return;
    const pts = points.map(p => latLonToVec3(p.lat, p.lon, 1.012));
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({color: COLOR.violet, transparent:true, opacity:0.32});
    historyLine = new THREE.Line(geo, mat);
    world.add(historyLine);
  }

  function setPlaybackMarker(lat, lon, visible){
    if(!playbackMesh){
      const geo = new THREE.SphereGeometry(0.03, 14, 10);
      const mat = new THREE.MeshBasicMaterial({color: COLOR.violet});
      playbackMesh = new THREE.Mesh(geo, mat);
      const haloGeo = new THREE.SphereGeometry(0.065, 14, 10);
      const haloMat = new THREE.MeshBasicMaterial({color: COLOR.violet, transparent:true, opacity:0.25});
      playbackMesh.add(new THREE.Mesh(haloGeo, haloMat));
      world.add(playbackMesh);
    }
    playbackMesh.visible = !!visible;
    if(visible && typeof lat === 'number' && typeof lon === 'number'){
      playbackMesh.position.copy(latLonToVec3(lat, lon, 1.03));
    }
  }

  function setObserver(lat, lon){
    if(!observerMesh){
      const geo = new THREE.SphereGeometry(0.022, 12, 10);
      const mat = new THREE.MeshBasicMaterial({color: COLOR.cyan});
      observerMesh = new THREE.Mesh(geo, mat);
      world.add(observerMesh);
    }
    observerMesh.visible = true;
    observerMesh.position.copy(latLonToVec3(lat, lon, 1.02));
  }

  function setGridVisible(visible){
    if(gridGroup) gridGroup.visible = !!visible;
  }

  function setTrailVisible(visible){
    if(trailGroup) trailGroup.visible = !!visible;
  }

  function setFutureVisible(visible){
    if(futureLine) futureLine.visible = !!visible;
  }

  function applyGlowUniform(){
    const v = Math.max(0, Math.min(1, lastGlowPct/100));
    if(glowMesh) glowMesh.material.opacity = 0.02 + v * 0.14;

    if(globeMat) globeMat.uniforms.nightBoost.value = 0.2 + v * 0.6;
  }

  function setGlowOpacity(pct){

    lastGlowPct = pct;
    applyGlowUniform();
  }

  function applyDayNightUniform(){
    if(!globeMat) return;
    globeMat.uniforms.dayNightOn.value = nightEnabled ? 1.0 : 0.0;
    if(typeof lastSubsolarLat === 'number' && typeof lastSubsolarLon === 'number'){
      const dir = latLonToVec3(lastSubsolarLat, lastSubsolarLon, 1);
      globeMat.uniforms.sunDir.value.copy(dir);
    }
  }

  function setDayNight(enabled, subsolarLat, subsolarLon){
    nightEnabled = !!enabled;
    if(typeof subsolarLat === 'number') lastSubsolarLat = subsolarLat;
    if(typeof subsolarLon === 'number') lastSubsolarLon = subsolarLon;
    applyDayNightUniform();
  }

  function setAutoRotate(enabled){
    autoRotate = !!enabled;
    if(autoRotate) dragging = false;
  }

  function isAutoRotate(){
    return autoRotate;
  }

  function zoomBy(delta){
    if(!camera) return;
    camera.position.z = Math.max(1.6, Math.min(5, camera.position.z + delta));
  }

  function resize(){
    if(!renderer || !canvas) return;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if(w===0||h===0) return;
    camera.aspect = w/h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }

  function animate(){
    raf = requestAnimationFrame(animate);
    if(autoRotate && !dragging) rotY += 0.0009;
    world.rotation.y = rotY;
    world.rotation.x = rotX;
    renderer.render(scene, camera);
    if(labelUpdateCb){
      try{ labelUpdateCb(collectLabelMarkers()); }catch(e){}
    }
  }

  global.ISSGlobe = { init, onReady, setISSPosition, setTrail, setFuturePath, setObserver, resize,
    setOtherSatellites, setHistoryPath, setPlaybackMarker,
    setGridVisible, setTrailVisible, setFutureVisible, setGlowOpacity, setDayNight,
    setAutoRotate, isAutoRotate, zoomBy, onMarkerSelect, onLabelUpdate, clearMarkerSelection };

})(window);
