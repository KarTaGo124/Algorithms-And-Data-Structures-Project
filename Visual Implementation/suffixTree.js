// =========== suffixTree.js ===========

/**
 * Node class representing a single node in the suffix tree.
 * Similar to your C++ Node structure, but adapted to JS.
 */
class Node {
    constructor(start, end) {
      this.start = start;            // Index of the substring start in text
      this.end = end;                // If it's a leaf, may be a global reference (null) or number
      this.children = new Array(27).fill(null); // 26 letters + '$'
      this.suffixLink = null;
      this.suffixIndex = -1;         // For leaves
    }
  
    /**
     * Returns the length of the edge from parent->this node.
     * If 'end' is null or not a simple number, we fall back to currentLeafEnd for leaves.
     */
    edgeLength(currentLeafEnd) {
      const realEnd = (typeof this.end === 'number') ? this.end : currentLeafEnd;
      return realEnd - this.start + 1;
    }
  }
  
  /**
   * SuffixTree class implementing Ukkonen's algorithm step by step.
   */
  export class SuffixTree {
    constructor(text) {
      this.text = text;            // The input text (with '$' at the end)
      this.size = text.length;     
      this.root = null;
  
      // Ukkonen's active points
      this.activeNode = null;
      this.activeEdge = -1;
      this.activeLength = 0;
      this.remainingSuffixCount = 0;
      this.leafEnd = -1;
      this.lastCreatedNode = null;
  
      // For step-by-step snapshots
      this.steps = [];
      this.currentStepIndex = 0;
  
      // Build and record snapshots
      this.buildSuffixTreeStepByStep();
  
      // Assign suffixIndex to leaves after the full build
      this.setSuffixIndexByDFS(this.root, 0);
    }
  
    // --------------------------
    // (1) Build Step-by-Step
    // --------------------------
  
    /**
     * Builds the suffix tree using Ukkonen's algorithm,
     * recording each extension as a separate step.
     */
    buildSuffixTreeStepByStep() {
      // Create the root node
      this.root = new Node(-1, -1);
      this.activeNode = this.root;
      this.leafEnd = -1;
      this.remainingSuffixCount = 0;
      this.activeLength = 0;
      this.lastCreatedNode = null;
  
      // Insert each character one by one
      for (let i = 0; i < this.size; i++) {
        this.extendSuffixTree(i);
        this.recordStep(`Extended with '${this.text[i]}' (i=${i})`);
      }
    }
  
    /**
     * Ukkonen's extension for position 'pos'.
     */
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
          // Rule 2: Create a new leaf node
          this.activeNode.children[edgeIndex] = new Node(pos, null);
  
          // If there was a node waiting for a suffix link, link it
          if (this.lastCreatedNode) {
            this.lastCreatedNode.suffixLink = this.activeNode;
            this.lastCreatedNode = null;
          }
        } else {
          // There's an existing edge from activeNode
          const nextNode = this.activeNode.children[edgeIndex];
          if (this.walkDown(nextNode)) {
            continue;
          }
          // If the next character is the same as text[pos], just increment activeLength
          const nextChar = this.text[nextNode.start + this.activeLength];
          if (nextChar === this.text[pos]) {
            if (this.lastCreatedNode && this.activeNode !== this.root) {
              this.lastCreatedNode.suffixLink = this.activeNode;
              this.lastCreatedNode = null;
            }
            this.activeLength++;
            break;
          }
  
          // Otherwise, split the edge
          const splitEnd = nextNode.start + this.activeLength - 1;
          const splitNode = new Node(nextNode.start, splitEnd);
          this.activeNode.children[edgeIndex] = splitNode;
  
          // Create a new leaf for the new character
          const leafIndex = this.charToIndex(this.text[pos]);
          splitNode.children[leafIndex] = new Node(pos, null);
  
          // Adjust the old edge
          nextNode.start += this.activeLength;
          const nextIndex = this.charToIndex(this.text[nextNode.start]);
          splitNode.children[nextIndex] = nextNode;
  
          if (this.lastCreatedNode) {
            this.lastCreatedNode.suffixLink = splitNode;
          }
          this.lastCreatedNode = splitNode;
        }
  
        // Decrement the remaining suffix count
        this.remainingSuffixCount--;
        if (this.activeNode === this.root && this.activeLength > 0) {
          this.activeLength--;
          this.activeEdge = pos - this.remainingSuffixCount + 1;
        } else if (this.activeNode !== this.root) {
          this.activeNode = this.activeNode.suffixLink || this.root;
        }
      }
    }
  
    /**
     * Ukkonen's walkDown check.
     */
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
  
    /**
     * Convert 'A'..'Z' + '$' to indices [0..26].
     */
    charToIndex(c) {
      if (c === '$') return 26;
      return c.charCodeAt(0) - 'A'.charCodeAt(0);
    }
  
    /**
     * Record the current state of the tree as a step.
     */
    recordStep(message) {
      // Create a shallow snapshot
      this.steps.push({
        message,
        snapshotRoot: this.cloneNode(this.root),
        activeNodeStart: this.activeNode.start,
        activeEdge: this.activeEdge,
        activeLength: this.activeLength,
        remainder: this.remainingSuffixCount,
      });
    }
  
    /**
     * Clones the tree structure recursively to store in steps[].
     * For a fully correct clone, also copy 'suffixLink' if you want to visualize it.
     */
    cloneNode(node) {
      if (!node) return null;
      const newNode = new Node(node.start, node.end);
      newNode.suffixLink = node.suffixLink;  // just reference
      newNode.suffixIndex = node.suffixIndex;
  
      for (let i = 0; i < 27; i++) {
        if (node.children[i]) {
          newNode.children[i] = this.cloneNode(node.children[i]);
        }
      }
      return newNode;
    }
  
    // ----------------------------------
    // (2) Set Suffix Indices by DFS
    // ----------------------------------
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
        // suffixIndex = size - labelHeight
        node.suffixIndex = this.size - labelHeight;
      }
    }
  
    // ----------------------------------
    // (3) Operations
    // ----------------------------------
  
    /**
     * Search(P): Return true if pattern P is found in the tree.
     */
    search(pattern) {
      let current = this.root;
      let pos = 0;
      while (pos < pattern.length) {
        const idx = this.charToIndex(pattern[pos]);
        if (!current.children[idx]) {
          return false; // No path for this character
        }
        const child = current.children[idx];
        const edgeLen = child.edgeLength(this.leafEnd);
        // Compare substring on this edge
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
  
    /**
     * findAllMatches(P): Return array of starting positions (suffix indices).
     */
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
  
    /**
     * longestRepeatedSubstring(): Return the LRS by finding the deepest internal node (≥2 children).
     */
    longestRepeatedSubstring() {
      let lrs = "";
      const self = this;
  
      function dfs(node, path) {
        if (!node) return;
        // Count children
        let childCount = 0;
        for (let i = 0; i < 27; i++) {
          if (node.children[i]) {
            childCount++;
          }
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
  
    /**
     * shortestUniqueSubstring(): Return the SUS by finding the shallowest node that leads to exactly 1 leaf.
     * We'll do a simple DFS approach. This is a simplified version; you can refine if needed.
     */
    shortestUniqueSubstring() {
        let sus = "";
        let minLen = Number.MAX_SAFE_INTEGER;
        const self = this;
      
        /**
         * DFS that:
         *  1. Computes how many leaves exist under each node (leafCount).
         *  2. If leafCount == 1, the path from root to this node is unique.
         *  3. We then consider partial prefixes of the *last* edge used to get here,
         *     ensuring we catch smaller substrings that do not contain '$'.
         */
        function dfs(node, pathSoFar) {
          if (!node) return 0;
      
          let totalLeaves = 0;
          let childCount = 0;
      
          // Explore each child
          for (let i = 0; i < 27; i++) {
            if (node.children[i]) {
              childCount++;
              const child = node.children[i];
              // Full label for the edge child
              const edgeLen = child.edgeLength(self.leafEnd);
              const edgeStr = self.text.substring(child.start, child.start + edgeLen);
      
              // Recursively count leaves in the child's subtree
              totalLeaves += dfs(child, pathSoFar + edgeStr);
            }
          }
      
          // If no children, this node is a leaf => 1 leaf
          if (childCount === 0) {
            totalLeaves = 1;
          }
      
          // If exactly 1 leaf => the entire pathSoFar is unique
          if (totalLeaves === 1) {
            // But pathSoFar might contain '$' (we discard those).
            // Also, the entire pathSoFar might be large. We want to check
            // partial prefixes of the *last* edge we just added, because
            // a shorter prefix might already be unique.
            if (!pathSoFar.includes('$') && pathSoFar.length > 0 && pathSoFar.length < minLen) {
              minLen = pathSoFar.length;
              sus = pathSoFar;
            }
      
            // --- PARTIAL-EDGE LOGIC ---
            // The pathSoFar is the entire string from root to this node.
            // We can try every proper prefix (1..pathSoFar.length) to see if it's smaller,
            // provided it doesn't contain '$'.
            // Because if the entire path is unique, any prefix that doesn't intersect a branching
            // is also unique (the tree compressed a single chain).
            for (let prefixLen = 1; prefixLen < pathSoFar.length; prefixLen++) {
              const candidate = pathSoFar.substring(0, prefixLen);
              if (candidate.includes('$')) break; // skip if it has '$'
              if (candidate.length < minLen) {
                minLen = candidate.length;
                sus = candidate;
              }
            }
          }
      
          return totalLeaves;
        }
      
        dfs(this.root, "");
        return sus;
      }
      
  }
  