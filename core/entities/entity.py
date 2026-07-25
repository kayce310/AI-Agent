class Entity:
    def __init__(self, entity_id, x, y):
        self.id = entity_id
        self.x = x
        self.y = y
        self.components = {}

    def add_component(self, component):
        self.components[type(component)] = component

    def get_component(self, component_type):
        return self.components.get(component_type)