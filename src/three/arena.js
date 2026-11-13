import * as THREE from 'three';

/**
 * Clean-room Procedural 3D Arena Stage:
 * - Sky/bottom linear shader backdrop (#3da9ff top -> #06254e bottom) + spotlight cones + bokeh
 * - Wide low-horizon boxing ring with corner turnbuckles, curved ropes, draped towel & corner stool
 * - Perspective-arched 3D beveled "NO MERCY Michel" hero plaque with 3D golden stars
 * - Continuous spline-lofted anatomical sculpted arms with Fresnel rim GI shader & 3D accessories
 */

function makeRadialGlowTexture(innerColor, outerColor, size = 256) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, innerColor);
  g.addColorStop(1, outerColor);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createArenaBackdrop() {
  const group = new THREE.Group();

  // Gradient sky wall with bright top-center arena spotlight bloom
  const skyUniforms = {
    uTopColor: { value: new THREE.Color(0x6bd0ff) },
    uBottomColor: { value: new THREE.Color(0x08346b) },
  };
  const skyMat = new THREE.ShaderMaterial({
    uniforms: skyUniforms,
    depthWrite: false,
    depthTest: false,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uTopColor;
      uniform vec3 uBottomColor;
      varying vec2 vUv;
      void main() {
        float h = smoothstep(0.10, 0.92, vUv.y);
        float spot = 1.0 - smoothstep(0.0, 0.56, distance(vUv, vec2(0.5, 0.62)));
        float cornerVignette = smoothstep(0.25, 0.88, distance(vUv, vec2(0.5, 0.52)));
        vec3 col = mix(uBottomColor, uTopColor, clamp(h * 0.55 + spot * 0.68, 0.0, 1.0));
        col += uTopColor * pow(spot, 1.8) * 0.38;
        col += vec3(0.45, 0.65, 0.72) * pow(spot, 3.6);
        col = mix(col, uBottomColor * 0.55, cornerVignette * 0.52);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const skyPlane = new THREE.Mesh(new THREE.PlaneGeometry(34, 22), skyMat);
  skyPlane.position.set(0, 1.8, -7.2);
  skyPlane.renderOrder = -10;
  group.add(skyPlane);

  // Volumetric animated spotlight cone shader (clean-room recreation of wave + rising smoke cones)
  const beamUniforms = {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(0x9ce3ff) },
  };
  const beamMat = new THREE.ShaderMaterial({
    uniforms: beamUniforms,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor;
      varying vec2 vUv;
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }
      float vnoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
          f.y
        );
      }
      void main() {
        float shape = clamp(1.0 - vUv.y * 0.88, 0.08, 1.0);
        float edge = 1.0 - abs(vUv.x * 2.0 - 1.0) / shape;
        float cone = smoothstep(0.0, 0.72, edge);
        float verticalFade = smoothstep(0.02, 0.35, vUv.y) * smoothstep(1.0, 0.18, vUv.y);
        float smoke = vnoise(vec2(vUv.x * 4.5, vUv.y * 3.5 - uTime * 0.12)) * 0.45 + 0.55;
        float waves = sin(vUv.y * 14.0 - uTime * 0.65) * 0.06 + 0.94;
        float alpha = cone * verticalFade * smoke * waves * 0.20;
        gl_FragColor = vec4(uColor * alpha, alpha);
      }
    `,
  });
  for (const [x, rotZ, scaleX] of [
    [-1.4, -0.20, 4.4],
    [1.4, 0.20, 4.4],
    [0, 0, 6.2],
  ]) {
    const beam = new THREE.Mesh(new THREE.PlaneGeometry(scaleX, 11.0), beamMat);
    beam.position.set(x, 3.2, -4.6);
    beam.rotation.z = rotZ;
    group.add(beam);
  }

  // Understated frosted lens bokeh across the upper sky (no oversized blobs).
  const bokehCount = 26;
  const bokehPos = new Float32Array(bokehCount * 3);
  const bokehPhase = new Float32Array(bokehCount);
  for (let i = 0; i < bokehCount; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    bokehPos[i * 3] = side * (1.4 + Math.random() * 4.6) + (Math.random() - 0.5) * 1.2;
    bokehPos[i * 3 + 1] = 0.25 + Math.random() * 3.6;
    bokehPos[i * 3 + 2] = -5.6 + Math.random() * 2.4;
    bokehPhase[i] = Math.random() * Math.PI * 2;
  }
  const bokehGeo = new THREE.BufferGeometry();
  bokehGeo.setAttribute('position', new THREE.BufferAttribute(bokehPos, 3));
  bokehGeo.setAttribute('aPhase', new THREE.BufferAttribute(bokehPhase, 1));
  const bokehMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(0xbcecff) },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute float aPhase;
      uniform float uTime;
      uniform float uPixelRatio;
      varying float vAlpha;
      varying float vPhase;
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        float shimmer = 0.68 + 0.32 * sin(uTime * 1.0 + aPhase);
        vAlpha = shimmer * 0.20;
        vPhase = aPhase;
        gl_PointSize = (76.0 + 62.0 * fract(aPhase)) * uPixelRatio / max(1.0, -mvPosition.z * 0.24);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      varying float vAlpha;
      void main() {
        float d = distance(gl_PointCoord, vec2(0.5));
        if (d > 0.5) discard;
        float inner = (1.0 - smoothstep(0.18, 0.48, d)) * 0.68;
        float rim = smoothstep(0.28, 0.40, d) * (1.0 - smoothstep(0.40, 0.50, d)) * 0.14;
        float shape = inner + rim;
        gl_FragColor = vec4(uColor, shape * vAlpha);
      }
    `,
  });
  group.add(new THREE.Points(bokehGeo, bokehMat));

  // Fine drifting spotlight dust motes
  const dustCount = 42;
  const dustPos = new Float32Array(dustCount * 3);
  const dustPhase = new Float32Array(dustCount);
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 6.5;
    dustPos[i * 3 + 1] = Math.random() * 3.8 - 0.1;
    dustPos[i * 3 + 2] = -2.8 + Math.random() * 3.4;
    dustPhase[i] = Math.random() * Math.PI * 2;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustTex = makeRadialGlowTexture('rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0)', 32);
  const dustMat = new THREE.PointsMaterial({
    map: dustTex,
    size: 0.045,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  group.add(new THREE.Points(dustGeo, dustMat));

  return {
    group,
    skyUniforms,
    beamUniforms,
    bokehMat,
    update(t) {
      beamUniforms.uTime.value = t;
      bokehMat.uniforms.uTime.value = t;
      const bAttr = bokehGeo.attributes.position;
      for (let i = 0; i < bokehCount; i++) {
        bAttr.array[i * 3 + 1] += 0.0012;
        bAttr.array[i * 3] += Math.sin(t * 0.45 + bokehPhase[i]) * 0.0007;
        if (bAttr.array[i * 3 + 1] > 4.6) bAttr.array[i * 3 + 1] = -0.2;
      }
      bAttr.needsUpdate = true;

      const dAttr = dustGeo.attributes.position;
      for (let i = 0; i < dustCount; i++) {
        dAttr.array[i * 3 + 1] += 0.0022;
        dAttr.array[i * 3] += Math.cos(t * 0.7 + dustPhase[i]) * 0.0011;
        if (dAttr.array[i * 3 + 1] > 3.8) dAttr.array[i * 3 + 1] = -0.1;
      }
      dAttr.needsUpdate = true;
    },
  };
}

export function createBoxingRing() {
  const ringGroup = new THREE.Group();

  // Neutral grayscale canvas floor (tinted dynamically per route mood in Stage.js)
  const matCanvas = document.createElement('canvas');
  matCanvas.width = 512;
  matCanvas.height = 512;
  const ctx = matCanvas.getContext('2d');
  const g = ctx.createRadialGradient(256, 256, 30, 256, 256, 255);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.55, '#8c96a6');
  g.addColorStop(1, '#262b33');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);
  ctx.strokeStyle = 'rgba(255,255,255,0.035)';
  for (let i = 0; i < 512; i += 4) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }
  const floorTex = new THREE.CanvasTexture(matCanvas);
  floorTex.colorSpace = THREE.SRGBColorSpace;

  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x3a84cc,
    map: floorTex,
    roughness: 0.82,
    metalness: 0.04,
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(18, 18), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.20;
  ringGroup.add(floor);

  const shadowTex = makeRadialGlowTexture('rgba(0, 6, 18, 0.72)', 'rgba(0, 6, 18, 0)', 128);
  const contactShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.8, 1.4),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }),
  );
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.set(0, -0.19, 0.05);
  ringGroup.add(contactShadow);

  // Diagonal corner perspective matching Ho (-0.19 * Math.PI rotation without front rope occlusion)
  const postMat = new THREE.MeshStandardMaterial({ color: 0x102d54, roughness: 0.48, metalness: 0.35 });
  const padMat = new THREE.MeshStandardMaterial({ color: 0x2466ad, roughness: 0.46, metalness: 0.12 });
  const ropeMat = new THREE.MeshStandardMaterial({ color: 0x07101e, roughness: 0.36, metalness: 0.38 });

  const cLeft = [-3.35, -1.85];
  const cRight = [3.20, -2.95];
  const cFrontLeft = [-4.65, 1.85];
  const cFrontRight = [4.55, 1.35];

  for (const [cx, cz] of [cLeft, cRight]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.13, 1.85, 16), postMat);
    post.position.set(cx, 0.72, cz);
    ringGroup.add(post);

    const dirX = -Math.sign(cx);
    for (const ry of [0.30, 0.72, 1.14]) {
      const pad = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.22, 6, 12), padMat);
      pad.position.set(cx + dirX * 0.22, ry, cz + 0.12);
      pad.rotation.z = dirX * 0.2;
      pad.lookAt(0, ry, 0);
      ringGroup.add(pad);
    }
  }

  // Softly curved catenary ropes spanning back & outer left/right wings (never across front)
  const ropesGroup = new THREE.Group();
  const segments = [
    [cFrontLeft, cLeft, 0.08],
    [cLeft, cRight, 0.14],
    [cRight, cFrontRight, 0.08],
  ];
  for (const ry of [0.30, 0.72, 1.14]) {
    for (const [[x1, z1], [x2, z2], sag] of segments) {
      const midX = (x1 + x2) * 0.5;
      const midZ = (z1 + z2) * 0.5;
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(x1, ry, z1),
        new THREE.Vector3(midX, ry - sag, midZ),
        new THREE.Vector3(x2, ry, z2),
      );
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.026, 8, false), ropeMat);
      ropesGroup.add(tube);
    }
  }
  ringGroup.add(ropesGroup);

  // Folded cloth towel draped directly over the right wing top rope (y = 1.14)
  const towelMat = new THREE.MeshStandardMaterial({ color: 0x7b8ea8, roughness: 0.92, side: THREE.DoubleSide });
  const towelGroup = new THREE.Group();
  const towelFront = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.54, 0.028), towelMat);
  towelFront.position.set(0, -0.27, 0.032);
  towelFront.rotation.x = 0.05;
  const towelBack = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.48, 0.028), towelMat);
  towelBack.position.set(0, -0.24, -0.028);
  towelBack.rotation.x = -0.05;
  const towelFold = new THREE.Mesh(
    new THREE.CylinderGeometry(0.044, 0.044, 0.46, 12, 1, false, 0, Math.PI),
    towelMat,
  );
  towelFold.rotation.z = Math.PI / 2;
  towelGroup.add(towelFront, towelBack, towelFold);
  // Compute midpoint on right wing top rope (cRight -> cFrontRight, sag = 0.08 at t=0.36)
  const ropeSpan = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(cRight[0], 1.14, cRight[1]),
    new THREE.Vector3((cRight[0] + cFrontRight[0]) * 0.5, 1.14 - 0.08, (cRight[1] + cFrontRight[1]) * 0.5),
    new THREE.Vector3(cFrontRight[0], 1.14, cFrontRight[1]),
  );
  const towelAnchor = ropeSpan.getPointAt(0.22);
  const towelTangent = ropeSpan.getTangentAt(0.22).normalize();
  towelGroup.position.copy(towelAnchor);
  towelGroup.rotation.y = Math.atan2(towelTangent.z, towelTangent.x) * -1 + Math.PI * 0.5;
  ringGroup.add(towelGroup);

  // Wooden corner stool inside right corner
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c3621, roughness: 0.78 });
  const stoolGroup = new THREE.Group();
  stoolGroup.position.set(2.55, -0.20, -2.35);
  const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.06, 16), woodMat);
  seat.position.y = 0.42;
  stoolGroup.add(seat);
  for (const [lx, lz] of [
    [-0.12, -0.12],
    [0.12, -0.12],
    [-0.12, 0.12],
    [0.12, 0.12],
  ]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.022, 0.44, 8), woodMat);
    leg.position.set(lx, 0.21, lz);
    stoolGroup.add(leg);
  }
  ringGroup.add(stoolGroup);

  ringGroup.position.y = -0.55;
  return { group: ringGroup, ropesGroup, floor, floorMat, postMat, padMat, ropeMat, towelMat };
}

