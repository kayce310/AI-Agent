// Player entity with all game mechanics
class Player extends Entity {
    constructor(id, name, engine) {
        super(id, name);
        this.engine = engine;
        
        // Add components
        this.addComponent(new Transform(100, 300, 64, 64));
        this.addComponent(new Sprite('assets/player.png', 64, 64, 4));
        this.addComponent(new Physics(1, 0, 0, 0.5, 0.1));
        this.addComponent(new Stats(100, 50, 10, 5, 5, 1, 0));
        this.addComponent(new Inventory(20));
        this.addComponent(new AI('npc', this.engine.entities));
        
        // Player-specific properties
        this.inputHandler = (action, pressed, data) => this.handleInput(action, pressed, data);
        this.experience = 0;
        this.level = 1;
        this.gold = 0;
        this.equippedItems = {};
        this.learnedSkills = [];
        
        // Animation
        this.sprite = this.getComponent('Sprite');
        this.sprite.animationSpeed = 0.15;
        this.sprite.onLoaded = () => {
            this.sprite.currentFrame = 0;
        };
        
        // Movement
        this.moving = false;
        this.velocity = { x: 0, y: 0 };
        this.speed = 200;
        
        // Combat
        this.attacking = false;
        this.attackCooldown = 0;
        this.maxAttackCooldown = 30;
        
        // State machine
        this.state = 'idle';
        this.previousState = 'idle';
        
        // Equipment slots
        this.equipmentSlots = ['weapon', 'armor', 'ring', 'helmet', 'boots'];
        this.equipment = {};
        
        // Cosmetics
        this.cosmetics = {
            skin: 'default',
            hair: 'default',
            outfit: 'default',
            title: 'Novice'
        };
        
        // Skills
        this.skills = {
            'attack': { damage: 10, mpCost: 0, cooldown: 0 },
            'magic': { damage: 20, mpCost: 15, cooldown: 60 },
            'defend': { defenseBonus: 5, duration: 300 },
            'heal': { healAmount: 30, mpCost: 20, cooldown: 120 }
        };
        
        // Game progression
        this.quests = [];
        this.completedQuests = [];
        this.currentMap = 'forest';
        this.worldMap = {
            'forest': { x: 100, y: 100, visited: true },
            'cave': { x: 400, y: 150, visited: false },
            'town': { x: 250, y: 400, visited: false },
            'mountain': { x: 500, y: 300, visited: false },
            'castle': { x: 800, y: 200, visited: false }
        };
        
        // World boss status
        this.worldBossDefeated = false;
        this.worldBossSpawned = false;
        
        // Hidden mechanics
        this.secretAreas = [];
        this.achievements = [];
        this.dailyChallenges = [];
        
        // Equipment generation
        this.generateStartingEquipment();
        
        // Update component references
        this.transform = this.getComponent('Transform');
        this.physics = this.getComponent('Physics');
        this.stats = this.getComponent('Stats');
        this.inventory = this.getComponent('Inventory');
    }
    
    generateStartingEquipment() {
        // Generate random starting equipment
        const weaponTypes = ['sword', 'bow', 'staff', 'dagger'];
        const armorTypes = ['leather', 'chain', 'plate', 'robe'];
        
        let weapon = this.generateRandomEquipment('weapon', weaponTypes);
        let armor = this.generateRandomEquipment('armor', armorTypes);
        
        this.equipItem('weapon', weapon);
        this.equipItem('armor', armor);
        
        // Add some starting items
        this.inventory.addItem({
            name: 'Health Potion',
            type: 'consumable',
            effect: 'heal',
            value: 30
        });
        
        this.inventory.addItem({
            name: 'Magic Potion',
            type: 'consumable',
            effect: 'mp_restore',
            value: 25
        });
    }
    
