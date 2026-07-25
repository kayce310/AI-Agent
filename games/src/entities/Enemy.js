// Enemy entity with AI behavior and combat
class Enemy extends Entity {
    constructor(id, name, type, engine) {
        super(id, name);
        this.engine = engine;
        this.type = type; // 'normal', 'boss', 'miniboss'
        this.aiType = 'patrol'; // 'patrol', 'chase', 'stationary'
        this PatrolPoints = [];
        this.currentPatrolIndex = 0;
        this.chaseTarget = null;
        this.attackRange = 50;
        this.attackCooldown = 0;
        this.maxAttackCooldown = 60;
        this.isAttacking = false;
        this.dropTable = [];
        this.experienceValue = 10;
        this.goldValue = 5;
        
        // Add components
        this.addComponent(new Transform(200, 200, 64, 64));
        this.addComponent(new Sprite('assets/enemy.png', 64, 64, 4));
        this.addComponent(new Physics(1, 0, 0, 0, 0.1));
        this.addComponent(new Stats(50, 20, 8, 3, 3, 1, 0));
        this.addComponent(new AI('enemy', this.engine.entities));
        
        // Enemy-specific properties
        this.sprite = this.getComponent('Sprite');
        this.sprite.animationSpeed = 0.15;
        
        // Update component references
        this.transform = this.getComponent('Transform');
        this.physics = this.getComponent('Physics');
        this.stats = this.getComponent('Stats');
    }
    
    update(deltaTime) {
        super.update(deltaTime);
        
        // Update physics
        this.physics.update(deltaTime);
        
        // Update stats
        this.stats.update(deltaTime);
        
        // Update attack cooldown
        if (this.attackCooldown > 0) {
            this.attackCooldown -= deltaTime;
        }
        
        // Update AI behavior
        this.updateAI(deltaTime);
        
        // Update animation
        this.updateAnimation(deltaTime);
        
        // Check for death
        if (this.stats.currentHP <= 0 && this.stats.currentHP > -10) {
            this.die();
        }
    }
    
    updateAI(deltaTime) {
        switch (this.aiType) {
            case 'patrol':
                this.updatePatrolAI(deltaTime);
                break;
            case 'chase':
                this.updateChaseAI(deltaTime);
                break;
            case 'stationary':
                this.updateStationaryAI(deltaTime);
                break;
        }
    }
    
    updatePatrolAI(deltaTime) {
        if (this.PatrolPoints.length === 0) return;
        
        let targetPoint = this.PatrolPoints[this.currentPatrolIndex];
        let distance = Math.sqrt(
            Math.pow(targetPoint.x - this.transform.x, 2) + 
            Math.pow(targetPoint.y - this.transform.y, 2)
        );
        
        if (distance < 10) {
            // Reached patrol point
            this.currentPatrolIndex = (this.currentPatrolIndex + 1) % this.PatrolPoints.length;
        } else {
            // Move toward patrol point
            let angle = Math.atan2(targetPoint.y - this.transform.y, targetPoint.x - this.transform.x);
            this.physics.velocity.x = Math.cos(angle) * this.stats.speed;
            this.physics.velocity.y = Math.sin(angle) * this.stats.speed;
        }
        
        // Check for player
        let player = this.engine.entities.find(e => e instanceof Player);
        if (player) {
            let playerDistance = Math.sqrt(
                Math.pow(player.transform.x - this.transform.x, 2) + 
                Math.pow(player.transform.y - this.transform.y, 2)
            );
            
            if (playerDistance < this.attackRange) {
                this.aiType = 'chase';
                this.chaseTarget = player;
            }
        }
    }
    
    updateChaseAI(deltaTime) {
        let player = this.engine.entities.find(e => e instanceof Player);
        if (!player) {
            this.aiType = 'patrol';
            this.PatrolPoints = [];
            return;
        }
        
        let distance = Math.sqrt(
            Math.pow(player.transform.x - this.transform.x, 2) + 
            Math.pow(player.transform.y - this.transform.y, 2)
        );
        
        if (distance > this.attackRange * 1.5) {
            // Move toward player
            let angle = Math.atan2(player.transform.y - this.transform.y, player.transform.x - this.transform.x);
            this.physics.velocity.x = Math.cos(angle) * this.stats.speed;
            this.physics.velocity.y = Math.sin(angle) * this.stats.speed;
            
            // Face player
            this.sprite.flipX = player.transform.x < this.transform.x;
        } else if (distance <= this.attackRange) {
            // Attack player
            this.performAttack();
        } else {
            // Too close, back away
            let angle = Math.atan2(this.transform.y - player.transform.y, this.transform.x - player.transform.x);
            this.physics.velocity.x = Math.cos(angle) * this.stats.speed * 0.5;
            this.physics.velocity.y = Math.sin(angle) * this.stats.speed * 0.5;
        }
    }
    
