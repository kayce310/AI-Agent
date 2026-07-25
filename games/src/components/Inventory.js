// Inventory component - Handles item storage and management
class Inventory {
    constructor(capacity = 20) {
        this.capacity = capacity;
        this.items = [];
        this.equippedItems = {
            weapon: null,
            armor: null,
            ring: null
        };
        this.chest = [];
        this.equipmentSlots = ['weapon', 'armor', 'ring'];
    }
    
    addItem(item) {
        if (this.items.length >= this.capacity) {
            return false; // Inventory full
        }
        this.items.push(item);
        return true;
    }
    
    removeItem(item) {
        let index = this.items.indexOf(item);
        if (index !== -1) {
            this.items.splice(index, 1);
            return true;
        }
        return false;
    }
    
    equipItem(slot, item) {
        if (!this.equipmentSlots.includes(slot)) return false;
        
        // Unequip current item
        if (this.equippedItems[slot]) {
            this.items.push(this.equippedItems[slot]);
        }
        
        // Equip new item
        this.equippedItems[slot] = item;
        
        // Remove from inventory
        let index = this.items.indexOf(item);
        if (index !== -1) {
            this.items.splice(index, 1);
        }
        
        return true;
    }
    
    unequipItem(slot) {
        if (!this.equipmentSlots.includes(slot)) return false;
        
        if (this.equippedItems[slot]) {
            this.items.push(this.equippedItems[slot]);
            this.equippedItems[slot] = null;
            return true;
        }
        return false;
    }
    
    useItem(itemIndex) {
        if (itemIndex < 0 || itemIndex >= this.items.length) return false;
        
        let item = this.items[itemIndex];
        if (item.useEffect) {
            return item.useEffect();
        }
        return false;
    }
    
    openChest() {
        this.items = this.items.concat(this.chest);
        this.chest = [];
        return true;
    }
    
    addToChest(item) {
        this.chest.push(item);
    }
    
    getItemCount(itemType) {
        return this.items.filter(item => item.type === itemType).length;
    }
    
    hasSpace() {
        return this.items.length < this.capacity;
    }
    
    destroy() {
        this.items = [];
        this.chest = [];
        for (let slot of this.equipmentSlots) {
            this.equippedItems[slot] = null;
        }
    }
}

// Export for use in other files
window.Inventory = Inventory;