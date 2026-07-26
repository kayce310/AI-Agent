import time
import pygame

class GameEngine:
    def __init__(self, width=800, height=600, title="2D Pixel RPG"):
        # Initialize pygame
        pygame.init()
        
        # Create display surface
        self.screen = pygame.display.set_mode((width, height))
        pygame.display.set_caption(title)
        
        # Game state
        self.is_running = False
        self.is_paused = False
        
        # Timing
        self.clock = pygame.time.Clock()
        self.delta_time = 0
        self.target_fps = 60
        self.last_time = time.time()
        
        # Entities and systems
        self.entities = []
        self.systems = []
        
        # Input handling
        self.keys = {}
        self.mouse_pos = (0, 0)
        self.mouse_buttons = {}
        
        # Performance tracking
        self.frame_count = 0
        self.fps = 0
        self.last_fps_time = time.time()

    def add_system(self, system):
        self.systems.append(system)

    def start(self):
        """Start the game loop"""
        self.is_running = True
        self.last_time = time.time()
        
        while self.is_running:
            self.handle_events()
            self.update()
            self.render()
            
            # Cap the frame rate
            self.delta_time = self.clock.tick(self.target_fps) / 1000.0
            
            # Update FPS counter
            self.frame_count += 1
            current_time = time.time()
            if current_time - self.last_fps_time >= 1.0:
                self.fps = self.frame_count
                self.frame_count = 0
                self.last_fps_time = current_time

    def handle_events(self):
        """Handle pygame events"""
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                self.is_running = False
            elif event.type == pygame.KEYDOWN:
                self.keys[event.key] = True
            elif event.type == pygame.KEYUP:
                self.keys[event.key] = False
            elif event.type == pygame.MOUSEBUTTONDOWN:
                self.mouse_buttons[event.button] = True
            elif event.type == pygame.MOUSEBUTTONUP:
                self.mouse_buttons[event.button] = False
        
        # Get mouse position
        self.mouse_pos = pygame.mouse.get_pos()

    def update(self):
        """Update all systems"""
        if self.is_paused:
            return
            
        for system in self.systems:
            system.update(self.delta_time, self)

    def render(self):
        """Render everything"""
        # Clear screen with dark background
        self.screen.fill((20, 20, 40))
        
        # Render all entities
        for entity in self.entities:
            entity.render(self.screen)
        
        # Draw debug info
        self.draw_debug_info()
        
        # Update display
        pygame.display.flip()

    def draw_debug_info(self):
        """Draw debug information"""
        font = pygame.font.Font(None, 24)
        
        # Draw FPS
        fps_text = font.render(f"FPS: {self.fps}", True, (255, 255, 255))
        self.screen.blit(fps_text, (10, 10))
        
        # Draw delta time
        dt_text = font.render(f"Delta Time: {self.delta_time:.4f}", True, (255, 255, 255))
        self.screen.blit(dt_text, (10, 40))
        
        # Draw entity count
        entity_text = font.render(f"Entities: {len(self.entities)}", True, (255, 255, 255))
        self.screen.blit(entity_text, (10, 70))

    def stop(self):
        """Stop the game"""
        self.is_running = False

    def pause(self):
        """Pause the game"""
        self.is_paused = True

    def resume(self):
        """Resume the game"""
        self.is_paused = False

    def add_entity(self, entity):
        """Add an entity to the engine"""
        self.entities.append(entity)

    def remove_entity(self, entity):
        """Remove an entity from the engine"""
        if entity in self.entities:
            self.entities.remove(entity)

    def get_entity_by_id(self, entity_id):
        """Get an entity by its ID"""
        for entity in self.entities:
            if entity.id == entity_id:
                return entity
        return None

    def cleanup(self):
        """Clean up resources"""
        self.entities.clear()
        self.systems.clear()
        pygame.quit()

class System:
    def update(self, delta_time, engine):
        """Update the system"""
        pass