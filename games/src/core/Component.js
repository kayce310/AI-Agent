// Base Component class for ECS architecture
class Component {
    constructor() {
        this.entity = null;
        this.active = true;
    }
    
    update(deltaTime) {
        // Override in derived classes
    }
    
    render(ctx) {
        // Override in derived classes
    }
    
    onAdded() {
        // Called when component is added to entity
    }
    
    onRemoved() {
        // Called when component is removed from entity
    }
}

// Export for use in other files
window.Component = Component;