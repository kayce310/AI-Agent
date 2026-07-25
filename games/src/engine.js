// Core Game Engine - HTML5 Canvas with ECS Architecture
class GameEngine {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;
        
        // ECS Systems
        this.entities = [];
        this.components = {
            transform: [],
            sprite: [],
            physics: [],
            stats: [],
            inventory: [],
            ai: []
        };
        
        // Game state
        this.running = false;
        this.lastTime = 0;
        this.deltaTime = 0;
        this.targetFPS = 60;
        this.frameTime = 1000 / this.targetFPS;
        
        // Input handling
        this.input = {
            keyboard: new Map(),
            mouse: { x: 0, y: 0, buttons: new Map() },
            touch: []
        };
        
        // Systems
        this.systems = [
            new UpdateSystem(this),
            new RenderSystem(this),
            new InputSystem(this),
            new CollisionSystem(this)
        ];
        
        // Game states
        this.states = {};
        this.currentState = null;
        
        // Asset loading
        this.assets = {};
        this.assetLoader = new AssetLoader(this);
        
        // Performance optimization
        this.entityPool = [];
        this.maxEntities = 1000;
        this.spatialGrid = null;
        
        // Audio
        this.audioContext = null;
        this.sounds = {};
        
        // Camera
        this.camera = { x: 0, y: 0, zoom: 1 };
        
