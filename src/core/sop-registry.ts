/**
 * Kato Agent — SOP Registry (Phase 7.1a)
 * 
 * YAML-schema SOP templates for structured procedure definitions.
 * Loads SOPs from knowledge/sops/*.yaml or in-memory definitions.
 */

export interface SOP {
  id: string;
  name: string;
  description: string;
  version: string;
  tags?: string[];
  steps: SOPStep[];
  metadata?: Record<string, string>;
}

export interface SOPStep {
  id: string;
  name: string;
  description: string;
  instruction: string;
  type: 'llm' | 'tool' | 'sub-sop' | 'decision' | 'verify';
  toolName?: string;
  subSOPId?: string;
  condition?: string;
  expectedOutput?: string;
  timeoutMs?: number;
  retryCount?: number;
}

export interface SOPRegistry {
  register(sop: SOP): void;
  get(id: string): SOP | undefined;
  find(tags: string[]): SOP[];
  all(): SOP[];
  remove(id: string): boolean;
  loadFromYaml(yaml: string): SOP;
}

export function createSOPRegistry(): SOPRegistry {
  const sops = new Map<string, SOP>();

  return {
    register(sop: SOP): void {
      if (sops.has(sop.id)) {
        throw new Error(`SOP '${sop.id}' already registered`);
      }
      sops.set(sop.id, { ...sop, steps: sop.steps.map(s => ({ ...s })) });
    },

    get(id: string): SOP | undefined {
      const s = sops.get(id);
      return s ? JSON.parse(JSON.stringify(s)) : undefined;
    },

    find(tags: string[]): SOP[] {
      if (tags.length === 0) return [];
      return Array.from(sops.values()).filter(sop =>
        tags.some(tag => sop.tags?.includes(tag))
      );
    },

    all(): SOP[] {
      return Array.from(sops.values()).map(s => ({ ...s, steps: s.steps.map(st => ({ ...st })) }));
    },

    remove(id: string): boolean {
      return sops.delete(id);
    },

    loadFromYaml(yaml: string): SOP {
      // Simple YAML-like parser (for .yaml stored as JSON-in-YAML)
      // Production: use js-yaml library
      try {
        return JSON.parse(yaml) as SOP;
      } catch {
        throw new Error('Invalid SOP YAML/JSON format');
      }
    },
  };
}

// ── Built-in SOP Templates ──────────────────────────────────────

/** Analyze task: understand requirements, constraints, context */
export function createAnalyzeSOP(): SOP {
  return {
    id: 'sop-analyze',
    name: 'Task Analysis',
    description: 'Analyze a task to extract requirements, constraints, and execution plan',
    version: '1.0',
    tags: ['analysis', 'planning', 'core'],
    steps: [
      {
        id: 'step-1',
        name: 'Parse Requirements',
        description: 'Extract explicit and implicit requirements from the task',
        instruction: 'Analyze the task description and list all explicit requirements, then infer implicit requirements from context.',
        type: 'llm',
        expectedOutput: 'List of explicit + implicit requirements with priority',
        timeoutMs: 30000,
      },
      {
        id: 'step-2',
        name: 'Identify Constraints',
        description: 'Identify resource, time, and scope constraints',
        instruction: 'Identify any constraints: resource limits, time bounds, scope restrictions, or dependency requirements.',
        type: 'llm',
        expectedOutput: 'Constraint list with severity flags',
        timeoutMs: 30000,
      },
      {
        id: 'step-3',
        name: 'Plan Execution',
        description: 'Create step-by-step execution plan',
        instruction: 'Based on requirements and constraints, create a detailed step-by-step execution plan with tool/LLM assignments.',
        type: 'llm',
        expectedOutput: 'Structured execution plan with steps, tools, and expected outcomes',
        timeoutMs: 60000,
      },
      {
        id: 'step-4',
        name: 'Verify Plan',
        description: 'Validate plan completeness and feasibility',
        instruction: 'Verify the plan covers all requirements within stated constraints. Flag gaps or risks.',
        type: 'verify',
        expectedOutput: 'Plan validation report with any gaps identified',
        timeoutMs: 20000,
      },
    ],
  };
}

/** Research task: gather information from sources */
export function createResearchSOP(): SOP {
  return {
    id: 'sop-research',
    name: 'Information Research',
    description: 'Systematically research a topic from multiple sources',
    version: '1.0',
    tags: ['research', 'knowledge', 'core'],
    steps: [
      {
        id: 'step-1',
        name: 'Define Scope',
        description: 'Define research scope and key questions',
        instruction: 'Define the research scope: what specific questions need answers, what depth is required, what sources are available.',
        type: 'llm',
        expectedOutput: 'Research brief with key questions and scope boundaries',
        timeoutMs: 20000,
      },
      {
        id: 'step-2',
        name: 'Gather Sources',
        description: 'Collect relevant knowledge base entries',
        instruction: 'Search knowledge base for relevant documents, wiki entries, and prior analysis.',
        type: 'tool',
        toolName: 'knowledge_search',
        expectedOutput: 'List of relevant documents with relevance scores',
        timeoutMs: 30000,
      },
      {
        id: 'step-3',
        name: 'Synthesize Findings',
        description: 'Synthesize gathered information into coherent answer',
        instruction: 'Synthesize all gathered information to answer the research questions. Note conflicting information and gaps.',
        type: 'llm',
        expectedOutput: 'Synthesized answer with citations and confidence levels',
        timeoutMs: 60000,
      },
    ],
  };
}

/** Write task: generate structured output */
export function createWriteSOP(): SOP {
  return {
    id: 'sop-write',
    name: 'Content Generation',
    description: 'Generate structured content with review loop',
    version: '1.0',
    tags: ['writing', 'content', 'core'],
    steps: [
      {
        id: 'step-1',
        name: 'Outline',
        description: 'Create content outline',
        instruction: 'Create a detailed outline based on the brief covering all required sections.',
        type: 'llm',
        expectedOutput: 'Section-by-section outline with key points per section',
        timeoutMs: 20000,
      },
      {
        id: 'step-2',
        name: 'Write Draft',
        description: 'Write full content draft from outline',
        instruction: 'Write complete content following the outline. Use appropriate tone, style, and structure.',
        type: 'llm',
        expectedOutput: 'Full draft content',
        timeoutMs: 60000,
      },
      {
        id: 'step-3',
        name: 'Review & Revise',
        description: 'Review draft against requirements',
        instruction: 'Review the draft against the original requirements. Check for completeness, accuracy, and quality.',
        type: 'llm',
        expectedOutput: 'Revised content with review notes',
        timeoutMs: 30000,
      },
      {
        id: 'step-4',
        name: 'Final Polish',
        description: 'Final formatting and quality check',
        instruction: 'Apply final formatting, check for consistency, and verify output format requirements.',
        type: 'verify',
        expectedOutput: 'Final polished content meeting all format requirements',
        timeoutMs: 20000,
      },
    ],
  };
}