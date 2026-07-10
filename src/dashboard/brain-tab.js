/**
 * @file Code Graph — Static 3D Knowledge Graph Visualization
 * Inspired by codebase-memory-mcp: stable, no animation, clean layout
 * Three.js r128 + EffectComposer (global THREE)
 */
(function () {
  'use strict';

  // ═══ CONFIG ═══
  var CONFIG = {
    // Graph layout
    sphereRadius: 3.5,
    maxNodes: 500,         // Limit for performance
    maxEdges: 200,
    // Node sizes by type (like codebase-memory-mcp)
    nodeSizes: {
      Class:     0.18,
      Interface: 0.16,
      Function:  0.14,
      Method:    0.12,
      File:      0.10,
      Module:    0.16,
      Variable:  0.08,
      Section:   0.06,
      default:   0.10,
    },
    // Node colors by type (like codebase-memory-mcp)
    nodeColors: {
      Class:     0xff66aa,
      Interface: 0xcc99ff,
      Function:  0x00ffcc,
      Method:    0x00ccff,
      File:      0x66aaff,
      Module:    0xffaa00,
      Variable:  0x88ff88,
      Section:   0x888888,
      default:   0xaaaaaa,
    },
    // Edge colors by type (like codebase-memory-mcp)
    edgeColors: {
      DEFINES:        0x00ff88,
      DEFINES_METHOD: 0x00cc88,
      IMPORTS:        0xffaa00,
      CALLS:          0x00ffcc,
      INHERITS:       0xff66aa,
      IMPLEMENTS:     0x66aaff,
      USAGE:          0x666666,
      WRITES:         0x88aaff,
      default:        0x444444,
    },
    edgeOpacity: 0.4,
    backgroundColor: 0x000611,
    bloomStrength: 0.2,
    bloomRadius: 0.05,
    bloomThreshold: 0.0,
  };

  // ═══ STATE ═══

  var scene, camera, renderer, composer;
  var graphGroup;
  var graphNodes = [];
  var graphEdges = [];
  var animFrame = null;
  var isActive = false;
  var currentTaskId = null;
  var graphDataLoaded = false;
  var isGraphLoading = false;
  var lastLoadedTaskId = null;
  var isMobile = window.innerWidth < 768 || ('ontouchstart' in window);
  var autoRotateSpeed = isMobile ? 0.002 : 0;
  var autoRotateAngle = 0;

  // ═══ EVENT HIGHLIGHT MANAGER ═══
  var HighlightManager = {
    nodeStates: new Map(),     // nodeId -> {active: boolean, startedAt: number, ttl: number, confidence: number, hop: number}
    activeIds: new Set(),
    lastProcessTime: 0,
    batchInterval: 64,          // ~15fps
    init: function() {
      console.log('[HighlightManager] Initialized');
    },
    clear: function() {
      this.nodeStates.clear();
      this.activeIds.clear();
    },
    startHighlight: function(nodeId, confidence, hop = 0) {
      const now = Date.now();
      const centerTTL = 4000;      // 4 seconds
      const neighborTTL = 2500;    // 2.5 seconds
      const ttl = (hop === 0) ? centerTTL : neighborTTL;
    
      this.nodeStates.set(nodeId, {
        active: true,
        startedAt: now,
        ttl: ttl,
        confidence: confidence,
        hop: hop
      });
      this.activeIds.add(nodeId);
    },
    update: function(now) {
      // Batch process, chỉ xử lý khi đạt đến batchInterval
      if (now - this.lastProcessTime < this.batchInterval) return;
      this.lastProcessTime = now;
    
      for (let [nodeId, state] of this.nodeStates.entries()) {
        const elapsed = now - state.startedAt;
        if (elapsed >= state.ttl) {
          this.nodeStates.delete(nodeId);
          this.activeIds.delete(nodeId);
        }
      }
    },
    isActive: function(nodeId) {
      return this.activeIds.has(nodeId);
    },
    getRemainingTTL: function(nodeId) {
      const state = this.nodeStates.get(nodeId);
      if (!state) return 0;
      const elapsed = Date.now() - state.startedAt;
      return Math.max(0, (state.ttl - elapsed) / state.ttl); // 0-1
    },
    getConfidence: function(nodeId) {
      const state = this.nodeStates.get(nodeId);
      return state ? state.confidence : 0;
    },
    getHop: function(nodeId) {
      const state = this.nodeStates.get(nodeId);
      return state ? state.hop : -1;
    }
  };

  // ═══ CODE GRAPH INDEX ═══
  var CodeGraphIndex = {
    nodesByFilePath: new Map(),        // filePath -> [nodeId, ...]
    nodesByQualifiedName: new Map(),   // qualifiedName -> nodeId
    nodesByNameLower: new Map(),       // name.toLowerCase() -> [nodeId, ...]
    adjacency: new Map(),              // nodeId -> Set(neighborId)
    edgesByPair: new Map(),            // `${source}-${target}` -> edgeData
    toolNodeMap: new Map(),            // toolName -> qualifiedName
    loaded: false
  };

  // ═══ EVENT TO NODE MATCHER ═══
  var EventMatcher = {
    // Primary tool registry - extracted from actual tool usage
    getToolRegistry: function() {
      return {
        'web_search': 'utils.search',
        'writeFile': 'fs.writeFile',
        'readFile': 'fs.readFile',
        'execute_bash': 'bash.execute',
        'read_file': 'fs.readFile',
        'write_file': 'fs.writeFile',
        'task_complete': 'task.complete',
        'judgment_call': 'judgment.call',
        'memo_write': 'memo.write',
        'tool_use': 'tools.use'
        // Add more from actual tool usage patterns
      };
    },
    matchEvent: function(event, index) {
      var payload = event.payload || {};
    
      // 1. args.path khớp byFilePath → 1.0
      if (payload.args) {
        var path = payload.args.path || payload.args.file_path || payload.args.file;
        if (path && index.nodesByFilePath.has(path)) {
          var nodeIds = index.nodesByFilePath.get(path);
          var results = [];
          for (var k = 0; k < nodeIds.length; k++) {
            results.push({ nodeId: nodeIds[k], confidence: 1.0, source: 'args.path' });
          }
          return results;
        }
      }
    
      // 2. toolName có trong TOOL_NODE_MAP → 1.0
      if (payload.toolName) {
        var qualifiedName = index.toolNodeMap.get(payload.toolName);
        if (qualifiedName && index.nodesByQualifiedName.has(qualifiedName)) {
          var nodeId = index.nodesByQualifiedName.get(qualifiedName);
          return [{ nodeId: nodeId, confidence: 1.0, source: 'toolName.exact' }];
        }
        // Fallback: match toolName directly against node names (lowercase)
        var toolLower = payload.toolName.toLowerCase();
        if (index.nodesByNameLower.has(toolLower)) {
          var candidates = index.nodesByNameLower.get(toolLower);
          var results = [];
          for (var k = 0; k < candidates.length; k++) {
            results.push({ nodeId: candidates[k], confidence: 0.8, source: 'toolName.fuzzy' });
          }
          return results;
        }
      }
    
      // 3. decision_made: keyword khớp y nguyên trong byNameLower/byQualifiedName → 0.7
      if (event.type === 'decision_made') {
        var decision = payload.decision || '';
        var reason = payload.reason || '';
        var nextAction = payload.nextAction || '';
        var text = (decision + ' ' + reason + ' ' + nextAction).toLowerCase();
      
        // Exact keyword matches
        var words = text.split(/[\s,()]+/).filter(function(w) { return w.length > 3; });
        for (var w = 0; w < words.length; w++) {
          var word = words[w];
          if (index.nodesByNameLower.has(word)) {
            var candidates = index.nodesByNameLower.get(word);
            var results = [];
            for (var k = 0; k < candidates.length; k++) {
              results.push({ nodeId: candidates[k], confidence: 0.7, source: 'decision.keyword' });
            }
            return results;
          }
        }
      }
    
      // 4. Bỏ qua các event không đạt 0.5 confidence
      return [];
    },
    highlightNeighbors: function(centerId, index, maxRadius = 2, maxTotal = 40) {
      const visited = new Set();
      const queue = [{ nodeId: centerId, distance: 0 }];
      visited.add(centerId);
      const results = [centerId];
    
      while (queue.length > 0 && results.length < maxTotal) {
        const current = queue.shift();
        if (current.distance >= maxRadius) continue;
      
        // Get neighbors from adjacency
        const neighbors = index.adjacency.get(current.nodeId) || new Set();
      
        for (const neighborId of neighbors) {
          if (!visited.has(neighborId) && results.length < maxTotal) {
            visited.add(neighborId);
            queue.push({ nodeId: neighborId, distance: current.distance + 1 });
            results.push(neighborId);
          }
        }
      }
    
      return results;
    }
  };

  // ═══ SCROLL HANDLER ═══
  var ScrollHandler = {
    seenIds: new Set(),
    processScrolling: function(now, index, matcher) {
      // Process new events from timeline
      if (window.__agentState && window.__agentState.timeline) {
        var timeline = window.__agentState.timeline;
        for (var i = 0; i < timeline.length; i++) {
          var ev = timeline[i];
          if (ev.id && !this.seenIds.has(ev.id)) {
            this.seenIds.add(ev.id);
            this.processEvent(ev, index, matcher);
          }
        }
        // Prevent unbounded growth — cap at 200 seen IDs
        if (this.seenIds.size > 200) {
          var arr = Array.from(this.seenIds).slice(-100);
          this.seenIds = new Set(arr);
        }
      }
    },
    processEvent: function(event, index, matcher) {
      var matches = matcher.matchEvent(event, index);
      if (!matches.length) return;
    
      for (var j = 0; j < matches.length; j++) {
        var match = matches[j];
        var neighbors = matcher.highlightNeighbors(match.nodeId, index, 2, 40);
      
        for (var i = 0; i < neighbors.length; i++) {
          var hop = (i === 0) ? 0 : (i <= 5 ? 1 : 2);
          HighlightManager.startHighlight(neighbors[i], match.confidence, hop);
        }
        console.log('[HighlightManager] Processed event', event.type, 'matches:', matches.length, 'nodes highlighted:', neighbors.length);
      }
    }
  };

  // FPS tracking
  var frameCount = 0;
  var fpsTimer = 0;
  var currentFps = 60;

  // Tooltip
  var tooltipEl = null;
  var raycaster = new THREE.Raycaster();
  var mouse = new THREE.Vector2();
  var hoveredNode = null;

  // Zoom / Orbit state
  var cameraMinZ = 2;
  var cameraMaxZ = 20;
  var cameraDefaultZ = 6;
  var isDragging = false;
  var dragLastX = 0;
  var dragLastY = 0;
  var orbitEnabled = !isMobile;  // disable orbit drag on mobile (auto-rotate instead)
  var currentMode = 'brain';     // 'brain' | 'combined' | 'graph'

  // 2D Graph mode SVG
  var graphSvgEl = null;
  var graphSvgGroup = null;
  var eventNodes = [];    // 3D meshes for combined mode event spheres

  // ═══ THREE.JS SETUP ═══
  function initScene(container) {
    var w = container.clientWidth || 1024;
    var h = container.clientHeight || 768;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(CONFIG.backgroundColor);

    camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 100);
    camera.position.set(0, 1.5, 6);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({
      antialias: !isMobile,
      alpha: true,
      powerPreference: isMobile ? 'low-power' : 'default',
    });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1 : 2));
    container.appendChild(renderer.domElement);

    // Bloom — skip on mobile (performance)
    if (!isMobile) {
      composer = new THREE.EffectComposer(renderer);
      var renderPass = new THREE.RenderPass(scene, camera);
      composer.addPass(renderPass);

      var bloomPass = new THREE.UnrealBloomPass(
        new THREE.Vector2(w, h),
        CONFIG.bloomStrength,
        CONFIG.bloomRadius,
        CONFIG.bloomThreshold
      );
      composer.addPass(bloomPass);
      composer._bloomPass = bloomPass;
    }

    // Group for all graph objects
    graphGroup = new THREE.Group();
    scene.add(graphGroup);

    // Resize
    var resizeObserver = new ResizeObserver(function () {
      var w2 = container.clientWidth;
      var h2 = container.clientHeight;
      camera.aspect = w2 / h2;
      camera.updateProjectionMatrix();
      renderer.setSize(w2, h2);
      if (composer) composer.setSize(w2, h2);
    });
    resizeObserver.observe(container);

    isActive = true;
    setupControls(container);
    // Add touch hint for mobile
    if (isMobile) {
      var hint = document.createElement('div');
      hint.id = 'brain-touch-hint';
      hint.textContent = '👆 chạm vào node để xem';
      hint.style.cssText = [
        'position: absolute',
        'bottom: 16px',
        'left: 50%',
        'transform: translateX(-50%)',
        'color: rgba(255,255,255,0.4)',
        'font-size: 11px',
        'pointer-events: none',
        'transition: opacity 2s ease',
        'text-align: center',
        'z-index: 10',
      ].join(';') + ';';
      container.appendChild(hint);
      // Fade out after 4s
      setTimeout(function () {
        hint.style.opacity = '0';
        setTimeout(function () { hint.remove(); }, 2000);
      }, 4000);
    }
    animate();
  }

  // ═══ FIBONACCI SPHERE LAYOUT ═══
  function fibonacciSphere(index, total, radius) {
    var goldenRatio = (1 + Math.sqrt(5)) / 2;
    var theta = 2 * Math.PI * index / goldenRatio;
    var phi = Math.acos(1 - 2 * (index + 0.5) / Math.max(total, 1));
    var r = radius;
    return {
      x: r * Math.sin(phi) * Math.cos(theta),
      y: r * Math.sin(phi) * Math.sin(theta),
      z: r * Math.cos(phi)
    };
  }

  // ═══ RENDER GRAPH ═══
  function clearGraph() {
    while (graphGroup.children.length > 0) {
      graphGroup.remove(graphGroup.children[0]);
    }
    graphNodes = [];
    graphEdges = [];
  }

  function makeHaloGeometry(radius, segments) {
    var geo = new THREE.SphereGeometry(radius * 2.5, segments, segments);
    return geo;
  }

  function makeLabelTexture(text, colorHex, size) {
    var canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 256, 64);
    // Text shadow / glow
    ctx.shadowColor = '#' + colorHex.toString(16).padStart(6, '0');
    ctx.shadowBlur = 8;
    ctx.font = '18px "Courier New", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Truncate if too long
    var displayText = text.length > 24 ? text.slice(0, 22) + '..' : text;
    ctx.fillText(displayText, 128, 32);
    // Re-draw without shadow for crisp text
    ctx.shadowBlur = 0;
    ctx.fillText(displayText, 128, 32);
    var texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  function renderGraph(data) {
    if (!data) return;
    clearGraph();

    var nodes = data.nodes || [];
    var edges = data.edges || [];
    
    if (nodes.length === 0) return;

    var nodeCount = Math.min(nodes.length, CONFIG.maxNodes);
    var nodeMap = {};

    // === RENDER NODES with halo glow (codebase-memory-mcp style) ===
    for (var i = 0; i < nodeCount; i++) {
      var nodeData = nodes[i];
      var label = nodeData.label || 'default';
      var size = CONFIG.nodeSizes[label] || CONFIG.nodeSizes.default;
      var color = CONFIG.nodeColors[label] || CONFIG.nodeColors.default;

      // Fibonacci sphere position
      var pos = fibonacciSphere(i, nodeCount, CONFIG.sphereRadius);

      // Halo glow (larger transparent sphere behind node)
      var haloGeo = makeHaloGeometry(size, 10);
      var haloMat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.15,
        depthWrite: false,
      });
      var halo = new THREE.Mesh(haloGeo, haloMat);
      halo.position.set(pos.x, pos.y, pos.z);
      halo.userData = { type: 'graphHalo', nodeIndex: i };
      graphGroup.add(halo);

      // Core sphere
      var geometry = new THREE.SphereGeometry(size, 12, 12);
      var material = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.85,
      });
      var mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(pos.x, pos.y, pos.z);

      mesh.userData = {
        type: 'graphNode',
        id: nodeData.id || i,
        label: label,
        name: nodeData.name || '',
        qualifiedName: nodeData.qualified_name || '',
        filePath: nodeData.file_path || '',
        color: color,
        size: size,
        basePos: { x: pos.x, y: pos.y, z: pos.z },
      };

      // Text sprite label (shown above node)
      var labelTex = makeLabelTexture(nodeData.name || nodeData.id, color, size);
      var spriteMat = new THREE.SpriteMaterial({
        map: labelTex,
        transparent: true,
        depthTest: false,
        opacity: 0.7,
      });
      var sprite = new THREE.Sprite(spriteMat);
      sprite.position.set(pos.x, pos.y + size * 3.5, pos.z);
      sprite.scale.set(1.0, 0.3, 1.0);

      graphGroup.add(sprite);
      graphGroup.add(mesh);
      graphNodes.push(mesh);
      nodeMap[nodeData.id] = mesh;
    }

    // === RENDER CURVED EDGES (Quadratic Bezier, codebase-memory-mcp style) ===
    var edgeCount = 0;
    var maxEdges = Math.min(edges.length, CONFIG.maxEdges);

    for (var i = 0; i < maxEdges; i++) {
      var edgeData = edges[i];
      var srcMesh = nodeMap[edgeData.source];
      var dstMesh = nodeMap[edgeData.target];
      if (!srcMesh || !dstMesh) continue;

      var edgeType = edgeData.type || 'default';
      var color = CONFIG.edgeColors[edgeType] || CONFIG.edgeColors.default;

      // Quadratic bezier curve for organic feel
      var sp = srcMesh.position;
      var dp = dstMesh.position;
      // Midpoint offset by random factor for curve
      var midX = (sp.x + dp.x) / 2;
      var midY = (sp.y + dp.y) / 2;
      var midZ = (sp.z + dp.z) / 2;
      // Offset control point outward from sphere center for arc
      var len = Math.sqrt(midX*midX + midY*midY + midZ*midZ);
      var offset = 0.15;
      if (len > 0) {
        midX += (midX / len) * offset;
        midY += (midY / len) * offset;
        midZ += (midZ / len) * offset;
      }

      var curve = new THREE.QuadraticBezierCurve3(sp, new THREE.Vector3(midX, midY, midZ), dp);
      var points = curve.getPoints(16);
      var geometry = new THREE.BufferGeometry().setFromPoints(points);
      var material = new THREE.LineBasicMaterial({
        color: color,
        transparent: true,
        opacity: CONFIG.edgeOpacity,
      });
      var line = new THREE.Line(geometry, material);
      line.userData = {
        type: 'graphEdge',
        edgeType: edgeType,
        sourceId: edgeData.source,
        targetId: edgeData.target,
      };

      graphGroup.add(line);
      graphEdges.push(line);
      edgeCount++;
    }

    console.log('[CodeGraph] Rendered: ' + graphNodes.length + ' nodes, ' + graphEdges.length + ' edges');
    
    // Build CodeGraphIndex for event matching
    buildCodeGraphIndex(data);
  }

  // Animation time tracker for node breathing
  var animTime = 0;

  // ═══ BUILD CODE GRAPH INDEX (one-time after render) ═══
  function buildCodeGraphIndex(data) {
    CodeGraphIndex.nodesByFilePath.clear();
    CodeGraphIndex.nodesByQualifiedName.clear();
    CodeGraphIndex.nodesByNameLower.clear();
    CodeGraphIndex.adjacency.clear();
    CodeGraphIndex.edgesByPair.clear();
    CodeGraphIndex.toolNodeMap.clear();

    var nodes = data.nodes || [];
    var edges = data.edges || [];

    // Populate node indexes
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      var id = n.id;
      
      // byFilePath
      if (n.file_path) {
        if (!CodeGraphIndex.nodesByFilePath.has(n.file_path)) {
          CodeGraphIndex.nodesByFilePath.set(n.file_path, []);
        }
        CodeGraphIndex.nodesByFilePath.get(n.file_path).push(id);
      }
      
      // byQualifiedName
      if (n.qualified_name) {
        CodeGraphIndex.nodesByQualifiedName.set(n.qualified_name, id);
      }
      
      // byNameLower
      if (n.name) {
        var nameLower = n.name.toLowerCase();
        if (!CodeGraphIndex.nodesByNameLower.has(nameLower)) {
          CodeGraphIndex.nodesByNameLower.set(nameLower, []);
        }
        CodeGraphIndex.nodesByNameLower.get(nameLower).push(id);
      }
    }

    // Build adjacency from edges
    for (var j = 0; j < edges.length; j++) {
      var e = edges[j];
      var src = e.source;
      var tgt = e.target;
      
      if (!CodeGraphIndex.adjacency.has(src)) {
        CodeGraphIndex.adjacency.set(src, new Set());
      }
      CodeGraphIndex.adjacency.get(src).add(tgt);
      
      // Undirected for BFS
      if (!CodeGraphIndex.adjacency.has(tgt)) {
        CodeGraphIndex.adjacency.set(tgt, new Set());
      }
      CodeGraphIndex.adjacency.get(tgt).add(src);
      
      // edgesByPair
      CodeGraphIndex.edgesByPair.set(src + '-' + tgt, e);
      CodeGraphIndex.edgesByPair.set(tgt + '-' + src, e);
    }

    // Tool → qualifiedName map (explicit registry)
    var registry = EventMatcher.getToolRegistry();
    for (var toolName in registry) {
      CodeGraphIndex.toolNodeMap.set(toolName, registry[toolName]);
    }

    CodeGraphIndex.loaded = true;
    console.log('[CodeGraphIndex] Built: ' + 
      CodeGraphIndex.nodesByFilePath.size + ' files, ' +
      CodeGraphIndex.nodesByQualifiedName.size + ' qualified, ' +
      CodeGraphIndex.nodesByNameLower.size + ' names, ' +
      CodeGraphIndex.adjacency.size + ' adjacency nodes');
  }

  // ═══ ANIMATION LOOP ═══
  function animate() {
    if (!isActive) return;
    animFrame = requestAnimationFrame(animate);

    animTime += 0.02;

    // Auto-rotation on mobile or combined mode
    if (autoRotateSpeed > 0 && graphGroup) {
      autoRotateAngle += autoRotateSpeed;
      graphGroup.rotation.y = autoRotateAngle;
    }

    // Breathing pulse animation for nodes (codebase-memory-mcp style)
    var pulse = 0.85 + 0.15 * Math.sin(animTime * 0.8);
    
    // Update highlight manager
    var now = Date.now();
    HighlightManager.update(now);
    
    for (var ni = 0; ni < graphNodes.length; ni++) {
      var n = graphNodes[ni];
      // Core node breathing
      var baseSize = n.userData.size || 0.1;
      var s = baseSize * (0.9 + 0.1 * Math.sin(animTime * 0.6 + ni * 0.1));
      
      // Apply highlight overlay for Brain/Combined modes
      var nodeId = n.userData.id;
      if (HighlightManager.isActive(nodeId)) {
        var ttl = HighlightManager.getRemainingTTL(nodeId);
        var conf = HighlightManager.getConfidence(nodeId);
        // Boost opacity and scale for active nodes
        n.material.opacity = Math.min(1.0, 0.85 + ttl * conf * 0.15);
        n.scale.setScalar((s / baseSize) * (1.0 + ttl * conf * 0.5));
      } else {
        // Normal breathing
        var isGraphMode = (currentMode === 'graph');
        // For graph mode: dim everything by default (overlay approach)
        // For brain/combined: keep normal breathing
        if (isGraphMode && HighlightManager.activeIds.size > 0) {
          // When highlights exist in graph mode, dim inactive nodes
          n.material.opacity = 0.1;
          n.scale.setScalar((s / baseSize) * 0.5);
        } else {
          n.material.opacity = 0.85;
          n.scale.setScalar(s / baseSize);
        }
      }
    }
    
    // Process batched events (only in graph mode for Canvas2D highlight)
    if (CodeGraphIndex.loaded) {
      ScrollHandler.processScrolling(now, CodeGraphIndex, EventMatcher);
    }
    
    // Update edge highlights for active nodes (Brain/Combined)
    if (HighlightManager.activeIds.size > 0) {
      for (var ei = 0; ei < graphEdges.length; ei++) {
        var edge = graphEdges[ei];
        var srcId = edge.userData.sourceId;
        var tgtId = edge.userData.targetId;
        var srcActive = HighlightManager.isActive(srcId);
        var tgtActive = HighlightManager.isActive(tgtId);
        if (srcActive || tgtActive) {
          var maxTTL = Math.max(
            HighlightManager.getRemainingTTL(srcId),
            HighlightManager.getRemainingTTL(tgtId)
          );
          edge.material.opacity = CONFIG.edgeOpacity + maxTTL * 0.6;
        } else if (currentMode === 'graph') {
          edge.material.opacity = CONFIG.edgeOpacity * 0.15;
        } else {
          edge.material.opacity = CONFIG.edgeOpacity;
        }
      }
    }

    // FPS tracking
    frameCount++;
    if (fpsTimer === 0) fpsTimer = Date.now();
    var elapsed = Date.now() - fpsTimer;
    if (elapsed >= 1000) {
      currentFps = Math.round(frameCount / (elapsed / 1000));
      fpsTimer = 0;
      frameCount = 0;
    }

    // Static layout - no animation
    // Only render
    if (composer) {
      composer.render();
    } else if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }
  }

  // ═══ ZOOM + ORBIT CONTROLS ═══
  function setupControls(container) {
    var canvas = renderer.domElement;
    if (!canvas) return;

    // Wheel zoom
    canvas.addEventListener('wheel', function (e) {
      e.preventDefault();
      var delta = e.deltaY > 0 ? 0.5 : -0.5;
      camera.position.z = Math.max(cameraMinZ, Math.min(cameraMaxZ, camera.position.z + delta));
      camera.lookAt(0, 0, 0);
    }, { passive: false });

    if (!orbitEnabled) return;

    // Drag orbit
    var dragPausedSpeed = 0;
    canvas.addEventListener('mousedown', function (e) {
      if (e.button !== 0) return;
      isDragging = true;
      dragLastX = e.clientX;
      dragLastY = e.clientY;
      dragPausedSpeed = autoRotateSpeed;
      autoRotateSpeed = 0;
    });

    window.addEventListener('mousemove', function (e) {
      if (!isDragging || !graphGroup) return;
      var dx = e.clientX - dragLastX;
      var dy = e.clientY - dragLastY;
      dragLastX = e.clientX;
      dragLastY = e.clientY;
      graphGroup.rotation.y += dx * 0.01;
      graphGroup.rotation.x += dy * 0.005;
      // Clamp X rotation
      if (graphGroup.rotation.x > Math.PI / 2) graphGroup.rotation.x = Math.PI / 2;
      if (graphGroup.rotation.x < -Math.PI / 2) graphGroup.rotation.x = -Math.PI / 2;
    });

    window.addEventListener('mouseup', function () {
      isDragging = false;
      autoRotateSpeed = dragPausedSpeed;
    });
  }

  // ═══ DATA LOADING ═══
  async function loadGraphData() {
    try {
      var resp = await fetch('/api/code-graph');
      if (!resp.ok) return null;
      var respData = await resp.json();
      if (respData.success && respData.data && respData.data.nodes && respData.data.edges) {
        return respData.data;
      }
      return null;
    } catch (err) {
      console.warn('[CodeGraph] Load failed:', err.message);
      return null;
    }
  }

  async function loadAndRenderGraph() {
    if (isGraphLoading) return;
    isGraphLoading = true;
    try {
      var data = await loadGraphData();
      if (data) {
        renderGraph(data);
        graphDataLoaded = true;
      }
    } finally {
      isGraphLoading = false;
    }
  }

  // ═══ TOOLTIP ═══
  function createTooltip() {
    var container = renderer.domElement.parentNode;
    if (!container) return;
    tooltipEl = document.createElement('div');
    tooltipEl.id = 'graph-tooltip';
    tooltipEl.style.cssText = [
      'position: absolute',
      'display: none',
      'z-index: 1000',
      'pointer-events: none',
      'background: rgba(0, 8, 20, 0.92)',
      'border: 1px solid rgba(0, 255, 200, 0.2)',
      'border-radius: 6px',
      'padding: 6px 10px',
      'font-family: "Courier New", monospace',
      'font-size: 11px',
      'line-height: 1.5',
      'color: #ccc',
      'white-space: nowrap',
    ].join(';') + ';';
    container.appendChild(tooltipEl);
  }

  function setupTooltip() {
    var canvas = renderer.domElement;
    if (!canvas) return;

    // Mouse event
    canvas.addEventListener('mousemove', function (e) {
      handlePointerMove(e.clientX, e.clientY);
    });

    // Touch events — mobile support
    canvas.addEventListener('touchstart', function (e) {
      if (e.touches.length === 1) {
        var t = e.touches[0];
        handlePointerMove(t.clientX, t.clientY);
      }
    }, { passive: true });

    canvas.addEventListener('touchmove', function (e) {
      if (e.touches.length === 1) {
        var t = e.touches[0];
        handlePointerMove(t.clientX, t.clientY);
      }
    }, { passive: true });

    canvas.addEventListener('touchend', function () {
      tooltipEl.style.display = 'none';
      if (hoveredNode) {
        hoveredNode.material.opacity = 0.7;
        hoveredNode = null;
      }
    }, { passive: true });
  }

  function handlePointerMove(clientX, clientY) {
    // Skip if dragging (orbit)
    if (isDragging) return;
    var canvas = renderer.domElement;
    if (!canvas) return;
    var rect = canvas.getBoundingClientRect();
    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    var intersects = raycaster.intersectObjects(graphNodes);

    if (intersects.length > 0) {
      var mesh = intersects[0].object;
      var ud = mesh.userData;

      if (hoveredNode && hoveredNode !== mesh) {
        hoveredNode.material.opacity = 0.7;
      }
      mesh.material.opacity = 1.0;
      hoveredNode = mesh;

      tooltipEl.style.display = 'block';
      var tx = clientX - rect.left + 14;
      var ty = clientY - rect.top - 12;
      if (ty < 10) ty = 20;
      if (tx + 250 > rect.width) tx = rect.width - 260;
      tooltipEl.style.left = tx + 'px';
      tooltipEl.style.top = ty + 'px';

      var html = '<div style="color:' + colorHex(mesh.material.color) + ';font-weight:bold;margin-bottom:2px">' + ud.label + '</div>';
      if (ud.name) html += '<div style="color:#fff;font-size:11px">' + escapeHtml(ud.name) + '</div>';
      if (ud.qualifiedName) html += '<div style="color:#8af;font-size:10px">' + escapeHtml(ud.qualifiedName) + '</div>';
      if (ud.filePath) html += '<div style="color:#666;font-size:9px;margin-top:2px">' + escapeHtml(ud.filePath) + '</div>';
      tooltipEl.innerHTML = html;
      return;
    }

    tooltipEl.style.display = 'none';
    if (hoveredNode) {
      hoveredNode.material.opacity = 0.7;
      hoveredNode = null;
    }
  }

  function colorHex(color) {
    return '#' + color.getHexString();
  }

  function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ═══ COMBINED MODE — Event Nodes on Inner Sphere ═══
  function renderCombinedEvents() {
    // Get event data from agent state timeline (200 entries real-time)
    var events = [];
    if (window.__agentState && window.__agentState.timeline) {
      events = window.__agentState.timeline;
    }

    // Inner sphere radius (smaller than code sphere)
    var innerRadius = 1.6;
    var takeEvents = events.slice(-100); // last 100 events
    var totalEvents = takeEvents.length;
    if (totalEvents === 0) {
      // Show placeholder: one small central glow
      var geo = new THREE.SphereGeometry(0.3, 16, 16);
      var mat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.3 });
      var placeholder = new THREE.Mesh(geo, mat);
      placeholder.position.set(0, 0, 0);
      graphGroup.add(placeholder);
      return;
    }
    for (var i = 0; i < totalEvents; i++) {
      var ev = takeEvents[i];
      // Map event type → color
      var color = 0x00ffff; // default cyan
      var etype = ev.type || '';
      if (etype === 'task_finished' || etype === 'task_completed') {
        color = ev.payload && ev.payload.success ? 0x00ff88 : 0xff3333;
      } else if (etype === 'task_started') {
        color = 0x00ffff;
      } else if (etype === 'decision_made') {
        color = 0xcc99ff;
      } else if (etype === 'tool_called' || etype === 'tool_started') {
        color = 0xffaa00;
      } else if (etype === 'tool_finished') {
        color = 0x88ff88;
      }

      var pos = fibonacciSphere(i, totalEvents, innerRadius);
      var geo = new THREE.SphereGeometry(0.12, 8, 8);
      var mat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.8 });
      var mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(pos.x, pos.y, pos.z);
      mesh.userData = {
        type: 'eventNode',
        id: ev.id || ev.decisionId || i,
        name: (ev.payload && (ev.payload.goal || ev.payload.toolName || ev.payload.decision)) || etype,
        label: etype,
        colorHex: color,
      };
      graphGroup.add(mesh);
      eventNodes.push(mesh);
    }
  }

  // ═══ GRAPH MODE — 2D SVG Force Graph ═══