        // Time management
        this.timeScale = 1.0;
        this.fixedDeltaTime = 0.016; // 60 FPS fixed update
    }
    
    init() {
        this.setupInputHandlers();
        this.initializeAudio();
        this.createSpatialGrid();
        this.loadAssets();
    }
    
    start() {
        if (!this.running) {
            this.running = true;
            this.lastTime = performance.now();
            this.gameLoop();
        }
    }
    
    stop() {
        this.running = false;
    }
    
    gameLoop(currentTime) {
        if (!this.running) return;
        
        requestAnimationFrame((time) => this.gameLoop(time));
        
        // Calculate delta time
        let deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        // Cap delta time to prevent spiral of death
        deltaTime = Math.min(deltaTime, this.frameTime * 4);
        
        // Update game state
        this.update(deltaTime);
        
        // Render
        this.render();
    }
    
    update(deltaTime) {
        // Apply time scale
        deltaTime *= this.timeScale;
        
        // Update all systems
        for (let system of this.systems) {
            if (system.update) {
                system.update(deltaTime);
            }
        }
        
        // Update entities
        for (let entity of this.entities) {
            entity.update(deltaTime);
        }
        
        // Update spatial grid
        if (this.spatialGrid) {
            this.spatialGrid.update(this.entities);
        }
    }
    
    render() {
        // Clear canvas
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Apply camera transform
        this.ctx.save();
        this.ctx.translate(-this.camera.x, -this.camera.y);
        this.ctx.scale(this.camera.zoom, this.camera.zoom);
        
        // Render all entities
        for (let entity of this.entities) {
            entity.render(this.ctx);
        }
        
        // Restore transform
        this.ctx.restore();
        
        // Render UI overlay
        this.renderUI();
    }
    
    renderUI() {
        // Render UI elements (HUD, menus, etc.)
        // This is called after game world rendering
    }
    
    addEntity(entity) {
        if (this.entities.length >= this.maxEntities) {
            console.warn('Maximum entity limit reached');
            return;
        }
        
        this.entities.push(entity);
        
        // Register entity with components
        for (let component of entity.components) {
            let type = component.constructor.name.toLowerCase();
            if (this.components[type]) {
                this.components[type].push(component);
            }
        }
        
        // Update spatial grid
        if (this.spatialGrid) {
            this.spatialGrid.insert(entity);
        }
    }
    
    removeEntity(entity) {
        let index = this.entities.indexOf(entity);
        if (index !== -1) {
            this.entities.splice(index, 1);
            
            // Remove from component lists
            for (let component of entity.components) {
                let type = component.constructor.name.toLowerCase();
                let compList = this.components[type];
                let compIndex = compList.indexOf(component);
                if (compIndex !== -1) {
                    compList.splice(compIndex, 1);
                }
            }
            
            // Remove from spatial grid
            if (this.spatialGrid) {
                this.spatialGrid.remove(entity);
            }
        }
    }
    
    setupInputHandlers() {
        // Keyboard input
        document.addEventListener('keydown', (e) => {
            this.input.keyboard.set(e.code, true);
        });
        
        document.addEventListener('keyup', (e) => {
            this.input.keyboard.set(e.code, false);
        });
        
        // Mouse input
        this.canvas.addEventListener('mousemove', (e) => {
            let rect = this.canvas.getBoundingClientRect();
            this.input.mouse.x = e.clientX - rect.left;
            this.input.mouse.y = e.clientY - rect.top;
        });
        
        this.canvas.addEventListener('mousedown', (e) => {
            this.input.mouse.buttons.set(e.button, true);
        });
        
        this.canvas.addEventListener('mouseup', (e) => {
            this.input.mouse.buttons.set(e.button, false);
        });
        
        // Touch input for mobile
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            for (let touch of e.touches) {
                this.input.touch.push({
                    id: touch.identifier,
                    x: touch.clientX,
                    y: touch.clientY,
                    startTime: Date.now()
                });
            }
        });
        
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            for (let touch of e.touches) {
                let touchData = this.input.touch.find(t => t.id === touch.identifier);
                if (touchData) {
                    touchData.x = touch.clientX;
                    touchData.y = touch.clientY;
                }
            }
        });
        
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            let currentTime = Date.now();
            for (let touch of e.changedTouches) {
                let touchIndex = this.input.touch.findIndex(t => t.id === touch.identifier);
                if (touchIndex !== -1) {
                    let touchData = this.input.touch[touchIndex];
                    let duration = currentTime - touchData.startTime;
                    
                    // Determine if it was a tap or swipe
                    if (duration < 300 && Math.abs(touchData.x - touch.x) < 10 && Math.abs(touchData.y - touch.y) < 10) {
                        // Tap action
                        this.handleTap(touchData.x, touchData.y);
                    } else {
                        // Swipe action
                        let deltaX = touchData.x - touchData.x;
                        let deltaY = touchData.y - touchData.y;
                        this.handleSwipe(deltaX, deltaY);
                    }
                    
                    this.input.touch.splice(touchIndex, 1);
                }
            }
        });
    }
    
    handleTap(x, y) {
        // Handle tap input
        for (let system of this.systems) {
            if (system.handleInput) {
                system.handleInput('tap', x, y);
            }
        }
    }
    
    handleSwipe(deltaX, deltaY) {
        // Handle swipe input
        for (let system of this.systems) {
            if (system.handleInput) {
                system.handleInput('swipe', deltaX, deltaY);
            }
        }
    }
    
    initializeAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API not supported');
        }
    }
    
    createSpatialGrid() {
        let cellSize = 100;
        let cols = Math.ceil(this.width / cellSize);
        let rows = Math.ceil(this.height / cellSize);
        
        this.spatialGrid = {
            cellSize: cellSize,
            cols: cols,
            rows: rows,
            grid: Array(cols * rows).fill(null).map(() => []),
            
            getCellIndex(x, y) {
                let col = Math.floor(x / this.cellSize);
                let row = Math.floor(y / this.cellSize);
                return row * this.cols + col;
            },
            
            insert(entity) {
                let transform = entity.getComponent('Transform');
                if (transform) {
                    let cellIndex = this.getCellIndex(transform.x, transform.y);
                    if (cellIndex >= 0 && cellIndex < this.grid.length) {
                        this.grid[cellIndex].push(entity);
                    }
                }
            },
            
            remove(entity) {
                for (let cell of this.grid) {
                    let index = cell.indexOf(entity);
                    if (index !== -1) {
                        cell.splice(index, 1);
                    }
                }
            },
            
            update(entities) {
                // Clear grid
                for (let cell of this.grid) {
                    cell.length = 0;
                }
                
                // Re-insert entities
                for (let entity of entities) {
                    this.insert(entity);
                }
            },
            
            query(x, y, radius) {
                let result = [];
                let minCol = Math.floor((x - radius) / this.cellSize);
                let maxCol = Math.floor((x + radius) / this.cellSize);
                let minRow = Math.floor((y - radius) / this.cellSize);
                let maxRow = Math.floor((y + radius) / this.cellSize);
                
                for (let col = minCol; col <= maxCol; col++) {
                    for (let row = minRow; row <= maxRow; row++) {
                        let cellIndex = row * this.cols + col;
                        if (cellIndex >= 0 && cellIndex < this.grid.length) {
                            result.push(...this.grid[cellIndex]);
                        }
                    }
                }
                
                return result;
            }
        };
    }
    
    loadAssets() {
        // Load game assets (sprites, audio, etc.)
        // This is called during initialization
    }
    
    addState(name, state) {
        this.states[name] = state;
        state.engine = this;
    }
    
    changeState(name) {
        if (this.currentState) {
            this.currentState.exit();
        }
        
        this.currentState = this.states[name];
        if (this.currentState) {
            this.currentState.enter();
        }
    }
    
    getEntitiesWithComponent(componentType) {
        return this.components[componentType] || [];
    }
    
    getNearbyEntities(x, y, radius) {
        return this.spatialGrid ? this.spatialGrid.query(x, y, radius) : this.entities;
    }
    
    setTimeScale(scale) {
        this.timeScale = Math.max(0, Math.min(scale, 10));
    }
    
    togglePause() {
        this.setTimeScale(this.timeScale === 1.0 ? 0 : 1.0);
    }
    
    destroy() {
        this.stop();
        this.entities = [];
        this.components = {
            transform: [],
            sprite: [],
            physics: [],
            stats: [],
            inventory: [],
            ai: []
        };
        
        if (this.spatialGrid) {
            this.spatialGrid.grid = [];
        }
        
        // Clean up audio
        if (this.audioContext) {
            this.audioContext.close();
        }
    }
}

// Export for use in other files
window.GameEngine = GameEngine;