    updateStationaryAI(deltaTime) {
        // Just stand still and look for players
        this.physics.velocity.x = 0;
        this.physics.velocity.y = 0;
        
        let player = this.engine.entities.find(e => e instanceof Player);
        if (player) {
            let distance = Math.sqrt(
                Math.pow(player.transform.x - this.transform.x, 2) + 
                Math.pow(player.transform.y - this.transform.y, 2)
            );
            
            if (distance < this.attackRange) {
                this.aiType = 'chase';
                this.chaseTarget = player;
            }
        }
    }
    
    performAttack() {
        if (this.isAttacking || this.attackCooldown > 0) return;
        
        this.isAttacking = true;
        this.attackCooldown = this.maxAttackCooldown;
        
        // Check if player is in attack range
        let player = this.engine.entities.find(e => e instanceof Player);
        if (player) {
            let distance = Math.sqrt(
                Math.pow(player.transform.x - this.transform.x, 2) + 
                Math.pow(player.transform.y - this.transform.y, 2)
            );
            
            if (distance <= this.attackRange) {
                // Attack player
                let damage = this.stats.attack;
                let playerDefeated = player.stats.takeDamage(damage);
                
                // Create attack effect
                this.createAttackEffect(player.transform.x, player.transform.y);
                
                if (playerDefeated) {
                    console.log('Player defeated!');
                }
            }
        }
    }
    
    createAttackEffect(x, y) {
        let attackEffect = new Entity(`effect_${Date.now()}`, 'attack_effect');
        attackEffect.addComponent(new Transform(x - 16, y - 16, 32, 32));
        attackEffect.addComponent(new Sprite('assets/attack_effect.png', 32, 32, 3));
        attackEffect.getComponent('Sprite').animationSpeed = 0.2;
        
        this.engine.addEntity(attackEffect);
        
        // Set timeout to remove effect
        setTimeout(() => {
            this.engine.removeEntity(attackEffect);
        }, 300);
    }
    
    die() {
        // Drop items
        this.dropItems();n        
        // Give experience and gold to player
        let player = this.engine.entities.find(e => e instanceof Player);
        if (player) {
            player.gainExperience(this.experienceValue);
            player.gold += this.goldValue;
        }
        
        // Remove enemy
        this.engine.removeEntity(this);
        
        console.log(`${this.name} defeated!`);
    }
    
    dropItems() {
        // Roll for drops based on drop table
        for (let drop of this.dropTable) {
            let roll = Math.random() * 100;
            if (roll <= drop.chance) {
                let item = this.generateDrop(drop.item);
                if (item) {
                    let itemEntity = new Entity(`item_${Date.now()}`, 'item');
                    itemEntity.addComponent(new Transform(
                        this.transform.x + (Math.random() - 0.5) * 50,
                        this.transform.y + (Math.random() - 0.5) * 50,
                        32, 32
                    ));
                    itemEntity.addComponent(new Sprite('assets/item.png', 32, 32, 1));
                    itemEntity.itemData = item;
                    
                    this.engine.addEntity(itemEntity);
                }
            }
        }
    }
    
    generateDrop(itemType) {
        // Generate a random item of the specified type
        let baseItems = {
            'weapon': ['sword', 'bow', 'staff', 'dagger'],
            'armor': ['leather', 'chain', 'plate', 'robe'],
            'potion': ['health', 'magic', 'strength'],
            'gold': null
        };
        
        if (itemType === 'gold') {
            return {
                name: `${Math.floor(Math.random() * 50) + 10} Gold`,
                type: 'currency',
                value: Math.floor(Math.random() * 50) + 10
            };
        }
        
        let itemName = baseItems[itemType][Math.floor(Math.random() * baseItems[itemType].length)];
        let level = Math.floor(Math.random() * 3) + 1;
        
        return {
            name: `${itemName.charAt(0).toUpperCase() + itemName.slice(1)} (Level ${level})`,
            type: itemType,
            level: level,
            value: Math.floor(Math.random() * 100) + 50
        };
    }
    
    updateAnimation(deltaTime) {
        if (this.isAttacking) {
            this.sprite.currentFrame = 3; // Attack animation
        } else if (this.physics.velocity.x !== 0 || this.physics.velocity.y !== 0) {
            this.sprite.currentFrame = Math.floor(Date.now() / 200) % 4; // Walk animation
        } else {
            this.sprite.currentFrame = 0; // Idle animation
        }
    }
    
    render(ctx) {
        super.render(ctx);
        
        // Render health bar
        if (this.stats.currentHP < this.stats.maxHP) {
            let healthPercent = this.stats.currentHP / this.stats.maxHP;
            ctx.fillStyle = '#FF0000';
            ctx.fillRect(this.transform.x - 2, this.transform.y - 30, 68, 6);
            ctx.fillStyle = '#00FF00';
            ctx.fillRect(this.transform.x - 2, this.transform.y - 30, 68 * healthPercent, 6);
        }
        
        // Render name
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '12px Arial';
        ctx.fillText(this.name, this.transform.x - 20, this.transform.y - 40);
    }
}

// Export for use in other files
window.Enemy = Enemy;