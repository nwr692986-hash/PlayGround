import * as THREE from 'three';
import {
  clamp, rand, pick, smoothstep, mulberry32, canvasTexture, textTexture,
} from './utils.js';

export const BLOCK = 70;
export const BLOCK_HALF = 26;
export const CITY_RADIUS = 3;
export const ROAD_LINES = [-245, -175, -105, -35, 35, 105, 175, 245];
export const WORLD_LIMIT = 320;

export const LANDMARKS = {
  safehouse: { x: -210, z: 160 },
  garage: { x: -140, z: 98 },
  hospital: { x: -70, z: 98 },
  spray: { x: 70, z: -112 },
  park: { x: 140, z: 140 },
  airport: { x: 300, z: -160 },
  downtown: { x: 140, z: 0 },
  beach: { x: 0, z: 290 },
  tower: { x: 140, z: 0 },
};

const PALETTES = {
  residential: [0xc9a27a, 0xb9775b, 0x7d9b91, 0xd8c39e, 0xa45b4f, 0x6f7f8c, 0xcfae8a],
  downtown: [0x5d7183, 0x475a6b, 0x74808c, 0x6b7589, 0x8b8f95, 0x3f4e5c, 0x9a8a78],
  industrial: [0x8a7256, 0x6d6152, 0x7b6b56, 0x9a7d5b, 0x5f645f, 0x8b5e4a],
  beach: [0xe0c6a8, 0xd8a68e, 0xa9c5bd, 0xefe0c8, 0xcaa8b8, 0x88aab2],
};

function districtOf(i, j) {
  if (j >= 2) return 'beach';
  if (i >= 1 && j <= 0) return 'downtown';
  if (i >= 1 && j >= 1) return 'industrial';
  return 'residential';
}

function makeAsphaltTexture() {
  return canvasTexture(256, 256, (ctx, w, h) => {
    const rng = mulberry32(7);
    ctx.fillStyle = '#343b41';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) {
      const v = 30 + Math.floor(rng() * 34);
      ctx.fillStyle = `rgba(${v},${v + 2},${v + 3},${0.25 + rng() * 0.35})`;
      const s = rng() * 2 + 0.5;
      ctx.fillRect(rng() * w, rng() * h, s, s);
    }
    ctx.strokeStyle = 'rgba(12,14,16,0.55)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 9; i++) {
      ctx.beginPath();
      const x = rng() * w;
      const y = rng() * h;
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rng() - 0.5) * 50, y + (rng() - 0.5) * 30);
      ctx.stroke();
    }
  });
}

function makeSidewalkTexture() {
  return canvasTexture(256, 256, (ctx, w, h) => {
    const rng = mulberry32(11);
    ctx.fillStyle = '#77746c';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 5000; i++) {
      const v = 95 + Math.floor(rng() * 45);
      ctx.fillStyle = `rgba(${v},${v - 2},${v - 6},0.25)`;
      ctx.fillRect(rng() * w, rng() * h, 1.5, 1.5);
    }
    ctx.strokeStyle = 'rgba(45,44,42,0.55)';
    ctx.lineWidth = 3;
    for (let i = 0; i <= 4; i++) {
      ctx.beginPath();
      ctx.moveTo((i * w) / 4, 0);
      ctx.lineTo((i * w) / 4, h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, (i * h) / 4);
      ctx.lineTo(w, (i * h) / 4);
      ctx.stroke();
    }
  });
}

function makeSandTexture() {
  return canvasTexture(256, 256, (ctx, w, h) => {
    const rng = mulberry32(19);
    ctx.fillStyle = '#c7a575';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 7000; i++) {
      const v = 150 + Math.floor(rng() * 80);
      ctx.fillStyle = `rgba(${v},${v - 20},${v - 60},0.35)`;
      ctx.fillRect(rng() * w, rng() * h, 1.8, 1.2);
    }
  });
}