/* ============================================================================
 * graph-canvas-force.js
 *
 * Drop-in replacement for renderGraph2D() / renderSvgGraph() inside
 * D:\AI-Agent\src\dashboard\brain-tab.js
 *
 * Replaces the static circular SVG layout with a Canvas2D + d3-force
 * (force-directed) layout: nodes cluster according to real edge
 * relationships, click-to-highlight connections, pan/zoom, scalable to
 * thousands of nodes without DOM bloat.
 *
 * INTEGRATION:
 *   1. Delete the existing renderGraph2D() (l.646-741) and
 *      renderSvgGraph() (l.747-852) functions from brain-tab.js.
 *   2. Paste everything below into brain-tab.js in their place
 *      (same module scope — it expects the existing `loadGraphData()`
 *      function and `data` shape from /api/code-graph to still exist).
 *   3. No other changes needed — window.CodeGraph.init/loadGraph/setMode
 *      call into renderGraph2D(container) exactly as before.
 * ==========================================================================*/

// ---- d3-force loader (CDN, standalone UMD bundle — no build step) --------
let _d3ForceLoadPromise = null;
function ensureD3Force() {
  if (window.d3 && window.d3.forceSimulation) return Promise.resolve();
  if (_d3ForceLoadPromise) return _d3ForceLoadPromise;
  _d3ForceLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/d3-force/3.0.0/d3-force.min.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load d3-force from CDN'));
    document.head.appendChild(script);
  });
  return _d3ForceLoadPromise;
}

