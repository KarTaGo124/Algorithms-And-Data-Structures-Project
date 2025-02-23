// =========== main.js ===========

import { SuffixTree } from "./suffixTree.js";

// DOM references
const inputStringEl = document.getElementById("inputString");
const buildTreeBtn = document.getElementById("buildTreeBtn");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const stepIndicatorEl = document.getElementById("stepIndicator");
const treeContainerEl = document.getElementById("treeContainer");
const patternInputEl = document.getElementById("patternInput");
const searchBtn = document.getElementById("searchBtn");
const allMatchesBtn = document.getElementById("allMatchesBtn");
const lrsBtn = document.getElementById("lrsBtn");
const susBtn = document.getElementById("susBtn");
const resultContainerEl = document.getElementById("resultContainer");

let suffixTree = null;
let currentStepIndex = 0;

// Build suffix tree
buildTreeBtn.addEventListener("click", () => {
  const userInput = inputStringEl.value.trim().toUpperCase();
  if (!userInput) return;
  // Ensure a terminal symbol
  const text = userInput.endsWith("$") ? userInput : userInput + "$";

  suffixTree = new SuffixTree(text);
  currentStepIndex = 0;
  updateStepIndicator();
  renderStep(currentStepIndex);
});

// Prev
prevBtn.addEventListener("click", () => {
  if (!suffixTree || suffixTree.steps.length === 0) return;
  currentStepIndex = Math.max(0, currentStepIndex - 1);
  updateStepIndicator();
  renderStep(currentStepIndex);
});

// Next
nextBtn.addEventListener("click", () => {
  if (!suffixTree || suffixTree.steps.length === 0) return;
  currentStepIndex = Math.min(
    suffixTree.steps.length - 1,
    currentStepIndex + 1
  );
  updateStepIndicator();
  renderStep(currentStepIndex);
});

// Operations
searchBtn.addEventListener("click", () => {
  if (!suffixTree) return;
  const pattern = patternInputEl.value.trim().toUpperCase();
  if (!pattern) return;
  const found = suffixTree.search(pattern);
  resultContainerEl.textContent = found
    ? `Pattern "${pattern}" found in the text.`
    : `Pattern "${pattern}" NOT found.`;
});

allMatchesBtn.addEventListener("click", () => {
  if (!suffixTree) return;
  const pattern = patternInputEl.value.trim().toUpperCase();
  if (!pattern) return;
  const positions = suffixTree.findAllMatches(pattern);
  if (positions.length > 0) {
    resultContainerEl.textContent = `Pattern "${pattern}" found at positions: ${positions.join(
      ", "
    )}`;
  } else {
    resultContainerEl.textContent = `Pattern "${pattern}" not found.`;
  }
});

lrsBtn.addEventListener("click", () => {
  if (!suffixTree) return;
  const lrs = suffixTree.longestRepeatedSubstring();
  if (lrs && lrs.length > 0) {
    resultContainerEl.textContent = `Longest Repeated Substring (LRS): "${lrs}"`;
  } else {
    resultContainerEl.textContent = "No repeated substring found.";
  }
});

susBtn.addEventListener("click", () => {
  if (!suffixTree) return;
  const sus = suffixTree.shortestUniqueSubstring();
  if (sus && sus.length > 0) {
    resultContainerEl.textContent = `Shortest Unique Substring (SUS): "${sus}"`;
  } else {
    resultContainerEl.textContent = "No unique substring found.";
  }
});

// Update step label
function updateStepIndicator() {
  if (!suffixTree || suffixTree.steps.length === 0) {
    stepIndicatorEl.textContent = "Step 0 of 0";
  } else {
    stepIndicatorEl.textContent = `Step ${currentStepIndex + 1} of ${
      suffixTree.steps.length
    }`;
  }
}

