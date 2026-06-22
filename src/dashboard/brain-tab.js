/**
 * @file Hologram Brain — JARVIS/Ultron-style 3D Neural Network Visualization
 * @description Three.js-powered real-time brain visualization driven by Coral agent activity
 * 
 * Visualizes:
 * - Central brain sphere with rotating orbital rings
 * - Neural network nodes (events, tools, decisions, memories)
 * - Pulsing connections between related nodes
 * - Real-time data readouts around the brain
 * - Particle effects for active processes
 */

(function() {
  'use strict';

  // ═══ CONFIG ═══
  const BRAIN_CONFIG = {
    nodeCount: 80,
    connectionDistance: 2.5,
    pulseSpeed: 0.02,
    rotationSpeed: 0.003,
    particleCount: 200,
    ringCount: 3,
    nodeTypes: {
      event:    { color: 0x00ffff, size: 0.08, glow: 0.4 },  // Cyan
      tool:     { color: 0xff6b35, size: 0.10, glow: 0.5 },  // Orange
      decision: { color: 0x00ff88, size: 0.12, glow: 0.6 },  // Green
      memory:   { color: 0xff00ff, size: 0.09, glow: 0.45 }, // Magenta
      error:    { color: 0xff3333, size: 0.11, glow: 0.7 },  // Red
    }
  };

  // ═══ STATE ═══
  let scene, camera, renderer, brainGroup;
  let nodes = [], connections = [], particles = [];
  let rings = [];
  let brainSphere, coreGlow;
  let animFrame = null;
  let isActive = false;
  let lastActivity = Date.now();
  let activityLevel = 0; // 0-1, drives pulse intensity
  let wsConnection = null;

  // Data readouts
  let readouts = {
    events: 0,
    tools: 0,
    decisions: 0,
    memories: 0,
    errors: 0,
    uptime: 0,
    status: 'IDLE'
  };

  // ═══ THREE.JS SETUP ═══
  function initThreeJS(container) {
    // Scene
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000011, 0.08);

    // Camera
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 100);
    camera.position.set(0, 1.5, 5);
    camera.lookAt(0, 0, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000011, 1);
    container.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x112244, 0.5);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x00ffff, 1.5, 20);
    pointLight1.position.set(3, 3, 3);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xff00ff, 1.0, 20);
    pointLight2.position.set(-3, -2, 2);
    scene.add(pointLight2);

    // Brain group (everything rotates together)
    brainGroup = new THREE.Group();
    scene.add(brainGroup);

    // Build brain components
    createBrainSphere();
    createOrbitalRings();
    createNeuralNodes();
    createConnections();
    createParticles();
    createCoreGlow();

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(container);
  }

  // ═══ BRAIN SPHERE ═══
  function createBrainSphere() {
    // Wireframe sphere (brain surface)
    const geometry = new THREE.IcosahedronGeometry(1.2, 2);
    const material = new THREE.MeshBasicMaterial({
      color: 0x003355,
      wireframe: true,
      transparent: true,
      opacity: 0.15
    });
    brainSphere = new THREE.Mesh(geometry, material);
    brainGroup.add(brainSphere);

    // Inner glow sphere
    const glowGeo = new THREE.SphereGeometry(1.1, 32, 32);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x0066aa,
      transparent: true,
      opacity: 0.05,
      side: THREE.BackSide
    });
    const innerGlow = new THREE.Mesh(glowGeo, glowMat);
    brainGroup.add(innerGlow);
  }

  // ═══ CORE GLOW ═══
  function createCoreGlow() {
    const geometry = new THREE.SphereGeometry(0.3, 32, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.6
    });
    coreGlow = new THREE.Mesh(geometry, material);
    brainGroup.add(coreGlow);

    // Outer glow
    const outerGeo = new THREE.SphereGeometry(0.5, 32, 32);
    const outerMat = new THREE.MeshBasicMaterial({
      color: 0x00aaff,
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide
    });
    const outerGlow = new THREE.Mesh(outerGeo, outerMat);
    coreGlow.add(outerGlow);
  }

  // ═══ ORBITAL RINGS ═══
  function createOrbitalRings() {
    const ringColors = [0x00ffff, 0xff00ff, 0x00ff88];
    const ringRadii = [1.6, 2.0, 2.4];
    const ringTilts = [0.3, -0.5, 0.8];

    for (let i = 0; i < BRAIN_CONFIG.ringCount; i++) {
      const curve = new THREE.EllipseCurve(
        0, 0,
        ringRadii[i], ringRadii[i] * 0.6,
        0, 2 * Math.PI,
        false, 0
      );
      const points = curve.getPoints(128);
      const geometry = new THREE.BufferGeometry().setFromPoints(
        points.map(p => new THREE.Vector3(p.x, 0, p.y))
      );
      const material = new THREE.LineBasicMaterial({
        color: ringColors[i],
        transparent: true,
        opacity: 0.3
      });
      const ring = new THREE.Line(geometry, material);
      ring.rotation.x = ringTilts[i];
      ring.rotation.z = i * 0.5;
      ring.userData = { speed: 0.005 + i * 0.003, baseOpacity: 0.3 };
      brainGroup.add(ring);
      rings.push(ring);
    }
  }

  // ═══ NEURAL NODES ═══
  function createNeuralNodes() {
    const types = Object.keys(BRAIN_CONFIG.nodeTypes);
    
    for (let i = 0; i < BRAIN_CONFIG.nodeCount; i++) {
      const type = types[i % types.length];
      const config = BRAIN_CONFIG.nodeTypes[type];
      
      // Distribute on sphere surface with some randomness
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 1.0 + Math.random() * 0.6; // Slightly outside brain surface
      
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      // Node sphere
      const geometry = new THREE.SphereGeometry(config.size, 8, 8);
      const material = new THREE.MeshBasicMaterial({
        color: config.color,
        transparent: true,
        opacity: 0.7
      });
      const node = new THREE.Mesh(geometry, material);
      node.position.set(x, y, z);
      node.userData = { 
        type, 
        baseOpacity: 0.7, 
        pulsePhase: Math.random() * Math.PI * 2,
        active: false,
        activityTime: 0
      };
      brainGroup.add(node);
      nodes.push(node);

      // Glow ring around active nodes
      const glowGeo = new THREE.RingGeometry(config.size * 1.5, config.size * 2, 16);
      const glowMat = new THREE.MeshBasicMaterial({
        color: config.color,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide
      });
      const glowRing = new THREE.Mesh(glowGeo, glowMat);
      glowRing.position.copy(node.position);
      glowRing.lookAt(0, 0, 0);
      glowRing.userData = { parent: node, baseOpacity: config.glow };
      brainGroup.add(glowRing);
      node.userData.glowRing = glowRing;
    }
  }

  // ═══ CONNECTIONS ═══
  function createConnections() {
    const material = new THREE.LineBasicMaterial({
      color: 0x004466,
      transparent: true,
      opacity: 0.1
    });

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dist = nodes[i].position.distanceTo(nodes[j].position);
        if (dist < BRAIN_CONFIG.connectionDistance) {
          const points = [nodes[i].position.clone(), nodes[j].position.clone()];
          const geometry = new THREE.BufferGeometry().setFromPoints(points);
          const line = new THREE.Line(geometry, material.clone());
          line.userData = { 
            nodeA: i, 
            nodeB: j, 
            baseOpacity: 0.1,
            active: false 
          };
          brainGroup.add(line);
          connections.push(line);
        }
      }
    }
  }

  // ═══ PARTICLES ═══
  function createParticles() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(BRAIN_CONFIG.particleCount * 3);
    const colors = new Float32Array(BRAIN_CONFIG.particleCount * 3);
    const sizes = new Float32Array(BRAIN_CONFIG.particleCount);

    for (let i = 0; i < BRAIN_CONFIG.particleCount; i++) {
      // Random position in sphere
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = Math.random() * 3;
      
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      // Cyan/white particles
      colors[i * 3] = 0.3 + Math.random() * 0.7;
      colors[i * 3 + 1] = 0.8 + Math.random() * 0.2;
      colors[i * 3 + 2] = 1.0;

      sizes[i] = 0.02 + Math.random() * 0.03;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.03,
      vertexColors: true,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const particleSystem = new THREE.Points(geometry, material);
    particleSystem.userData = { positions, velocities: [] };
    
    // Initialize velocities
    for (let i = 0; i < BRAIN_CONFIG.particleCount; i++) {
      particleSystem.userData.velocities.push({
        x: (Math.random() - 0.5) * 0.002,
        y: (Math.random() - 0.5) * 0.002,
        z: (Math.random() - 0.5) * 0.002
      });
    }
    
    brainGroup.add(particleSystem);
    particles.push(particleSystem);
  }

  // ═══ ANIMATION LOOP ═══
  function animate() {
    if (!isActive) return;
    animFrame = requestAnimationFrame(animate);

    const time = Date.now() * 0.001;
    const pulse = Math.sin(time * 2) * 0.5 + 0.5;

    // Rotate brain group
    brainGroup.rotation.y += BRAIN_CONFIG.rotationSpeed;
    brainGroup.rotation.x = Math.sin(time * 0.5) * 0.1;

    // Pulse brain sphere
    if (brainSphere) {
      const scale = 1 + pulse * 0.02 * activityLevel;
      brainSphere.scale.setScalar(scale);
      brainSphere.material.opacity = 0.12 + pulse * 0.05 * activityLevel;
    }

    // Pulse core glow
    if (coreGlow) {
      const coreScale = 0.8 + pulse * 0.4 + activityLevel * 0.3;
      coreGlow.scale.setScalar(coreScale);
      coreGlow.material.opacity = 0.4 + pulse * 0.3 * activityLevel;
      
      // Color shift based on activity
      const hue = activityLevel > 0.5 ? 0xff0066 : 0x00ffff;
      coreGlow.material.color.setHex(hue);
    }

    // Rotate rings
    for (const ring of rings) {
      ring.rotation.z += ring.userData.speed;
      ring.material.opacity = ring.userData.baseOpacity + pulse * 0.1 * activityLevel;
    }

    // Pulse nodes
    for (const node of nodes) {
      const phase = node.userData.pulsePhase;
      const nodePulse = Math.sin(time * 3 + phase) * 0.5 + 0.5;
      
      if (node.userData.active) {
        // Active nodes glow brighter
        node.material.opacity = 0.7 + nodePulse * 0.3;
        const scale = 1 + nodePulse * 0.3;
        node.scale.setScalar(scale);
        
        // Show glow ring
        if (node.userData.glowRing) {
          node.userData.glowRing.material.opacity = 
            node.userData.glowRing.userData.baseOpacity * (0.5 + nodePulse * 0.5);
        }
        
        // Decay activity
        if (Date.now() - node.userData.activityTime > 3000) {
          node.userData.active = false;
          node.material.opacity = node.userData.baseOpacity;
          node.scale.setScalar(1);
          if (node.userData.glowRing) {
            node.userData.glowRing.material.opacity = 0;
          }
        }
      } else {
        // Idle pulse
        node.material.opacity = node.userData.baseOpacity * (0.5 + nodePulse * 0.5);
      }
    }

    // Pulse connections
    for (const conn of connections) {
      if (conn.userData.active) {
        conn.material.opacity = 0.5 + pulse * 0.3;
        conn.material.color.setHex(0x00ffff);
        
        if (Date.now() - conn.userData.activityTime > 2000) {
          conn.userData.active = false;
          conn.material.opacity = conn.userData.baseOpacity;
          conn.material.color.setHex(0x004466);
        }
      }
    }

    // Animate particles
    for (const ps of particles) {
      const positions = ps.geometry.attributes.position.array;
      const velocities = ps.userData.velocities;
      
      for (let i = 0; i < BRAIN_CONFIG.particleCount; i++) {
        positions[i * 3] += velocities[i].x + Math.sin(time + i) * 0.001 * activityLevel;
        positions[i * 3 + 1] += velocities[i].y + Math.cos(time + i) * 0.001 * activityLevel;
        positions[i * 3 + 2] += velocities[i].z;
        
        // Keep particles in bounds
        const dist = Math.sqrt(
          positions[i * 3] ** 2 + 
          positions[i * 3 + 1] ** 2 + 
          positions[i * 3 + 2] ** 2
        );
        if (dist > 3.5) {
          positions[i * 3] *= 0.5;
          positions[i * 3 + 1] *= 0.5;
          positions[i * 3 + 2] *= 0.5;
        }
      }
      ps.geometry.attributes.position.needsUpdate = true;
      
      // Particle opacity based on activity
      ps.material.opacity = 0.2 + activityLevel * 0.4;
    }

    // Update activity level (decay over time)
    activityLevel *= 0.995;
    if (Date.now() - lastActivity > 10000) {
      activityLevel = Math.max(0, activityLevel - 0.01);
    }

    renderer.render(scene, camera);
  }

  // ═══ ACTIVITY TRIGGERS ═══
  function triggerActivity(type, data) {
    lastActivity = Date.now();
    activityLevel = Math.min(1, activityLevel + 0.2);

    // Find a random node of this type and activate it
    const typeNodes = nodes.filter(n => n.userData.type === type);
    if (typeNodes.length > 0) {
      const node = typeNodes[Math.floor(Math.random() * typeNodes.length)];
      node.userData.active = true;
      node.userData.activityTime = Date.now();
      
      // Activate nearby connections
      for (const conn of connections) {
        const idx = nodes.indexOf(node);
        if (conn.userData.nodeA === idx || conn.userData.nodeB === idx) {
          conn.userData.active = true;
          conn.userData.activityTime = Date.now();
        }
      }
    }

    // Update readouts
    readouts[type + 's'] = (readouts[type + 's'] || 0) + 1;
    updateReadoutDisplay();
  }

  function triggerError() {
    lastActivity = Date.now();
    activityLevel = Math.min(1, activityLevel + 0.4);
    
    // Flash core red
    if (coreGlow) {
      coreGlow.material.color.setHex(0xff3333);
      setTimeout(() => coreGlow.material.color.setHex(0x00ffff), 500);
    }
    
    readouts.errors++;
    updateReadoutDisplay();
  }

  // ═══ WEBSOCKET INTEGRATION ═══
  function connectToAgent() {
    const wsUrl = `ws://${location.host}/ws/events`;
    wsConnection = new WebSocket(wsUrl);
    
    wsConnection.onopen = () => {
      readouts.status = 'CONNECTED';
      updateReadoutDisplay();
    };
    
    wsConnection.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        
        if (msg.type === 'state') {
          // Update readouts from agent state
          if (msg.state) {
            readouts.status = msg.state.status || 'IDLE';
            if (msg.state.currentGoal) {
              readouts.uptime = Date.now();
            }
          }
        } else if (msg.type === 'event') {
          const evt = msg.event;
          if (!evt) return;
          
          // Map event types to node types
          switch (evt.type) {
            case 'task_started':
            case 'task_finished':
              triggerActivity('event', evt);
              break;
            case 'tool_called':
            case 'tool_finished':
              triggerActivity('tool', evt);
              break;
            case 'decision_made':
              triggerActivity('decision', evt);
              break;
            case 'memory_stored':
            case 'memory_retrieved':
              triggerActivity('memory', evt);
              break;
            case 'error':
              triggerError();
              break;
            default:
              triggerActivity('event', evt);
          }
        } else if (msg.type === 'events' && Array.isArray(msg.events)) {
          // Batch events
          for (const evt of msg.events) {
            switch (evt.type) {
              case 'tool_called':
              case 'tool_finished':
                triggerActivity('tool', evt);
                break;
              case 'decision_made':
                triggerActivity('decision', evt);
                break;
              case 'error':
                triggerError();
                break;
              default:
                triggerActivity('event', evt);
            }
          }
        }
      } catch (e) {
        // Non-critical
      }
    };
    
    wsConnection.onclose = () => {
      readouts.status = 'DISCONNECTED';
      updateReadoutDisplay();
      // Reconnect after 3s
      setTimeout(connectToAgent, 3000);
    };
    
    wsConnection.onerror = () => {
      readouts.status = 'ERROR';
      updateReadoutDisplay();
    };
  }

  // ═══ READOUT DISPLAY ═══
  function updateReadoutDisplay() {
    const els = {
      'brain-status': readouts.status,
      'brain-events': readouts.events,
      'brain-tools': readouts.tools,
      'brain-decisions': readouts.decisions,
      'brain-memories': readouts.memories,
      'brain-errors': readouts.errors,
    };
    
    for (const [id, value] of Object.entries(els)) {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    }

    // Update activity bar
    const activityBar = document.getElementById('brain-activity-bar');
    if (activityBar) {
      activityBar.style.width = `${activityLevel * 100}%`;
      activityBar.className = `brain-activity-fill ${activityLevel > 0.7 ? 'high' : activityLevel > 0.3 ? 'medium' : 'low'}`;
    }
  }

  // ═══ PUBLIC API ═══
  window.HologramBrain = {
    init(container) {
      if (scene) return; // Already initialized
      
      initThreeJS(container);
      connectToAgent();
      
      isActive = true;
      animate();
    },
    
    destroy() {
      isActive = false;
      if (animFrame) cancelAnimationFrame(animFrame);
      if (wsConnection) wsConnection.close();
      if (renderer) {
        renderer.dispose();
        renderer.domElement?.remove();
      }
      scene = null;
      nodes = [];
      connections = [];
      particles = [];
      rings = [];
    },
    
    // Manual trigger for testing
    trigger(type) {
      triggerActivity(type || 'event');
    },
    
    getReadouts() {
      return { ...readouts };
    }
  };
})();
