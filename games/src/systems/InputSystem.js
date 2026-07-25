// Input System - Handles user input
class InputSystem {
    constructor(engine) {
        this.engine = engine;
        this.input = engine.input;
    }
    
    update(deltaTime) {
        // Process keyboard input
        for (let [key, pressed] of this.input.keyboard) {
            if (pressed) {
                this.handleKeyInput(key, true);
            }
        }
        
        // Process mouse input
        for (let [button, pressed] of this.input.mouse.buttons) {
            if (pressed) {
                this.handleMouseInput(button, this.input.mouse.x, this.input.mouse.y);
            }
        }
        
        // Process touch input
        for (let touch of this.input.touch) {
            this.handleTouchInput(touch);
        }
    }
    
    handleKeyInput(key, pressed) {
        // Map keyboard codes to game actions
        let action = this.getKeyAction(key);
        if (action) {
            // Broadcast input to all entities
            for (let entity of this.engine.entities) {
                if (entity.active && entity.inputHandler) {
                    entity.inputHandler(action, pressed, this.getInputData(key));
                }
            }
        }
    }
    
    handleMouseInput(button, x, y) {
        // Broadcast mouse input to all entities
        for (let entity of this.engine.entities) {
            if (entity.active && entity.inputHandler) {
                entity.inputHandler('mouse', button, x, y);
            }
        }
    }
    
    handleTouchInput(touch) {
        // Broadcast touch input to all entities
        for (let entity of this.engine.entities) {
            if (entity.active && entity.inputHandler) {
                entity.inputHandler('touch', touch.id, touch.x, touch.y);
            }
        }
    }
    
    getKeyAction(key) {
        // Map keyboard codes to game actions
        const keyActions = {
            'KeyW': 'move_up',
            'KeyS': 'move_down',
            'KeyA': 'move_left',
            'KeyD': 'move_right',
            'Space': 'jump',
            'ControlLeft': 'crouch',
            'ShiftLeft': 'sprint',
            'KeyE': 'interact',
            'KeyQ': 'use_item',
            'KeyR': 'reload',
            'KeyF': 'attack',
            'KeyT': 'talk',
            'Escape': 'pause'
        };
        return keyActions[key] || null;
    }
    
    getInputData(key) {
        return {
            key: key,
            timestamp: Date.now()
        };
    }
}

// Export for use in other files
window.InputSystem = InputSystem;