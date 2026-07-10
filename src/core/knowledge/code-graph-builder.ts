/**
 * @file Code Graph Builder — Parse source code into knowledge graph
 * @layer core
 * @created 2026-06-27
 * 
 * Inspired by codebase-memory-mcp's approach but simplified for AI-Agent:
 * - Parse TypeScript/JavaScript files using regex (no tree-sitter dependency)
 * - Extract: Functions, Classes, Interfaces, Exports, Imports
 * - Build: CALLS, IMPORTS, DEFINES edges
 * - Store: In-memory graph
 */

export interface CodeNode {
  id: string;
  label: string;        // Function, Class, Interface, File, Module
  name: string;
  qualifiedName: string;
  filePath: string;
  startLine: number;
  endLine: number;
  isExported: boolean;
}

export interface CodeEdge {
  source: string;
  target: string;
  type: 'CALLS' | 'IMPORTS' | 'DEFINES' | 'IMPLEMENTS' | 'INHERITS';
}

export interface CodeGraph {
  nodes: CodeNode[];
  edges: CodeEdge[];
}

/**
 * Parse TypeScript/JavaScript source code and extract graph
 */
export function parseSourceFile(filePath: string, content: string): { nodes: CodeNode[]; edges: CodeEdge[] } {
  const nodes: CodeNode[] = [];
  const edges: CodeEdge[] = [];
  const lines = content.split('\n');
  
  // Relative path for IDs
  const relPath = filePath.replace(/^.*[\\/]src[\\/]/, 'src/').replace(/\.(ts|js)$/, '');
  const fileId = relPath.replace(/[\\/]/g, '.');
  
  // Add file node
  nodes.push({
    id: fileId,
    label: 'File',
    name: filePath.split('/').pop() || filePath,
    qualifiedName: relPath,
    filePath: relPath,
    startLine: 1,
    endLine: lines.length,
    isExported: false,
  });

  // Track current class/interface for DEFINES edges
  let currentClass: string | null = null;
  let braceDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    
    // Track brace depth
    for (const ch of line) {
      if (ch === '{') braceDepth++;
      if (ch === '}') braceDepth--;
    }

    // Match exported class
    const classMatch = line.match(/^export\s+(?:default\s+)?(?:abstract\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([\w,\s]+))?\s*\{?/);
    if (classMatch) {
      const className = classMatch[1];
      const extendsClass = classMatch[2];
      const implementsClasses = classMatch[3];
      const classId = `${fileId}.${className}`;
      
      nodes.push({
        id: classId,
        label: 'Class',
        name: className,
        qualifiedName: `${relPath}.${className}`,
        filePath: relPath,
        startLine: lineNum,
        endLine: lineNum,
        isExported: true,
      });

      // DEFINES edge from file
      edges.push({ source: fileId, target: classId, type: 'DEFINES' });

      // INHERITS edge
      if (extendsClass) {
        edges.push({ source: classId, target: extendsClass, type: 'INHERITS' });
      }

      // IMPLEMENTS edge
      if (implementsClasses) {
        const interfaces = implementsClasses.split(',').map(s => s.trim());
        for (const iface of interfaces) {
          edges.push({ source: classId, target: iface, type: 'IMPLEMENTS' });
        }
      }

      currentClass = classId;
      continue;
    }

    // Match exported interface
    const ifaceMatch = line.match(/^export\s+interface\s+(\w+)(?:\s+extends\s+([\w,\s]+))?\s*\{?/);
    if (ifaceMatch) {
      const ifaceName = ifaceMatch[1];
      const ifaceId = `${fileId}.${ifaceName}`;
      
      nodes.push({
        id: ifaceId,
        label: 'Interface',
        name: ifaceName,
        qualifiedName: `${relPath}.${ifaceName}`,
        filePath: relPath,
        startLine: lineNum,
        endLine: lineNum,
        isExported: true,
      });

      edges.push({ source: fileId, target: ifaceId, type: 'DEFINES' });
      continue;
    }

    // Match exported function
    const funcMatch = line.match(/^export\s+(?:async\s+)?function\s+(\w+)/);
    if (funcMatch) {
      const funcName = funcMatch[1];
      const funcId = currentClass ? `${currentClass}.${funcName}` : `${fileId}.${funcName}`;
      
      nodes.push({
        id: funcId,
        label: 'Function',
        name: funcName,
        qualifiedName: `${relPath}.${currentClass ? currentClass.split('.').pop() + '.' : ''}${funcName}`,
        filePath: relPath,
        startLine: lineNum,
        endLine: lineNum,
        isExported: true,
      });

      if (currentClass) {
        edges.push({ source: currentClass, target: funcId, type: 'DEFINES' });
      } else {
        edges.push({ source: fileId, target: funcId, type: 'DEFINES' });
      }
      continue;
    }

    // Match function in class (method) - indented or async
    const methodMatch = line.match(/^\s+(?:async\s+)?(\w+)\s*\(([^)]*)\)\s*(?:=>|{)/);
    if (methodMatch && currentClass) {
      const methodName = methodMatch[1];
      // Skip keywords
      if (!['if', 'for', 'while', 'switch', 'catch', 'return', 'new', 'throw', 'try', 'else'].includes(methodName)) {
        const methodId = `${currentClass}.${methodName}`;
        
        if (!nodes.find(n => n.id === methodId)) {
          nodes.push({
            id: methodId,
            label: 'Method',
            name: methodName,
            qualifiedName: `${relPath}.${currentClass.split('.').pop()}.${methodName}`,
            filePath: relPath,
            startLine: lineNum,
            endLine: lineNum,
            isExported: false,
          });

          edges.push({ source: currentClass, target: methodId, type: 'DEFINES' });
        }
      }
      continue;
    }

    // Match exported const/let/var (treat as variables)
    const varMatch = line.match(/^export\s+(?:const|let|var)\s+(\w+)/);
    if (varMatch) {
      const varName = varMatch[1];
      const varId = `${fileId}.${varName}`;
      
      nodes.push({
        id: varId,
        label: 'Variable',
        name: varName,
        qualifiedName: `${relPath}.${varName}`,
        filePath: relPath,
        startLine: lineNum,
        endLine: lineNum,
        isExported: true,
      });

      edges.push({ source: fileId, target: varId, type: 'DEFINES' });
      continue;
    }

    // Match imports
    const importMatch = line.match(/^import\s+(?:{([^}]+)}|(\w+))\s+from\s+['"]([^'"]+)['"]/);
    if (importMatch) {
      const namedImports = importMatch[1];
      const defaultImport = importMatch[2];
      const importPath = importMatch[3];

      if (namedImports) {
        const imports = namedImports.split(',').map(s => s.trim().split(/\s+as\s+/)[0].trim());
        for (const imp of imports) {
          edges.push({ source: fileId, target: importPath, type: 'IMPORTS' });
        }
      }
      if (defaultImport) {
        edges.push({ source: fileId, target: importPath, type: 'IMPORTS' });
      }
      continue;
    }

    // Match method definitions inside classes
    const methodDefMatch = line.match(/^\s+(?:async\s+)?(\w+)\s*\([^)]*\)\s*{/);
    if (methodDefMatch && currentClass) {
      const methodName = methodDefMatch[1];
      // Skip common non-method patterns
      if (['if', 'for', 'while', 'switch', 'catch', 'return', 'new'].includes(methodName)) continue;
      
      const methodId = `${currentClass}.${methodName}`;
      
      // Check if method already added
      if (!nodes.find(n => n.id === methodId)) {
        nodes.push({
          id: methodId,
          label: 'Method',
          name: methodName,
          qualifiedName: `${relPath}.${currentClass.split('.').pop()}.${methodName}`,
          filePath: relPath,
          startLine: lineNum,
          endLine: lineNum,
          isExported: false,
        });

        edges.push({ source: currentClass, target: methodId, type: 'DEFINES' });
      }
    }
  }

  return { nodes, edges };
}

