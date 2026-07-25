// Stats component - Handles character and entity statistics
class Stats {
    constructor(maxHP = 100, maxMP = 50, attack = 10, defense = 5, speed = 5, level = 1, experience = 0) {
        this.maxHP = maxHP;
        this.currentHP = maxHP;
        this.maxMP = maxMP;
        this.currentMP = maxMP;
        this.attack = attack;
        this.defense = defense;
        this.speed = speed;
        this.level = level;
        this.experience = experience;
        this.nextLevelXP = 100;
        this.gold = 0;
        this.title = "Novice";
        this.skills = [];
        this.equippedItems = {
            weapon: null,
            armor: null,
            ring: null
        };
    }
    
    update(deltaTime) {
        // Regenerate HP/MP over time
        if (this.currentHP < this.maxHP) {
            this.currentHP = Math.min(this.maxHP, this.currentHP + 5 * deltaTime);
        }
        if (this.currentMP < this.maxMP) {
            this.currentMP = Math.min(this.maxMP, this.currentMP + 2 * deltaTime);
        }
    }
    
    takeDamage(amount) {
        this.currentHP = Math.max(0, this.currentHP - amount);
        return this.currentHP <= 0;
    }
    
    heal(amount) {
        this.currentHP = Math.min(this.maxHP, this.currentHP + amount);
    }
    
    useMP(amount) {
        if (this.currentMP >= amount) {
            this.currentMP -= amount;
            return true;
        }
        return false;
    }
    
    addExperience(exp) {
        this.experience += exp;
        if (this.experience >= this.nextLevelXP) {
            this.levelUp();
        }
    }
    
    levelUp() {
        this.level++;
        this.nextLevelXP = Math.floor(this.nextLevelXP * 1.5);
        this.maxHP += 20;
        this.currentHP = this.maxHP;
        this.maxMP += 10;
        this.currentMP = this.maxMP;
        this.attack += 5;
        this.defense += 3;
        this.speed += 2;
        
        // Random equipment stat upgrade
        if (this.equippedItems.weapon) {
            this.equippedItems.weapon.stats.attack += Math.floor(Math.random() * 5) + 1;
        }
        if (this.equippedItems.armor) {
            this.equippedItems.armor.stats.defense += Math.floor(Math.random() * 3) + 1;
        }
    }
    
    equipItem(slot, item) {
        if (this.equippedItems[slot]) {
            // Unequip previous item
            this.equippedItems[slot] = null;
        }
        this.equippedItems[slot] = item;
        
        // Apply item stats
        if (item && item.stats) {
            this.maxHP += item.stats.hp || 0;
            this.maxMP += item.stats.mp || 0;
            this.attack += item.stats.attack || 0;
            this.defense += item.stats.defense || 0;
            this.speed += item.stats.speed || 0;
        }
    }
    
    destroy() {
        this.currentHP = 0;
        this.currentMP = 0;
        this.experience = 0;
        this.gold = 0;
        this.skills = [];
        
        // Remove equipped items
        for (let slot in this.equippedItems) {
            this.equippedItems[slot] = null;
        }
    }
}

// Export for use in other files
window.Stats = Stats;