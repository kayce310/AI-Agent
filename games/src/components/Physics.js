// Physics component - Handles physics simulation
class Physics {
    constructor(mass = 1, velocityX = 0, velocityY = 0, gravity = 0, friction = 0.1) {
        this.mass = mass;
        this.velocity = { x: velocityX, y: velocityY };
        this.acceleration = { x: 0, y: 0 };
        this.gravity = gravity;
        this.friction = friction;
        this.isStatic = false;
        this.restitution = 0.5; // Bounciness
        this.collisionLayer = 1;
        this.collisionMask = -1; // Collide with all layers
    }
    
    update(deltaTime) {
        // Apply gravity
        if (!this.isStatic) {
            this.acceleration.y += this.gravity;
            
            // Update velocity
            this.velocity.x += this.acceleration.x * deltaTime;
            this.velocity.y += this.acceleration.y * deltaTime;
            
            // Apply friction
            if (this.velocity.x !== 0) {
                this.velocity.x *= (1 - this.friction * deltaTime);
            }
            if (this.velocity.y !== 0) {
                this.velocity.y *= (1 - this.friction * deltaTime);
            }
        }
    }
    
    applyForce(forceX, forceY) {
        this.acceleration.x += forceX / this.mass;
        this.acceleration.y += forceY / this.mass;
    }
    
    setVelocity(x, y) {
        this.velocity.x = x;
        this.velocity.y = y;
    }
    
    addVelocity(dx, dy) {
        this.velocity.x += dx;
        this.velocity.y += dy;
    }
    
    destroy() {
        this.velocity.x = 0;
        this.velocity.y = 0;
        this.acceleration.x = 0;
        this.acceleration.y = 0;
    }
}

// Export for use in other files
window.Physics = Physics;