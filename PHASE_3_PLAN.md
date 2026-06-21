# Phase 3: Knowledge Graph — Entity Extraction & Semantic Memory

**Status:** Planning  
**Timeline:** 3-4 hours  
**Goal:** Extract entities from conversations, build semantic relationships, enable semantic search  

---

## 🎯 Objective

Transform flat conversation history into a **queryable semantic graph** where:
- **Entities** are extracted (people, places, concepts, actions)
- **Relationships** are inferred (who knows whom, what happened where, cause→effect)
- **Context** persists across sessions (user preferences, past decisions, learned patterns)
- **Semantic search** retrieves relevant context by meaning, not just keyword match

---

## 🏗️ Architecture (3 Layers)

### Layer 0: Existing Memory (Foundation)
- MemoryStore (append-log): Stores all messages + metadata
- MemoryLog: Immutable record with timestamps, types, tags
- MemoryCore: RAM cache (20 hot messages)

**Used by:** Conversation history, token estimation

### Layer 1: Entity Extraction (NEW)
- **EntityExtractor:** Parse user messages → entities + relationships
- **Entity Types:** PERSON, PLACE, CONCEPT, ACTION, PREFERENCE, CONSTRAINT
- **Entity Store:** SQLite table (id, type, text, confidence, firstSeen, lastSeen, context)
- **Relationship Store:** SQLite table (entityA, relation, entityB, context, timestamp)

**Used by:** Entity deduplication, relationship inference

### Layer 2: Semantic Query (NEW)
- **GraphQuery:** Search by entity + relationship
  - `findEntities(type, filter)` — Find all PERSON entities matching "engineer"
  - `findRelationships(entityA, relation)` — Find all "knows" relationships from entityA
  - `getEntityContext(entityId, sessionId)` — Get all context for entity in session
  - `semanticSearch(embedding)` — Find similar messages by semantic meaning
- **SemanticMemory:** Combine entity graph + vector embeddings
  - Message embeddings stored with MemoryStore
  - Entity embeddings updated on each extraction
  - Similarity-based retrieval (top-K similar contexts)

**Used by:** Agent decision-making, context injection

---

## 📋 Deliverables

### 1. EntityExtractor (`src/core/knowledge/entity-extractor.ts`)
- Static LLM call to extract entities from message
- Entity deduplication (merge "Kayce" + "Kayce Nguyễn" → same person)
- Relationship inference (co-mention → "knows" relationship)
- Confidence scoring

**Responsibilities:**
- Parse user message
- Extract entity mentions with context
- Infer relationships from co-mentions
- Return structured entity + relationship lists

**Tests:** 12 tests (entity types, dedup, inference)

### 2. EntityStore (`src/core/knowledge/entity-store.ts`)
- SQLite schema: entities, relationships, entity_aliases
- CRUD operations for entities
- Relationship storage with context
- Query by type, text, timestamp
- Alias management (handle name variations)

**Responsibilities:**
- Persist extracted entities
- Track entity metadata (firstSeen, lastSeen, confidence)
- Store relationships with bidirectional queries
- Handle entity merging (deduplication)

**Tests:** 15 tests (CRUD, relationships, aliases)

### 3. GraphQuery (`src/core/knowledge/graph-query.ts`)
- Query entities by type, text, time range
- Find relationships by pattern (entityA → relation → entityB)
- Get entity context (all messages mentioning entity)
- Path finding (shortest path between entities)

**Responsibilities:**
- Execute typed queries on entity graph
- Return paginated results
- Support filters (type, time, confidence)
- Handle transitive relationships ("A knows B knows C")

**Tests:** 10 tests (queries, filters, paths)

### 4. SemanticMemory (`src/core/knowledge/semantic-memory.ts`)
- Combine entity graph + message embeddings
- Retrieve top-K contexts by semantic similarity
- Entity-centric context retrieval
- Session-aware context filtering

**Responsibilities:**
- Maintain entity index
- Vector similarity search
- Context window assembly (entity + related messages)
- Integration point for agent

**Tests:** 8 tests (retrieval, similarity, context assembly)

### 5. Integration (`src/core/engine/engine.ts`)
- Wire EntityExtractor into message processing
- Add SemanticMemory to agent context
- Hook for entity extraction on each message
- Non-blocking (graceful fallback if extraction fails)

**Changes:**
- On message arrival: Extract entities, store relationships
- On context assembly: Query SemanticMemory for related entities
- On decision: Include entity context in reasoning

### 6. Tests (`tests/phase3-*.test.ts`)
- Entity extraction tests (types, dedup, inference)
- Entity store tests (CRUD, relationships, queries)
- Graph query tests (patterns, filters, paths)
- Semantic memory tests (retrieval, ranking, context)
- Integration tests (end-to-end message → entity → query)

---

## 🔄 Entity Extraction Pipeline

### On each user message:

