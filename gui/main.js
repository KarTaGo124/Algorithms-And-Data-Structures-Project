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

  // Draw an SVG of the snapshot using D3.js with layout horizontal
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

// ====================== D3.js Horizontal Tree Drawing ======================

/**
 * Build a simple hierarchy object from the suffix tree snapshot.
 * Each node has: { edgeLabel: string, nodeRef: Node, children: [] }
 */
function buildHierarchy(node, parentEdgeLabel, text, leafEnd) {
  if (!node) return null;
  const label = parentEdgeLabel || "";
  const data = {
    edgeLabel: label,
    nodeRef: node,
    children: []
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

/**
 * Draw the suffix tree snapshot as a horizontal tree using D3.js.
 * La raíz se posiciona a la izquierda y los nodos se extienden hacia la derecha.
 */
function drawTreeSVG(rootNode, text, leafEnd, containerEl) {
  // Build hierarchy from the snapshot
  const hierarchyData = buildHierarchy(rootNode, "", text, leafEnd);
  if (!hierarchyData) {
    containerEl.textContent = "Empty tree snapshot.";
    return;
  }
  
  // Clear container
  containerEl.innerHTML = "";
  
  // Setup SVG dimensions and margins
  const svgWidth = 800, svgHeight = 600;
  const margin = { top: 60, right: 60, bottom: 60, left: 60 };
  const width = svgWidth - margin.left - margin.right;
  const height = svgHeight - margin.top - margin.bottom;
  
  // Create d3 hierarchy
  const rootD3 = d3.hierarchy(hierarchyData, d => d.children);
  
  // Create tree layout (horizontal: x = vertical, y = horizontal)
  const treeLayout = d3.tree().size([height, width]);
  treeLayout(rootD3);
  
  // Create SVG element
  const svg = d3.select(containerEl)
    .append("svg")
    .attr("width", svgWidth)
    .attr("height", svgHeight)
    .style("background-color", "#f9f9f9");
  
  // Create group element
  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);
  
  // Draw links (edges)
  const links = rootD3.links();
  g.selectAll("line.link")
    .data(links)
    .enter()
    .append("line")
    .attr("class", "link")
    .attr("x1", d => d.source.y)
    .attr("y1", d => d.source.x)
    .attr("x2", d => d.target.y)
    .attr("y2", d => d.target.x)
    .attr("stroke", "#999")
    .attr("stroke-width", 2);
  
  // Draw link labels (edge prefixes)
  g.selectAll("text.link-label")
    .data(links)
    .enter()
    .append("text")
    .attr("class", "link-label")
    .attr("text-anchor", "middle")
    .attr("fill", "black")
    .attr("dominant-baseline", "middle")
    .attr("transform", function(d) {
      const x1 = d.source.x, y1 = d.source.y;
      const x2 = d.target.x, y2 = d.target.y;
      // Calcular el punto medio
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      // Calcular el ángulo en grados
      let angle = Math.atan2(x2 - x1, y2 - y1) * 180 / Math.PI;
      if (angle > 90) angle -= 180;
      else if (angle < -90) angle += 180;
      return `translate(${y1 + (y2 - y1) / 2}, ${x1 + (x2 - x1) / 2}) rotate(${angle}) translate(0, -10)`;
    })
    .text(d => d.target.data.edgeLabel);
  
  // Draw nodes
  const nodes = rootD3.descendants();
  const nodeGroup = g.selectAll("g.node")
    .data(nodes)
    .enter()
    .append("g")
    .attr("class", "node")
    .attr("transform", d => `translate(${d.y},${d.x})`);
  
  // Draw node circles
  nodeGroup.append("circle")
    .attr("r", 15)
    .attr("fill", "#f66")
    .attr("stroke", "#333")
    .attr("stroke-width", 1);
  
  // Draw node labels (suffixIndex or "•" para nodos internos)
  nodeGroup.append("text")
    .attr("dy", 5)
    .attr("text-anchor", "middle")
    .attr("fill", "white")
    .attr("font-weight", "bold")
    .text(d => {
      return (d.data.nodeRef && d.data.nodeRef.suffixIndex !== -1) ? String(d.data.nodeRef.suffixIndex) : "•";
    });
}
