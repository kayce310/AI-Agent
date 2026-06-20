/**
 * @file Smart Home Manager
 * @layer core
 * @owner smarthome
 *
 * Main orchestrator for smart home operations.
 * Manages providers, routes commands, discovers devices.
 */

import { Logger } from '../logger.js';
import { Device, DeviceState, SmartHomeProvider, LightCommand, SwitchCommand } from './types.js';
import { DeviceRegistry } from './device-registry.js';

const log = new Logger({ module: 'SmartHome' });

/**
 * SmartHomeManager — Central controller for all smart home devices.
 * Routes commands to the correct provider based on device.provider field.
 * 
 * Usage:
 *   const sh = new SmartHomeManager();
 *   sh.registerProvider('xiaomi', provider);
 *   await sh.discover();
 *   await sh.light('bedroom', { power: true, brightness: 80 });
 *   await sh.command('device-123', { power: false });
 */
export class SmartHomeManager {
  private providers: Map<string, SmartHomeProvider> = new Map();
  private registry: DeviceRegistry;

  constructor(registry?: DeviceRegistry) {
    this.registry = registry || new DeviceRegistry();
  }

  /** Register a device provider */
  registerProvider(name: string, provider: SmartHomeProvider): void {
    this.providers.set(name, provider);
    log.info(`Registered provider: ${name}`);
  }

  /** Get the device registry */
  getRegistry(): DeviceRegistry {
    return this.registry;
  }

  /** Discover devices from all registered providers */
  async discover(): Promise<Device[]> {
    const allDevices: Device[] = [];
    
    Array.from(this.providers.entries()).forEach(async ([name, provider]) => {
      try {
        const available = await provider.isAvailable();
        if (!available) {
          log.warn(`Provider "${name}" is not available, skipping discovery`);
          return;
        }
        
        const devices = await provider.discover();
        devices.forEach(d => this.registry.register(d));
        allDevices.push(...devices);
        log.info(`Discovered ${devices.length} devices from ${name}`);
      } catch (err: any) {
        log.error(`Failed to discover devices from ${name}: ${err.message}`);
      }
    });
    
    return allDevices;
  }

  /**
   * Send command to a device by ID.
   * Routes to the correct provider automatically.
   */
  async command(deviceId: string, command: Record<string, unknown>): Promise<boolean> {
    const device = this.registry.get(deviceId);
    if (!device) {
      log.warn(`Device not found: ${deviceId}`);
      return false;
    }

    const provider = this.providers.get(device.provider);
    if (!provider) {
      log.warn(`Provider "${device.provider}" not found for device ${deviceId}`);
      return false;
    }

    try {
      const result = await provider.command(deviceId, command);
      if (result) {
        this.registry.updateState(deviceId, command);
      }
      return result;
    } catch (err: any) {
      log.error(`Command failed for ${deviceId}: ${err.message}`);
      return false;
    }
  }

  /**
   * Control a light by name or ID.
   */
  async light(target: string, command: LightCommand): Promise<boolean> {
    const device = this.resolveTarget(target);
    if (!device || device.type !== 'light') {
      log.warn(`Light not found: ${target}`);
      return false;
    }
    return this.command(device.id, command as Record<string, unknown>);
  }

  /**
   * Control a switch by name or ID.
   */
  async switch(target: string, command: SwitchCommand): Promise<boolean> {
    const device = this.resolveTarget(target);
    if (!device || device.type !== 'switch') {
      log.warn(`Switch not found: ${target}`);
      return false;
    }
    return this.command(device.id, command as Record<string, unknown>);
  }

  /**
   * Get state of a device.
   */
  async state(deviceId: string): Promise<DeviceState | null> {
    const device = this.registry.get(deviceId);
    if (!device) return null;

    const provider = this.providers.get(device.provider);
    if (!provider) return device.state;

    try {
      const liveState = await provider.getState(deviceId);
      if (liveState) {
        this.registry.updateState(deviceId, liveState);
        return liveState;
      }
    } catch {
      // Fallback to cached state
    }
    return device.state;
  }

  /**
   * Resolve a target string to a device.
   * Tries: deviceId → exact name → partial name match
   */
  private resolveTarget(target: string): Device | undefined {
    // Try exact ID
    const byId = this.registry.get(target);
    if (byId) return byId;

    // Try exact name
    const byName = this.registry.all().find(d => d.name === target);
    if (byName) return byName;

    // Try partial name (first match wins)
    const matches = this.registry.findByName(target);
    return matches[0];
  }

  /**
   * Get hub status string (for Telegram /status command).
   */
  getStatus(): string {
    const devices = this.registry.count();
    const providers = this.providers.size;
    const online = this.registry.all().filter(d => d.status === 'online').length;
    
    return [
      '🏠 **Smart Home**',
      `Providers: ${providers}`,
      `Devices: ${devices} (${online} online)`,
      `Rooms: ${this.registry.allRooms().length}`,
    ].join('\n');
  }
}

export default SmartHomeManager;
