export type AgentLifecycle = 'UNINITIALIZED' | 'INITIALIZING' | 'READY' | 'ERROR';
export interface KatoWorkspaceState {
    schemaVersion: '1.0';
    agent: {
        lifecycle: AgentLifecycle;
        role: string | null;
        loadedSkills: string[];
        lastInitializedAt: string | null;
    };
    session: {
        id: string;
        startedAt: string;
        updatedAt: string;
        currentTask: string | null;
    };
    controlPlane: {
        bootloader: 'CLINE.md';
        router: 'knowledge/wiki/AGENTS.md';
        index: 'knowledge/wiki/index.md';
    };
    dataPlane: {
        statePath: 'knowledge/workspace/state.json';
        manager: 'kato-state-manager';
        checksum: string;
    };
    notes: string[];
}
export interface StructuredStateError {
    ok: false;
    error: {
        code: string;
        message: string;
        details?: unknown;
    };
}
export interface StructuredStateSuccess<T> {
    ok: true;
    data: T;
}
export type StructuredStateResult<T> = StructuredStateSuccess<T> | StructuredStateError;
export declare class KatoStateManager {
    private readonly statePath;
    constructor(statePath?: string);
    init(currentTask?: string | null): Promise<StructuredStateResult<KatoWorkspaceState>>;
    read(): Promise<StructuredStateResult<KatoWorkspaceState>>;
    update(patch: Partial<KatoWorkspaceState>): Promise<StructuredStateResult<KatoWorkspaceState>>;
    markReady(role: string, loadedSkills: string[]): Promise<StructuredStateResult<KatoWorkspaceState>>;
    private write;
    private acquireLock;
    private assertValid;
    private withChecksum;
    private computeChecksum;
    private error;
    private normalizeError;
}
export declare const katoStateManager: KatoStateManager;
