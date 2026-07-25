// Game Menu State - Main menu and pause menu
class GameMenuState {
    constructor(engine) {
        this.engine = engine;
        this.menuItems = [
            { text: 'Continue', action: 'continue' },
            { text: 'New Game', action: 'new_game' },
            { text: 'Settings', action: 'settings' },
            { text: 'Save Game', action: 'save_game' },
            { text: 'Load Game', action: 'load_game' },
            { text: 'Exit', action: 'exit' }
        ];
        this.selectedItem = 0;
        this.background = null;
    }
    
    enter() {
        // Initialize menu
        this.background = new Image();
        this.background.src = 'assets/menu_background.png';
        this.background.onload = () => {
            this.engine.changeState('menu');
        };
    }
    
    exit() {
        // Clean up menu
        this.background = null;
    }
    
    update(deltaTime) {
        // Handle input
        if (this.engine.input.keyboard.get('KeyW') && this.engine.input.keyboard.get('KeyW')) {
            this.selectedItem = Math.max(0, this.selectedItem - 1);
        } else if (this.engine.input.keyboard.get('KeyS') && this.engine.input.keyboard.get('KeyS')) {
            this.selectedItem = Math.min(this.menuItems.length - 1, this.selectedItem + 1);
        } else if (this.engine.input.keyboard.get('Enter') && this.engine.input.keyboard.get('Enter')) {
            this.handleSelection();
        }
    }
    
    handleSelection() {
        let action = this.menuItems[this.selectedItem].action;
        
        switch (action) {
            case 'continue':
                this.engine.changeState('gameplay');
                break;
            case 'new_game':
                this.startNewGame();
                break;
            case 'settings':
                this.engine.changeState('settings');
                break;
            case 'save_game':
                this.saveGame();
                break;
            case 'load_game':
                this.loadGame();
                break;
            case 'exit':
                this.engine.stop();
                break;
        }
    }
    
    startNewGame() {
        // Reset player and start new game
        let player = this.engine.entities.find(e => e instanceof Player);
        if (player) {
            // Reset player stats
            let stats = player.getComponent('Stats');
            if (stats) {
                stats.currentHP = stats.maxHP;
                stats.currentMP = stats.maxMP;
                stats.experience = 0;
                stats.level = 1;
                stats.gold = 0;
            }
            
            // Reset equipment
            for (let slot in player.equipment) {
                player.equipment[slot] = null;
            }
            
            // Reset position
            let transform = player.getComponent('Transform');
            if (transform) {
                transform.x = 100;
                transform.y = 300;
            }
            
            // Clear inventory except starting items
            let inventory = player.getComponent('Inventory');
            if (inventory) {
                inventory.items = inventory.items.filter(item => 
                    item.name.includes('Health Potion') || item.name.includes('Magic Potion')
                );
            }
            
            // Start gameplay
            this.engine.changeState('gameplay');
        }
    }
    
    saveGame() {
        // Save game state
        let player = this.engine.entities.find(e => e instanceof Player);
        if (player) {
            let gameState = {
                player: {
                    x: player.transform.x,
                    y: player.transform.y,
                    level: player.level,
                    experience: player.experience,
                    gold: player.gold,
                    equipment: player.equipment,
                    inventory: player.inventory.items,
                    stats: {
                        currentHP: player.stats.currentHP,
                        currentMP: player.stats.currentMP,
                        attack: player.stats.attack,
                        defense: player.stats.defense,
                        speed: player.stats.speed
                    }
                },
                currentMap: player.currentMap,
                worldBossDefeated: player.worldBossDefeated,
                worldBossSpawned: player.worldBossSpawned,
                time: Date.now()
            };
            
            localStorage.setItem('isekai_rpg_save', JSON.stringify(gameState));
            console.log('Game saved!');
        }
    }
    
    loadGame() {
        // Load game state
        let savedState = localStorage.getItem('isekai_rpg_save');
        if (savedState) {
            let gameState = JSON.parse(savedState);
            
            let player = this.engine.entities.find(e => e instanceof Player);
            if (player) {
                // Restore player state
                let transform = player.getComponent('Transform');
                if (transform) {
                    transform.x = gameState.player.x;
                    transform.y = gameState.player.y;
                }
                
                player.level = gameState.player.level;
                player.experience = gameState.player.experience;
                player.gold = gameState.player.gold;
                player.equipment = gameState.player.equipment;
                player.inventory.items = gameState.player.inventory;
                
                let stats = player.getComponent('Stats');
                if (stats) {
                    stats.currentHP = gameState.player.stats.currentHP;
                    stats.currentMP = gameState.player.stats.currentMP;
                    stats.attack = gameState.player.stats.attack;
                    stats.defense = gameState.player.stats.defense;
                    stats.speed = gameState.player.stats.speed;
                }
                
                // Restore world state
                player.currentMap = gameState.currentMap;
                player.worldBossDefeated = gameState.worldBossDefeated;
                player.worldBossSpawned = gameState.worldBossSpawned;
                
                console.log('Game loaded!');
                this.engine.changeState('gameplay');
            }
        } else {
            console.log('No saved game found!');
        }
    }
    
    render(ctx) {
        // Render menu background
        if (this.background && this.background.complete) {
            ctx.drawImage(this.background, 0, 0, this.engine.width, this.engine.height);
        } else {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, this.engine.width, this.engine.height);
        }
        
        // Render menu title
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '48px Arial';
        ctx.fillText('ISEKAI RPG', this.engine.width / 2 - 150, 100);
        
        // Render menu items
        ctx.font = '24px Arial';
        for (let i = 0; i < this.menuItems.length; i++) {
            let item = this.menuItems[i];
            let color = i === this.selectedItem ? '#00FF00' : '#FFFFFF';
            
            ctx.fillStyle = color;
            ctx.fillText(item.text, this.engine.width / 2 - 100, 200 + i * 50);
        }
        
        // Render instructions
        ctx.font = '16px Arial';
        ctx.fillStyle = '#CCCCCC';
        ctx.fillText('W/S: Navigate  A/D: Move  E: Interact  Space: Jump', this.engine.width / 2 - 200, this.engine.height - 50);
    }
}

// Export for use in other files
window.GameMenuState = GameMenuState;