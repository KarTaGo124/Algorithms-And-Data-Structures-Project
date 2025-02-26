// =========== suffixTree.js ===========

/**
 * Node class representing a single node in the suffix tree.
 */
class Node {
  constructor(start, end) {
    this.start = start;
    this.end = end;
    this.children = new Array(27).fill(null); // 26 letras + '$'
    this.suffixLink = null;
    this.suffixIndex = -1; // Para hojas
  }

  /**
   * Retorna la longitud de la arista desde el padre hasta este nodo.
   * Si 'end' es null, se usa currentLeafEnd para hojas.
   */
  edgeLength(currentLeafEnd) {
    const realEnd = (typeof this.end === 'number') ? this.end : currentLeafEnd;
    return realEnd - this.start + 1;
  }
}

export class SuffixTree {
  constructor(text) {
    this.text = text;
    this.size = text.length;
    this.root = null;

    // Puntos activos de Ukkonen
    this.activeNode = null;
    this.activeEdge = -1;
    this.activeLength = 0;
    this.remainingSuffixCount = 0;
    this.leafEnd = -1;
    this.lastCreatedNode = null;

    // Instantáneas (paso a paso)
    this.steps = [];

    // Construir el árbol paso a paso
    this.buildSuffixTreeStepByStep();

    // Asignar índices de sufijo tras la construcción completa
    this.setSuffixIndexByDFS(this.root, 0);
  }

  // --------------------------
  // (1) Construcción paso a paso
  // --------------------------
  buildSuffixTreeStepByStep() {
    this.root = new Node(-1, -1);
    this.activeNode = this.root;
    this.leafEnd = -1;
    this.remainingSuffixCount = 0;
    this.activeLength = 0;
    this.lastCreatedNode = null;

    for (let i = 0; i < this.size; i++) {
      this.extendSuffixTree(i);
      // Guardar snapshot tras insertar cada carácter
      // IMPORTANTE: también guardamos el leafEnd de este paso
      this.recordStep(i, `Extended with '${this.text[i]}' (i=${i})`, this.leafEnd);
    }
  }

  extendSuffixTree(pos) {
    this.leafEnd = pos;
    this.remainingSuffixCount++;
    this.lastCreatedNode = null;

    while (this.remainingSuffixCount > 0) {
      if (this.activeLength === 0) {
        this.activeEdge = pos;
      }

      const edgeIndex = this.charToIndex(this.text[this.activeEdge]);
      if (!this.activeNode.children[edgeIndex]) {
        // Crear nueva hoja
        this.activeNode.children[edgeIndex] = new Node(pos, null);

        if (this.lastCreatedNode) {
          this.lastCreatedNode.suffixLink = this.activeNode;
          this.lastCreatedNode = null;
        }
      } else {
        // Existe una arista
        const nextNode = this.activeNode.children[edgeIndex];
        if (this.walkDown(nextNode)) {
          continue;
        }
        const nextChar = this.text[nextNode.start + this.activeLength];
        if (nextChar === this.text[pos]) {
          if (this.lastCreatedNode && this.activeNode !== this.root) {
            this.lastCreatedNode.suffixLink = this.activeNode;
            this.lastCreatedNode = null;
          }
          this.activeLength++;
          break;
        }
        // Dividir la arista
        const splitEnd = nextNode.start + this.activeLength - 1;
        const splitNode = new Node(nextNode.start, splitEnd);
        this.activeNode.children[edgeIndex] = splitNode;

        // Nueva hoja
        const leafIndex = this.charToIndex(this.text[pos]);
        splitNode.children[leafIndex] = new Node(pos, null);

        nextNode.start += this.activeLength;
        const nextIndex = this.charToIndex(this.text[nextNode.start]);
        splitNode.children[nextIndex] = nextNode;

        if (this.lastCreatedNode) {
          this.lastCreatedNode.suffixLink = splitNode;
        }
        this.lastCreatedNode = splitNode;
      }

      this.remainingSuffixCount--;
      if (this.activeNode === this.root && this.activeLength > 0) {
        this.activeLength--;
        this.activeEdge = pos - this.remainingSuffixCount + 1;
      } else if (this.activeNode !== this.root) {
        this.activeNode = this.activeNode.suffixLink || this.root;
      }
    }
  }

  walkDown(node) {
    const edgeLen = node.edgeLength(this.leafEnd);
    if (this.activeLength >= edgeLen) {
      this.activeEdge += edgeLen;
      this.activeLength -= edgeLen;
      this.activeNode = node;
      return true;
    }
    return false;
  }

  charToIndex(c) {
    if (c === '$') return 26;
    return c.charCodeAt(0) - 'A'.charCodeAt(0);
  }

