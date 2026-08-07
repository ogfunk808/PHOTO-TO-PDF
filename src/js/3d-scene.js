import * as THREE from 'three';

export function init3DScene() {
  const canvas = document.getElementById('bg-3d');
  if (!canvas) return;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x070913, 0.025);

  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.z = 25;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const pointLight1 = new THREE.PointLight(0x6366f1, 2.5, 100);
  pointLight1.position.set(15, 15, 15);
  scene.add(pointLight1);

  const pointLight2 = new THREE.PointLight(0x10b981, 2.0, 100);
  pointLight2.position.set(-15, -15, 10);
  scene.add(pointLight2);

  const pointLight3 = new THREE.PointLight(0x06b6d4, 1.5, 80);
  pointLight3.position.set(0, 20, -10);
  scene.add(pointLight3);

  // Floating 3D Document Planes
  const cardGroup = new THREE.Group();
  scene.add(cardGroup);

  const cardMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x1e1b4b,
    transparent: true,
    opacity: 0.35,
    roughness: 0.1,
    metalness: 0.1,
    transmission: 0.8,
    ior: 1.5,
    reflectivity: 0.9,
    clearcoat: 1,
    clearcoatRoughness: 0.1,
    side: THREE.DoubleSide
  });

  const borderMaterial = new THREE.LineBasicMaterial({
    color: 0x818cf8,
    transparent: true,
    opacity: 0.4
  });

  const cards = [];
  const count = 14;

  for (let i = 0; i < count; i++) {
    // 3D Card ratio similar to photo/A4 paper (1 : 1.4)
    const geometry = new THREE.PlaneGeometry(3.5, 4.9);
    const card = new THREE.Mesh(geometry, cardMaterial);

    // Edges
    const edges = new THREE.EdgesGeometry(geometry);
    const line = new THREE.LineSegments(edges, borderMaterial);
    card.add(line);

    const x = (Math.random() - 0.5) * 45;
    const y = (Math.random() - 0.5) * 35;
    const z = (Math.random() - 0.5) * 30 - 5;

    card.position.set(x, y, z);
    card.rotation.x = Math.random() * Math.PI;
    card.rotation.y = Math.random() * Math.PI;

    card.userData = {
      rotSpeedX: (Math.random() - 0.5) * 0.006,
      rotSpeedY: (Math.random() - 0.5) * 0.006,
      floatSpeed: 0.001 + Math.random() * 0.002,
      initialY: y
    };

    cards.push(card);
    cardGroup.add(card);
  }

  // Floating Star Particle Field
  const particleCount = 400;
  const particleGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);

  const c1 = new THREE.Color(0x6366f1);
  const c2 = new THREE.Color(0x10b981);

  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 70;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 70;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 50;

    const mixedColor = c1.clone().lerp(c2, Math.random());
    colors[i * 3] = mixedColor.r;
    colors[i * 3 + 1] = mixedColor.g;
    colors[i * 3 + 2] = mixedColor.b;
  }

  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const particleMat = new THREE.PointsMaterial({
    size: 0.25,
    vertexColors: true,
    transparent: true,
    opacity: 0.7
  });

  const particleSystem = new THREE.Points(particleGeo, particleMat);
  scene.add(particleSystem);

  // Mouse Parallax Interaction
  let mouseX = 0;
  let mouseY = 0;
  let targetX = 0;
  let targetY = 0;

  window.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  // Animation Loop
  let clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const elapsedTime = clock.getElapsedTime();

    targetX += (mouseX - targetX) * 0.05;
    targetY += (mouseY - targetY) * 0.05;

    camera.position.x = targetX * 3;
    camera.position.y = -targetY * 3;
    camera.lookAt(scene.position);

    cards.forEach((card) => {
      card.rotation.x += card.userData.rotSpeedX;
      card.rotation.y += card.userData.rotSpeedY;

      card.position.y = card.userData.initialY + Math.sin(elapsedTime * 1.5 + card.position.x) * 1.2;
    });

    particleSystem.rotation.y = elapsedTime * 0.03;

    pointLight1.position.x = Math.sin(elapsedTime * 0.5) * 20;
    pointLight1.position.z = Math.cos(elapsedTime * 0.5) * 20;

    renderer.render(scene, camera);
  }

  animate();

  // Resize Handler
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}