// Render a specific step
function renderStep(stepIndex) {
  if (!suffixTree || suffixTree.steps.length === 0) {
    treeContainerEl.textContent = "No steps to display.";
    return;
  }
  const stepData = suffixTree.steps[stepIndex];

  // Clear old content
  treeContainerEl.innerHTML = "";

  // Step message
  const msgEl = document.createElement("p");
  msgEl.textContent = stepData.message;
  treeContainerEl.appendChild(msgEl);

  // Draw an SVG of the snapshot
  drawTreeSVG(
    stepData.snapshotRoot,
    suffixTree.text,
    suffixTree.leafEnd,
    treeContainerEl
  );

  // Show active point info
  const info = document.createElement("p");
  info.textContent =
    `active_node.start=${stepData.activeNodeStart}, ` +
    `active_edge=${stepData.activeEdge}, ` +
    `active_length=${stepData.activeLength}, ` +
    `remainder=${stepData.remainder}`;
  treeContainerEl.appendChild(info);
}

// ====================== SVG Tree Drawing (Tidy Layout) ======================

/**
 * Build a simple hierarchy object from the suffix tree snapshot.
 * Each node in the returned object has:
 *   { edgeLabel: string, nodeRef: Node, children: [], x: number, depth: number }
 */
function buildHierarchy(node, parentEdgeLabel, text, leafEnd) {
    if (!node) return null;
    const label = parentEdgeLabel || "";
    const data = {
      edgeLabel: label,
      nodeRef: node,
      children: [],
      x: 0,
      depth: 0 // we'll store the "level" in the tree here
    };
    for (let i = 0; i < 27; i++) {
      if (node.children[i]) {
        const child = node.children[i];
        const edgeLen = child.edgeLength(leafEnd);
        const edgeStr = text.substring(child.start, child.start + edgeLen);
        const childData = buildHierarchy(child, edgeStr, text, leafEnd);
        if (childData) {
          data.children.push(childData);
        }
      }
    }
    return data;
  }
  
  // A global counter to assign unique x-coordinates to leaves.
  let globalLeafCounter = 0;
  
  /**
   * Recursively assign (x, depth) to each node in a tidy manner:
   *  - If node has no children, it's a leaf => node.x = globalLeafCounter++.
   *  - Otherwise, layout children first, then node.x = midpoint of children’s x.
   *  - node.depth = depth.
   */
  function layoutTidy(node, depth) {
    node.depth = depth;
    if (node.children.length === 0) {
      // Leaf node
      node.x = globalLeafCounter++;
    } else {
      // Internal node: lay out children, track min & max child.x
      let minX = Infinity;
      let maxX = -Infinity;
      for (const child of node.children) {
        layoutTidy(child, depth + 1);
        if (child.x < minX) minX = child.x;
        if (child.x > maxX) maxX = child.x;
      }
      // Place the parent at the midpoint of its children
      node.x = (minX + maxX) / 2;
    }
  }
  
  /**
   * Draw the suffix tree snapshot as an <svg> using our tidy layout.
   */
  function drawTreeSVG(rootNode, text, leafEnd, containerEl) {
    // Build hierarchy
    const hierarchy = buildHierarchy(rootNode, "", text, leafEnd);
    if (!hierarchy) {
      containerEl.textContent = "Empty tree snapshot.";
      return;
    }
  
    // 1) Layout
    globalLeafCounter = 0;
    layoutTidy(hierarchy, 0);
  
    // 2) Collect all nodes for bounding box
    let minX = Infinity, maxX = -Infinity;
    let minDepth = Infinity, maxDepth = -Infinity;
    const allNodes = [];
  
    function collectNodes(h) {
      allNodes.push(h);
      if (h.x < minX) minX = h.x;
      if (h.x > maxX) maxX = h.x;
      if (h.depth < minDepth) minDepth = h.depth;
      if (h.depth > maxDepth) maxDepth = h.depth;
      for (const c of h.children) {
        collectNodes(c);
      }
    }
    collectNodes(hierarchy);
  
    // 3) Compute final width/height for <svg>
    const MARGIN = 60;
    const X_SCALE = 120;    // Horizontal spacing factor
    const Y_SPACING = 120;  // Vertical distance between levels
  
    // Width covers from minX..maxX, each "unit" scaled by X_SCALE
    const width = (maxX - minX + 1) * X_SCALE + 2 * MARGIN;
    // Height covers from minDepth..maxDepth, each level is Y_SPACING
    const height = (maxDepth - minDepth + 1) * Y_SPACING + 2 * MARGIN;
  
    // Create an <svg>
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", width);
    svg.setAttribute("height", height);
    svg.style.backgroundColor = "#f9f9f9";
    containerEl.appendChild(svg);
  
    // Draw edges
    function drawEdges(parent) {
        for (const child of parent.children) {
          // parent coords
          const px = (parent.x - minX) * X_SCALE + MARGIN;
          const py = (parent.depth - minDepth) * Y_SPACING + MARGIN;
          // child coords
          const cx = (child.x - minX) * X_SCALE + MARGIN;
          const cy = (child.depth - minDepth) * Y_SPACING + MARGIN;
      
          // Draw the line
          const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
          line.setAttribute("x1", px);
          line.setAttribute("y1", py);
          line.setAttribute("x2", cx);
          line.setAttribute("y2", cy);
          line.setAttribute("stroke", "#999");
          line.setAttribute("stroke-width", "2");
          svg.appendChild(line);
      
          // Calculate midpoint for the label
          const mx = (px + cx) / 2;
          const my = (py + cy) / 2;
      
          // Calculate the angle (in degrees) of the line
          let angleDeg = (Math.atan2(cy - py, cx - px) * 180) / Math.PI;
      
          // OPTIONAL: Keep text from appearing upside-down. If the angle is
          // beyond +/-90°, flip it by 180° so the label reads left-to-right.
          if (angleDeg > 90) {
            angleDeg -= 180;
          } else if (angleDeg < -90) {
            angleDeg += 180;
          }
      
          // Create and position the label
          const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
          // We first translate to the midpoint, rotate, then translate "up" (-10) 
          // so the text is slightly off the line
          label.setAttribute(
            "transform",
            `translate(${mx},${my}) rotate(${angleDeg}) translate(0,-10)`
          );
          label.setAttribute("fill", "black");
          label.setAttribute("text-anchor", "middle");
          // So the text is vertically centered on the baseline after rotation
          label.setAttribute("dominant-baseline", "middle");
      
          label.textContent = child.edgeLabel;
          svg.appendChild(label);
      
          // Recurse
          drawEdges(child);
        }
      }
      
    drawEdges(hierarchy);
  
    // Draw nodes
    for (const node of allNodes) {
      const nx = (node.x - minX) * X_SCALE + MARGIN;
      const ny = (node.depth - minDepth) * Y_SPACING + MARGIN;
  
      // Circle
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", nx);
      circle.setAttribute("cy", ny);
      circle.setAttribute("r", 15);
      circle.setAttribute("fill", "#f66");
      circle.setAttribute("stroke", "#333");
      circle.setAttribute("stroke-width", "1");
      svg.appendChild(circle);
  
      // Label: leaf suffixIndex or "•" for internal
      let nodeLabel = "•";
      if (node.nodeRef.suffixIndex !== -1) {
        nodeLabel = String(node.nodeRef.suffixIndex);
      }
      const textEl = document.createElementNS("http://www.w3.org/2000/svg", "text");
      textEl.setAttribute("x", nx);
      textEl.setAttribute("y", ny + 5);
      textEl.setAttribute("fill", "white");
      textEl.setAttribute("font-weight", "bold");
      textEl.setAttribute("text-anchor", "middle");
      textEl.textContent = nodeLabel;
      svg.appendChild(textEl);
    }
  }
  