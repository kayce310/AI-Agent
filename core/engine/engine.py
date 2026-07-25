class GameEngine:
    def __init__(self):
        self.is_running = True
        self.entities = []
        self.systems = []

    def add_system(self, system):
        self.systems.append(system)

    def run(self):
        print("Engine started...")
        while self.is_running:
            self.update()
            # self.render() # Placeholder for rendering
            break # Break for testing purposes

    def update(self):
        for system in self.systems:
            system.update()

class System:
    def update(self):
        pass