// NPC entity for dialogue and quests
class NPC extends Entity {
    constructor(id, name, dialogue, engine) {
        super(id, name);
        this.engine = engine;
        this.dialogue = dialogue || "Hello there!";
        this.interactionRange = 50;
        this.quests = [];
        this.currentQuest = null;
        this.isTalking = false;
        
        // Add components
        this.addComponent(new Transform(100, 100, 64, 64));
        this.addComponent(new Sprite('assets/npc.png', 64, 64, 2));
        this.addComponent(new AI('npc', this.engine.entities));
        
        // NPC-specific properties
        this.sprite = this.getComponent('Sprite');
        this.sprite.animationSpeed = 0.2;
        
        // Update component references
        this.transform = this.getComponent('Transform');
    }
    
    update(deltaTime) {
        super.update(deltaTime);
        
        // Check for player interaction
        this.checkPlayerInteraction();
        
        // Update animation
        this.updateAnimation(deltaTime);
    }
    
    checkPlayerInteraction() {
        // Check if player is within interaction range
        let player = this.engine.entities.find(e => e instanceof Player);
        if (player) {
            let distance = Math.sqrt(
                Math.pow(player.transform.x - this.transform.x, 2) + 
                Math.pow(player.transform.y - this.transform.y, 2)
            );
            
            if (distance < this.interactionRange) {
                this.isTalking = true;
                // Trigger interaction
                this.onPlayerNear(player);
            } else {
                this.isTalking = false;
            }
        }
    }
    
    onPlayerNear(player) {
        // Handle player interaction
        if (player.inputHandler && !player.interactionHandled) {
            player.interactionHandled = true;
            this.showDialogue(player);
        }
    }
    
    showDialogue(player) {
        console.log(`${this.name}: ${this.dialogue}`);
        
        // Reset interaction flag after dialogue
        setTimeout(() => {
            player.interactionHandled = false;
        }, 1000);
    }
    
    updateAnimation(deltaTime) {
        if (this.isTalking) {
            this.sprite.currentFrame = 1; // Talking animation
        } else {
            this.sprite.currentFrame = Math.floor(Date.now() / 300) % 2; // Idle animation
        }
    }
    
    addQuest(quest) {
        this.quests.push(quest);
    }
    
    acceptQuest(questName) {
        let quest = this.quests.find(q => q.name === questName);
        if (quest && !quest.completed) {
            this.currentQuest = quest;
            return quest;
        }
        return null;
    }
    
    completeQuest() {
        if (this.currentQuest) {
            this.currentQuest.completed = true;
            let reward = this.currentQuest.reward;
            
            // Give rewards
            if (reward.gold) {
                // Add gold to player
                let player = this.engine.entities.find(e => e instanceof Player);
                if (player) {
                    player.gold += reward.gold;
                }
            }
            
            if (reward.items) {
                let player = this.engine.entities.find(e => e instanceof Player);
                if (player) {
                    for (let item of reward.items) {
                        player.inventory.addItem(item);
                    }
                }
            }
            
            if (reward.experience) {
                let player = this.engine.entities.find(e => e instanceof Player);
                if (player) {
                    player.gainExperience(reward.experience);
                }
            }
            
            this.currentQuest = null;
            return true;
        }
        return false;
    }
    
    render(ctx) {
        super.render(ctx);
        
        // Render dialogue indicator
        if (this.isTalking) {
            ctx.fillStyle = '#00FF00';
            ctx.font = '12px Arial';
            ctx.fillText('?', this.transform.x, this.transform.y - 50);
        }
    }
}

// Export for use in other files
window.NPC = NPC;