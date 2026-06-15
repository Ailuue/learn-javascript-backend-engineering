class Graph {
  constructor() {
    this.graph = new Map();
  }

  addEdge(u, v) {
    if (!this.graph.has(u)) {
      this.graph.set(u, new Set());
    }
    if (!this.graph.has(v)) {
      this.graph.set(v, new Set());
    }
    this.graph.get(u).add(v);
    this.graph.get(v).add(u);
  }

  adjacentNodes(node) {
    if (!this.graph.has(node)) {
      return null;
    }
    return this.graph.get(node);
  }

  unconnectedVertices() {
    const unconnected = [];
    for (const [key, neighbors] of this.graph) {
      if (neighbors.size === 0) {
        unconnected.push(key);
      }
    }
    return unconnected;
  }

  edgeExists(u, v) {
    if (this.graph.has(u) && this.graph.has(v)) {
      return this.graph.get(u).has(v) && this.graph.get(v).has(u);
    }
    return false;
  }

  breadthFirstSearch(v) {
    if (!this.graph.has(v)) {
      return [];
    }
    const visited = [];
    const explore = [v];
    while (explore.length > 0) {
      const node = explore.shift();
      if (visited.includes(node)) {
        continue;
      }
      visited.push(node);
      for (const neighbor of [...this.graph.get(node)].sort((a, b) => a - b)) {
        if (!visited.includes(neighbor)) {
          explore.push(neighbor);
        }
      }
    }
    return visited;
  }

  depthFirstSearch(startVertex) {
    const visited = [];
    this.depthFirstSearchR(visited, startVertex);
    return visited;
  }

  depthFirstSearchR(visited, currentVertex) {
    visited.push(currentVertex);
    for (const neighbor of [...this.graph.get(currentVertex)].sort((a, b) => a - b)) {
      if (!visited.includes(neighbor)) {
        this.depthFirstSearchR(visited, neighbor);
      }
    }
  }
}

module.exports = { Graph };