export function createLogoPlaque() {
  const c = document.createElement('canvas');
  c.width = 1408;
  c.height = 704;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 1408, 704);

  // Perspective arched brushed-metal backing plank spanning full curved frame around MERCY
  ctx.save();
  ctx.translate(704, 340);
  const plankGrad = ctx.createLinearGradient(-640, -100, 640, 115);
  plankGrad.addColorStop(0, '#626b78');
  plankGrad.addColorStop(0.25, '#8e99a8');
  plankGrad.addColorStop(0.50, '#b2bcc9');
  plankGrad.addColorStop(0.78, '#7e8896');
  plankGrad.addColorStop(1, '#545d6a');
  ctx.fillStyle = plankGrad;
  ctx.strokeStyle = '#cfd8e3';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(-500, -104);
  ctx.quadraticCurveTo(0, -158, 500, -104);
  ctx.lineTo(560, 150);
  ctx.quadraticCurveTo(0, 92, -560, 150);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Subtle brushed metal grain & stone speckle across plaque
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 2;
  for (let y = -94; y <= 120; y += 8) {
    ctx.beginPath();
    ctx.moveTo(-500, y);
    ctx.quadraticCurveTo(0, y - 34, 500, y);
    ctx.stroke();
  }

  // Deep extruded 3D dark metallic under-bevel lip
  ctx.fillStyle = '#2d3440';
  ctx.beginPath();
  ctx.moveTo(-548, 128);
  ctx.quadraticCurveTo(0, 70, 548, 128);
  ctx.lineTo(562, 160);
  ctx.quadraticCurveTo(0, 98, -562, 160);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 4 Extruded Golden Stars flanking warm tangerine "NO"
  function drawStar(cx, cy, r) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = '#9a5f08';
    for (let d = 7; d >= 1; d--) {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = (i * Math.PI) / 5 - Math.PI / 2;
        const rad = i % 2 === 0 ? r : r * 0.48;
        const x = Math.cos(a) * rad;
        const y = Math.sin(a) * rad + d * 1.1;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    }
    const sg = ctx.createLinearGradient(0, -r, 0, r);
    sg.addColorStop(0, '#fff7b0');
    sg.addColorStop(1, '#f8be34');
    ctx.fillStyle = sg;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i * Math.PI) / 5 - Math.PI / 2;
      const rad = i % 2 === 0 ? r : r * 0.48;
      const x = Math.cos(a) * rad;
      const y = Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  drawStar(464, 152, 31);
  drawStar(542, 140, 34);
  drawStar(866, 140, 34);
  drawStar(944, 152, 31);

  // Warm orange extruded "NO" directly behind/above MERCY
  ctx.save();
  ctx.font = '900 156px "Barlow Condensed", Impact, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let d = 14; d >= 1; d--) {
    ctx.fillStyle = '#8c420e';
    ctx.fillText('NO', 704, 134 + d * 1.35);
  }
  const noG = ctx.createLinearGradient(0, 62, 0, 198);
  noG.addColorStop(0, '#ffd48e');
  noG.addColorStop(0.55, '#f79540');
  noG.addColorStop(1, '#df631a');
  ctx.fillStyle = noG;
  ctx.fillText('NO', 704, 132);
  ctx.restore();

  // Perspective arched 3D extruded "MERCY" curved neatly inside/over plaque
  const letters = ['M', 'E', 'R', 'C', 'Y'];
  const xOffsets = [-425, -210, 0, 210, 425];
  const yOffsets = [18, -10, -22, -10, 18];
  const rots = [-0.085, -0.038, 0, 0.038, 0.085];

  letters.forEach((ch, idx) => {
    ctx.save();
    ctx.translate(704 + xOffsets[idx], 338 + yOffsets[idx]);
    ctx.rotate(rots[idx]);
    ctx.font = '900 318px "Barlow Condensed", Impact, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Deep 3D block extrusion fanning down & inward toward vanishing point
    for (let d = 24; d >= 1; d--) {
      ctx.fillStyle = d > 15 ? '#692507' : '#ad4712';
      ctx.fillText(ch, (idx - 2) * -0.52 * d, d * 1.25);
    }

    const lg = ctx.createLinearGradient(0, -135, 0, 125);
    lg.addColorStop(0, '#ffd28e');
    lg.addColorStop(0.45, '#f88630');
    lg.addColorStop(1, '#db5412');
    ctx.fillStyle = lg;
    ctx.fillText(ch, 0, 0);
    ctx.restore();
  });

  // Vivid aqua neon cursive tube "Michel" overlapping front-bottom of arch
  ctx.save();
  ctx.font = 'italic 400 166px "Yellowtail", "Brush Script MT", cursive';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#28dcff';
  ctx.shadowBlur = 42;
  ctx.strokeStyle = '#6cf0ff';
  ctx.lineWidth = 10;
  ctx.strokeText('Michel', 704, 482);
  ctx.fillStyle = '#ffffff';
  ctx.fillText('Michel', 704, 482);
  ctx.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;

  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(3.95, 1.975),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }),
  );
  mesh.position.set(0, 1.84, -0.82);
  return mesh;
}

