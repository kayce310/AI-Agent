/**
 * @vitest-environment jsdom
 *
 * Coral Behavior Engine — Renderer Tests (Phase 2)
 * Tests action → effect mapping and public API of BehaviorRenderer.
 *
 * Since behavior-renderer.js is a browser-side IIFE that depends on THREE.js globals,
 * we test the action mapping logic by mocking the THREE namespace and DOM.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Reset module cache so the IIFE re-runs each test
beforeEach(() => {
  vi.resetModules();
});

// ═══ THREE.js Mock ═══
// Minimal mock sufficient for BehaviorRenderer initialization

function createMockMesh() {
  return {
    position: { set: vi.fn(), x: 0, y: 0, z: 0 },
    scale: { setScalar: vi.fn() },
    rotation: { x: 0, y: 0, z: 0 },
    material: { opacity: 0.5, color: {}, transparent: true, dispose: vi.fn() },
    geometry: { dispose: vi.fn() },
    lookAt: vi.fn(),
    traverse: vi.fn(),
    isMesh: true,
    name: '',
  };
}

function createMockGroup() {
  const meshes: any[] = [];
  return {
    add: vi.fn((m: any) => meshes.push(m)),
    remove: vi.fn((m: any) => { const i = meshes.indexOf(m); if (i >= 0) meshes.splice(i, 1); }),
    traverse: vi.fn((fn: any) => meshes.forEach(fn)),
    name: '',
    _meshes: meshes,
  };
}

function setupMocks() {
  const mockScene = {
    add: vi.fn(),
    remove: vi.fn(),
  };

  const mockGraphGroup = createMockGroup();
  const mockBehaviorGroup = createMockGroup();

  // @ts-ignore
  globalThis.THREE = {
    SphereGeometry: vi.fn(() => ({ dispose: vi.fn() })),
    RingGeometry: vi.fn(() => ({ dispose: vi.fn() })),
    TorusGeometry: vi.fn(() => ({ dispose: vi.fn() })),
    MeshBasicMaterial: vi.fn((opts: any) => ({
      ...opts,
      opacity: opts?.opacity ?? 0.5,
      dispose: vi.fn(),
    })),
    Mesh: vi.fn(() => createMockMesh()),
    Group: vi.fn(() => mockBehaviorGroup),
    DoubleSide: 2,
    Vector3: vi.fn(() => ({ x: 0, y: 0, z: 0 })),
  };

  // Mock CodeGraph public API
  // @ts-ignore
  globalThis.window = globalThis.window || {};
  // @ts-ignore
  globalThis.window.CodeGraph = {
    getScene: () => mockScene,
    getGraphGroup: () => mockGraphGroup,
    getCamera: () => ({ position: { z: 6 } }),
    setBehaviorTick: vi.fn(),
  };

  return { mockScene, mockGraphGroup, mockBehaviorGroup };
}

// ═══ Tests ═══

describe('BehaviorRenderer — Public API', () => {
  beforeEach(() => {
    setupMocks();
  });

  afterEach(() => {
    // @ts-ignore
    if (window.BehaviorRenderer) window.BehaviorRenderer.destroy();
    // @ts-ignore
    delete globalThis.window?.BehaviorRenderer;
    // @ts-ignore
    delete globalThis.window?.CodeGraph;
    // @ts-ignore
    delete globalThis.THREE;
  });

  it('should expose BehaviorRenderer on window', async () => {
    // The IIFE auto-runs on import, but needs THREE and CodeGraph
    await import('../../src/dashboard/behavior-renderer.js');

    // @ts-ignore
    expect(window.BehaviorRenderer).toBeDefined();
    // @ts-ignore
    expect(typeof window.BehaviorRenderer.init).toBe('function');
    // @ts-ignore
    expect(typeof window.BehaviorRenderer.trigger).toBe('function');
    // @ts-ignore
    expect(typeof window.BehaviorRenderer.destroy).toBe('function');
    // @ts-ignore
    expect(typeof window.BehaviorRenderer.getParticleCount).toBe('function');
    // @ts-ignore
    expect(typeof window.BehaviorRenderer.getActiveEffects).toBe('function');
    // @ts-ignore
    expect(typeof window.BehaviorRenderer.isInitialized).toBe('function');
  });

  it('should initialize and register behavior tick with CodeGraph', async () => {
    await import('../../src/dashboard/behavior-renderer.js');

    // @ts-ignore
    window.BehaviorRenderer.init();

    // @ts-ignore
    expect(window.CodeGraph.setBehaviorTick).toHaveBeenCalledWith(expect.any(Function));
    // @ts-ignore
    expect(window.BehaviorRenderer.isInitialized()).toBe(true);
  });

  it('should report 0 particles after init', async () => {
    await import('../../src/dashboard/behavior-renderer.js');

    // @ts-ignore
    window.BehaviorRenderer.init();

    // @ts-ignore
    expect(window.BehaviorRenderer.getParticleCount()).toBe(0);
  });

  it('should clean up on destroy', async () => {
    await import('../../src/dashboard/behavior-renderer.js');

    // @ts-ignore
    window.BehaviorRenderer.init();
    // @ts-ignore
    window.BehaviorRenderer.destroy();

    // @ts-ignore
    expect(window.BehaviorRenderer.getParticleCount()).toBe(0);
    // @ts-ignore
    expect(window.BehaviorRenderer.isInitialized()).toBe(false);
  });
});

describe('BehaviorRenderer — Action Effects', () => {
  beforeEach(() => {
    setupMocks();
  });

  afterEach(() => {
    // @ts-ignore
    if (window.BehaviorRenderer) window.BehaviorRenderer.destroy();
    // @ts-ignore
    delete globalThis.window?.BehaviorRenderer;
    // @ts-ignore
    delete globalThis.window?.CodeGraph;
    // @ts-ignore
    delete globalThis.THREE;
  });

  it('should create burst effect for celebrate', async () => {
    await import('../../src/dashboard/behavior-renderer.js');

    // @ts-ignore
    window.BehaviorRenderer.init();
    // @ts-ignore
    window.BehaviorRenderer.trigger('celebrate', 'excited');

    // Should have particles (burst count = 40)
    // @ts-ignore
    expect(window.BehaviorRenderer.getParticleCount()).toBeGreaterThan(0);
    // @ts-ignore
    const effects = window.BehaviorRenderer.getActiveEffects();
    expect(effects.burst).toBeGreaterThan(0);
  });

  it('should create orbit effect for think', async () => {
    await import('../../src/dashboard/behavior-renderer.js');

    // @ts-ignore
    window.BehaviorRenderer.init();
    // @ts-ignore
    window.BehaviorRenderer.trigger('think', 'thoughtful');

    // @ts-ignore
    expect(window.BehaviorRenderer.getParticleCount()).toBeGreaterThan(0);
    // @ts-ignore
    const effects = window.BehaviorRenderer.getActiveEffects();
    expect(effects.orbit).toBeGreaterThan(0);
  });

  it('should create ripple + glow for speak', async () => {
    await import('../../src/dashboard/behavior-renderer.js');

    // @ts-ignore
    window.BehaviorRenderer.init();
    // @ts-ignore
    window.BehaviorRenderer.trigger('speak', 'confident');

    // @ts-ignore
    expect(window.BehaviorRenderer.getParticleCount()).toBeGreaterThan(0);
    // @ts-ignore
    const effects = window.BehaviorRenderer.getActiveEffects();
    expect(effects.ripple).toBeGreaterThan(0);
    expect(effects.glow).toBeGreaterThan(0);
  });

  it('should create torus + glow for confirm_needed', async () => {
    await import('../../src/dashboard/behavior-renderer.js');

    // @ts-ignore
    window.BehaviorRenderer.init();
    // @ts-ignore
    window.BehaviorRenderer.trigger('confirm_needed', 'uncertain');

    // @ts-ignore
    expect(window.BehaviorRenderer.getParticleCount()).toBeGreaterThan(0);
    // @ts-ignore
    const effects = window.BehaviorRenderer.getActiveEffects();
    expect(effects.torus).toBeGreaterThan(0);
    expect(effects.glow).toBeGreaterThan(0);
  });

  it('should create ripple + glow for apologize', async () => {
    await import('../../src/dashboard/behavior-renderer.js');

    // @ts-ignore
    window.BehaviorRenderer.init();
    // @ts-ignore
    window.BehaviorRenderer.trigger('apologize', 'apologetic');

    // @ts-ignore
    expect(window.BehaviorRenderer.getParticleCount()).toBeGreaterThan(0);
    // @ts-ignore
    const effects = window.BehaviorRenderer.getActiveEffects();
    expect(effects.ripple).toBeGreaterThan(0);
    expect(effects.glow).toBeGreaterThan(0);
  });

  it('should create glow for look_at', async () => {
    await import('../../src/dashboard/behavior-renderer.js');

    // @ts-ignore
    window.BehaviorRenderer.init();
    // @ts-ignore
    window.BehaviorRenderer.trigger('look_at', 'neutral');

    // @ts-ignore
    expect(window.BehaviorRenderer.getParticleCount()).toBeGreaterThan(0);
    // @ts-ignore
    const effects = window.BehaviorRenderer.getActiveEffects();
    expect(effects.glow).toBeGreaterThan(0);
  });

  it('should create blink effect', async () => {
    await import('../../src/dashboard/behavior-renderer.js');

    // @ts-ignore
    window.BehaviorRenderer.init();
    // @ts-ignore
    window.BehaviorRenderer.trigger('blink', 'neutral');

    // @ts-ignore
    expect(window.BehaviorRenderer.getParticleCount()).toBeGreaterThan(0);
    // @ts-ignore
    const effects = window.BehaviorRenderer.getActiveEffects();
    expect(effects.blink).toBeGreaterThan(0);
  });

  it('should create pause effect', async () => {
    await import('../../src/dashboard/behavior-renderer.js');

    // @ts-ignore
    window.BehaviorRenderer.init();
    // @ts-ignore
    window.BehaviorRenderer.trigger('pause', 'neutral');

    // @ts-ignore
    expect(window.BehaviorRenderer.getParticleCount()).toBeGreaterThan(0);
    // @ts-ignore
    const effects = window.BehaviorRenderer.getActiveEffects();
    expect(effects.pause).toBeGreaterThan(0);
  });
});

describe('BehaviorRenderer — Event Integration', () => {
  beforeEach(() => {
    setupMocks();
  });

  afterEach(() => {
    // @ts-ignore
    if (window.BehaviorRenderer) window.BehaviorRenderer.destroy();
    // @ts-ignore
    delete globalThis.window?.BehaviorRenderer;
    // @ts-ignore
    delete globalThis.window?.CodeGraph;
    // @ts-ignore
    delete globalThis.THREE;
  });

  it('should process behavior_plan_generated events from CustomEvent', async () => {
    // Setup DOM
    const brainView = document.createElement('div');
    brainView.id = 'brain-view';
    document.body.appendChild(brainView);

    await import('../../src/dashboard/behavior-renderer.js');

    // @ts-ignore
    window.BehaviorRenderer.init();

    // Simulate a behavior_plan_generated event
    const event = new CustomEvent('hologram:agent-event', {
      detail: {
        event: {
          type: 'behavior_plan_generated',
          payload: {
            planId: '00000000-0000-4000-8000-000000000001',
            sourceEventId: '00000000-0000-4000-8000-000000000002',
            sourceEventType: 'task_finished',
            actions: [
              { type: 'celebrate' },
              { type: 'speak', text: 'Done!' },
            ],
            emotion: 'confident',
            confidence: 0.9,
          },
        },
      },
    });
    brainView.dispatchEvent(event);

    // Should have created effects from both actions
    // @ts-ignore
    expect(window.BehaviorRenderer.getParticleCount()).toBeGreaterThan(0);

    // Cleanup
    document.body.removeChild(brainView);
  });

  it('should ignore non-behavior events', async () => {
    const brainView = document.createElement('div');
    brainView.id = 'brain-view';
    document.body.appendChild(brainView);

    await import('../../src/dashboard/behavior-renderer.js');

    // @ts-ignore
    window.BehaviorRenderer.init();

    // Simulate a non-behavior event
    const event = new CustomEvent('hologram:agent-event', {
      detail: {
        event: {
          type: 'task_started',
          payload: { taskId: '123', goal: 'test' },
        },
      },
    });
    brainView.dispatchEvent(event);

    // Should NOT create any effects
    // @ts-ignore
    expect(window.BehaviorRenderer.getParticleCount()).toBe(0);

    document.body.removeChild(brainView);
  });
});

describe('BehaviorRenderer — Multiple Actions', () => {
  beforeEach(() => {
    setupMocks();
  });

  afterEach(() => {
    // @ts-ignore
    if (window.BehaviorRenderer) window.BehaviorRenderer.destroy();
    // @ts-ignore
    delete globalThis.window?.BehaviorRenderer;
    // @ts-ignore
    delete globalThis.window?.CodeGraph;
    // @ts-ignore
    delete globalThis.THREE;
  });

  it('should handle multiple simultaneous effects', async () => {
    await import('../../src/dashboard/behavior-renderer.js');

    // @ts-ignore
    window.BehaviorRenderer.init();

    // Trigger multiple actions
    // @ts-ignore
    window.BehaviorRenderer.trigger('think', 'thoughtful');
    // @ts-ignore
    window.BehaviorRenderer.trigger('celebrate', 'excited');
    // @ts-ignore
    window.BehaviorRenderer.trigger('speak', 'confident');

    // @ts-ignore
    const count = window.BehaviorRenderer.getParticleCount();
    expect(count).toBeGreaterThan(10); // Multiple effects with multiple particles each

    // @ts-ignore
    const effects = window.BehaviorRenderer.getActiveEffects();
    expect(effects.orbit).toBeGreaterThan(0);
    expect(effects.burst).toBeGreaterThan(0);
    expect(effects.ripple).toBeGreaterThan(0);
  });
});
