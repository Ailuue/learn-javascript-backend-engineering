class Graph {
  constructor(numVertices) {
    this.graph = Array.from({ length: numVertices }, () =>
      new Array(numVertices).fill(false)
    );
  }

  addEdge(u, v) {
    this.graph[u][v] = true;
    this.graph[v][u] = true;
  }

  // don't touch below this line

  edgeExists(u, v) {
    if (u < 0 || u >= this.graph.length) {
      return false;
    }
    if (this.graph.length === 0) {
      return false;
    }
    const row1 = this.graph[0];
    if (v < 0 || v >= row1.length) {
      return false;
    }
    return this.graph[u][v];
  }
}

module.exports = { Graph };