export class World {
  constructor(scene) {
    this.scene = scene;
    this.rng = mulberry32(19970214);
    this.colliders = [];
    this.blocks = [];
    this.buildings = [];
    this.special = new Set(['-3,2', '2,2', '-2,-2', '1,-2', '-1,1', '2,0']);
    this.group = new THREE.Group();
    this.group.name = 'city';
    scene.add(this.group);
    this.windowInstances = [];
    this.lampHeads = [];
    this.neonMaterials = [];
    this.roadLines = ROAD_LINES;
    this.timeUniform = { value: 0 };

    this.buildSky();
    this.buildGround();
    this.buildBlocks();
    this.buildRoadDetails();
    this.buildBuildings();
    this.buildLandmarks();
    this.buildStreetFurniture();
    this.buildSigns();
    this.buildStars();
    this.buildRain();
    this.buildMap();

    this.hemi = new THREE.HemisphereLight(0x9cc7ff, 0x4b3b2f, 1.1);
    scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffd39a, 2.2);
    this.sun.position.set(-260, 170, 110);
    scene.add(this.sun);
    this.ambient = new THREE.AmbientLight(0x607080, 0.5);
    scene.add(this.ambient);
    this.updateEnvironment(17.2, 'clear');
  }

  addCollider(x, z, w, d, height = 30, pad = 0) {
    this.colliders.push({
      minX: x - w / 2 - pad,
      maxX: x + w / 2 + pad,
      minZ: z - d / 2 - pad,
      maxZ: z + d / 2 + pad,
      height,
    });
  }

  buildSky() {
    this.skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        topColor: { value: new THREE.Color(0x2c3d78) },
        bottomColor: { value: new THREE.Color(0xff9a63) },
        sunColor: { value: new THREE.Color(0xffd08a) },
        sunDirection: { value: new THREE.Vector3(-0.8, 0.12, 0.4).normalize() },
      },
      vertexShader: `
        varying vec3 vWorld;
        void main() {
          vWorld = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform vec3 sunColor;
        uniform vec3 sunDirection;
        varying vec3 vWorld;
        void main() {
          vec3 dir = normalize(vWorld);
          float h = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);
          vec3 col = mix(bottomColor, topColor, pow(h, 0.72));
          float sun = pow(max(dot(dir, normalize(sunDirection)), 0.0), 160.0);
          col += sunColor * sun * 1.7;
          float band = pow(max(dot(dir, normalize(sunDirection)), 0.0), 14.0);
          col += sunColor * band * 0.12;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(620, 24, 16), this.skyMat);
    this.sky.frustumCulled = false;
    this.scene.add(this.sky);
  }

  buildGround() {
    const asphalt = makeAsphaltTexture();
    asphalt.wrapS = asphalt.wrapT = THREE.RepeatWrapping;
    asphalt.repeat.set(55, 55);
    const roadMat = new THREE.MeshStandardMaterial({
      map: asphalt,
      color: 0xffffff,
      roughness: 0.96,
      metalness: 0.02,
    });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), roadMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    this.group.add(ground);

    const grassTex = canvasTexture(256, 256, (ctx, w, h) => {
      const rng = mulberry32(5);
      ctx.fillStyle = '#4a5c37';
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 6000; i++) {
        const v = 55 + Math.floor(rng() * 55);
        ctx.fillStyle = `rgba(${v - 12},${v + 10},${v - 30},0.4)`;
        ctx.fillRect(rng() * w, rng() * h, 2, 2);
      }
    });
    grassTex.wrapS = grassTex.wrapT = THREE.RepeatWrapping;
    grassTex.repeat.set(7, 7);
    this.grassMat = new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1 });

    const sand = makeSandTexture();
    sand.wrapS = sand.wrapT = THREE.RepeatWrapping;
    sand.repeat.set(18, 8);
    const beach = new THREE.Mesh(
      new THREE.PlaneGeometry(900, 130),
      new THREE.MeshStandardMaterial({ map: sand, roughness: 1 }),
    );
    beach.rotation.x = -Math.PI / 2;
    beach.position.set(0, 0.04, 315);
    this.group.add(beach);

    this.waterUniforms = THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uTime: { value: 0 },
        deep: { value: new THREE.Color(0x0b556e) },
        shallow: { value: new THREE.Color(0x28b4c9) },
        sunColor: { value: new THREE.Color(0xffd9a1) },
      },
    ]);
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(1100, 330, 50, 16),
      new THREE.ShaderMaterial({
        uniforms: this.waterUniforms,
        fog: true,
        vertexShader: `
          uniform float uTime;
          varying vec2 vUv;
          varying float vWave;
          #include <fog_pars_vertex>
          void main() {
            vUv = uv;
            vec3 p = position;
            float w = sin(p.x * 0.055 + uTime * 0.9) * 0.55
                    + cos(p.y * 0.08 + uTime * 0.7) * 0.4
                    + sin((p.x + p.y) * 0.03 + uTime * 0.45) * 0.35;
            p.z += w;
            vWave = w;
            vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
            gl_Position = projectionMatrix * mvPosition;
            #include <fog_vertex>
          }
        `,
        fragmentShader: `
          uniform vec3 deep;
          uniform vec3 shallow;
          uniform vec3 sunColor;
          uniform float uTime;
          varying vec2 vUv;
          varying float vWave;
          #include <fog_pars_fragment>
          void main() {
            float ripple = sin(vUv.x * 90.0 + uTime * 0.8) * 0.5 + 0.5;
            vec3 col = mix(deep, shallow, 0.35 + vWave * 0.22 + ripple * 0.06);
            float glint = pow(ripple, 14.0) * 0.35;
            col += sunColor * glint;
            gl_FragColor = vec4(col, 1.0);
            #include <fog_fragment>
          }
        `,
      }),
    );
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, -0.08, 460);
    this.water = water;
    this.group.add(water);
  }

  buildBlocks() {
    const sidewalk = makeSidewalkTexture();
    sidewalk.wrapS = sidewalk.wrapT = THREE.RepeatWrapping;
    sidewalk.repeat.set(2, 2);
    this.sidewalkMat = new THREE.MeshStandardMaterial({ map: sidewalk, roughness: 0.95 });
    const blockGeo = new THREE.BoxGeometry(52, 0.18, 52);
    const count = 49;
    const inst = new THREE.InstancedMesh(blockGeo, this.sidewalkMat, count);
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    let n = 0;
    for (let i = -CITY_RADIUS; i <= CITY_RADIUS; i++) {
      for (let j = -CITY_RADIUS; j <= CITY_RADIUS; j++) {
        const x = i * BLOCK;
        const z = j * BLOCK;
        const block = { i, j, x, z, district: districtOf(i, j), special: this.special.has(`${i},${j}`) };
        this.blocks.push(block);
        dummy.position.set(x, 0.09, z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        inst.setMatrixAt(n, dummy.matrix);
        const v = 0.78 + this.rng() * 0.12;
        color.setRGB(v, v, v * 0.97);
        inst.setColorAt(n, color);
        n++;
      }
    }
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    this.group.add(inst);
    this.blockMesh = inst;

    for (const block of this.blocks) {
      if (block.special) continue;
      if (block.district === 'beach' || (this.rng() < 0.13 && block.district === 'residential')) {
        const park = new THREE.Mesh(new THREE.PlaneGeometry(46, 46), this.grassMat);
        park.rotation.x = -Math.PI / 2;
        park.position.set(block.x, 0.185, block.z);
        this.group.add(park);
        block.park = true;
      }
    }
  }

  buildRoadDetails() {
    const dashGeo = new THREE.BoxGeometry(0.22, 0.02, 2.8);
    const dashMat = new THREE.MeshBasicMaterial({ color: 0xd9d3a8, transparent: true, opacity: 0.5 });
    const dashes = [];
    for (const c of ROAD_LINES) {
      for (let t = -245; t <= 245; t += 8.5) {
        dashes.push({ x: c, z: t, rot: 0 });
        dashes.push({ x: t, z: c, rot: Math.PI / 2 });
      }
    }
    const inst = new THREE.InstancedMesh(dashGeo, dashMat, dashes.length);
    const dummy = new THREE.Object3D();
    dashes.forEach((d, i) => {
      dummy.position.set(d.x, 0.012, d.z);
      dummy.rotation.set(0, d.rot, 0);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
    });
    inst.instanceMatrix.needsUpdate = true;
    this.group.add(inst);

    const cwGeo = new THREE.BoxGeometry(1.1, 0.022, 10);
    const cwMat = new THREE.MeshBasicMaterial({ color: 0xe8e3cf, transparent: true, opacity: 0.55 });
    const crosswalks = [];
    for (const x of ROAD_LINES) {
      for (const z of ROAD_LINES) {
        for (const side of [-1, 1]) {
          for (let k = -3; k <= 3; k++) {
            crosswalks.push({ x: x + side * 10.5, z: z + k * 1.35, rot: 0 });
            crosswalks.push({ x: x + k * 1.35, z: z + side * 10.5, rot: Math.PI / 2 });
          }
        }
      }
    }
    const cw = new THREE.InstancedMesh(cwGeo, cwMat, crosswalks.length);
    crosswalks.forEach((d, i) => {
      dummy.position.set(d.x, 0.016, d.z);
      dummy.rotation.set(0, d.rot, 0);
      dummy.updateMatrix();
      cw.setMatrixAt(i, dummy.matrix);
    });
    cw.instanceMatrix.needsUpdate = true;
    this.group.add(cw);
  }

  buildBuildings() {
    const windowMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
    this.windowMat = windowMat;
    const buildingData = [];
    const rooftop = [];

    for (const block of this.blocks) {
      if (block.special) continue;
      const palette = PALETTES[block.district];
      const plots = [];
      const gap = 4.2;
      const zone = 19;
      for (let a = 0; a < 2; a++) {
        for (let b = 0; b < 2; b++) {
          if (this.rng() < 0.12) continue;
          const w = 11 + this.rng() * 6;
          const d = 11 + this.rng() * 6;
          const x = block.x + (a === 0 ? -1 : 1) * (zone / 2 + gap / 2) + (this.rng() - 0.5) * 2;
          const z = block.z + (b === 0 ? -1 : 1) * (zone / 2 + gap / 2) + (this.rng() - 0.5) * 2;
          plots.push({ x, z, w, d });
        }
      }
      if (!plots.length) plots.push({ x: block.x, z: block.z, w: 20, d: 20 });

      for (const plot of plots) {
        let height;
        const d = block.district;
        if (d === 'downtown') height = 24 + this.rng() * 46;
        else if (d === 'residential') height = 8 + this.rng() * 13;
        else if (d === 'industrial') height = 7 + this.rng() * 13;
        else height = 5 + this.rng() * 12;
        const color = new THREE.Color(palette[Math.floor(this.rng() * palette.length)]);
        color.offsetHSL((this.rng() - 0.5) * 0.03, (this.rng() - 0.5) * 0.08, (this.rng() - 0.5) * 0.08);
        buildingData.push({ ...plot, height, color, district: d });
        this.addCollider(plot.x, plot.z, plot.w, plot.d, height, 0.2);
        this.buildWindows(plot.x, plot.z, plot.w, plot.d, height);
        if (this.rng() < 0.7) {
          rooftop.push({
            x: plot.x + (this.rng() - 0.5) * plot.w * 0.4,
            z: plot.z + (this.rng() - 0.5) * plot.d * 0.4,
            y: height + 0.18,
            s: 1.2 + this.rng() * 2.2,
          });
        }
        if (d === 'residential' && this.rng() < 0.4) {
          rooftop.push({ x: plot.x, z: plot.z, y: height + 0.18, s: 0.2, tank: true });
        }
      }
    }

    const geo = new THREE.BoxGeometry(1, 1, 1);
    geo.translate(0, 0.5, 0);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.82,
      metalness: 0.06,
      flatShading: true,
    });
    const inst = new THREE.InstancedMesh(geo, mat, buildingData.length);
    const dummy = new THREE.Object3D();
    buildingData.forEach((b, i) => {
      dummy.position.set(b.x, 0.18, b.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(b.w, b.height, b.d);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
      inst.setColorAt(i, b.color);
      this.buildings.push(b);
    });
    inst.instanceMatrix.needsUpdate = true;
    inst.instanceColor.needsUpdate = true;
    inst.castShadow = false;
    inst.receiveShadow = false;
    this.group.add(inst);
    this.buildingMesh = inst;

    const roofGeo = new THREE.BoxGeometry(1, 1, 1);
    roofGeo.translate(0, 0.5, 0);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x8a857c, roughness: 0.9, flatShading: true });
    const roofs = rooftop.filter((r) => !r.tank);
    const rinst = new THREE.InstancedMesh(roofGeo, roofMat, Math.max(1, roofs.length));
    roofs.forEach((r, i) => {
      dummy.position.set(r.x, r.y, r.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(r.s, 0.7 + r.s * 0.3, r.s);
      dummy.updateMatrix();
      rinst.setMatrixAt(i, dummy.matrix);
    });
    rinst.count = roofs.length;
    rinst.instanceMatrix.needsUpdate = true;
    this.group.add(rinst);

    const tankGeo = new THREE.CylinderGeometry(1.5, 1.5, 3.4, 8);
    const tankMat = new THREE.MeshStandardMaterial({ color: 0x6b5741, roughness: 0.95, flatShading: true });
    const tanks = rooftop.filter((r) => r.tank);
    const tinst = new THREE.InstancedMesh(tankGeo, tankMat, Math.max(1, tanks.length));
    tanks.forEach((r, i) => {
      dummy.position.set(r.x, r.y + 1.7, r.z);
      dummy.rotation.set(0, this.rng() * Math.PI, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      tinst.setMatrixAt(i, dummy.matrix);
    });
    tinst.count = tanks.length;
    tinst.instanceMatrix.needsUpdate = true;
    this.group.add(tinst);

    const awnGeo = new THREE.BoxGeometry(1, 1, 1);
    const awnMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, flatShading: true });
    const awnings = [];
    for (const b of buildingData) {
      if (this.rng() < 0.55) {
        const facingX = this.rng() < 0.5;
        const color = new THREE.Color(pick([0xb23a48, 0x2e7d6e, 0xc7842d, 0x3a5c8a, 0x8b4a8c]));
        awnings.push({
          x: b.x + (facingX ? (this.rng() < 0.5 ? -1 : 1) * (b.w / 2 + 0.75) : 0),
          z: b.z + (!facingX ? (this.rng() < 0.5 ? -1 : 1) * (b.d / 2 + 0.75) : 0),
          sx: facingX ? 1.5 : Math.min(b.w * 0.7, 6),
          sz: facingX ? Math.min(b.d * 0.7, 6) : 1.5,
          color,
        });
      }
    }
    const ain = new THREE.InstancedMesh(awnGeo, awnMat, Math.max(1, awnings.length));
    awnings.forEach((a, i) => {
      dummy.position.set(a.x, 3.1, a.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(a.sx, 0.28, a.sz);
      dummy.updateMatrix();
      ain.setMatrixAt(i, dummy.matrix);
      ain.setColorAt(i, a.color);
    });
    ain.count = awnings.length;
    ain.instanceMatrix.needsUpdate = true;
    if (ain.instanceColor) ain.instanceColor.needsUpdate = true;
    this.group.add(ain);
  }

  buildWindows(x, z, w, d, height) {
    const faceAlongX = this.rng() < 0.5;
    const floors = Math.max(1, Math.min(12, Math.floor((height - 2.2) / 3.5)));
    const cols = Math.max(2, Math.min(6, Math.floor((faceAlongX ? w : d) / 3.4)));
    for (let f = 0; f < floors; f++) {
      for (let c = 0; c < cols; c++) {
        const y = 2.2 + f * 3.5;
        const t = (c + 0.5) / cols - 0.5;
        const lit = this.rng();
        const color = new THREE.Color(
          lit < 0.22 ? 0x1d2a38 : lit < 0.62 ? 0xffd28a : lit < 0.85 ? 0xfff1cc : 0x9dc6ee,
        );
        for (const side of [-1, 1]) {
          if (faceAlongX) {
            this.windowInstances.push({
              x: x + side * (w / 2 + 0.03),
              y,
              z: z + t * d,
              rot: side > 0 ? Math.PI / 2 : -Math.PI / 2,
              color,
            });
          } else {
            this.windowInstances.push({
              x: x + t * w,
              y,
              z: z + side * (d / 2 + 0.03),
              rot: side > 0 ? 0 : Math.PI,
              color,
            });
          }
        }
      }
    }
  }

  buildLandmarks() {
    this.buildSafehouse();
    this.buildSpray();
    this.buildHospital();
    this.buildTower();
    this.buildPark(LANDMARKS.park.x, LANDMARKS.park.z, true);
    this.buildAirport();
    this.finishWindows();
  }

  finishWindows() {
    if (!this.windowInstances.length) return;
    const geo = new THREE.PlaneGeometry(1.35, 1.55);
    const inst = new THREE.InstancedMesh(geo, this.windowMat, this.windowInstances.length);
    const dummy = new THREE.Object3D();
    this.windowInstances.forEach((w, i) => {
      dummy.position.set(w.x, w.y, w.z);
      dummy.rotation.set(0, w.rot, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
      inst.setColorAt(i, w.color);
    });
    inst.instanceMatrix.needsUpdate = true;
    inst.instanceColor.needsUpdate = true;
    inst.frustumCulled = true;
    this.windowMesh = inst;
    this.group.add(inst);
  }

  buildSafehouse() {
    const x = -210;
    const z = 134;
    const houseMat = new THREE.MeshStandardMaterial({ color: 0xd8b78d, roughness: 0.9, flatShading: true });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0xf1e6cf, roughness: 0.9 });
    const house = new THREE.Mesh(new THREE.BoxGeometry(15, 6, 11), houseMat);
    house.position.set(x, 3.18, z);
    this.group.add(house);
    this.addCollider(x, z, 15, 11, 6);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(16.5, 0.6, 12.5), new THREE.MeshStandardMaterial({ color: 0x8d3b2f, roughness: 0.95 }));
    roof.position.set(x, 6.4, z);
    this.group.add(roof);
    const porch = new THREE.Mesh(new THREE.BoxGeometry(6, 0.25, 2.6), trimMat);
    porch.position.set(x + 2.5, 0.32, z + 6.8);
    this.group.add(porch);
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.7, 2.6, 0.15), new THREE.MeshStandardMaterial({ color: 0x453226, roughness: 0.8 }));
    door.position.set(x + 2.5, 1.4, z + 5.55);
    this.group.add(door);
    for (const [ox, oy] of [[-4, 2.6], [5.8, 2.6], [-4, 4.6], [5.8, 4.6]]) {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.4), new THREE.MeshBasicMaterial({ color: 0xffd38f, toneMapped: false }));
      win.position.set(x + ox, oy, z + 5.56);
      this.group.add(win);
    }
    const graffiti = canvasTexture(512, 256, (ctx, w, h) => {
      ctx.fillStyle = '#b9aa92';
      ctx.fillRect(0, 0, w, h);
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.rotate(-0.03);
      ctx.font = '900 86px Impact, "Arial Black", sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 10;
      ctx.strokeStyle = '#2b1b44';
      ctx.strokeText('SUN KIDS', 0, 6);
      const g = ctx.createLinearGradient(-200, -40, 200, 40);
      g.addColorStop(0, '#ffb703');
      g.addColorStop(1, '#ff4d2d');
      ctx.fillStyle = g;
      ctx.fillText('SUN KIDS', 0, 6);
      ctx.font = '700 34px Tahoma, sans-serif';
      ctx.fillStyle = '#f5e9d0';
      ctx.fillText('حي الشمس', 0, 62);
      ctx.restore();
      ctx.strokeStyle = 'rgba(40,20,60,0.4)';
      ctx.lineWidth = 3;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(40 + i * 20, 210);
        ctx.lineTo(90 + i * 25, 230);
        ctx.stroke();
      }
    });
    const tag = new THREE.Mesh(new THREE.PlaneGeometry(7, 3.5), new THREE.MeshStandardMaterial({ map: graffiti, roughness: 0.95 }));
    tag.position.set(x + 7.55, 2.3, z - 1);
    tag.rotation.y = Math.PI / 2;
    this.group.add(tag);

    const garage = new THREE.Mesh(new THREE.BoxGeometry(7.5, 4.2, 8), new THREE.MeshStandardMaterial({ color: 0x9a6b50, roughness: 0.95, flatShading: true }));
    garage.position.set(x + 12.5, 2.28, z + 1);
    this.group.add(garage);
    this.addCollider(x + 12.5, z + 1, 7.5, 8, 4.2);
    const court = new THREE.Mesh(new THREE.PlaneGeometry(20, 14), this.grassMat);
    court.rotation.x = -Math.PI / 2;
    court.position.set(x, 0.2, z + 14);
    this.group.add(court);

    const marker = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 0.05, 24), new THREE.MeshBasicMaterial({ color: 0x66ff88, transparent: true, opacity: 0.3 }));
    marker.position.set(LANDMARKS.safehouse.x, 0.22, LANDMARKS.safehouse.z);
    this.group.add(marker);
  }

  buildSpray() {
    const x = 70;
    const z = -140;
    const body = new THREE.Mesh(new THREE.BoxGeometry(22, 6.5, 16), new THREE.MeshStandardMaterial({ color: 0x4d5a63, roughness: 0.85, flatShading: true }));
    body.position.set(x, 3.43, z);
    this.group.add(body);
    this.addCollider(x, z, 22, 16, 6.5);
    const door = new THREE.Mesh(new THREE.PlaneGeometry(9, 4.6), new THREE.MeshStandardMaterial({ color: 0x171f24, roughness: 0.7 }));
    door.position.set(x, 2.5, z + 8.03);
    this.group.add(door);
    const signTex = textTexture("PAY 'N' SPRAY", {
      width: 640, height: 160, bg: '#101418', color: '#65f0c2', font: '900 78px Impact, "Arial Black", sans-serif',
    });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(16, 4), new THREE.MeshBasicMaterial({ map: signTex, toneMapped: false }));
    sign.position.set(x, 8.4, z + 8.2);
    this.group.add(sign);
    this.neonMaterials.push(sign.material);
    const pad = new THREE.Mesh(new THREE.PlaneGeometry(16, 10), new THREE.MeshStandardMaterial({ color: 0x2b3a38, roughness: 1 }));
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(x, 0.2, z + 13);
    this.group.add(pad);
  }

  buildHospital() {
    const x = -70;
    const z = 70;
    const body = new THREE.Mesh(new THREE.BoxGeometry(26, 24, 20), new THREE.MeshStandardMaterial({ color: 0xd7ddd8, roughness: 0.85, flatShading: true }));
    body.position.set(x, 12.18, z);
    this.group.add(body);
    this.addCollider(x, z, 26, 20, 24);
    const crossMat = new THREE.MeshBasicMaterial({ color: 0xff4d4d, toneMapped: false });
    const v = new THREE.Mesh(new THREE.BoxGeometry(2.2, 8, 0.2), crossMat);
    v.position.set(x, 17, z + 10.12);
    this.group.add(v);
    const hbar = new THREE.Mesh(new THREE.BoxGeometry(7.5, 2.2, 0.2), crossMat);
    hbar.position.set(x, 17, z + 10.12);
    this.group.add(hbar);
  }

  buildTower() {
    const x = 140;
    const z = 0;
    const glass = new THREE.MeshStandardMaterial({ color: 0x536f83, roughness: 0.28, metalness: 0.45, flatShading: true });
    const tower = new THREE.Mesh(new THREE.BoxGeometry(26, 96, 26), glass);
    tower.position.set(x, 48.18, z);
    this.group.add(tower);
    this.addCollider(x, z, 26, 26, 96);
    const top = new THREE.Mesh(new THREE.BoxGeometry(18, 3, 18), new THREE.MeshStandardMaterial({ color: 0x222c33, roughness: 0.7 }));
    top.position.set(x, 97.6, z);
    this.group.add(top);
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.35, 18, 6), new THREE.MeshStandardMaterial({ color: 0x99a2a8, metalness: 0.7, roughness: 0.4 }));
    antenna.position.set(x, 108, z);
    this.group.add(antenna);
    const signTex = textTexture('ARROYO', {
      width: 900, height: 220, bg: 'transparent', color: '#ffb703', font: '900 150px Impact, "Arial Black", sans-serif', stroke: '#3a1600', strokeWidth: 16,
    });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(24, 5.8), new THREE.MeshBasicMaterial({ map: signTex, transparent: true, toneMapped: false }));
    sign.position.set(x, 72, z + 13.2);
    sign.rotation.y = 0;
    this.group.add(sign);
    this.neonMaterials.push(sign.material);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(16, 0.35, 6, 40), new THREE.MeshBasicMaterial({ color: 0x59f0ff, transparent: true, opacity: 0.8, toneMapped: false }));
    ring.rotation.x = Math.PI / 2;
    ring.position.set(x, 88, z);
    this.group.add(ring);
    this.neonMaterials.push(ring.material);
  }

  buildPark(x, z, turf = false) {
    const court = new THREE.Mesh(new THREE.PlaneGeometry(30, 18), new THREE.MeshStandardMaterial({ color: turf ? 0x4f5a4a : 0x3e5745, roughness: 1 }));
    court.rotation.x = -Math.PI / 2;
    court.position.set(x, 0.19, z);
    this.group.add(court);
    const pathMat = new THREE.MeshStandardMaterial({ color: 0x8d8878, roughness: 1 });
    const p1 = new THREE.Mesh(new THREE.PlaneGeometry(6, 44), pathMat);
    p1.rotation.x = -Math.PI / 2;
    p1.position.set(x, 0.2, z);
    this.group.add(p1);
    const p2 = new THREE.Mesh(new THREE.PlaneGeometry(44, 6), pathMat);
    p2.rotation.x = -Math.PI / 2;
    p2.position.set(x, 0.2, z);
    this.group.add(p2);
    const hoopMat = new THREE.MeshStandardMaterial({ color: 0x2a3034, metalness: 0.4, roughness: 0.6 });
    for (const side of [-1, 1]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 4.2, 6), hoopMat);
      pole.position.set(x + side * 13, 2.25, z);
      this.group.add(pole);
      const board = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.8, 2.6), new THREE.MeshStandardMaterial({ color: 0xd9d4c5, roughness: 0.9 }));
      board.position.set(x + side * 13, 4.3, z);
      this.group.add(board);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.08, 4, 12), new THREE.MeshBasicMaterial({ color: 0xff7b22 }));
      rim.rotation.x = Math.PI / 2;
      rim.position.set(x + side * 12.1, 3.8, z);
      this.group.add(rim);
    }
    for (const [bx, bz] of [[x - 16, z - 16], [x + 16, z + 16], [x - 16, z + 16], [x + 16, z - 16]]) {
      const bench = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.25, 0.8), new THREE.MeshStandardMaterial({ color: 0x7a553a, roughness: 0.9 }));
      bench.position.set(bx, 0.9, bz);
      this.group.add(bench);
      for (const s of [-1, 1]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.7), new THREE.MeshStandardMaterial({ color: 0x3d484d }));
        leg.position.set(bx + s * 1.3, 0.55, bz);
        this.group.add(leg);
      }
    }
  }

  buildAirport() {
    const x = 300;
    const z = -160;
    const runway = new THREE.Mesh(new THREE.PlaneGeometry(54, 250), new THREE.MeshStandardMaterial({ color: 0x24282c, roughness: 0.92 }));
    runway.rotation.x = -Math.PI / 2;
    runway.position.set(x, 0.06, z);
    this.group.add(runway);
    const markMat = new THREE.MeshBasicMaterial({ color: 0xf2ead2, transparent: true, opacity: 0.7 });
    for (let i = -11; i <= 11; i++) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 4), markMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(x, 0.08, z + i * 10);
      this.group.add(dash);
    }
    const hangar = new THREE.Mesh(new THREE.BoxGeometry(28, 11, 34), new THREE.MeshStandardMaterial({ color: 0x7b858b, roughness: 0.8, flatShading: true }));
    hangar.position.set(x - 34, 5.58, z + 20);
    this.group.add(hangar);
    this.addCollider(x - 34, z + 20, 28, 34, 11);
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(3, 4.6, 20, 8), new THREE.MeshStandardMaterial({ color: 0x9ba3a6, roughness: 0.8 }));
    tower.position.set(x + 32, 10.06, z - 14);
    this.group.add(tower);
    this.addCollider(x + 32, z - 14, 8, 8, 20);
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 3, 8), new THREE.MeshBasicMaterial({ color: 0x9be7ff, toneMapped: false }));
    glass.position.set(x + 32, 21, z - 14);
    this.group.add(glass);
    const signTex = textTexture('SAN ARROYO INTL', {
      width: 900, height: 180, bg: '#101820', color: '#f3e9cf', font: '900 72px Impact, "Arial Black", sans-serif',
    });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(24, 4.8), new THREE.MeshBasicMaterial({ map: signTex, toneMapped: false }));
    sign.position.set(x - 34, 12, z + 37.2);
    this.group.add(sign);
  }

  buildStreetFurniture() {
    const trunkGeo = new THREE.CylinderGeometry(0.16, 0.3, 4.4, 5);
    trunkGeo.translate(0, 2.2, 0);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7a5a3c, roughness: 0.95, flatShading: true });
    const frondGeo = new THREE.ConeGeometry(0.3, 2.8, 3);
    frondGeo.translate(0, 1.4, 0);
    const frondMat = new THREE.MeshStandardMaterial({ color: 0x4a8a45, roughness: 0.9, flatShading: true });
    const trunkData = [];
    const frondData = [];

    const addPalm = (x, z, s = 1) => {
      trunkData.push({ x, z, s });
      const count = 6;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + this.rng() * 0.4;
        frondData.push({
          x, z,
          y: 4.3 * s,
          rotY: a,
          tilt: 0.9 + this.rng() * 0.3,
          s,
        });
      }
    };

    for (const c of ROAD_LINES) {
      for (let t = -238; t <= 238; t += 57) {
        if (this.rng() < 0.72) {
          const side = this.rng() < 0.5 ? -1 : 1;
          addPalm(c + side * 13.5, t + (this.rng() - 0.5) * 8, 0.85 + this.rng() * 0.4);
        }
        if (this.rng() < 0.7) {
          const side = this.rng() < 0.5 ? -1 : 1;
          addPalm(t + (this.rng() - 0.5) * 8, c + side * 13.5, 0.85 + this.rng() * 0.4);
        }
      }
    }
    for (let i = 0; i < 30; i++) {
      addPalm(-340 + this.rng() * 680, 262 + this.rng() * 52, 0.8 + this.rng() * 0.5);
    }
    addPalm(140 - 18, 140 - 18, 1.1);
    addPalm(140 + 18, 140 + 18, 1.15);
    addPalm(-140 - 18, -140 + 18, 1.05);
    addPalm(-210 + 10, 158, 1.05);

    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, trunkData.length);
    const dummy = new THREE.Object3D();
    trunkData.forEach((p, i) => {
      dummy.position.set(p.x, 0.18, p.z);
      dummy.rotation.set(0, this.rng() * Math.PI, 0);
      dummy.scale.set(p.s, p.s, p.s);
      dummy.updateMatrix();
      trunks.setMatrixAt(i, dummy.matrix);
    });
    trunks.instanceMatrix.needsUpdate = true;
    this.group.add(trunks);

    const fronds = new THREE.InstancedMesh(frondGeo, frondMat, frondData.length);
    frondData.forEach((f, i) => {
      dummy.position.set(f.x, f.y, f.z);
      dummy.rotation.set(0, f.rotY, 0);
      dummy.rotateZ(f.tilt);
      dummy.scale.set(f.s, f.s, f.s);
      dummy.updateMatrix();
      fronds.setMatrixAt(i, dummy.matrix);
    });
    fronds.instanceMatrix.needsUpdate = true;
    this.group.add(fronds);

    const poleGeo = new THREE.CylinderGeometry(0.08, 0.11, 5.6, 5);
    poleGeo.translate(0, 2.8, 0);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x38424a, roughness: 0.7, metalness: 0.5 });
    const headGeo = new THREE.BoxGeometry(0.55, 0.22, 0.8);
    const headMat = new THREE.MeshBasicMaterial({ color: 0xffcf7a, toneMapped: false });
    this.lampMat = headMat;
    const poles = [];
    const heads = [];
    for (const c of ROAD_LINES) {
      for (let t = -230; t <= 230; t += 46) {
        for (const side of [-1, 1]) {
          poles.push({ x: c + side * 10.8, z: t });
          heads.push({ x: c + side * 10.8, z: t, y: 5.55, rot: side > 0 ? -Math.PI / 2 : Math.PI / 2 });
        }
      }
    }
    const pin = new THREE.InstancedMesh(poleGeo, poleMat, poles.length);
    poles.forEach((p, i) => {
      dummy.position.set(p.x, 0.18, p.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      pin.setMatrixAt(i, dummy.matrix);
    });
    pin.instanceMatrix.needsUpdate = true;
    this.group.add(pin);
    const hin = new THREE.InstancedMesh(headGeo, headMat, heads.length);
    heads.forEach((h, i) => {
      dummy.position.set(h.x, h.y, h.z);
      dummy.rotation.set(0, h.rot, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      hin.setMatrixAt(i, dummy.matrix);
    });
    hin.instanceMatrix.needsUpdate = true;
    this.group.add(hin);

    const benchMat = new THREE.MeshStandardMaterial({ color: 0x7a553a, roughness: 0.9 });
    const binMat = new THREE.MeshStandardMaterial({ color: 0x3f5a4c, roughness: 0.8 });
    for (let i = 0; i < 28; i++) {
      const block = this.blocks[Math.floor(this.rng() * this.blocks.length)];
      if (block.special) continue;
      const x = block.x + (this.rng() - 0.5) * 38;
      const z = block.z + (this.rng() < 0.5 ? -1 : 1) * (22 + this.rng() * 2);
      const bin = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.2, 0.9), binMat);
      bin.position.set(x, 0.78, z);
      this.group.add(bin);
    }

    const hydrantMat = new THREE.MeshStandardMaterial({ color: 0xb43b2f, roughness: 0.7 });
    for (let i = 0; i < 22; i++) {
      const c = pick(ROAD_LINES);
      const t = -230 + this.rng() * 460;
      const x = c + (this.rng() < 0.5 ? -1 : 1) * 11.5;
      const h = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.7, 6), hydrantMat);
      h.position.set(x, 0.53, t);
      this.group.add(h);
    }
  }

  buildSigns() {
    const defs = [
      { text: 'SUNSET BLVD', x: -245, z: 35, rot: Math.PI / 2, color: '#ffb703', bg: '#1a1326' },
      { text: 'SUN FM 98.1', x: 245, z: 105, rot: -Math.PI / 2, color: '#ff5d3a', bg: '#170f1e' },
      { text: 'SAN ARROYO', x: 35, z: -245, rot: 0, color: '#71f6d6', bg: '#0c1a20' },
      { text: 'شوارع الشمس', x: -105, z: 245, rot: Math.PI, color: '#ffd166', bg: '#231521', arabic: true },
      { text: 'GROVE HEIGHTS', x: -245, z: -105, rot: Math.PI / 2, color: '#b6ff6b', bg: '#111b16' },
    ];
    for (const d of defs) {
      const tex = textTexture(d.text, {
        width: 1024, height: 300, bg: d.bg, color: d.color,
        font: d.arabic ? '900 120px Tahoma, sans-serif' : '900 124px Impact, "Arial Black", sans-serif',
        stroke: '#000000', strokeWidth: 10,
      });
      const group = new THREE.Group();
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(15, 4.5), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, side: THREE.DoubleSide }));
      plane.position.y = 8;
      group.add(plane);
      const poleMat = new THREE.MeshStandardMaterial({ color: 0x3a3f42, metalness: 0.5, roughness: 0.6 });
      for (const s of [-1, 1]) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 8, 6), poleMat);
        pole.position.set(s * 5.5, 4, -0.1);
        group.add(pole);
      }
      group.position.set(d.x, 0.18, d.z);
      group.rotation.y = d.rot;
      this.group.add(group);
    }

    const neonDefs = [
      { text: 'TACOS', x: -174, z: 14, rot: Math.PI / 2, color: '#ff5d3a' },
      { text: 'LIQUOR', x: -34, z: -64, rot: 0, color: '#71f6d6' },
      { text: '24/7', x: 104, z: 78, rot: -Math.PI / 2, color: '#ffd166' },
      { text: 'MOTEL', x: 174, z: -104, rot: Math.PI, color: '#ff77c8' },
    ];
    for (const d of neonDefs) {
      const tex = textTexture(d.text, {
        width: 512, height: 160, bg: 'transparent', color: d.color,
        font: '900 90px Impact, "Arial Black", sans-serif', stroke: '#120b16', strokeWidth: 8,
      });
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.9), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, side: THREE.DoubleSide }));
      plane.position.set(d.x, 4.1, d.z);
      plane.rotation.y = d.rot;
      this.group.add(plane);
      this.neonMaterials.push(plane.material);
    }
  }

  buildStars() {
    const count = 900;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const y = 0.1 + Math.random() * 0.9;
      const r = Math.sqrt(Math.max(0, 1 - y * y)) * 560;
      positions[i * 3] = Math.cos(theta) * r;
      positions[i * 3 + 1] = y * 560;
      positions[i * 3 + 2] = Math.sin(theta) * r;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.starMat = new THREE.PointsMaterial({ color: 0xdfe9ff, size: 1.7, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false });
    this.stars = new THREE.Points(geo, this.starMat);
    this.stars.frustumCulled = false;
    this.scene.add(this.stars);

    const mountainMat = new THREE.MeshStandardMaterial({ color: 0x2c2a3d, roughness: 1, flatShading: true });
    for (let i = 0; i < 9; i++) {
      const h = 40 + Math.random() * 70;
      const m = new THREE.Mesh(new THREE.ConeGeometry(60 + Math.random() * 70, h, 5), mountainMat);
      const a = Math.random() * Math.PI * 2;
      m.position.set(Math.cos(a) * 540, h / 2 - 4, Math.sin(a) * 540);
      this.scene.add(m);
    }
  }

  buildRain() {
    const count = 1500;
    const positions = new Float32Array(count * 3);
    this.rainData = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 90;
      positions[i * 3 + 1] = Math.random() * 42;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 90;
      this.rainData[i] = 26 + Math.random() * 24;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.rainMat = new THREE.PointsMaterial({ color: 0xb9d4e8, size: 0.16, transparent: true, opacity: 0.65, depthWrite: false, fog: false });
    this.rain = new THREE.Points(geo, this.rainMat);
    this.rain.frustumCulled = false;
    this.rain.visible = false;
    this.scene.add(this.rain);
  }

  updateRain(dt, camera, active) {
    this.rain.visible = active;
    if (!active) return;
    this.rain.position.set(camera.position.x, 0, camera.position.z);
    const pos = this.rain.geometry.attributes.position.array;
    for (let i = 0; i < this.rainData.length; i++) {
      pos[i * 3 + 1] -= this.rainData[i] * dt;
      if (pos[i * 3 + 1] < 0) {
        pos[i * 3 + 1] = 38 + Math.random() * 6;
        pos[i * 3] = (Math.random() - 0.5) * 90;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 90;
      }
    }
    this.rain.geometry.attributes.position.needsUpdate = true;
  }

  updateEnvironment(hour, weather = 'clear') {
    this.hour = hour;
    this.weather = weather;
    const angle = ((hour - 6) / 24) * Math.PI * 2;
    const alt = Math.sin(angle);
    const day = smoothstep(-0.08, 0.32, alt);
    const sunset = Math.exp(-Math.pow((alt - 0.04) / 0.2, 2));
    const rain = weather === 'rain';
    const night = 1 - day;
    this.night = night;

    const topDay = new THREE.Color(0x3f7cbf);
    const topSunset = new THREE.Color(0x323372);
    const topNight = new THREE.Color(0x050a17);
    const bottomDay = new THREE.Color(0xcfe6ef);
    const bottomSunset = new THREE.Color(0xff8d58);
    const bottomNight = new THREE.Color(0x101a2b);
    const top = topNight.clone().lerp(topSunset, Math.min(1, day * 1.2 + sunset * 0.8)).lerp(topDay, Math.max(0, day - 0.4) * 1.2);
    const bottom = bottomNight.clone().lerp(bottomSunset, Math.min(1, day * 1.3 + sunset * 0.9)).lerp(bottomDay, Math.max(0, day - 0.4) * 1.2);
    if (rain) {
      top.lerp(new THREE.Color(0x1d2732), 0.65);
      bottom.lerp(new THREE.Color(0x44525c), 0.65);
    }
    this.skyMat.uniforms.topColor.value.copy(top);
    this.skyMat.uniforms.bottomColor.value.copy(bottom);
    const sunColor = new THREE.Color(0xff8a4f).lerp(new THREE.Color(0xfff2d0), Math.max(0, day));
    this.skyMat.uniforms.sunColor.value.copy(sunColor);
    const sunDir = new THREE.Vector3(Math.cos(angle) * 0.85, Math.max(-0.25, alt), 0.42).normalize();
    this.skyMat.uniforms.sunDirection.value.copy(sunDir);

    this.sun.position.set(sunDir.x * 300, Math.max(8, sunDir.y * 320), sunDir.z * 300);
    this.sun.intensity = 0.24 + day * (rain ? 1.1 : 2.4);
    this.ambient.intensity = 0.5 + night * 0.28;
    this.sun.color.copy(new THREE.Color(0xffa66b).lerp(new THREE.Color(0xfff0cf), Math.max(0, day)));
    this.hemi.intensity = 0.58 + day * (rain ? 0.45 : 0.9);
    this.hemi.color.copy(top).lerp(new THREE.Color(0xffffff), 0.25).lerp(new THREE.Color(0x9fb4d6), night * 0.75);
    this.hemi.groundColor.copy(new THREE.Color(0x2a201b).lerp(new THREE.Color(0x6b5540), day)).lerp(new THREE.Color(0x4a4038), night * 0.5);

    const fogColor = bottom.clone().lerp(top, 0.42).lerp(new THREE.Color(0x8a99a3), rain ? 0.4 : 0);
    this.scene.fog = new THREE.Fog(fogColor, rain ? 35 : 55, rain ? 240 : 470);
    this.scene.background = null;

    if (this.windowMat) {
      const v = 0.24 + night * 1.05;
      this.windowMat.color.setRGB(v, v * 0.94, v * 0.8);
    }
    if (this.lampMat) {
      const v = 0.35 + night * 1.5;
      this.lampMat.color.setRGB(v, v * 0.8, v * 0.45);
    }
    for (const m of this.neonMaterials) {
      if (m.opacity !== undefined && m.opacity < 1) m.opacity = 0.35 + night * 0.65;
    }
    if (this.starMat) this.starMat.opacity = Math.max(0, night * (rain ? 0.05 : 0.95));
    if (this.waterUniforms) this.waterUniforms.uTime.value = performance.now() / 1000;
  }

  update(dt, hour, weather, camera) {
    this.updateEnvironment(hour, weather);
    this.updateRain(dt, camera, weather === 'rain');
  }

  groundHeightAt(x, z) {
    if (z > 252) return 0.05;
    if (x > 260) return 0.02;
    const i = Math.round(x / BLOCK);
    const j = Math.round(z / BLOCK);
    if (i >= -CITY_RADIUS && i <= CITY_RADIUS && j >= -CITY_RADIUS && j <= CITY_RADIUS) {
      if (Math.abs(x - i * BLOCK) <= 26 && Math.abs(z - j * BLOCK) <= 26) return 0.18;
    }
    return 0.02;
  }

  onRoad(x, z) {
    if (x > 258 || z > 252 || z < -258) return true;
    let dx = Infinity;
    let dz = Infinity;
    for (const c of ROAD_LINES) {
      dx = Math.min(dx, Math.abs(x - c));
      dz = Math.min(dz, Math.abs(z - c));
    }
    return Math.min(dx, dz) < 10.5;
  }

  nearestRoadPoint(x, z) {
    let best = { d: Infinity, x, z, axis: 'x' };
    for (const c of ROAD_LINES) {
      const d = Math.abs(x - c);
      if (d < best.d) best = { d, x: c, z, axis: 'x' };
      const d2 = Math.abs(z - c);
      if (d2 < best.d) best = { d: d2, x, z: c, axis: 'z' };
    }
    if (x > 258) return { x, z, axis: 'x' };
    return best;
  }

  randomRoadPoint() {
    const c = pick(ROAD_LINES);
    const along = -220 + Math.random() * 440;
    if (Math.random() < 0.5) return { x: c + (Math.random() < 0.5 ? 4 : -4), z: along, axis: 'x' };
    return { x: along, z: c + (Math.random() < 0.5 ? 4 : -4), axis: 'z' };
  }

  resolveCircle(pos, radius = 0.55) {
    let hit = false;
    for (let pass = 0; pass < 3; pass++) {
      for (const c of this.colliders) {
        if (pos.y > c.height + 0.5) continue;
        const cx = clamp(pos.x, c.minX, c.maxX);
        const cz = clamp(pos.z, c.minZ, c.maxZ);
        let dx = pos.x - cx;
        let dz = pos.z - cz;
        const d2 = dx * dx + dz * dz;
        if (d2 < radius * radius) {
          hit = true;
          if (d2 > 1e-8) {
            const d = Math.sqrt(d2);
            const push = radius - d;
            pos.x += (dx / d) * push;
            pos.z += (dz / d) * push;
          } else {
            const left = pos.x - c.minX;
            const right = c.maxX - pos.x;
            const near = pos.z - c.minZ;
            const far = c.maxZ - pos.z;
            const m = Math.min(left, right, near, far);
            if (m === left) pos.x = c.minX - radius;
            else if (m === right) pos.x = c.maxX + radius;
            else if (m === near) pos.z = c.minZ - radius;
            else pos.z = c.maxZ + radius;
          }
        }
      }
    }
    pos.x = clamp(pos.x, -WORLD_LIMIT, WORLD_LIMIT + 20);
    pos.z = clamp(pos.z, -WORLD_LIMIT, WORLD_LIMIT + 60);
    return hit;
  }

  raycast(origin, dir, maxDist = 200) {
    let best = maxDist;
    let normal = new THREE.Vector3(0, 1, 0);
    for (const c of this.colliders) {
      const minY = 0;
      const maxY = c.height;
      let tmin = 0;
      let tmax = best;
      for (let a = 0; a < 3; a++) {
        const o = a === 0 ? origin.x : a === 1 ? origin.y : origin.z;
        const d = a === 0 ? dir.x : a === 1 ? dir.y : dir.z;
        const mn = a === 0 ? c.minX : a === 1 ? minY : c.minZ;
        const mx = a === 0 ? c.maxX : a === 1 ? maxY : c.maxZ;
        if (Math.abs(d) < 1e-8) {
          if (o < mn || o > mx) { tmin = Infinity; break; }
        } else {
          let t1 = (mn - o) / d;
          let t2 = (mx - o) / d;
          if (t1 > t2) [t1, t2] = [t2, t1];
          tmin = Math.max(tmin, t1);
          tmax = Math.min(tmax, t2);
          if (tmin > tmax) break;
        }
      }
      if (tmin <= tmax && tmin < best && tmin > 0) {
        best = tmin;
        normal = new THREE.Vector3(0, 1, 0);
        const p = origin.clone().addScaledVector(dir, tmin);
        if (Math.abs(p.y - c.height) < 0.6) normal.set(0, 1, 0);
        else if (Math.abs(p.x - c.minX) < 0.6) normal.set(-1, 0, 0);
        else if (Math.abs(p.x - c.maxX) < 0.6) normal.set(1, 0, 0);
        else if (Math.abs(p.z - c.minZ) < 0.6) normal.set(0, 0, -1);
        else normal.set(0, 0, 1);
      }
    }
    return { distance: best, point: origin.clone().addScaledVector(dir, best), normal };
  }

  buildMap() {
    const size = 680;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0d1319';
    ctx.fillRect(0, 0, size, size);
    const worldToMap = (v) => ((v + 340) / 680) * size;
    ctx.fillStyle = '#c3a575';
    ctx.fillRect(0, worldToMap(252), size, size - worldToMap(252));
    ctx.fillStyle = '#1b262e';
    ctx.fillRect(0, 0, size, worldToMap(252));
    ctx.strokeStyle = '#3b4852';
    ctx.lineWidth = ((20 / 680) * size) + 2;
    for (const c of ROAD_LINES) {
      ctx.beginPath();
      ctx.moveTo(worldToMap(c), 0);
      ctx.lineTo(worldToMap(c), size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, worldToMap(c));
      ctx.lineTo(size, worldToMap(c));
      ctx.stroke();
    }
    for (const b of this.blocks) {
      ctx.fillStyle = b.park ? '#375032' : '#222d35';
      const x = worldToMap(b.x - 25);
      const z = worldToMap(b.z - 25);
      const w = ((50 / 680) * size);
      ctx.fillRect(x, z, w, w);
    }
    ctx.fillStyle = '#151b20';
    ctx.fillRect(worldToMap(273), worldToMap(-285), worldToMap(327) - worldToMap(273), worldToMap(-35) - worldToMap(-285));
    ctx.strokeStyle = '#d9cfae';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(worldToMap(300), worldToMap(-280));
    ctx.lineTo(worldToMap(300), worldToMap(-40));
    ctx.stroke();
    ctx.fillStyle = '#ffb703';
    ctx.beginPath();
    ctx.arc(worldToMap(LANDMARKS.safehouse.x), worldToMap(LANDMARKS.safehouse.z), 4, 0, Math.PI * 2);
    ctx.fill();
    this.mapCanvas = canvas;
  }

  getSpawn() {
    return {
      x: LANDMARKS.safehouse.x - 1,
      z: LANDMARKS.safehouse.z + 7,
      yaw: Math.PI,
    };
  }
}
