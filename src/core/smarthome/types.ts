/**
 * @file Smart Home Types
 * @layer core
 * @owner smarthome
 *
 * Device types, capabilities, and states for the smart home framework.
 * Designed for Xiaomi ecosystem + generic IoT devices.
 */

// ═══ DEVICE TYPES ═══

export type DeviceType = 'light' | 'switch' | 'sensor' | 'camera' | 'thermostat' | 'fan' | 'vacuum' | 'blinds' | 'speaker' | 'unknown';

export type DeviceStatus = 'online' | 'offline' | 'unavailable';

// ═══ DEVICE CAPABILITIES ═══

export interface LightCapabilities {
  brightness?: boolean;    // 0-100
  color?: boolean;         // RGB hex
  temperature?: boolean;   // 2700-6500K
}

export interface SwitchCapabilities {
  toggle?: boolean;
}

export interface SensorCapabilities {
  temperature?: boolean;
  humidity?: boolean;
  motion?: boolean;
  door?: boolean;
}

export interface ThermostatCapabilities {
  targetTemp?: boolean;
  mode?: 'heat' | 'cool' | 'auto' | 'off';
}

export type DeviceCapabilities = LightCapabilities | SwitchCapabilities | SensorCapabilities | ThermostatCapabilities;

// ═══ DEVICE STATE ═══

export interface DeviceState {
  power?: boolean;         // on/off
  brightness?: number;     // 0-100
  color?: string;          // RGB hex "#FF0000"
  temperature?: number;    // current or target
  humidity?: number;       // 0-100
  [key: string]: unknown;  // extensible
}

// ═══ DEVICE REGISTRY ═══

export interface Device {
  id: string;              // unique device ID
  name: string;            // human-readable name
  type: DeviceType;
  provider: string;        // 'xiaomi' | 'hue' | 'generic'
  roomId?: string;         // which room
  capabilities: DeviceCapabilities;
  state: DeviceState;
  status: DeviceStatus;
  lastSeen?: number;       // timestamp
  metadata?: Record<string, unknown>;
}

export interface Room {
  id: string;
  name: string;
  deviceIds: string[];
}

// ═══ PROVIDER INTERFACE ═══

export interface SmartHomeProvider {
  name: string;
  
  /** Discover devices from this provider */
  discover(): Promise<Device[]>;
  
  /** Send command to a device */
  command(deviceId: string, command: Record<string, unknown>): Promise<boolean>;
  
  /** Get current state of a device */
  getState(deviceId: string): Promise<DeviceState | null>;
  
  /** Check if provider is configured and available */
  isAvailable(): Promise<boolean>;
}

// ═══ PROVIDER COMMANDS ═══

export interface LightCommand {
  power?: boolean;
  brightness?: number;    // 0-100
  color?: string;         // "#FF0000"
  temperature?: number;   // 2700-6500K
}

export interface SwitchCommand {
  power?: boolean;
}

export interface ThermostatCommand {
  targetTemp?: number;
  mode?: 'heat' | 'cool' | 'auto' | 'off';
}