// ---- color maps (reused from the old SVG implementation) -----------------
const NODE_COLORS = {
  Class: '#ff66aa', Interface: '#cc99ff', Function: '#00ffcc',
  Method: '#00ccff', File: '#66aaff', Module: '#ffaa00',
  Variable: '#88ff88', default: '#aaa'
};
const EDGE_COLORS = {
  DEFINES: '#00ff88', IMPORTS: '#ffaa00', CALLS: '#00ffcc',
  INHERITS: '#ff66aa', IMPLEMENTS: '#66aaff', USAGE: '#666', default: '#444'
};
const NODE_RADIUS = {
  File: 7, Module: 6, Class: 5.5, Interface: 5, Function: 4, Method: 4, Variable: 3, default: 4
};

// ---- internal state for the canvas graph instance -------------------------
let _cg = null; // current canvas-graph instance, one at a time per container

function destroyCanvasGraph() {
  if (!_cg) return;
  if (_cg.simulation) _cg.simulation.stop();
  if (_cg.rafId) cancelAnimationFrame(_cg.rafId);
  if (_cg.resizeObserver) _cg.resizeObserver.disconnect();
  if (_cg.canvas && _cg.canvas.parentNode) _cg.canvas.parentNode.removeChild(_cg.canvas);
  if (_cg.tooltipEl && _cg.tooltipEl.parentNode) _cg.tooltipEl.parentNode.removeChild(_cg.tooltipEl);
  if (_cg.inspectorEl && _cg.inspectorEl.parentNode) _cg.inspectorEl.parentNode.removeChild(_cg.inspectorEl);
  _cg = null;
}

