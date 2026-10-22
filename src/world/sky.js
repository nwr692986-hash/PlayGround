import * as THREE from 'three'
import { cloudTexture, sunTexture } from '../core/textures.js'

export const SKIES = {
  baghdad: {
    top: 0x5d86b8,
    horizon: 0xe8c79a,
    bottom: 0xc7a173,
    sun: 0xffe2b0,
    sunDir: new THREE.Vector3(-0.42, 0.28, -0.86).normalize(),
    fog: 0xd7bc95,
    fogDensity: 0.0062,
    hemiSky: 0xbcd4ee,
    hemiGround: 0xb08a5c,
    sunLight: 0xffd7a0,
    sunIntensity: 3.1,
    exposure: 1.02
  },
  basra: {
    top: 0x26365e,
    horizon: 0xf2a06b,
    bottom: 0x6f5b52,
    sun: 0xffcf8d,
    sunDir: new THREE.Vector3(0.72, 0.12, -0.68).normalize(),
    fog: 0xb78e72,
    fogDensity: 0.0085,
    hemiSky: 0x93a8c9,
    hemiGround: 0x7d6248,
    sunLight: 0xffb877,
    sunIntensity: 2.5,
    exposure: 1.08
  },
  erbil: {
    top: 0x4f78a6,
    horizon: 0xd9c3a0,
    bottom: 0x9b8c74,
    sun: 0xfff0cc,
    sunDir: new THREE.Vector3(0.5, 0.42, -0.55).normalize(),
    fog: 0xc6beac,
    fogDensity: 0.0048,
    hemiSky: 0xc3d6e8,
    hemiGround: 0x8c8068,
    sunLight: 0xffe6bd,
    sunIntensity: 2.8,
    exposure: 1.0
  }
}

export function createSky(scene, config) {
  const uniforms = {
    topColor: { value: new THREE.Color(config.top) },
    horizonColor: { value: new THREE.Color(config.horizon) },
    bottomColor: { value: new THREE.Color(config.bottom) },
    sunColor: { value: new THREE.Color(config.sun) },
    sunDir: { value: config.sunDir.clone() }
  }

  const material = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    toneMapped: true,
    vertexShader: `
      varying vec3 vWorld;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 horizonColor;
      uniform vec3 bottomColor;
      uniform vec3 sunColor;
      uniform vec3 sunDir;
      varying vec3 vWorld;

      void main() {
        vec3 dir = normalize(vWorld - cameraPosition);
        float h = dir.y;
        vec3 col = mix(horizonColor, topColor, smoothstep(-0.02, 0.58, h));
        col = mix(bottomColor, col, smoothstep(-0.35, 0.015, h));

        float sunAmt = max(dot(dir, normalize(sunDir)), 0.0);
        float disc = smoothstep(0.9993, 0.99975, sunAmt);
        float glow = pow(sunAmt, 42.0) * 0.55 + pow(sunAmt, 9.0) * 0.16;
        col += sunColor * (glow + disc * 1.8);

        float haze = exp(-abs(h) * 10.0);
        col += horizonColor * haze * 0.12;
        col = mix(col, horizonColor, smoothstep(0.02, -0.08, h) * 0.35);

        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `
  })

  const sky = new THREE.Mesh(new THREE.SphereGeometry(420, 40, 24), material)
  sky.frustumCulled = false
  sky.renderOrder = -100
  scene.add(sky)

  const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: sunTexture(), color: config.sun, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, opacity: 0.55
  }))
  sunSprite.position.copy(config.sunDir).multiplyScalar(320)
  sunSprite.scale.setScalar(68)
  scene.add(sunSprite)

  const clouds = new THREE.Group()
  const cloudMat = new THREE.SpriteMaterial({
    map: cloudTexture(), transparent: true, depthWrite: false,
    color: new THREE.Color(config.sun).lerp(new THREE.Color(0xffffff), 0.4), opacity: 0.35
  })
  for (let i = 0; i < 9; i++) {
    const sprite = new THREE.Sprite(cloudMat.clone())
    const angle = (i / 9) * Math.PI * 2 + Math.random() * 0.4
    const dist = 150 + Math.random() * 140
    sprite.position.set(Math.cos(angle) * dist, 45 + Math.random() * 45, Math.sin(angle) * dist)
    sprite.scale.set(110 + Math.random() * 80, 30 + Math.random() * 22, 1)
    sprite.material.opacity = 0.08 + Math.random() * 0.16
    clouds.add(sprite)
  }
  scene.add(clouds)

  return { sky, sunSprite, clouds }
}

export function createLighting(scene, config) {
  const hemi = new THREE.HemisphereLight(config.hemiSky, config.hemiGround, 1.25)
  scene.add(hemi)

  const sun = new THREE.DirectionalLight(config.sunLight, config.sunIntensity)
  sun.position.copy(config.sunDir).multiplyScalar(80)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  sun.shadow.camera.near = 1
  sun.shadow.camera.far = 190
  const span = 52
  sun.shadow.camera.left = -span
  sun.shadow.camera.right = span
  sun.shadow.camera.top = span
  sun.shadow.camera.bottom = -span
  sun.shadow.bias = -0.0006
  sun.shadow.normalBias = 0.03
  scene.add(sun)
  scene.add(sun.target)
  sun.target.position.set(0, 0, -18)

  const fill = new THREE.DirectionalLight(0x9fb7d6, 0.35)
  fill.position.set(25, 18, 35)
  scene.add(fill)

  return { hemi, sun, fill }
}
