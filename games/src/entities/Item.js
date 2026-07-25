// Item entity for pickup and usage
class Item extends Entity {
    constructor(id, name, type, value, engine) {
        super(id, name);
        this.engine = engine;
        this.type = type; // 'weapon', 'armor', 'potion', 'scroll', 'key', 'currency'
        this.value = value;
        this.usable = false;
        this.equippable = false;
        this.stackable = false;
        this.maxStack = 1;
        this.currentStack = 1;
        this.description = "An item";
        this.rarity = 'common'; // 'common', 'uncommon', 'rare', 'epic', 'legendary'
        
        // Add components
        this.addComponent(new Transform(0, 0, 32, 32));
        this.addComponent(new Sprite('assets/item.png', 32, 32, 1));
        this.addComponent(new Physics(1, 0, 0, 0, 0.1));
        
        // Update component references
        this.transform = this.getComponent('Transform');
        this.physics = this.getComponent('Physics');
    }
    
    update(deltaTime) {
        super.update(deltaTime);
        
        // Update physics
        this.physics.update(deltaTime);
        
        // Float slightly in place
        this.transform.velocity.y = Math.sin(Date.now() / 1000) * 0.5;
    }
    
    use() {
        if (!this.usable) return false;
        
        // Apply item effect
        if (this.effect) {
            return this.effect();
        }
        
        return false;
    }
    
    equip() {
        if (!this.equippable) return false;
        
        // Equip item logic
        return true;
    }
    
    drop() {
        // Drop item logic
        return true;
    }
    
    render(ctx) {
        super.render(ctx);
        
        // Render stack count
        if (this.currentStack > 1) {
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '12px Arial';
            ctx.fillText(this.currentStack.toString(), this.transform.x + 16, this.transform.y + 50);
        }
        
        // Render rarity glow
        if (this.rarity !== 'common') {
            ctx.save();
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = this.getRarityColor(this.rarity);
            ctx.fillRect(this.transform.x - 5, this.transform.y - 5, 42, 42);
            ctx.restore();
        }
    }
    
    getRarityColor(rarity) {
        const colors = {
            'common': '#FFFFFF',
            'uncommon': '#1EFF00',
            'rare': '#0070DD',
            'epic': '#A335EE',
            'legendary': '#FF8000'
        };
        return colors[rarity] || colors.common;
    }
}

// Export for use in other files
window.Item = Item;