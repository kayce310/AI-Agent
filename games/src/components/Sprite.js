// Sprite component - Handles visual representation
class Sprite {
    constructor(imageSrc, spriteWidth, spriteHeight, frameCount = 1) {
        this.image = new Image();
        this.spriteWidth = spriteWidth;
        this.spriteHeight = spriteHeight;
        this.frameCount = frameCount;
        this.currentFrame = 0;
        this.animationSpeed = 0.1;
        this.animationTimer = 0;
        this.flipX = false;
        this.tint = null;
        this.visible = true;
        
        if (imageSrc) {
            this.loadImage(imageSrc);
        }
    }
    
    loadImage(src) {
        this.image.onload = () => {
            if (this.onLoaded) this.onLoaded();
        };
        this.image.src = src;
    }
    
    update(deltaTime) {
        if (this.frameCount > 1) {
            this.animationTimer += deltaTime;
            if (this.animationTimer >= this.animationSpeed) {
                this.animationTimer = 0;
                this.currentFrame = (this.currentFrame + 1) % this.frameCount;
            }
        }
    }
    
    render(ctx, transform) {
        if (!this.visible || !this.image.complete) return;
        
        ctx.save();
        
        // Apply transform
        if (transform) {
            ctx.translate(transform.x + transform.width / 2, transform.y + transform.height / 2);
            ctx.rotate(transform.rotation);
            ctx.scale(transform.scaleX, transform.scaleY);
            ctx.translate(-(transform.width / 2), -(transform.height / 2));
        }
        
        // Apply flip
        if (this.flipX) {
            ctx.scale(-1, 1);
        }
        
        // Apply tint
        if (this.tint) {
            ctx.globalCompositeOperation = 'multiply';
            ctx.fillStyle = this.tint;
            ctx.fillRect(0, 0, this.spriteWidth, this.spriteHeight);
            ctx.globalCompositeOperation = 'source-over';
        }
        
        // Draw sprite
        let sx = this.currentFrame * this.spriteWidth;
        ctx.drawImage(
            this.image,
            sx, 0, this.spriteWidth, this.spriteHeight,
            0, 0, this.spriteWidth, this.spriteHeight
        );
        
        ctx.restore();
    }
    
    destroy() {
        this.image = null;
        this.tint = null;
    }
}

// Export for use in other files
window.Sprite = Sprite;