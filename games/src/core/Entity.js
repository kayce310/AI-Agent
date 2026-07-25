// Base Entity class for ECS architecture
class Entity {
    constructor(id, name) {
        this.id = id;
        this.name = name;
        this.components = [];
        this.tags = new Set();
        this.active = true;
        this.layer = 0;
        this.parent = null;
        this.children = [];
        this.transform = null;
        
        // Performance tracking
        this.updateCount = 0;
        this.lastUpdateTime = 0;
    }
    
    addComponent(component) {
        this.components.push(component);
        component.entity = this;
        
        // Register with engine if available
        if (window.gameEngine) {
            let type = component.constructor.name.toLowerCase();
            if (!window.gameEngine.components[type]) {
                window.gameEngine.components[type] = [];
            }
            window.gameEngine.components[type].push(component);
            
            // Add to spatial grid if transform component
            if (component instanceof Transform) {
                window.gameEngine.spatialGrid?.insert(this);
            }
        }
        
        return component;
    }
    
    getComponent(componentType) {
        if (typeof componentType === 'string') {
            return this.components.find(c => c.constructor.name === componentType);
        }
        return this.components.find(c => c instanceof componentType);
    }
    
    hasComponent(componentType) {
        return this.getComponent(componentType) !== null;
    }
    
    removeComponent(componentType) {
        let index = this.components.findIndex(c => 
            (typeof componentType === 'string' ? c.constructor.name === componentType : c instanceof componentType)
        );
        if (index !== -1) {
            let component = this.components[index];
            this.components.splice(index, 1);
            
            // Unregister from engine
            if (window.gameEngine) {
                let type = component.constructor.name.toLowerCase();
                let compList = window.gameEngine.components[type];
                let compIndex = compList?.indexOf(component);
                if (compIndex !== -1) {
                    compList.splice(compIndex, 1);
                }
                
                // Remove from spatial grid if transform component
                if (component instanceof Transform) {
                    window.gameEngine.spatialGrid?.remove(this);
                }
            }
            
            component.entity = null;
        }
    }
    
    addTag(tag) {
        this.tags.add(tag);
    }
    
    hasTag(tag) {
        return this.tags.has(tag);
    }
    
    removeTag(tag) {
        this.tags.delete(tag);
    }
    
    update(deltaTime) {
        // Update all components
        for (let component of this.components) {
            if (component.update) {
                component.update(deltaTime);
            }
        }
        
        this.updateCount++;
        this.lastUpdateTime = Date.now();
    }
    
    render(ctx) {
        // Render all components
        for (let component of this.components) {
            if (component.render) {
                component.render(ctx);
            }
        }
        
        // Render children
        for (let child of this.children) {
            if (child.active) {
                child.render(ctx);
            }
        }
    }
    
    destroy() {
        // Remove from parent
        if (this.parent) {
            let index = this.parent.children.indexOf(this);
            if (index !== -1) {
                this.parent.children.splice(index, 1);
            }
        }
        
        // Destroy children
        for (let child of this.children) {
            child.destroy();
        }
        this.children = [];
        
        // Remove from engine
        if (window.gameEngine) {
            window.gameEngine.removeEntity(this);
        }
        
        this.active = false;
    }
}

// Export for use in other files
window.Entity = Entity;