    generateRandomEquipment(slot, types) {
        let type = types[Math.floor(Math.random() * types.length)];
        let level = Math.floor(Math.random() * 5) + 1;
        
        let baseStats = {
            'sword': { attack: 10, defense: 2, hp: 0, mp: 0 },
            'bow': { attack: 8, defense: 1, hp: 0, mp: 5 },
            'staff': { attack: 5, defense: 1, hp: 0, mp: 15 },
            'dagger': { attack: 12, defense: 0, hp: 0, mp: 0 },
            'leather': { attack: 0, defense: 3, hp: 5, mp: 0 },
            'chain': { attack: 0, defense: 5, hp: 0, mp: 0 },
            'plate': { attack: 0, defense: 8, hp: 10, mp: 0 },
            'robe': { attack: 0, defense: 2, hp: 0, mp: 10 }
        };
        
        let stats = baseStats[type];
        let quality = Math.random() < 0.3 ? 'rare' : Math.random() < 0.1 ? 'epic' : 'common';
        
        // Add random stat increases based on quality
        if (quality === 'rare') {
            stats.attack += Math.floor(Math.random() * 5) + 1;
            stats.defense += Math.floor(Math.random() * 3) + 1;
        } else if (quality === 'epic') {
            stats.attack += Math.floor(Math.random() * 10) + 5;
            stats.defense += Math.floor(Math.random() * 8) + 5;
            stats.hp += Math.floor(Math.random() * 20) + 10;
            stats.mp += Math.floor(Math.random() * 15) + 5;
        }
        
        return {
            name: `${type} (Level ${level}) - ${quality.charAt(0).toUpperCase() + quality.slice(1)}`,
            type: type,
            slot: slot,
            level: level,
            quality: quality,
            stats: stats,
            description: this.getEquipmentDescription(type, quality),
            value: this.calculateEquipmentValue(stats, quality, level)
        };
    }
    
    getEquipmentDescription(type, quality) {
        const descriptions = {
            'sword': 'A sharp weapon for close combat',
            'bow': 'A ranged weapon for shooting enemies',
            'staff': 'A magical weapon for casting spells',
            'dagger': 'A quick weapon for stealth attacks',
            'leather': 'Light armor for quick movement',
            'chain': 'Medium armor for balanced protection',
            'plate': 'Heavy armor for maximum protection',
            'robe': 'Magical armor for spellcasters'
        };
        
        let base = descriptions[type] || 'An item';
        if (quality === 'rare') return base + ' (Rare!)';
        if (quality === 'epic') return base + ' (Epic!)';
        return base;
    }
    
    calculateEquipmentValue(stats, quality, level) {
        let value = stats.attack + stats.defense + (stats.hp || 0) + (stats.mp || 0);
        value *= (quality === 'rare' ? 2 : quality === 'epic' ? 5 : 1);
        value *= level;
        return Math.floor(value);
    }
    
    equipItem(slot, item) {
        if (!this.equipmentSlots.includes(slot)) return false;
        
        // Unequip current item
        if (this.equipment[slot]) {
            this.unequipItem(slot);
        }
        
        // Equip new item
        this.equipment[slot] = item;
        
        // Apply item stats to player
        if (item && item.stats) {
            this.stats.maxHP += item.stats.hp || 0;
            this.stats.maxMP += item.stats.mp || 0;
            this.stats.attack += item.stats.attack || 0;
            this.stats.defense += item.stats.defense || 0;
            this.stats.speed += item.stats.speed || 0;
            
            // Update current stats
            this.stats.currentHP = this.stats.maxHP;
            this.stats.currentMP = this.stats.maxMP;
        }
        
        return true;
    }
    
    unequipItem(slot) {
        if (!this.equipmentSlots.includes(slot)) return false;
        
        if (this.equipment[slot]) {
            let item = this.equipment[slot];
            
            // Remove item stats from player
            if (item && item.stats) {
                this.stats.maxHP -= item.stats.hp || 0;
                this.stats.maxMP -= item.stats.mp || 0;
                this.stats.attack -= item.stats.attack || 0;
                this.stats.defense -= item.stats.defense || 0;
                this.stats.speed -= item.stats.speed || 0;
                
                // Ensure stats don't go below minimum
                this.stats.maxHP = Math.max(20, this.stats.maxHP);
                this.stats.maxMP = Math.max(0, this.stats.maxMP);
                this.stats.attack = Math.max(1, this.stats.attack);
                this.stats.defense = Math.max(0, this.stats.defense);
                this.stats.speed = Math.max(1, this.stats.speed);
            }
            
            this.equipment[slot] = null;
            return true;
        }
        return false;
    }
    
