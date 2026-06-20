/**
 * @file SmartHomeManager + DeviceRegistry Tests
 * @layer tests
 * @owner smarthome
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SmartHomeManager } from '../src/core/smarthome/smarthome-manager.js';
import { DeviceRegistry } from '../src/core/smarthome/device-registry.js';
import { SmartHomeProvider, Device } from '../src/core/smarthome/types.js';

// ── Mock Provider ──

function createMockProvider(name = 'mock', devices: Device[] = []): SmartHomeProvider {
  return {
    name,
    isAvailable: async () => true,
    discover: async () => devices,
    command: async (_id, cmd) => {
      if ((cmd as any).power === false) return true; // success
      return true;
    },
    getState: async (_id) => ({ power: true, brightness: 80 }),
  };
}

function makeDevice(overrides: Partial<Device> = {}): Device {
  return {
    id: 'light-1',
    name: 'Đèn phòng khách',
    type: 'light',
    provider: 'mock',
    capabilities: { brightness: true, color: true },
    state: { power: false },
    status: 'online',
    ...overrides,
  };
}

// ── Tests ──

describe('DeviceRegistry', () => {
  let registry: DeviceRegistry;

  beforeEach(() => {
    registry = new DeviceRegistry();
  });

  it('should register and retrieve a device', () => {
    const device = makeDevice();
    registry.register(device);
    expect(registry.get('light-1')).toBeDefined();
    expect(registry.get('light-1')?.name).toBe('Đèn phòng khách');
  });

  it('should unregister a device', () => {
    registry.register(makeDevice());
    expect(registry.unregister('light-1')).toBe(true);
    expect(registry.get('light-1')).toBeUndefined();
  });

  it('should find devices by type', () => {
    registry.register(makeDevice({ id: 'light-1', type: 'light' }));
    registry.register(makeDevice({ id: 'switch-1', type: 'switch' }));
    expect(registry.findByType('light')).toHaveLength(1);
    expect(registry.findByType('switch')).toHaveLength(1);
  });

  it('should find devices by name (partial match)', () => {
    registry.register(makeDevice({ id: 'd1', name: 'Đèn phòng khách' }));
    registry.register(makeDevice({ id: 'd2', name: 'Đèn phòng ngủ' }));
    registry.register(makeDevice({ id: 'd3', name: 'Quạt trần' }));

    const lights = registry.findByName('đèn');
    expect(lights).toHaveLength(2);
  });

  it('should update device state', () => {
    registry.register(makeDevice());
    const ok = registry.updateState('light-1', { power: true, brightness: 50 });
    expect(ok).toBe(true);
    expect(registry.get('light-1')?.state.power).toBe(true);
    expect(registry.get('light-1')?.state.brightness).toBe(50);
  });

  it('should return false for unknown device update', () => {
    expect(registry.updateState('unknown', { power: true })).toBe(false);
  });

  it('should manage rooms', () => {
    registry.addRoom({ id: 'room-1', name: 'Phòng khách', deviceIds: ['light-1'] });
    expect(registry.getRoom('room-1')?.name).toBe('Phòng khách');
    expect(registry.allRooms()).toHaveLength(1);
  });

  it('should count devices', () => {
    expect(registry.count()).toBe(0);
    registry.register(makeDevice({ id: 'd1' }));
    registry.register(makeDevice({ id: 'd2' }));
    expect(registry.count()).toBe(2);
  });
});

describe('SmartHomeManager', () => {
  let manager: SmartHomeManager;
  let provider: SmartHomeProvider;

  beforeEach(() => {
    manager = new SmartHomeManager();
    provider = createMockProvider('mock', [
      makeDevice({ id: 'light-1', name: 'Đèn phòng khách' }),
      makeDevice({ id: 'light-2', name: 'Đèn phòng ngủ' }),
    ]);
  });

  it('should register provider and discover devices', async () => {
    manager.registerProvider('mock', provider);
    const devices = await manager.discover();
    expect(devices).toHaveLength(2);
    expect(manager.getRegistry().count()).toBe(2);
  });

  it('should skip unavailable providers', async () => {
    const unavailableProvider = { ...provider, isAvailable: async () => false };
    manager.registerProvider('mock', unavailableProvider);
    const devices = await manager.discover();
    expect(devices).toHaveLength(0);
  });

  it('should send command to device by ID', async () => {
    manager.registerProvider('mock', provider);
    await manager.discover();
    
    const result = await manager.command('light-1', { power: true });
    expect(result).toBe(true);
  });

  it('should return false for unknown device', async () => {
    const result = await manager.command('unknown', { power: true });
    expect(result).toBe(false);
  });

  it('should control light by name', async () => {
    manager.registerProvider('mock', provider);
    await manager.discover();

    const result = await manager.light('phòng khách', { power: true, brightness: 80 });
    expect(result).toBe(true);
  });

  it('should get device state', async () => {
    manager.registerProvider('mock', provider);
    await manager.discover();

    const state = await manager.state('light-1');
    expect(state).toBeDefined();
    expect(state?.power).toBe(true);
    expect(state?.brightness).toBe(80);
  });

  it('should return status string', () => {
    manager.registerProvider('mock', provider);
    const status = manager.getStatus();
    expect(status).toContain('Smart Home');
    expect(status).toContain('Providers: 1');
  });
});
