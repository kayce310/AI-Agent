/**
 * @file Device Registry — Smart Home device management
 * @layer core
 * @owner smarthome
 */

import { Logger } from '../logger.js';
import { Device, Room } from './types.js';

const log = new Logger({ module: 'DeviceRegistry' });

/**
 * Device Registry — Manages known devices and rooms.
 * In-memory store with optional JSON persistence.
 */
export class DeviceRegistry {
  private devices: Map<string, Device> = new Map();
  private rooms: Map<string, Room> = new Map();
  private storagePath: string | null = null;

  constructor(storagePath?: string) {
    this.storagePath = storagePath ?? null;
  }

  /** Register a device */
  register(device: Device): void {
    this.devices.set(device.id, device);
    log.info(`Registered device: ${device.name} (${device.type}) via ${device.provider}`);
  }

  /** Unregister a device */
  unregister(deviceId: string): boolean {
    return this.devices.delete(deviceId);
  }

  /** Update device state */
  updateState(deviceId: string, state: Record<string, unknown>, status?: Device['status']): boolean {
    const device = this.devices.get(deviceId);
    if (!device) return false;
    
    Object.assign(device.state, state);
    device.lastSeen = Date.now();
    if (status) device.status = status;
    return true;
  }

  /** Get a device by ID */
  get(deviceId: string): Device | undefined {
    return this.devices.get(deviceId);
  }

  /** Find devices by type */
  findByType(type: string): Device[] {
    return Array.from(this.devices.values()).filter(d => d.type === type);
  }

  /** Find devices by room */
  findByRoom(roomId: string): Device[] {
    return Array.from(this.devices.values()).filter(d => d.roomId === roomId);
  }

  /** Find devices by name (partial match) */
  findByName(name: string): Device[] {
    const lower = name.toLowerCase();
    return Array.from(this.devices.values()).filter(d => d.name.toLowerCase().includes(lower));
  }

  /** Get all devices */
  all(): Device[] {
    return Array.from(this.devices.values());
  }

  /** Get device count */
  count(): number {
    return this.devices.size;
  }

  // ═══ ROOM MANAGEMENT ═══

  addRoom(room: Room): void {
    this.rooms.set(room.id, room);
    log.info(`Added room: ${room.name}`);
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  allRooms(): Room[] {
    return Array.from(this.rooms.values());
  }

  /** Load device config from JSON */
  async load(path?: string): Promise<void> {
    const loadPath = path || this.storagePath;
    if (!loadPath) return;
    
    try {
      const fs = await import('fs/promises');
      const data = await fs.readFile(loadPath, 'utf8');
      const json = JSON.parse(data);
      
      if (json.devices) {
        json.devices.forEach((d: Device) => this.devices.set(d.id, d));
      }
      if (json.rooms) {
        json.rooms.forEach((r: Room) => this.rooms.set(r.id, r));
      }
      log.info(`Loaded ${this.devices.size} devices from ${loadPath}`);
    } catch (err: any) {
      if (err.code !== 'ENOENT') {
        log.warn(`Failed to load device config: ${err.message}`);
      }
    }
  }

  /** Save device config to JSON */
  async save(path?: string): Promise<void> {
    const savePath = path || this.storagePath;
    if (!savePath) return;
    
    try {
      const fs = await import('fs/promises');
      const data = JSON.stringify({
        devices: Array.from(this.devices.values()),
        rooms: Array.from(this.rooms.values()),
      }, null, 2);
      await fs.writeFile(savePath, data, 'utf8');
      log.info(`Saved ${this.devices.size} devices to ${savePath}`);
    } catch (err: any) {
      log.warn(`Failed to save device config: ${err.message}`);
    }
  }
}
