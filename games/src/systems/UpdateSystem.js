// Update System - Handles entity updates
class UpdateSystem {
    constructor(engine) {
        this.engine = engine;
        this.entities = [];
    }
    
    update(deltaTime) {
        // Update all entities
        for (let entity of this.engine.entities) {
            if (entity.active) {
                entity.update(deltaTime);
            }
        }
    }
}

// Export for use in other files
window.UpdateSystem = UpdateSystem;