/**
 * Entry point — replaces old renderGraph2D(container).
 * Hides the 3D canvas (if present, same as before), shows a loading
 * placeholder, fetches graph data via the existing loadGraphData(),
 * then builds the force-directed canvas view.
 */
function renderGraph2D(container) {
  // Hide 3D canvas (same behavior as before)
  if (typeof renderer !== 'undefined' && renderer && renderer.domElement) {
    renderer.domElement.style.display = 'none';
  }

  destroyCanvasGraph();

  const loadingEl = document.createElement('div');
  loadingEl.textContent = 'Loading code graph...';
  loadingEl.style.cssText =
    'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);' +
    'color:#888;font-family:monospace;font-size:14px;pointer-events:none;';
  loadingEl.dataset.cgLoading = '1';
  container.appendChild(loadingEl);

  Promise.all([ensureD3Force(), loadGraphData()])
    .then(([_, data]) => {
      if (loadingEl.parentNode) loadingEl.parentNode.removeChild(loadingEl);
      if (!data || !data.nodes || !data.nodes.length) {
        const emptyEl = document.createElement('div');
        emptyEl.textContent = 'No graph data available.';
        emptyEl.style.cssText = loadingEl.style.cssText;
        container.appendChild(emptyEl);
        return;
      }
      buildCodeGraphIndex(data);
      buildForceGraph(container, data);
    })
    .catch((err) => {
      console.warn('[CodeGraph] graph mode failed:', err);
      if (loadingEl.parentNode) loadingEl.parentNode.removeChild(loadingEl);
      const errEl = document.createElement('div');
      errEl.textContent = 'Failed to load graph: ' + err.message;
      errEl.style.cssText =
        'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);' +
        'color:#ff6666;font-family:monospace;font-size:13px;pointer-events:none;';
      container.appendChild(errEl);
    });
}

