/**
 * @file Event Validator — Schema validation for agent events
 * @layer core
 * @created 2026-06-20
 */

import { z, ZodError } from 'zod';
import { AgentEventSchema, BaseEventSchema, EventType } from './types.js';

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
  event?: any;
}

export class EventValidator {
  /**
   * Validate a single event against its schema
   */
  static validate(event: unknown): ValidationResult {
    try {
      const validated = AgentEventSchema.parse(event);
      return { valid: true, event: validated };
    } catch (error) {
      if (error instanceof ZodError) {
        return {
          valid: false,
          errors: (error as any).issues?.map((e: any) => `${e.path.join('.')}: ${e.message}`) || [error.message],
        };
      }
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Validate event type exists in schema
   */
  static isValidType(type: string): boolean {
    return Object.values(EventType).includes(type as EventType);
  }

  /**
   * Validate base event structure (without payload validation)
   */
  static validateBase(event: unknown): ValidationResult {
    try {
      const validated = BaseEventSchema.parse(event);
      return { valid: true, event: validated };
    } catch (error) {
      if (error instanceof ZodError) {
        return {
          valid: false,
          errors: (error as any).issues?.map((e: any) => `${e.path.join('.')}: ${e.message}`) || [error.message],
        };
      }
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Batch validate multiple events
   */
  static validateBatch(events: unknown[]): {
    valid: number;
    invalid: number;
    errors: Array<{ index: number; errors: string[] }>;
  } {
    let valid = 0;
    let invalid = 0;
    const errors: Array<{ index: number; errors: string[] }> = [];

    events.forEach((event, index) => {
      const result = this.validate(event);
      if (result.valid) {
        valid++;
      } else {
        invalid++;
        errors.push({ index, errors: result.errors || [] });
      }
    });

    return { valid, invalid, errors };
  }
}