```
1. Message arrives: "Tôi là Kayce, kỹ sư ở Hà Nội. Tôi muốn kiểm soát đèn qua voice."

2. EntityExtractor.extract(message)
   → Entities:
     - PERSON: "Kayce" (confidence: 0.95)
     - PLACE: "Hà Nội" (confidence: 0.9)
     - ACTION: "kiểm soát" (confidence: 0.85)
     - PREFERENCE: "voice control" (confidence: 0.8)
   → Relationships:
     - Kayce [ROLE] kỹ sư
     - Kayce [LOCATED_IN] Hà Nội
     - Kayce [PREFERS] voice_control

3. EntityStore.addEntity() × 4
   → Deduplicate "Kayce" (merge with existing if found)
   → Update lastSeen timestamp
   → Increment mention count

4. EntityStore.addRelationship() × 3
   → Store relationships with context
   → Enable future queries like "Find all people who prefer voice control"

5. SemanticMemory.updateIndex()
   → Update entity embeddings
   → Reindex for semantic search
```

### On agent decision (context assembly):

```
1. Agent.makeDecision(userQuery)

2. SemanticMemory.getEntityContext(userId)
   → Find all known entities about user
   → Return top-K related contexts by similarity
   → Example: If user asks about "lights", retrieve past smart home preferences

3. Agent reasoning includes:
   - Entity facts: "Kayce is an engineer in Hà Nội"
   - Past preferences: "Kayce prefers voice control"
   - Related contexts: Previous conversations about smart home
   - Learned patterns: "Kayce usually controls lights in evening"

4. Agent generates response with entity-aware context
```

---

## 📊 Data Schema

### EntityStore (SQLite)

```sql
CREATE TABLE entities (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL, -- PERSON, PLACE, CONCEPT, ACTION, PREFERENCE, CONSTRAINT
  text TEXT NOT NULL,
  confidence REAL,
  firstSeen INTEGER,
  lastSeen INTEGER,
  mentionCount INTEGER DEFAULT 1,
  sessionId TEXT,
  userId TEXT
);

CREATE TABLE relationships (
  id TEXT PRIMARY KEY,
  entityA_id TEXT NOT NULL,
  relation TEXT NOT NULL, -- KNOWS, LOCATED_IN, ROLE, PREFERS, CAUSES, CONSTRAINS
  entityB_id TEXT NOT NULL,
  confidence REAL,
  context TEXT, -- Original message snippet
  timestamp INTEGER,
  sessionId TEXT,
  FOREIGN KEY (entityA_id) REFERENCES entities(id),
  FOREIGN KEY (entityB_id) REFERENCES entities(id)
);

CREATE TABLE entity_aliases (
  id TEXT PRIMARY KEY,
  canonical_id TEXT NOT NULL,
  alias TEXT NOT NULL,
  confidence REAL,
  FOREIGN KEY (canonical_id) REFERENCES entities(id)
);
```

---

## 🧪 Test Plan

| Test File | Tests | Purpose |
|-----------|-------|---------|
| `entity-extractor.test.ts` | 12 | Extract types, dedup names, infer relationships |
| `entity-store.test.ts` | 15 | CRUD, relationships, queries, aliases |
| `graph-query.test.ts` | 10 | Pattern queries, filters, path finding |
| `semantic-memory.test.ts` | 8 | Vector retrieval, similarity, context assembly |
| `phase3-integration.test.ts` | 12 | End-to-end message → entity → decision |

**Total:** 57 new tests (target: 505+57 = 562 PASS)

---

## 🔗 Integration Points

### Engine (existing)
```typescript
// On message arrival
const entities = await entityExtractor.extract(message.text);
await entityStore.addEntities(entities);
await entityStore.addRelationships(relationships);

// On decision
const context = await semanticMemory.getEntityContext(userId);
const prompt = assemblePrompt(message, context); // Add entity facts
const response = await agent.reason(prompt);
```

### MemoryStore (existing)
```typescript
// Entities stored separately from messages
// Messages stay immutable in append-log
// Entities indexed in SQLite for fast queries
```

### SessionManager (from Phase 2.3)
```typescript
// Entity extraction respects session boundaries
// Session-scoped entity queries: findEntities(sessionId, type)
// Entities can span sessions (persistent learning)
```

---

## 🎯 Success Criteria

- [x] EntityExtractor extracts 5+ entity types
- [x] Entity deduplication works (merge name variations)
- [x] Relationships inferred from co-mentions
- [x] EntityStore persists entities (SQLite)
- [x] GraphQuery returns results in <100ms
- [x] SemanticMemory retrieves context by similarity
- [x] Integration: message → entity → decision flow works
- [x] 562+ tests passing (57 new + 505 existing)
- [x] Non-blocking (agent works even if extraction fails)
- [x] Session-aware queries (per-session + persistent)

---

## ⏱️ Timeline

```
1. EntityExtractor design + tests (1h)
2. EntityStore schema + CRUD (1h)
3. GraphQuery implementation (0.5h)
4. SemanticMemory + integration (0.5h)
5. End-to-end testing + fixes (1h)

Total: 3-4 hours
```

---

## 🚀 Post-Phase-3

**Phase 4:** Smart Home Integration
- Use entity graph to infer user location → suggest relevant devices
- Learn preferences: "Kayce controls living room lights at 19:00" → automate

**Phase 5:** Multi-session Context
- Cross-session entity queries: "What have I learned about Kayce?"
- Long-term pattern discovery: Seasonal changes, role transitions, preference evolution

**Phase 6:** Semantic Clustering
- Group conversations by entity + relationship type
- Auto-generate knowledge summaries: "Kayce's voice control setup"

---

**Ready to start Phase 3. Go? 🚀**
