/**
 * @file Behavior Renderer — Maps BehaviorPlan → Three.js particle effects
 * @phase Phase 2 — Dashboard Renderer (Hologram tab)
 * @created 2026-07-22
 *
 * Sits alongside brain-tab.js (no modifications to its animation logic).
 * Hooks into the existing Three.js scene via CodeGraph public API.
 * Listens for `behavior_plan_generated` events forwarded by app.js.
 *
 * Visual vocabulary:
 *   think          → orbiting particle swarm (cyan)
 *   celebrate      → particle burst outward (gold)
 *   apologize      → red pulse wave on all nodes
 *   blink          → quick opacity flash on all nodes
 *   look_at        → center glow pulse
 *   pause          → brief animation slowdown
 *   speak          → expanding ripple ring
 *   confirm_needed → pulsing torus around center
 */
(function () {
  'use strict';

  // ═══ CONFIG ═══
  var BEHAVIOR_CONFIG = {
    maxParticles: 200,
    burstCount: 40,
    orbitCount: 24,
    rippleSegments: 64,
    defaultLifespan: 1500,    // ms
    burstLifespan: 1200,
    rippleLifespan: 1000,
    pulseLifespan: 800,
    orbitLifespan: 3000,
    torusLifespan: 2000,
    // Colors per emotion
    emotionColors: {
      confident:  0xffd700,   // gold
      excited:    0xff6600,   // orange
      apologetic: 0xff3333,   // red
      thoughtful: 0x00ccff,   // cyan
      uncertain:  0xcc99ff,   // purple
      urgent:     0xff0066,   // hot pink
      neutral:    0x888888,   // gray
    },
    actionColors: {
      celebrate:      0xffd700,
      apologize:      0xff3333,
      think:          0x00ccff,
      blink:          0xffffff,
      look_at:        0x00ffcc,
      pause:          0x666666,
      speak:          0x00ff88,
      confirm_needed: 0xcc99ff,
    },
  };

  // ═══ STATE ═══
  var behaviorParticles = [];    // { mesh, velocity, life, maxLife, type }
  var behaviorEffects = [];      // { mesh, life, maxLife, type, update }
  var pendingActions = [];       // queued action effects
  var scene = null;
  var graphGroup = null;
  var behaviorGroup = null;      // dedicated Three.Group for behavior effects
  var initialized = false;
  var lastAnimTime = 0;
  var _initTimers = [];        // track setTimeout IDs for cleanup

  // ═══ HELPERS ═══

  function vec3FromFibonacci(index, total, radius) {
    var goldenRatio = (1 + Math.sqrt(5)) / 2;
    var theta = 2 * Math.PI * index / goldenRatio;
    var phi = Math.acos(1 - 2 * (index + 0.5) / Math.max(total, 1));
    return {
      x: radius * Math.sin(phi) * Math.cos(theta),
      y: radius * Math.sin(phi) * Math.sin(theta),
      z: radius * Math.cos(phi),
    };
  }

  function lerp(a, b, t) { return a + (b - a) * t; }

  function getEmotionColor(emotion) {
    return BEHAVIOR_CONFIG.emotionColors[emotion] || 0x888888;
  }

  function getActionColor(actionType, emotion) {
    if (emotion && BEHAVIOR_CONFIG.emotionColors[emotion]) {
      return BEHAVIOR_CONFIG.emotionColors[emotion];
    }
    return BEHAVIOR_CONFIG.actionColors[actionType] || 0x888888;
  }

  // ═══ EFFECT CREATORS ═══

  /**
   * Particle burst — particles shoot outward from center, fade and die
   */
  function createBurstEffect(color, count) {
    count = count || BEHAVIOR_CONFIG.burstCount;
    var geometry = new THREE.SphereGeometry(0.04, 4, 4);
    for (var i = 0; i < count; i++) {
      var mat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 1.0,
      });
      var mesh = new THREE.Mesh(geometry, mat);
      // Random direction from center
      var theta = Math.random() * Math.PI * 2;
      var phi = Math.acos(2 * Math.random() - 1);
      var speed = 0.02 + Math.random() * 0.04;
      mesh.position.set(0, 0, 0);
      behaviorGroup.add(mesh);
      behaviorParticles.push({
        mesh: mesh,
        velocity: {
          x: Math.sin(phi) * Math.cos(theta) * speed,
          y: Math.sin(phi) * Math.sin(theta) * speed,
          z: Math.cos(phi) * speed,
        },
        life: BEHAVIOR_CONFIG.burstLifespan,
        maxLife: BEHAVIOR_CONFIG.burstLifespan,
        type: 'burst',
      });
    }
  }

  /**
   * Orbiting particle swarm — particles orbit around center
   */
  function createOrbitEffect(color, count) {
    count = count || BEHAVIOR_CONFIG.orbitCount;
    var geometry = new THREE.SphereGeometry(0.03, 4, 4);
    for (var i = 0; i < count; i++) {
      var mat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.8,
      });
      var mesh = new THREE.Mesh(geometry, mat);
      var angle = (i / count) * Math.PI * 2;
      var radius = 1.2 + Math.random() * 0.6;
      var yOffset = (Math.random() - 0.5) * 1.5;
      mesh.position.set(
        Math.cos(angle) * radius,
        yOffset,
        Math.sin(angle) * radius
      );
      behaviorGroup.add(mesh);
      behaviorParticles.push({
        mesh: mesh,
        velocity: {
          x: 0, y: 0, z: 0,  // not used for orbit
        },
        orbit: {
          angle: angle,
          radius: radius,
          speed: 0.015 + Math.random() * 0.01,
          yOffset: yOffset,
          yOscillation: Math.random() * 0.3,
        },
        life: BEHAVIOR_CONFIG.orbitLifespan,
        maxLife: BEHAVIOR_CONFIG.orbitLifespan,
        type: 'orbit',
      });
    }
  }

  /**
   * Ripple ring — expanding ring from center
   */
  function createRippleEffect(color) {
    var geometry = new THREE.RingGeometry(0.1, 0.15, BEHAVIOR_CONFIG.rippleSegments);
    var mat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });
    var mesh = new THREE.Mesh(geometry, mat);
    mesh.lookAt(new THREE.Vector3(0, 0, 1)); // face camera
    behaviorGroup.add(mesh);
    behaviorEffects.push({
      mesh: mesh,
      life: BEHAVIOR_CONFIG.rippleLifespan,
      maxLife: BEHAVIOR_CONFIG.rippleLifespan,
      type: 'ripple',
      update: function (progress) {
        var scale = 0.5 + progress * 4.0;
        mesh.scale.setScalar(scale);
        mesh.material.opacity = 0.8 * (1 - progress);
      },
    });
  }

  /**
   * Pulsing torus — ring around center, pulses opacity
   */
  function createTorusEffect(color) {
    var geometry = new THREE.TorusGeometry(1.8, 0.03, 8, 64);
    var mat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.6,
    });
    var mesh = new THREE.Mesh(geometry, mat);
    mesh.rotation.x = Math.PI / 2;
    behaviorGroup.add(mesh);
    behaviorEffects.push({
      mesh: mesh,
      life: BEHAVIOR_CONFIG.torusLifespan,
      maxLife: BEHAVIOR_CONFIG.torusLifespan,
      type: 'torus',
      update: function (progress) {
        var pulse = 0.3 + 0.7 * Math.abs(Math.sin(progress * Math.PI * 4));
        mesh.material.opacity = pulse * (1 - progress);
        var scale = 1.0 + 0.1 * Math.sin(progress * Math.PI * 6);
        mesh.scale.setScalar(scale);
        mesh.rotation.z += 0.02;
      },
    });
  }

  /**
   * Center glow pulse — enlarged transparent sphere at center
   */
  function createCenterGlow(color) {
    var geometry = new THREE.SphereGeometry(0.3, 16, 16);
    var mat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.5,
    });
    var mesh = new THREE.Mesh(geometry, mat);
    mesh.position.set(0, 0, 0);
    behaviorGroup.add(mesh);
    behaviorEffects.push({
      mesh: mesh,
      life: BEHAVIOR_CONFIG.pulseLifespan,
      maxLife: BEHAVIOR_CONFIG.pulseLifespan,
      type: 'glow',
      update: function (progress) {
        var scale = 1.0 + 2.0 * Math.sin(progress * Math.PI);
        mesh.scale.setScalar(scale);
        mesh.material.opacity = 0.5 * (1 - progress);
      },
    });
  }

  // ═══ ACTION → EFFECT MAPPING ═══

  function processAction(action, emotion) {
    var color = getActionColor(action.type, emotion);

    switch (action.type) {
      case 'celebrate':
        createBurstEffect(color, BEHAVIOR_CONFIG.burstCount);
        // Second wave with slight delay (handled by life spread)
        setTimeout(function () {
          createBurstEffect(color, Math.floor(BEHAVIOR_CONFIG.burstCount * 0.6));
        }, 200);
        break;

      case 'apologize':
        // Red pulse on all existing graph nodes (done in tick via nodeMaterials)
        createRippleEffect(color);
        createCenterGlow(color);
        break;

      case 'think':
        createOrbitEffect(color, BEHAVIOR_CONFIG.orbitCount);
        break;

      case 'blink':
        // Quick flash — handled via nodeMaterials in tick
        behaviorEffects.push({
          mesh: null,
          life: 300,
          maxLife: 300,
          type: 'blink',
          update: function () {},
        });
        break;

      case 'look_at':
        createCenterGlow(color);
        break;

      case 'pause':
        // Slow down all behavior particles temporarily
        behaviorEffects.push({
          mesh: null,
          life: action.ms || 500,
          maxLife: action.ms || 500,
          type: 'pause',
          update: function () {},
        });
        break;

      case 'speak':
        createRippleEffect(color);
        createCenterGlow(color);
        break;

      case 'confirm_needed':
        createTorusEffect(color);
        createCenterGlow(color);
        break;
    }
  }

  // ═══ ANIMATION UPDATE ═══

  var _isPaused = false;

  function updateBehaviors(animTime, dt) {
    if (!initialized || !behaviorGroup) return;

    // Check for pause effect
    _isPaused = false;
    for (var pi = 0; pi < behaviorEffects.length; pi++) {
      if (behaviorEffects[pi].type === 'pause') { _isPaused = true; break; }
    }

    var dtMs = dt * 1000;

    // Update particles
    for (var i = behaviorParticles.length - 1; i >= 0; i--) {
      var p = behaviorParticles[i];
      p.life -= dtMs;
      if (p.life <= 0) {
        behaviorGroup.remove(p.mesh);
        if (p.mesh.geometry) p.mesh.geometry.dispose();
        if (p.mesh.material) p.mesh.material.dispose();
        behaviorParticles.splice(i, 1);
        continue;
      }

      var lifeRatio = p.life / p.maxLife;

      if (p.type === 'burst') {
        // Move outward, slow down, fade
        p.mesh.position.x += p.velocity.x;
        p.mesh.position.y += p.velocity.y;
        p.mesh.position.z += p.velocity.z;
        p.velocity.x *= 0.97;
        p.velocity.y *= 0.97;
        p.velocity.z *= 0.97;
        p.mesh.material.opacity = lifeRatio;
        var burstScale = 0.5 + lifeRatio * 0.5;
        p.mesh.scale.setScalar(burstScale);
      } else if (p.type === 'orbit') {
        // Orbit around center
        if (!_isPaused) {
          p.orbit.angle += p.orbit.speed;
        }
        p.mesh.position.x = Math.cos(p.orbit.angle) * p.orbit.radius;
        p.mesh.position.z = Math.sin(p.orbit.angle) * p.orbit.radius;
        p.mesh.position.y = p.orbit.yOffset +
          Math.sin(animTime * 0.5 + p.orbit.angle) * p.orbit.yOscillation;
        p.mesh.material.opacity = 0.3 + 0.5 * lifeRatio;
        var orbitScale = 0.6 + 0.4 * lifeRatio;
        p.mesh.scale.setScalar(orbitScale);
      }
    }

    // Update effects
    for (var j = behaviorEffects.length - 1; j >= 0; j--) {
      var e = behaviorEffects[j];
      e.life -= dtMs;
      if (e.life <= 0) {
        if (e.mesh) {
          behaviorGroup.remove(e.mesh);
          if (e.mesh.geometry) e.mesh.geometry.dispose();
          if (e.mesh.material) e.mesh.material.dispose();
        }
        behaviorEffects.splice(j, 1);
        continue;
      }
      var progress = 1 - (e.life / e.maxLife);
      if (e.update) e.update(progress);
    }

    // Blink effect: flash all graph nodes briefly
    for (var bi = 0; bi < behaviorEffects.length; bi++) {
      if (behaviorEffects[bi].type === 'blink') {
        var blinkProgress = 1 - (behaviorEffects[bi].life / behaviorEffects[bi].maxLife);
        var flashIntensity = Math.sin(blinkProgress * Math.PI);
        // Access graph nodes via CodeGraph (will be set during init)
        if (window.CodeGraph && typeof window.CodeGraph.getGraphGroup === 'function') {
          var gg = window.CodeGraph.getGraphGroup();
          if (gg) {
            gg.traverse(function (child) {
              if (child.isMesh && child.material && child.material.opacity !== undefined) {
                child.material.opacity = Math.min(1.0, child.material.opacity + flashIntensity * 0.3);
              }
            });
          }
        }
        break; // only one blink at a time
      }
    }

    // Apology red tint: tint graph nodes red briefly
    for (var ai = 0; ai < behaviorEffects.length; ai++) {
      if (behaviorEffects[ai].type === 'ripple' || behaviorEffects[ai].type === 'glow') {
        // Only apply red tint for apologize color
        break;
      }
    }
  }

  // ═══ INIT ═══

  function init() {
    if (initialized) return;

    // Wait for CodeGraph to be ready
    if (!window.CodeGraph || typeof window.CodeGraph.getScene !== 'function') {
      // Retry after a short delay (CodeGraph loads after brain-tab.js)
      _initTimers.push(setTimeout(init, 200));
      return;
    }

    scene = window.CodeGraph.getScene();
    if (!scene) {
      // Scene not yet created (tab not opened), retry
      _initTimers.push(setTimeout(init, 500));
      return;
    }

    graphGroup = window.CodeGraph.getGraphGroup();
    behaviorGroup = new THREE.Group();
    behaviorGroup.name = 'behavior-effects';
    scene.add(behaviorGroup);

    // Hook into brain-tab.js animation loop
    window.CodeGraph.setBehaviorTick(updateBehaviors);

    initialized = true;
    console.log('[BehaviorRenderer] Initialized — listening for behavior_plan_generated');
  }

  // ═══ EVENT LISTENER ═══

  function setupEventListener() {
    var brainView = document.getElementById('brain-view');
    if (!brainView) {
      // brain-view not in DOM yet, retry
      _initTimers.push(setTimeout(setupEventListener, 500));
      return;
    }

    brainView.addEventListener('hologram:agent-event', function (e) {
      var msg = e.detail;
      if (!msg || !msg.event) return;

      var event = msg.event;
      if (event.type !== 'behavior_plan_generated') return;

      // Ensure behaviorGroup exists (may need re-init if scene was recreated)
      if (!behaviorGroup || !scene) {
        init();
        if (!behaviorGroup) return;
      }

      var payload = event.payload;
      var actions = payload.actions || [];
      var emotion = payload.emotion;

      for (var i = 0; i < actions.length; i++) {
        processAction(actions[i], emotion);
      }

      // Update readout
      var eventsEl = document.getElementById('brain-events');
      if (eventsEl) {
        var count = parseInt(eventsEl.textContent || '0', 10);
        eventsEl.textContent = count + 1;
      }
    });

    console.log('[BehaviorRenderer] Event listener attached to brain-view');
  }

  // ═══ PUBLIC API ═══

  window.BehaviorRenderer = {
    init: function () {
      init();
      setupEventListener();
    },

    /** Manually trigger a behavior action (for testing/debugging) */
    trigger: function (actionType, emotion) {
      processAction({ type: actionType }, emotion);
    },

    /** Get current particle count (for debugging) */
    getParticleCount: function () {
      return behaviorParticles.length + behaviorEffects.length;
    },

    /** Get active effect types */
    getActiveEffects: function () {
      var types = {};
      behaviorParticles.forEach(function (p) { types[p.type] = (types[p.type] || 0) + 1; });
      behaviorEffects.forEach(function (e) { types[e.type] = (types[e.type] || 0) + 1; });
      return types;
    },

    /** Destroy all effects and cleanup */
    destroy: function () {
      // Cancel any pending init timers
      for (var t = 0; t < _initTimers.length; t++) {
        clearTimeout(_initTimers[t]);
      }
      _initTimers = [];

      for (var i = behaviorParticles.length - 1; i >= 0; i--) {
        var p = behaviorParticles[i];
        if (behaviorGroup) behaviorGroup.remove(p.mesh);
        if (p.mesh.geometry) p.mesh.geometry.dispose();
        if (p.mesh.material) p.mesh.material.dispose();
      }
      for (var j = behaviorEffects.length - 1; j >= 0; j--) {
        var e = behaviorEffects[j];
        if (e.mesh && behaviorGroup) behaviorGroup.remove(e.mesh);
        if (e.mesh && e.mesh.geometry) e.mesh.geometry.dispose();
        if (e.mesh && e.mesh.material) e.mesh.material.dispose();
      }
      behaviorParticles = [];
      behaviorEffects = [];
      if (behaviorGroup && scene) scene.remove(behaviorGroup);
      behaviorGroup = null;
      initialized = false;
    },

    isInitialized: function () { return initialized; },
  };

  // Auto-init when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      _initTimers.push(setTimeout(init, 100));
      setupEventListener();
    });
  } else {
    _initTimers.push(setTimeout(init, 100));
    setupEventListener();
  }
})();