    handleInput(action, pressed, data) {
        if (!pressed) return; // Only handle key down events
        
        switch (action) {
            case 'move_up':
                this.velocity.y = -this.speed;
                this.state = 'moving';
                break;
            case 'move_down':
                this.velocity.y = this.speed;
                this.state = 'moving';
                break;
            case 'move_left':
                this.velocity.x = -this.speed;
                this.state = 'moving';
                this.sprite.flipX = true;
                break;
            case 'move_right':
                this.velocity.x = this.speed;
                this.state = 'moving';
                this.sprite.flipX = false;
                break;
            case 'attack':
                this.performAttack();
                break;
            case 'interact':
                this.interact();
                break;
            case 'use_item':
                this.useSelectedItem();
                break;
            case 'pause':
                this.engine.changeState('pause');
                break;
        }
    }
    
    performAttack() {
        if (this.attacking || this.attackCooldown > 0) return;
        
        this.attacking = true;
        this.attackCooldown = this.maxAttackCooldown;
        
        // Create attack effect
        let attackEffect = new Entity(`effect_${Date.now()}`, 'attack_effect');
        attackEffect.addComponent(new Transform(
            this.transform.x + (this.velocity.x > 0 ? 50 : -50),
            this.transform.y - 20,
            32, 32
        ));
        attackEffect.addComponent(new Sprite('assets/attack_effect.png', 32, 32, 3));
        attackEffect.getComponent('Sprite').animationSpeed = 0.2;
        
        this.engine.addEntity(attackEffect);
        
        // Set timeout to remove effect
        setTimeout(() => {
            this.engine.removeEntity(attackEffect);
        }, 500);
        
        // Check for enemy collisions
        this.checkAttacks();
    }
    
    checkAttacks() {
        // Check for nearby enemies
        let nearbyEntities = this.engine.getNearbyEntities(
            this.transform.x, this.transform.y, 100
        );
        
        for (let entity of nearbyEntities) {
            if (entity.name.includes('enemy') || entity.name.includes('boss')) {
                let enemyStats = entity.getComponent('Stats');
                if (enemyStats) {
                    let damage = this.stats.attack;
                    let enemyDefeated = enemyStats.takeDamage(damage);
                    
                    if (enemyDefeated) {
                        this.engine.removeEntity(entity);
                        this.gainExperience(100);
                    }
                }
            }
        }
    }
    
    interact() {
        // Check for nearby NPCs and objects
        let nearbyEntities = this.engine.getNearbyEntities(
            this.transform.x, this.transform.y, 50
        );
        
        for (let entity of nearbyEntities) {
            if (entity.name.includes('npc')) {
                // Show dialogue
                this.showDialogue(entity.dialogue);
                return;
            }
            
            if (entity.name.includes('chest')) {
                // Open chest
                this.openChest(entity);
                return;
            }
            
            if (entity.name.includes('door')) {
                // Try to open door
                this.tryOpenDoor(entity);
                return;
            }
        }
    }
    
    showDialogue(text) {
        // Show dialogue in UI
        console.log(`NPC: ${text}`);
    }
    
    openChest(chest) {
        // Open chest and get random items
        let items = [];
        let itemCount = Math.floor(Math.random() * 3) + 1;
        
        for (let i = 0; i < itemCount; i++) {
            let item = this.generateRandomEquipment(
                ['weapon', 'armor', 'ring', 'potion'][Math.floor(Math.random() * 4)],
                ['weapon', 'bow', 'staff', 'dagger', 'leather', 'chain', 'plate', 'robe', 'potion', 'scroll']
            );
            items.push(item);
        }
        
        for (let item of items) {
            this.inventory.addItem(item);
        }
        
        // Remove chest
        this.engine.removeEntity(chest);
        
        console.log(`Opened chest! Found ${itemCount} items.`);
    }
    
    tryOpenDoor(door) {
        // Check if player has key or meets requirements
        if (this.hasKey('dungeon_key')) {
            // Open door
            door.open();
            console.log('Door opened!');
        } else {
            console.log('You need a key to open this door.');
        }
    }
    
    hasKey(keyType) {
        return this.inventory.items.some(item => item.name.includes(keyType));
    }
    
    useSelectedItem() {
        // Use selected item from inventory
        // Implementation depends on UI selection
        console.log('Use item functionality to be implemented');
    }
    
    gainExperience(exp) {
        this.stats.addExperience(exp);
        this.experience = this.stats.experience;
        
        if (this.stats.level > this.level) {
            this.level = this.stats.level;
            this.onLevelUp();
        }
    }
    