function buildForceGraph(container, data) {
  const w = container.clientWidth || 800;
  const h = container.clientHeight || 600;

  // --- clone nodes/edges so we never mutate the original /api/code-graph
  //     payload (d3-force mutates edge.source/target into object refs,
  //     and writes x/y/vx/vy onto nodes).
  const nodes = data.nodes.map((n) => ({ ...n }));
  const idSet = new Set(nodes.map((n) => n.id));
  const edges = data.edges
    .filter((e) => idSet.has(e.source) && idSet.has(e.target))
    .map((e) => ({ ...e }));

  // --- adjacency map for O(1) click-highlight lookups ----------------------
  const adjacency = new Map(); // id -> { neighbors: Set<id>, edges: Set<edgeIndex> }
  nodes.forEach((n) => adjacency.set(n.id, { neighbors: new Set(), edgeIdx: new Set() }));
  edges.forEach((e, i) => {
    adjacency.get(e.source).neighbors.add(e.target);
    adjacency.get(e.source).edgeIdx.add(i);
    adjacency.get(e.target).neighbors.add(e.source);
    adjacency.get(e.target).edgeIdx.add(i);
  });

  // --- canvas setup ---------------------------------------------------------
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;cursor:grab;';
  container.appendChild(canvas);

  const dpr = window.devicePixelRatio || 1;
  function resizeCanvas() {
    const cw = container.clientWidth || w;
    const ch = container.clientHeight || h;
    canvas.width = cw * dpr;
    canvas.height = ch * dpr;
    canvas.style.width = cw + 'px';
    canvas.style.height = ch + 'px';
  }
  resizeCanvas();
  const ctx = canvas.getContext('2d');

  // --- tooltip (hover) --------------------------------------------------
  const tooltipEl = document.createElement('div');
  tooltipEl.style.cssText =
    'position:absolute;pointer-events:none;display:none;z-index:10;' +
    'background:rgba(10,14,20,0.95);border:1px solid #2a3540;border-radius:4px;' +
    'padding:6px 10px;font-family:monospace;font-size:11px;color:#ccc;' +
    'max-width:320px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
  container.appendChild(tooltipEl);

  // --- inspector panel (click) -------------------------------------------
  const inspectorEl = document.createElement('div');
  inspectorEl.style.cssText =
    'position:absolute;top:10px;right:10px;width:280px;display:none;z-index:10;' +
    'background:rgba(10,14,20,0.97);border:1px solid #2a3540;border-radius:6px;' +
    'padding:12px;font-family:monospace;font-size:11px;color:#ccc;' +
    'max-height:80%;overflow-y:auto;';
  container.appendChild(inspectorEl);

  // --- view transform (pan/zoom) -------------------------------------------
  const transform = { x: w / 2, y: h / 2, k: 1 };
  let needsRedraw = true;

  function worldToScreen(x, y) {
    return [x * transform.k + transform.x, y * transform.k + transform.y];
  }
  function screenToWorld(sx, sy) {
    return [(sx - transform.x) / transform.k, (sy - transform.y) / transform.k];
  }

  // --- selection state -----------------------------------------------------
  let selectedNode = null;

  // --- d3-force simulation ---------------------------------------------
  const d3 = window.d3;
  const simulation = d3
    .forceSimulation(nodes)
    .force('link', d3.forceLink(edges).id((d) => d.id).distance(40).strength(0.35))
    .force('charge', d3.forceManyBody().strength(-60).distanceMax(500))
    .force('center', d3.forceCenter(0, 0))
    .force('collide', d3.forceCollide((d) => (NODE_RADIUS[d.label] || NODE_RADIUS.default) + 2))
    .alphaDecay(0.04)
    .stop();

  // Pre-settle synchronously (headless) before first paint, capped by a
  // time budget so very large graphs don't freeze the tab.
  const TICK_BUDGET_MS = 1500;
  const startTime = performance.now();
  let ticks = 0;
  while (simulation.alpha() > simulation.alphaMin() && performance.now() - startTime < TICK_BUDGET_MS) {
    simulation.tick();
    ticks++;
    if (ticks > 600) break; // hard cap regardless of time, safety net
  }

  // --- draw ------------------------------------------------------------
  function draw() {
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

    const highlightSet = selectedNode ? adjacency.get(selectedNode.id) : null;
    const hasHighlights = HighlightManager.activeIds.size > 0;

    // edges
    ctx.lineWidth = 1;
    for (let i = 0; i < edges.length; i++) {
      const e = edges[i];
      const srcId = typeof e.source === 'object' ? e.source.id : e.source;
      const tgtId = typeof e.target === 'object' ? e.target.id : e.target;
      const dimmed = highlightSet && !highlightSet.edgeIdx.has(i);
      const [sx, sy] = worldToScreen(e.source.x, e.source.y);
      const [tx, ty] = worldToScreen(e.target.x, e.target.y);
      ctx.strokeStyle = EDGE_COLORS[e.type] || EDGE_COLORS.default;
      
      // Event highlight: edges connected to active nodes glow
      if (hasHighlights) {
        const srcActive = HighlightManager.isActive(srcId);
        const tgtActive = HighlightManager.isActive(tgtId);
        if (srcActive || tgtActive) {
          const maxTTL = Math.max(HighlightManager.getRemainingTTL(srcId), HighlightManager.getRemainingTTL(tgtId));
          ctx.globalAlpha = 0.3 + maxTTL * 0.7;
          ctx.lineWidth = 1 + maxTTL * 2;
        } else {
          ctx.globalAlpha = 0.05;  // Subscribe-less: dim inactive when highlights exist
          ctx.lineWidth = 0.5;
        }
      } else if (dimmed) {
        ctx.globalAlpha = 0.04;
      } else {
        ctx.globalAlpha = 0.55;
      }
      
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(tx, ty);
      ctx.stroke();
    }

    // nodes
    for (const n of nodes) {
      const dimmed =
        highlightSet && n.id !== selectedNode?.id && !highlightSet.neighbors.has(n.id);
      const isSelected = n.id === selectedNode?.id;
      const r = (NODE_RADIUS[n.label] || NODE_RADIUS.default) * (isSelected ? 1.6 : 1);
      const [sx, sy] = worldToScreen(n.x, n.y);
      
      // Event highlight overlay for Graph mode
      if (hasHighlights) {
        const isActive = HighlightManager.isActive(n.id);
        const ttl = HighlightManager.getRemainingTTL(n.id);
        if (isActive) {
          // Active node: bright glow, increased size based on TTL
          const boost = 1.0 + ttl * 0.4;
          ctx.globalAlpha = Math.min(1, 0.3 + ttl * 0.7);
          ctx.fillStyle = NODE_COLORS[n.label] || NODE_COLORS.default;
          ctx.beginPath();
          ctx.arc(sx, sy, r * boost * Math.sqrt(transform.k) * 1.3, 0, Math.PI * 2);
          ctx.fill();
          
          // Outer glow ring
          if (ttl > 0.3) {
            ctx.globalAlpha = ttl * 0.3;
            ctx.strokeStyle = NODE_COLORS[n.label] || '#fff';
            ctx.lineWidth = 1 + ttl * 2;
            ctx.beginPath();
            ctx.arc(sx, sy, r * boost * Math.sqrt(transform.k) * 1.6, 0, Math.PI * 2);
            ctx.stroke();
          }
        } else {
          // Inactive node when highlights are present: very dim
          ctx.globalAlpha = 0.1;
          ctx.fillStyle = NODE_COLORS[n.label] || NODE_COLORS.default;
          ctx.beginPath();
          ctx.arc(sx, sy, r * Math.sqrt(transform.k), 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        ctx.globalAlpha = dimmed ? 0.15 : 1;
        ctx.fillStyle = NODE_COLORS[n.label] || NODE_COLORS.default;
        ctx.beginPath();
        ctx.arc(sx, sy, r * Math.sqrt(transform.k), 0, Math.PI * 2);
        ctx.fill();
      }
      
      if (isSelected) {
        ctx.lineWidth = 2;
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#fff';
        ctx.beginPath();
        ctx.arc(sx, sy, r * Math.sqrt(transform.k) * 1.1, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1;
    ctx.restore();
    needsRedraw = false;
  }

  function requestRedraw() {
    needsRedraw = true;
  }

  // Process events from timeline (for Canvas2D highlight)
  var cgBatchTimer = 0;
  let rafId = requestAnimationFrame(function loop() {
    // Process batched events every ~64ms
    var now = Date.now();
    if (now - cgBatchTimer > 64) {
      cgBatchTimer = now;
      if (CodeGraphIndex.loaded) {
        ScrollHandler.processScrolling(now, CodeGraphIndex, EventMatcher);
      }
    }
    if (needsRedraw || HighlightManager.activeIds.size > 0) draw();
    rafId = requestAnimationFrame(loop);
  });

  // --- pan/zoom interaction --------------------------------------------
  let isDragging = false;
  let dragStart = null;

  canvas.addEventListener('mousedown', (ev) => {
    isDragging = true;
    canvas.style.cursor = 'grabbing';
    dragStart = { x: ev.offsetX, y: ev.offsetY, tx: transform.x, ty: transform.y };
  });
  window.addEventListener('mouseup', () => {
    isDragging = false;
    canvas.style.cursor = 'grab';
  });
  canvas.addEventListener('mousemove', (ev) => {
    if (isDragging) {
      transform.x = dragStart.tx + (ev.offsetX - dragStart.x);
      transform.y = dragStart.ty + (ev.offsetY - dragStart.y);
      requestRedraw();
      tooltipEl.style.display = 'none';
      return;
    }
    // hover hit-test via d3-force's internal quadtree
    const [wx, wy] = screenToWorld(ev.offsetX, ev.offsetY);
    const hit = simulation.find(wx, wy, 14 / transform.k);
    if (hit) {
      tooltipEl.style.display = 'block';
      tooltipEl.style.left = ev.offsetX + 14 + 'px';
      tooltipEl.style.top = ev.offsetY + 10 + 'px';
      tooltipEl.innerHTML =
        '<strong style="color:' + (NODE_COLORS[hit.label] || '#fff') + '">' + hit.name + '</strong>' +
        '<br><span style="color:#888">' + hit.label + '</span>' +
        '<br><span style="color:#666">' + (hit.filePath || '') + '</span>';
      canvas.style.cursor = 'pointer';
    } else {
      tooltipEl.style.display = 'none';
      canvas.style.cursor = 'grab';
    }
  });
  canvas.addEventListener('mouseleave', () => {
    tooltipEl.style.display = 'none';
  });

  canvas.addEventListener('wheel', (ev) => {
    ev.preventDefault();
    const zoomFactor = ev.deltaY < 0 ? 1.1 : 0.9;
    const [wx, wy] = screenToWorld(ev.offsetX, ev.offsetY);
    transform.k = Math.max(0.05, Math.min(8, transform.k * zoomFactor));
    const [sx2, sy2] = worldToScreen(wx, wy);
    transform.x += ev.offsetX - sx2;
    transform.y += ev.offsetY - sy2;
    requestRedraw();
  }, { passive: false });

  // --- click → highlight connections + inspector --------------------------
  canvas.addEventListener('click', (ev) => {
    const [wx, wy] = screenToWorld(ev.offsetX, ev.offsetY);
    const hit = simulation.find(wx, wy, 14 / transform.k);
    selectedNode = hit || null;
    requestRedraw();
    renderInspector();
  });

  function renderInspector() {
    if (!selectedNode) {
      inspectorEl.style.display = 'none';
      return;
    }
    const adj = adjacency.get(selectedNode.id);
    const neighborNames = Array.from(adj.neighbors)
      .slice(0, 25)
      .map((id) => {
        const n = nodes.find((x) => x.id === id);
        return n ? '<div style="padding:2px 0;color:#9cf;cursor:pointer" data-node-id="' + n.id + '">' +
          n.name + ' <span style="color:#555">(' + n.label + ')</span></div>' : '';
      })
      .join('');

    inspectorEl.style.display = 'block';
    inspectorEl.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
        '<strong style="color:' + (NODE_COLORS[selectedNode.label] || '#fff') + '">' + selectedNode.name + '</strong>' +
        '<span id="cg-inspector-close" style="cursor:pointer;color:#888;">&times;</span>' +
      '</div>' +
      '<div style="color:#888;margin-bottom:4px;">' + selectedNode.label + '</div>' +
      '<div style="color:#666;font-size:10px;word-break:break-all;margin-bottom:8px;">' +
        (selectedNode.filePath || '') +
        (selectedNode.startLine ? ' : ' + selectedNode.startLine + '-' + selectedNode.endLine : '') +
      '</div>' +
      '<div style="border-top:1px solid #2a3540;margin:8px 0;padding-top:8px;color:#888;">' +
        'Connected (' + adj.neighbors.size + ')</div>' +
      '<div>' + (neighborNames || '<span style="color:#555">none</span>') + '</div>';

    inspectorEl.querySelector('#cg-inspector-close').addEventListener('click', () => {
      selectedNode = null;
      requestRedraw();
      renderInspector();
    });
    inspectorEl.querySelectorAll('[data-node-id]').forEach((el) => {
      el.addEventListener('click', () => {
        const id = el.dataset.nodeId;
        selectedNode = nodes.find((n) => n.id === id) || null;
        requestRedraw();
        renderInspector();
      });
    });
  }

  // --- resize handling -------------------------------------------------
  const resizeObserver = new ResizeObserver(() => {
    resizeCanvas();
    requestRedraw();
  });
  resizeObserver.observe(container);

  // store instance for cleanup / getStats()
  _cg = { canvas, tooltipEl, inspectorEl, simulation, rafId, resizeObserver, nodes, edges };
}

/**
 * Hook into the existing getStats() — call this from CodeGraph.getStats()
 * when mode === 'graph' to report node/edge counts from the active canvas
 * graph instead of the old SVG counts.
 */
function getCanvasGraphStats() {
  if (!_cg) return { nodes: 0, edges: 0 };
  return { nodes: _cg.nodes.length, edges: _cg.edges.length };
}

/**
 * Call this from CodeGraph.destroy() / setMode() away from 'graph' to
 * properly tear down the canvas, simulation, and listeners.
 */
function destroyGraph2D() {
  destroyCanvasGraph();
}
  // ═══ MODE SWITCHING ═══
  function switchMode(mode, container) {
    if (mode === currentMode) return;
    currentMode = mode;

    // Clean up 2D graph if switching away
    if (mode !== 'graph') {
      // Clean up old SVG (legacy)
      var svgEl = document.getElementById('brain-svg-graph');
      if (svgEl) svgEl.remove();
      var tip = document.getElementById('svg-graph-tooltip');
      if (tip) tip.remove();
      // Clean up new Canvas 2D graph
      destroyCanvasGraph();
      // Show 3D canvas again
      if (renderer) renderer.domElement.style.display = 'block';
    }

    if (mode === 'brain') {
      // Reset to code graph only
      clearGraph();
      // Clean up event nodes from previous combined mode
      while (eventNodes.length > 0) {
        var n = eventNodes.pop();
        if (n) graphGroup.remove(n);
      }
      if (graphDataLoaded) {
        loadAndRenderGraph();
      }
      autoRotateSpeed = isMobile ? 0.002 : 0;
      graphGroup.rotation.x = 0;
      graphGroup.rotation.y = 0;
      camera.position.z = cameraDefaultZ;

    } else if (mode === 'combined') {
      // Code graph + event nodes
      clearGraph();
      // Remove event nodes from previous combined render
      while (eventNodes.length > 0) {
        var n = eventNodes.pop();
        if (n) graphGroup.remove(n);
      }
      if (graphDataLoaded) {
        // Load code graph data and re-render, then add event nodes
        loadAndRenderGraph();
      }
      renderCombinedEvents();
      autoRotateSpeed = isMobile ? 0.003 : 0.001;
      camera.position.z = cameraDefaultZ + 1;

    } else if (mode === 'graph') {
      // 2D SVG
      if (renderer) renderer.domElement.style.display = 'none';
      autoRotateSpeed = 0;
      renderGraph2D(container);
    }
  }
  // ═══ PUBLIC API ═══
  window.CodeGraph = {
    init: function (container) {
      if (scene) return;
      HighlightManager.init();
      initScene(container);
      createTooltip();
      setupTooltip();
    },

    loadGraph: async function () {
      await loadAndRenderGraph();
    },

    setMode: function (mode) {
      var container = renderer ? renderer.domElement.parentNode : null;
      switchMode(mode, container);
    },

    getMode: function () {
      return currentMode;
    },

    destroy: function () {
      isActive = false;
      HighlightManager.clear();
      destroyGraph2D();
      if (animFrame) cancelAnimationFrame(animFrame);
      if (tooltipEl && tooltipEl.parentNode) tooltipEl.parentNode.removeChild(tooltipEl);
      // Remove SVG graph tooltip
      var svgTip = document.getElementById('svg-graph-tooltip');
      if (svgTip) svgTip.remove();
      if (renderer) {
        renderer.dispose();
        if (renderer.domElement && renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
      }
      scene = null;
      graphNodes = [];
      graphEdges = [];
      eventNodes = [];
      renderer = null;
      composer = null;
    },

    getStats: function () {
      if (currentMode === 'graph') {
        var cgStats = getCanvasGraphStats();
        return {
          nodes: cgStats.nodes,
          edges: cgStats.edges,
          fps: currentFps,
          loaded: graphDataLoaded,
          mode: currentMode,
          activeHighlights: HighlightManager.activeIds.size,
        };
      }
      return {
        nodes: graphNodes.length,
        edges: graphEdges.length,
        fps: currentFps,
        loaded: graphDataLoaded,
        mode: currentMode,
        activeHighlights: HighlightManager.activeIds.size,
      };
    },
  };
})();
