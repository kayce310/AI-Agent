# Compact Tool Definitions

Tối ưu token bằng cách chỉ định params bắt buộc.

## Core Tools

### read_file
```json
{ "name": "read_file", "params": ["path"] }
```

### write_wiki_page  
```json
{ "name": "write_wiki_page", "params": ["path", "content", "tags"] }
```

### search_knowledge_graph
```json
{ "name": "search_knowledge_graph", "params": ["keyword"] }
```

### list_directory
```json
{ "name": "list_directory", "params": ["path"] }
```

## State Management

### kato-state-manager
```json
{ "name": "kato-state-manager", "params": ["action"], "actions": ["init", "read", "update", "scan", "mark"] }
```

## Document Processing

### archive_document
```json
{ "name": "archive_document", "params": ["path", "topic"] }
```

## Usage
Chỉ truyền params bắt buộc, bỏ qua description để giảm token.

---
#tools #optimization #token-budget