    onLevelUp() {
        console.log(`Level up! Now level ${this.level}`);
        
        // Generate random stat increase
        let statChoices = ['attack', 'defense', 'speed', 'maxHP', 'maxMP'];
        let chosenStat = statChoices[Math.floor(Math.random() * statChoices.length)];
        
        this.stats[chosenStat] += 5;
        
        // Generate new equipment option
        let newEquipment = this.generateRandomEquipment(
            this.equipmentSlots[Math.floor(Math.random() * this.equipmentSlots.length)],
            ['weapon', 'armor', 'ring', 'helmet', 'boots']
        );
        
        console.log(`You gained +5 ${chosenStat} and found ${newEquipment.name}!`);
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
        
        // Update movement
        this.transform.velocity.x = this.velocity.x;
        this.transform.velocity.y = this.velocity.y;
        
        // Update animation based on state
        this.updateAnimation();
        
        // Check for level up
        if (this.stats.level > this.level) {
            this.level = this.stats.level;
            this.onLevelUp();
        }
        
        // Update world boss
        this.updateWorldBoss(deltaTime);
        
        // Check for secret areas
        this.checkSecretAreas();
    }
    
    updateAnimation() {
        if (this.state === 'moving') {
            this.sprite.currentFrame = Math.floor(Date.now() / 200) % 4;
        } else {
            this.sprite.currentFrame = 0;
        }
    }
    
    updateWorldBoss(deltaTime) {
        // World boss spawning logic
        if (!this.worldBossSpawned && Math.random() < 0.001 * deltaTime) {
            this.spawnWorldBoss();
        }
        
        // World boss respawn logic
        if (this.worldBossDefeated) {
            // Boss respawns after 30 minutes of game time
            if (!this.worldBossTimer) {
                this.worldBossTimer = 1800000; // 30 minutes in ms
            }
            this.worldBossTimer -= deltaTime;
            
            if (this.worldBossTimer <= 0) {
                this.respawnWorldBoss();
            }
        }
    }
    
    spawnWorldBoss() {
        let worldBoss = new Entity('world_boss', 'World Boss');
        worldBoss.addComponent(new Transform(800, 200, 128, 128));
        worldBoss.addComponent(new Sprite('assets/world_boss.png', 128, 128, 6));
        worldBoss.getComponent('Sprite').animationSpeed = 0.1;
        worldBoss.addComponent(new Physics(10, 0, 0, 0, 0.1));
        worldBoss.addComponent(new Stats(1000, 500, 50, 30, 10, 50, 0));
        worldBoss.addComponent(new AI('boss', this.engine.entities));
        
        this.engine.addEntity(worldBoss);
        this.worldBossSpawned = true;
        
        console.log('World Boss has spawned! Defeat it to save the realm!');
    }
    
    respawnWorldBoss() {
        this.spawnWorldBoss();
        this.worldBossDefeated = false;
        this.worldBossTimer = 1800000;
        console.log('World Boss has respawned!');
    }
    
    checkSecretAreas() {
        // Check for secret areas based on player position
        for (let area of this.secretAreas) {
            let distance = Math.sqrt(
                Math.pow(this.transform.x - area.x, 2) + 
                Math.pow(this.transform.y - area.y, 2)
            );
            
            if (distance < 50) {
                this.enterSecretArea(area);
            }
        }
    }
    
    enterSecretArea(area) {
        console.log(`Entered secret area: ${area.name}`);
        
        // Remove from secret areas
        let index = this.secretAreas.indexOf(area);
        if (index !== -1) {
            this.secretAreas.splice(index, 1);
        }
        
        // Trigger area effect
        area.triggerEffect(this);
    }
    
    render(ctx) {
        super.render(ctx);
        
        // Render equipment
        for (let slot in this.equipment) {
            if (this.equipment[slot]) {
                let item = this.equipment[slot];
                // Render equipment overlay
                ctx.fillStyle = '#FFD700';
                ctx.font = '12px Arial';
                ctx.fillText(item.name, this.transform.x - 20, this.transform.y - 40);
            }
        }
        
        // Render cosmetics
        ctx.save();
        ctx.translate(this.transform.x, this.transform.y);
        
        // Apply cosmetic effects
        if (this.cosmetics.skin !== 'default') {
            ctx.fillStyle = this.getCosmeticColor(this.cosmetics.skin);
            ctx.fillRect(-32, -32, 64, 64);
        }
        
        ctx.restore();
    }
}

// Export for use in other files
window.Player = Player;