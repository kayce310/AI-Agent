// Render System - Handles entity rendering
class RenderSystem {
    constructor(engine) {
        this.engine = engine;
        this.ctx = engine.ctx;
        this.camera = engine.camera;
    }
    
    render() {
        // Clear canvas with background
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.engine.width, this.engine.height);
        
        // Apply camera transform
        this.ctx.save();
        this.ctx.translate(-this.camera.x, -this.camera.y);
        this.ctx.scale(this.camera.zoom, this.camera.zoom);
        
        // Sort entities by layer for proper rendering order
        let sortedEntities = [...this.engine.entities].sort((a, b) => a.layer - b.layer);
        
        // Render all entities
        for (let entity of sortedEntities) {
            if (entity.active && entity.transform) {
                entity.render(this.ctx);
            }
        }
        
        // Restore transform
        this.ctx.restore();
        
        // Render UI elements
        this.renderUI();
    }
    
    renderUI() {
        // Render UI elements (HUD, menus, etc.)
        // This is called after game world rendering
    }
}

// Export for use in other files
window.RenderSystem = RenderSystem;