  /**
   * Registra un paso (snapshot) del árbol.
   * Ahora también guardamos la versión local de leafEnd (leafEndSnapshot).
   */
  recordStep(pos, message, leafEndSnapshot) {
    this.steps.push({
      pos,
      message,
      snapshotRoot: this.cloneTreeWithSuffixLinks(this.root),
      activeNodeStart: this.activeNode.start,
      activeEdge: this.activeEdge,
      activeLength: this.activeLength,
      remainder: this.remainingSuffixCount,
      leafEndSnapshot
    });
  }

  // Clona el árbol y actualiza suffix links
  cloneTreeWithSuffixLinks(node) {
    const map = new Map();
    const clonedRoot = this._cloneNodeHelper(node, map);
    for (let [orig, clone] of map.entries()) {
      if (orig.suffixLink) {
        clone.suffixLink = map.get(orig.suffixLink) || null;
      }
    }
    return clonedRoot;
  }

  _cloneNodeHelper(node, map) {
    if (!node) return null;
    const newNode = new Node(node.start, node.end);
    map.set(node, newNode);
    newNode.suffixIndex = node.suffixIndex;
    for (let i = 0; i < 27; i++) {
      if (node.children[i]) {
        newNode.children[i] = this._cloneNodeHelper(node.children[i], map);
      }
    }
    return newNode;
  }

  setSuffixIndexByDFS(node, labelHeight) {
    if (!node) return;
    let isLeaf = true;
    for (let i = 0; i < 27; i++) {
      if (node.children[i]) {
        isLeaf = false;
        const edgeLen = node.children[i].edgeLength(this.leafEnd);
        this.setSuffixIndexByDFS(node.children[i], labelHeight + edgeLen);
      }
    }
    if (isLeaf) {
      node.suffixIndex = this.size - labelHeight;
    }
  }

  // --------------------------
  // (2) Operaciones
  // --------------------------
  search(pattern) {
    let current = this.root;
    let pos = 0;
    while (pos < pattern.length) {
      const idx = this.charToIndex(pattern[pos]);
      if (!current.children[idx]) {
        return false;
      }
      const child = current.children[idx];
      const edgeLen = child.edgeLength(this.leafEnd);
      let i = 0;
      while (i < edgeLen && pos < pattern.length) {
        if (this.text[child.start + i] !== pattern[pos]) {
          return false;
        }
        i++;
        pos++;
      }
      current = child;
    }
    return true;
  }

  findAllMatches(pattern) {
    const node = this._findNode(pattern);
    if (!node) return [];
    const result = [];
    this._collectLeafIndices(node, result);
    result.sort((a, b) => a - b);
    return result;
  }

  _findNode(pattern) {
    let current = this.root;
    let pos = 0;
    while (pos < pattern.length) {
      const idx = this.charToIndex(pattern[pos]);
      if (!current.children[idx]) return null;
      const child = current.children[idx];
      const edgeLen = child.edgeLength(this.leafEnd);
      let i = 0;
      while (i < edgeLen && pos < pattern.length) {
        if (this.text[child.start + i] !== pattern[pos]) {
          return null;
        }
        i++;
        pos++;
      }
      current = child;
    }
    return current;
  }

  _collectLeafIndices(node, arr) {
    let isLeaf = true;
    for (let i = 0; i < 27; i++) {
      if (node.children[i]) {
        isLeaf = false;
        this._collectLeafIndices(node.children[i], arr);
      }
    }
    if (isLeaf && node.suffixIndex !== -1) {
      arr.push(node.suffixIndex);
    }
  }

  longestRepeatedSubstring() {
    let lrs = "";
    const self = this;
    function dfs(node, path) {
      if (!node) return;
      let childCount = 0;
      for (let i = 0; i < 27; i++) {
        if (node.children[i]) childCount++;
      }
      if (childCount >= 2 && path.length > lrs.length) {
        lrs = path;
      }
      for (let i = 0; i < 27; i++) {
        const child = node.children[i];
        if (child) {
          const edgeLen = child.edgeLength(self.leafEnd);
          const edgeStr = self.text.substring(child.start, child.start + edgeLen);
          dfs(child, path + edgeStr);
        }
      }
    }
    dfs(this.root, "");
    return lrs;
  }

  shortestUniqueSubstring() {
    const n = this.size;
    for (let len = 1; len <= n; len++) {
      let candidates = [];
      for (let i = 0; i <= n - len; i++) {
        const candidate = this.text.substring(i, i + len);
        if (candidate.includes('$')) continue;
        const occ = this.findAllMatches(candidate);
        if (occ.length === 1) {
          candidates.push(candidate);
        }
      }
      if (candidates.length > 0) {
        candidates.sort();
        return candidates[0];
      }
    }
    return "";
  }
}
