// Collision System - Handles entity collision detection and resolution
class CollisionSystem {
    constructor(engine) {
        this.engine = engine;
        this.collisions = [];
    }
    
    update(deltaTime) {
        // Clear previous collisions
        this.collisions = [];
        
        // Check for collisions between entities
        for (let i = 0; i < this.engine.entities.length; i++) {
            let entityA = this.engine.entities[i];
            if (!entityA.active) continue;
            
            for (let j = i + 1; j < this.engine.entities.length; j++) {
                let entityB = this.engine.entities[j];
                if (!entityB.active) continue;
                
                // Check if entities have collision components
                let transformA = entityA.getComponent('Transform');
                let transformB = entityB.getComponent('Transform');
                let physicsA = entityA.getComponent('Physics');
                let physicsB = entityB.getComponent('Physics');
                
                if (transformA && transformB && physicsA && physicsB) {
                    // Check collision based on collision layers
                    if ((physicsA.collisionLayer & physicsB.collisionMask) || 
                        (physicsB.collisionLayer & physicsA.collisionMask)) {
                        
                        let collision = this.checkCollision(entityA, entityB, transformA, transformB);
                        if (collision) {
                            this.collisions.push(collision);
                        }
                    }
                }
            }
        }
        
        // Resolve collisions
        this.resolveCollisions(deltaTime);
    }
    
    checkCollision(entityA, entityB, transformA, transformB) {
        // Simple AABB collision detection
        let leftA = transformA.x;
        let rightA = transformA.x + transformA.width;
        let topA = transformA.y;
        let bottomA = transformA.y + transformA.height;
        
        let leftB = transformB.x;
        let rightB = transformB.x + transformB.width;
        let topB = transformB.y;
        let bottomB = transformB.y + transformB.height;
        
        if (rightA < leftB || leftA > rightB || bottomA < topB || topA > bottomB) {
            return null; // No collision
        }
        
        // Calculate collision details
        let overlapX = Math.min(rightA - leftB, rightB - leftA);
        let overlapY = Math.min(bottomA - topB, bottomB - topA);
        
        // Determine which side was hit
        let centerA = { x: transformA.x + transformA.width / 2, y: transformA.y + transformA.height / 2 };
        let centerB = { x: transformB.x + transformB.width / 2, y: transformB.y + transformB.height / 2 };
        
        let hitDirection = {
            x: centerB.x - centerA.x > 0 ? 'right' : 'left',
            y: centerB.y - centerA.y > 0 ? 'down' : 'up'
        };
        
        return {
            entityA: entityA,
            entityB: entityB,
            overlapX: overlapX,
            overlapY: overlapY,
            hitDirection: hitDirection,
            centerA: centerA,
            centerB: centerB
        };
    }
    
    resolveCollisions(deltaTime) {
        for (let collision of this.collisions) {
            let entityA = collision.entityA;
            let entityB = collision.entityB;
            let transformA = entityA.getComponent('Transform');
            let transformB = entityB.getComponent('Transform');
            let physicsA = entityA.getComponent('Physics');
            let physicsB = entityB.getComponent('Physics');
            
            // Resolve based on entity types
            if (entityA instanceof Player && entityB instanceof Enemy) {
                this.resolvePlayerEnemyCollision(collision, entityA, entityB, transformA, transformB, physicsA, physicsB);
            } else if (entityA instanceof Enemy && entityB instanceof Player) {
                this.resolvePlayerEnemyCollision(collision, entityB, entityA, transformB, transformA, physicsB, physicsA);
            } else if (entityA instanceof Item && entityB instanceof Player) {
                this.resolveItemPickupCollision(collision, entityA, entityB, transformA, transformB);
            } else if (entityA instanceof Item && entityB instanceof NPC) {
                this.resolveItemNPCCollision(collision, entityA, entityB, transformA, transformB);
            } else {
                // Default collision resolution
                this.resolveDefaultCollision(collision, transformA, transformB, physicsA, physicsB);
            }
        }
    }
    
    resolvePlayerEnemyCollision(collision, player, enemy, transformA, transformB, physicsA, physicsB) {
        // Move player away from enemy
        let pushForce = 5;
        
        if (collision.hitDirection.x === 'left') {
            transformA.x -= collision.overlapX * pushForce;
        } else {
            transformA.x += collision.overlapX * pushForce;
        }
        
        if (collision.hitDirection.y === 'up') {
            transformA.y -= collision.overlapY * pushForce;
        } else {
            transformA.y += collision.overlapY * pushForce;
        }
        
        // Apply damage if player is close enough
        let distance = Math.sqrt(
            Math.pow(player.transform.x - enemy.transform.x, 2) + 
            Math.pow(player.transform.y - enemy.transform.y, 2)
        );
        
        if (distance < 60) {
            let enemyStats = enemy.getComponent('Stats');
            if (enemyStats) {
                let playerDefeated = enemyStats.takeDamage(5);
                if (playerDefeated) {
                    console.log('Player defeated!');
                }
            }
        }
    }
    
    resolveItemPickupCollision(collision, item, player, transformA, transformB) {
        // Player picked up item
        let playerStats = player.getComponent('Stats');
        let playerInventory = player.getComponent('Inventory');
        
        if (playerStats && playerInventory) {
            // Add item to inventory
            playerInventory.addItem(item.itemData);
            
            // Remove item from game
            this.engine.removeEntity(item);
        }
    }
    
    resolveItemNPCCollision(collision, item, npc, transformA, transformB) {
        // Item traded with NPC
        console.log(`${npc.name} traded with player for item`);
        
        // Remove item from game
        this.engine.removeEntity(item);
    }
    
    resolveDefaultCollision(collision, transformA, transformB, physicsA, physicsB) {
        // Simple elastic collision
        let relativeVelocityX = physicsA.velocity.x - physicsB.velocity.x;
        let relativeVelocityY = physicsA.velocity.y - physicsB.velocity.y;
        
        let normalX = collision.centerB.x - collision.centerA.x;
        let normalY = collision.centerB.y - collision.centerA.y;
        let distance = Math.sqrt(normalX * normalX + normalY * normalY);
        
        if (distance > 0) {
            normalX /= distance;
            normalY /= distance;
            
            let velocityAlongNormal = relativeVelocityX * normalX + relativeVelocityY * normalY;
            
            if (velocityAlongNormal > 0) return; // Moving away from each other
            
            let impulse = 2 * velocityAlongNormal / (physicsA.mass + physicsB.mass);
            
            physicsA.velocity.x -= impulse * physicsB.mass * normalX;
            physicsA.velocity.y -= impulse * physicsB.mass * normalY;
            physicsB.velocity.x += impulse * physicsA.mass * normalX;
            physicsB.velocity.y += impulse * physicsA.mass * normalY;
        }
    }
}

// Export for use in other files
window.CollisionSystem = CollisionSystem;