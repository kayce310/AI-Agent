// Transform component - Handles position, rotation, and scale
class Transform {
    constructor(x = 0, y = 0, width = 0, height = 0, rotation = 0, scaleX = 1, scaleY = 1) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.rotation = rotation;
        this.scaleX = scaleX;
        this.scaleY = scaleY;
        this.position = { x, y };
        this.previousPosition = { x, y };
        this.velocity = { x: 0, y: 0 };
        this.acceleration = { x: 0, y: 0 };
    }
    
    update(deltaTime) {
        // Update position based on velocity
        this.previousPosition.x = this.x;
        this.previousPosition.y = this.y;
        this.x += this.velocity.x * deltaTime;
        this.y += this.velocity.y * deltaTime;
        
        // Apply acceleration
        this.velocity.x += this.acceleration.x * deltaTime;
        this.velocity.y += this.acceleration.y * deltaTime;
        
        // Update position object
        this.position.x = this.x;
        this.position.y = this.y;
    }
    
    render(ctx) {
        // Transform context for this entity
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(this.rotation);
        ctx.scale(this.scaleX, this.scaleY);
        ctx.translate(-(this.width / 2), -(this.height / 2));
    }
    
    destroy() {
        // Clean up transform
        this.x = 0;
        this.y = 0;
        this.velocity.x = 0;
        this.velocity.y = 0;
        this.acceleration.x = 0;
        this.acceleration.y = 0;
    }
}

// Export for use in other files
window.Transform = Transform;