function makeSkinTexture(baseHex, tattoos = []) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d');
  ctx.fillStyle = `#${new THREE.Color(baseHex).getHexString()}`;
  ctx.fillRect(0, 0, 512, 512);

  // Warm natural skin gradient & subtle tonal shift
  const sheen = ctx.createLinearGradient(0, 0, 0, 512);
  sheen.addColorStop(0, 'rgba(255,232,216,0.10)');
  sheen.addColorStop(0.48, 'rgba(255,255,255,0)');
  sheen.addColorStop(1, 'rgba(30,8,4,0.12)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, 512, 512);

  if (tattoos.length > 0) {
    const isLight = new THREE.Color(baseHex).getHSL({ h: 0, s: 0, l: 0 }).l > 0.45;
    ctx.strokeStyle = isLight ? 'rgba(28, 22, 20, 0.78)' : 'rgba(14, 8, 8, 0.80)';
    ctx.fillStyle = isLight ? 'rgba(28, 22, 20, 0.78)' : 'rgba(14, 8, 8, 0.80)';
    ctx.lineWidth = 3.2;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Left bicep: NO REGERTS near top shoulder, R.I.P. tombstone below it above bandana, ★ on forearm
    // Right bicep/forearm: BIG I'M TIRED on sunlit upper arm + anchor & heart above it
    // With flipY disabled, canvas y=0 is the shoulder and y=512 the wrist.
    // Both arms face the camera around u=0.25 (canvas x≈128), so all ink
    // lives in the left half of its own texture.
    const leftSlots = [
      [126, 58, -0.35, 0.86, 0.86], // top shoulder NO REGERTS
      [128, 132, -0.22, 0.82, 0.82], // upper bicep R.I.P. tombstone above bandana
      [168, 336, -0.08, 1, 1], // forearm star
    ];
    const rightSlots = [
      [146, 180, -0.75, 0.9, 0.9], // upper-arm I'M TIRED, clear of the form
      [142, 80, -0.60, 0.9, 0.9], // top shoulder anchor
      [164, 120, -0.60, 0.9, 0.9], // upper shoulder heart
    ];

    tattoos.slice(0, 4).forEach((name, idx) => {
      const slot = (isLight ? rightSlots : leftSlots)[idx] || [256, 200 + idx * 50, 0, -1, 1];
      const [x, y, rot, sx, sy] = slot;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(sx, sy);
      ctx.rotate(rot);
      const id = String(name || '').toLowerCase();
      if (id.includes('regret') || id.includes('noregret')) {
        ctx.font = '800 21px "Barlow Condensed", sans-serif';
        ctx.fillText('NO', 0, -11);
        ctx.fillText('REGERTS', 0, 11);
      } else if (id.includes('rip')) {
        ctx.beginPath();
        ctx.arc(0, -10, 17, Math.PI, 0);
        ctx.lineTo(17, 19);
        ctx.lineTo(-17, 19);
        ctx.closePath();
        ctx.stroke();
        ctx.font = '800 12px "Barlow Condensed", sans-serif';
        ctx.fillText('R.I.P.', 0, 2);
      } else if (id.includes('tired')) {
        ctx.font = '900 40px "Barlow Condensed", sans-serif';
        ctx.fillText("I'M", 0, -20);
        ctx.fillText('TIRED', 0, 20);
      } else if (id.includes('anchor')) {
        ctx.beginPath();
        ctx.arc(0, -18, 7, 0, Math.PI * 2);
        ctx.moveTo(0, -11);
        ctx.lineTo(0, 22);
        ctx.moveTo(-14, 3);
        ctx.lineTo(14, 3);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 12, 16, 0.25, Math.PI - 0.25);
        ctx.stroke();
      } else if (id.includes('cross') || id.includes('heart')) {
        ctx.beginPath();
        ctx.moveTo(0, 12);
        ctx.bezierCurveTo(-22, -4, -12, -20, 0, -6);
        ctx.bezierCurveTo(12, -20, 22, -4, 0, 12);
        ctx.stroke();
      } else {
        ctx.font = 'bold 26px "Barlow Condensed", sans-serif';
        ctx.fillText('★', 0, 0);
      }
      ctx.restore();
    });
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  // Keep canvas y=0 at the shoulder so tattoo lettering is not flipped.
  tex.flipY = false;
  return tex;
}