/**
 * Build CALLS edges by finding function calls in source
 */
export function buildCallsEdges(content: string, nodes: CodeNode[], filePath: string): CodeEdge[] {
  const edges: CodeEdge[] = [];
  const lines = content.split('\n');
  const relPath = filePath.replace(/^.*[\\/]src[\\/]/, 'src/').replace(/\.(ts|js)$/, '');
  const fileId = relPath.replace(/[\\/]/g, '.');

  // Get all function/method names
  const callableNames = nodes
    .filter(n => n.label === 'Function' || n.label === 'Method')
    .map(n => n.name);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Find function calls: name( or name.call( etc
    for (const name of callableNames) {
      // Match function calls but not definitions
      const callRegex = new RegExp(`\\b${name}\\s*\\(`);
      const defRegex = new RegExp(`(?:function|${name}\\s*=\\s*(?:async\\s+)?(?:function|\\(\\))`);
      
      if (callRegex.test(line) && !defRegex.test(line)) {
        // Find which function/method contains this call
        let callerId = fileId;
        for (const node of nodes) {
          if ((node.label === 'Function' || node.label === 'Method') && 
              node.filePath === relPath &&
              i + 1 >= node.startLine && 
              i + 1 <= (node.endLine || node.startLine + 50)) {
            callerId = node.id;
            break;
          }
        }

        // Find callee
        const callee = nodes.find(n => n.name === name && n.filePath === relPath);
        if (callee && callerId !== callee.id) {
          // Avoid duplicate edges
          if (!edges.find(e => e.source === callerId && e.target === callee.id && e.type === 'CALLS')) {
            edges.push({ source: callerId, target: callee.id, type: 'CALLS' });
          }
        }
      }
    }
  }

  return edges;
}

/**
 * Scan directory and build complete code graph
 */
export async function scanCodebase(rootPath: string): Promise<CodeGraph> {
  const fs = await import('fs');
  const path = await import('path');
  
  const allNodes: CodeNode[] = [];
  const allEdges: CodeEdge[] = [];

  async function scanDir(dirPath: string) {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        // Skip node_modules, .git, dist, etc
        if (['node_modules', '.git', 'dist', 'build', '.next', 'coverage', 'test-bank'].includes(entry.name)) {
          continue;
        }
        await scanDir(fullPath);
      } else if (entry.isFile() && /\.(ts|js)$/.test(entry.name)) {
        try {
          const content = await fs.promises.readFile(fullPath, 'utf-8');
          const { nodes, edges } = parseSourceFile(fullPath, content);
          
          // Build CALLS edges
          const callsEdges = buildCallsEdges(content, nodes, fullPath);
          
          allNodes.push(...nodes);
          allEdges.push(...edges, ...callsEdges);
        } catch (err) {
          // Skip files that can't be read
        }
      }
    }
  }

  await scanDir(rootPath);

  // Deduplicate edges
  const uniqueEdges = allEdges.filter((edge, index, self) =>
    index === self.findIndex(e => e.source === edge.source && e.target === edge.target && e.type === edge.type)
  );

  return { nodes: allNodes, edges: uniqueEdges };
}
