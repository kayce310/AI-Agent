/**
 * Kato Discord Bridge Module
 * Framework 6 Layers Claude Code - Module độc lập
 */
import 'dotenv/config';
export declare class DiscordBridge {
    private client;
    private llm;
    private memory;
    constructor();
    private registerEventHandlers;
    start(): Promise<void>;
}
export default DiscordBridge;