/**
 * Generates a single continuous organic spline-lofted anatomical arm BufferGeometry
 * using an analytical Z-up Bishop frame so the inner elbow crease NEVER twists or pinches.
 */
function buildLoftedArmData(s, pose = 'clasp') {
  // Home uses a wide crossed-forearm X: shoulders start off the bottom corners
  // and the wrists meet high at the centre. The EndWin variant folds the same
  // anatomy into a vertical bicep flex with the fist raised.
  const pathPoints = pose === 'flex'
    ? [
        new THREE.Vector3(s * -0.75, 0.78, -0.04), // shoulder out to the left
        new THREE.Vector3(s * -0.54, 0.48, -0.02),
        new THREE.Vector3(s * -0.22, 0.18, 0.00),
        new THREE.Vector3(s * 0.06, 0.10, 0.01), // elbow at the bottom
        new THREE.Vector3(s * 0.32, 0.28, 0.03),
        new THREE.Vector3(s * 0.56, 0.52, 0.04),
        new THREE.Vector3(s * 0.88, 0.82, 0.05), // raised hand
      ]
    : [
        new THREE.Vector3(s * 1.25, 0.68, -0.04), // shoulder high at the outer edge
        new THREE.Vector3(s * 1.05, 0.42, -0.02),
        new THREE.Vector3(s * 0.78, 0.10, -0.005),
        new THREE.Vector3(s * 0.50, -0.18, 0.00), // rounded elbow low near centre
        new THREE.Vector3(s * 0.36, 0.12, 0.02),
        new THREE.Vector3(s * 0.20, 0.44, 0.038),
        new THREE.Vector3(s * 0.04, 0.74, 0.05), // wrist into the central clasp
      ];
  const curve = new THREE.CatmullRomCurve3(pathPoints);
  const segs = 64;
  const radialSegs = 32;
  const zAxis = new THREE.Vector3(0, 0, 1);

  const positions = [];
  const uvs = [];
  const indices = [];

  function profileRadius(t) {
    // Curve-safe muscular proportions (R_tube < R_curve prevents inner crimp)
    if (t < 0.06) {
      const k = 1 - t / 0.06;
      return 0.285 * Math.sqrt(Math.max(0, 1 - k * k)) + 0.004;
    }
    if (t > 0.90) {
      const k = (t - 0.90) / 0.10;
      return 0.100 * Math.sqrt(Math.max(0, 1 - k * k)) + 0.004;
    }
    if (t < 0.55) {
      const k = (t - 0.06) / 0.49;
      const bicep = Math.sin(k * Math.PI) * 0.034;
      return 0.275 - 0.035 * k + bicep;
    }
    if (t < 0.90) {
      const k = (t - 0.55) / 0.35;
      const fore = Math.sin(k * Math.PI) * 0.026;
      return 0.215 - 0.052 * k + fore;
    }
    return 0.10;
  }

  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const center = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();
    // Twist-free Bishop frame anchored to scene Z
    const N = new THREE.Vector3().crossVectors(tangent, zAxis).normalize();
    const B = new THREE.Vector3().crossVectors(N, tangent).normalize();
    const r = profileRadius(t);
    const rx = r * 0.97;
    const ry = r * 1.03;

    for (let j = 0; j <= radialSegs; j++) {
      const angle = (j / radialSegs) * Math.PI * 2;
      const cos = Math.cos(angle) * rx;
      const sin = Math.sin(angle) * ry;
      const vx = center.x + cos * N.x + sin * B.x;
      const vy = center.y + cos * N.y + sin * B.y;
      const vz = center.z + cos * N.z + sin * B.z;
      positions.push(vx, vy, vz);
      uvs.push(j / radialSegs, t);
    }
  }

  const row = radialSegs + 1;
  for (let i = 0; i < segs; i++) {
    for (let j = 0; j < radialSegs; j++) {
      const a = i * row + j;
      const b = (i + 1) * row + j;
      const c = (i + 1) * row + (j + 1);
      const d = i * row + (j + 1);
      indices.push(a, b, d, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return { geo, curve, profileRadius };
}

export function createSculptedArm({
  mirror = false,
  pose = 'clasp',
  skinHex = 0xe38956,
  envMapIntensity = 0.52,
  tattoos = [],
  showBandana = false,
  showChain = false,
  showRing = false,
  showBandaid = false,
} = {}) {
  const root = new THREE.Group();
  const s = mirror ? 1 : -1;

  const skinTex = makeSkinTexture(skinHex, tattoos);
  const rimUniform = { value: new THREE.Color(0x3fa4ff) };
  const timeUniform = { value: 0 };
  const effortUniform = { value: 0 };

  // Glossy ring-lit skin: darker warm brown on the left, pale peach on the right.
  const skinMat = new THREE.MeshPhysicalMaterial({
    map: skinTex,
    roughness: 0.62,
    metalness: 0.03,
    clearcoat: 0.55,
    clearcoatRoughness: 0.34,
    envMapIntensity,
  });

  // Inject Fresnel rim GI, warm elbow crease AO, and effort-driven procedural sweat micro-highlights
  skinMat.onBeforeCompile = (shader) => {
    shader.uniforms.uRimColor = rimUniform;
    shader.uniforms.uTime = timeUniform;
    shader.uniforms.uEffort = effortUniform;
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform vec3 uRimColor;
        uniform float uTime;
        uniform float uEffort;
        float sweatHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }`,
      )
      .replace(
        '#include <dithering_fragment>',
        `
        vec3 viewDirRim = normalize(vViewPosition);
        float fresnel = pow(1.0 - clamp(dot(normal, viewDirRim), 0.0, 1.0), 2.4);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, uRimColor, fresnel * 0.34);
        if (uEffort > 0.02) {
          vec2 dropGrid = vec2(vMapUv.x * 16.0, vMapUv.y * 12.0 + uTime * 0.35);
          vec2 cell = floor(dropGrid);
          vec2 gv = fract(dropGrid) - 0.5;
          float rnd = sweatHash(cell);
          float d = length(gv - vec2(0.0, (rnd - 0.5) * 0.4));
          float drop = smoothstep(0.18, 0.05, d) * step(0.62, rnd) * uEffort;
          gl_FragColor.rgb += vec3(0.32, 0.38, 0.42) * drop;
        }
        #include <dithering_fragment>
        `,
      );
  };

  const pivot = new THREE.Group();
  root.add(pivot);

  const { geo: armGeo, curve, profileRadius } = buildLoftedArmData(s, pose);
  const armMesh = new THREE.Mesh(armGeo, skinMat);
  pivot.add(armMesh);

  const wristPoint = curve.getPointAt(1);
  const isFlex = pose === 'flex';

  // Interlocked clasp: the pale fist sits behind while the dark hand reaches
  // across it with four long purple-nailed fingers.
  const hand = new THREE.Group();
  const palm = new THREE.Mesh(
    new THREE.SphereGeometry(isFlex ? 0.260 : mirror ? 0.195 : 0.235, 24, 20),
    skinMat,
  );
  palm.scale.set(isFlex ? 1.06 : 1.02, isFlex ? 1.14 : 0.96, isFlex ? 0.72 : 0.68);
  hand.add(palm);

  if (!mirror && !isFlex) {
    hand.position.set(wristPoint.x - 0.005, wristPoint.y + 0.01, wristPoint.z + 0.02);
    const mainThumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.048, 0.13, 6, 12), skinMat);
    mainThumb.position.set(-0.075, 0.07, 0.12);
    mainThumb.rotation.z = -0.78;
    hand.add(mainThumb);

    const nailMat = new THREE.MeshPhysicalMaterial({
      color: 0xa74dff,
      roughness: 0.12,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
      emissive: 0x23003f,
      emissiveIntensity: 0.45,
    });
    for (let i = 0; i < 4; i++) {
      const y = 0.20 - i * 0.058;
      const finger = new THREE.Mesh(new THREE.CapsuleGeometry(0.041, 0.195, 8, 14), skinMat);
      finger.rotation.z = Math.PI * 0.5 - 0.10;
      finger.rotation.y = -0.22;
      finger.position.set(0.04, y, 0.16);
      hand.add(finger);

      const nail = new THREE.Mesh(new THREE.SphereGeometry(0.041, 12, 10), nailMat);
      nail.scale.set(1.55, 0.92, 0.62);
      nail.rotation.z = -0.12;
      nail.position.set(0.182, y + 0.005, 0.195);
      hand.add(nail);
    }
  } else if (mirror && !isFlex) {
    hand.position.set(wristPoint.x + 0.005, wristPoint.y + 0.01, wristPoint.z - 0.05);
    const knuckle = new THREE.Mesh(new THREE.SphereGeometry(0.125, 18, 16), skinMat);
    knuckle.scale.set(1.12, 0.78, 0.90);
    knuckle.position.set(0.015, 0.075, 0.025);
    hand.add(knuckle);
    const oppThumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.048, 0.11, 6, 12), skinMat);
    oppThumb.position.set(-0.08, 0.10, 0.045);
    oppThumb.rotation.z = 0.82;
    hand.add(oppThumb);
  } else {
    // EndWin diva hand: open palm, four long fingers fanned upward, thumb out.
    hand.position.set(wristPoint.x, wristPoint.y + 0.02, wristPoint.z + 0.03);
    hand.rotation.z = -0.16;
    for (let i = 0; i < 4; i++) {
      const finger = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.042, 0.265 - Math.abs(i - 1.5) * 0.020, 8, 12),
        skinMat,
      );
      finger.position.set(-0.15 + i * 0.10, 0.30 - Math.abs(i - 1.5) * 0.016, 0.03);
      finger.rotation.z = (i - 1.5) * 0.13;
      hand.add(finger);
    }
    const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.20, 8, 12), skinMat);
    thumb.position.set(-0.245, 0.15, 0.07);
    thumb.rotation.z = 0.86;
    hand.add(thumb);
  }
  pivot.add(hand);

  // Tangent-aligned 3D Cosmetics hugging exact spline cross-sections
  const zUp = new THREE.Vector3(0, 0, 1);
  const bandanaT = 0.32;
  const bandanaRTop = profileRadius(bandanaT - 0.03) * 1.06;
  const bandanaRBot = profileRadius(bandanaT + 0.03) * 1.06;
  const bandanaGroup = new THREE.Group();
  const bandanaMat = new THREE.MeshStandardMaterial({ color: 0xa42234, roughness: 0.70 });
  const bandanaWrap = new THREE.Mesh(
    new THREE.CylinderGeometry(bandanaRBot, bandanaRTop, 0.095, 28, 1, false),
    bandanaMat,
  );
  bandanaGroup.add(bandanaWrap);
  // Tied knot + 2 fabric tails on outer arm edge (+bandanaRBot in local oriented coords)
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.048, 10, 10), bandanaMat);
  knot.position.set(bandanaRBot * 0.96, 0.0, 0.05);
  bandanaGroup.add(knot);
  for (const [rx, rz, len] of [
    [-0.35, 0.55, 0.14],
    [0.25, 0.85, 0.12],
  ]) {
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.042, len, 0.014), bandanaMat);
    tail.position.set(bandanaRBot * 1.10, -0.055, 0.04);
    tail.rotation.set(rx, 0, rz);
    bandanaGroup.add(tail);
  }
  bandanaGroup.position.copy(curve.getPointAt(bandanaT));
  bandanaGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), curve.getTangentAt(bandanaT).normalize());
  bandanaGroup.visible = showBandana;
  pivot.add(bandanaGroup);

  // Thick metallic curb chain links around wrist
  const chainT = 0.84;
  const chainR = profileRadius(chainT) * 1.04;
  const chainGroup = new THREE.Group();
  const chainMat = new THREE.MeshStandardMaterial({ color: 0xdce4ee, roughness: 0.20, metalness: 0.94 });
  const linkCount = 14;
  for (let i = 0; i < linkCount; i++) {
    const a = (i / linkCount) * Math.PI * 2;
    const link = new THREE.Mesh(new THREE.TorusGeometry(0.031, 0.011, 7, 14), chainMat);
    link.position.set(Math.cos(a) * chainR, Math.sin(a) * chainR, 0);
    link.rotation.z = a + Math.PI * 0.5;
    link.rotation.x = i % 2 === 0 ? 0.58 : -0.58;
    chainGroup.add(link);
  }
  chainGroup.position.copy(curve.getPointAt(chainT));
  chainGroup.quaternion.setFromUnitVectors(zUp, curve.getTangentAt(chainT).normalize());
  chainGroup.visible = showChain;
  pivot.add(chainGroup);

  // Pill-shaped bandaid with gauze pad texture flush on lower forearm
  const bCanvas = document.createElement('canvas');
  bCanvas.width = 128;
  bCanvas.height = 64;
  const bCtx = bCanvas.getContext('2d');
  bCtx.fillStyle = '#e8b36b';
  bCtx.fillRect(0, 0, 128, 64);
  bCtx.fillStyle = '#f8dcb4';
  bCtx.fillRect(42, 10, 44, 44);
  bCtx.fillStyle = 'rgba(130, 80, 30, 0.35)';
  for (let px = 12; px <= 32; px += 8) {
    for (let py = 16; py <= 48; py += 16) {
      bCtx.fillRect(px, py, 3, 3);
      bCtx.fillRect(128 - px, py, 3, 3);
    }
  }
  const bandaidTex = new THREE.CanvasTexture(bCanvas);
  bandaidTex.colorSpace = THREE.SRGBColorSpace;
  const bandaidPt = curve.getPointAt(0.68);
  const bandaidMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.118, 0.046, 0.012),
    new THREE.MeshStandardMaterial({ map: bandaidTex, roughness: 0.72 }),
  );
  bandaidMesh.position.set(bandaidPt.x, bandaidPt.y, bandaidPt.z + profileRadius(0.68) * 1.03);
  bandaidMesh.rotation.z = s * -0.55;
  bandaidMesh.visible = showBandaid;
  pivot.add(bandaidMesh);

  const ringGroup = new THREE.Group();
  const ringBand = new THREE.Mesh(
    new THREE.TorusGeometry(0.060, 0.015, 8, 20),
    new THREE.MeshStandardMaterial({ color: 0xffd54a, roughness: 0.2, metalness: 0.92 }),
  );
  const ringGem = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.068, 0),
    new THREE.MeshPhysicalMaterial({ color: 0x52a8ff, roughness: 0.08, clearcoat: 1 }),
  );
  ringGem.position.set(0, 0.015, 0.036);
  ringGroup.add(ringBand, ringGem);
  ringGroup.position.set(
    wristPoint.x + s * (isFlex ? 0.105 : 0.045),
    wristPoint.y + (isFlex ? 0.225 : 0.005),
    wristPoint.z + (isFlex ? 0.20 : 0.155),
  );
  ringGroup.visible = showRing;
  pivot.add(ringGroup);

  return {
    root,
    pivot,
    skinMat,
    rimUniform,
    ringGroup,
    update(t, effort = 0) {
      timeUniform.value = t;
      effortUniform.value = effort;
    },
    applyCosmetics({ accessories = [], tattoosList = [] } = {}) {
      bandanaGroup.visible = accessories.length >= 1;
      chainGroup.visible = accessories.length >= 2;
      ringGroup.visible = accessories.length >= 3;
      bandaidMesh.visible = accessories.length >= 4;
      if (tattoosList.length > 0) {
        skinMat.map?.dispose?.();
        skinMat.map = makeSkinTexture(skinHex, tattoosList);
        skinMat.needsUpdate = true;
      }
    },
  };
}

/**
 * Reverse-engineered piecewise arm clasp curve Wi:
 * Maps normalized match progress [0, 1] through control points:
 * [[0.16, 0], [0.22, 1], [0.5, 0], [0.78, -1], [0.84, 0]]
 */
export function evaluateClaspCurve(progress) {
  if (progress <= 0.16) return 0;
  if (progress >= 0.84) return 0;
  if (progress < 0.22) {
    return (progress - 0.16) / (0.22 - 0.16);
  }
  if (progress < 0.50) {
    return 1 - (progress - 0.22) / (0.50 - 0.22);
  }
  if (progress < 0.78) {
    return -(progress - 0.50) / (0.78 - 0.50);
  }
  return -1 + (progress - 0.78) / (0.84 - 0.78);
}
