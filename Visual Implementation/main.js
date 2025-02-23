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

// ====================== SVG Tree Drawing ======================

function buildHierarchy(node, parentEdgeLabel, text, leafEnd) {
  if (!node) return null;
  const label = parentEdgeLabel || "";
  const data = {
    id: Math.random().toString(36).slice(2),
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

function computeSubtreeWidth(h) {
  if (!h.children || h.children.length === 0) {
    return 1;
  }
  let width = 0;
  for (const c of h.children) {
    width += computeSubtreeWidth(c);
  }
  return width;
}

function layoutTree(h, xStart, depth, xStep, yStep) {
  const subtreeWidth = computeSubtreeWidth(h);
  h.x = xStart + (subtreeWidth * xStep) / 2;
  h.y = depth * yStep;

  let offset = xStart;
  for (const child of h.children) {
    const w = computeSubtreeWidth(child);
    layoutTree(child, offset, depth + 1, xStep, yStep);
    offset += w;
  }
}

function drawTreeSVG(rootNode, text, leafEnd, containerEl) {
  const hierarchy = buildHierarchy(rootNode, "", text, leafEnd);
  if (!hierarchy) {
    containerEl.textContent = "Empty tree snapshot.";
    return;
  }

  const xStep = 60;
  const yStep = 80;
  layoutTree(hierarchy, 0, 0, xStep, yStep);

  let minX = Infinity, maxX = -Infinity, maxY = 0;
  const allNodes = [];

  function collectNodes(h) {
    allNodes.push(h);
    if (h.x < minX) minX = h.x;
    if (h.x > maxX) maxX = h.x;
    if (h.y > maxY) maxY = h.y;
    for (const c of h.children) {
      collectNodes(c);
    }
  }
  collectNodes(hierarchy);

  const width = maxX - minX + 100;
  const height = maxY + 100;

  // Create <svg>
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", width);
  svg.setAttribute("height", height);
  svg.style.backgroundColor = "#f9f9f9";
  containerEl.appendChild(svg);

  // Draw edges
  function drawEdges(h) {
    for (const child of h.children) {
      // line
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", h.x - minX + 50);
      line.setAttribute("y1", h.y + 50);
      line.setAttribute("x2", child.x - minX + 50);
      line.setAttribute("y2", child.y + 50);
      line.setAttribute("stroke", "#999");
      svg.appendChild(line);

      // label
      const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      label.setAttribute("x", (h.x + child.x)/2 - minX + 50);
      label.setAttribute("y", (h.y + child.y)/2 + 45); 
      label.setAttribute("fill", "black");
      label.setAttribute("text-anchor", "middle");
      label.textContent = child.edgeLabel;
      svg.appendChild(label);

      drawEdges(child);
    }
  }
  drawEdges(hierarchy);

  // Draw nodes
  for (const h of allNodes) {
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", h.x - minX + 50);
    circle.setAttribute("cy", h.y + 50);
    circle.setAttribute("r", 15);
    circle.setAttribute("fill", "#f66");
    circle.setAttribute("stroke", "#333");
    circle.setAttribute("stroke-width", "1");
    svg.appendChild(circle);

    let nodeLabel = "•";
    if (h.nodeRef.suffixIndex !== -1) {
      nodeLabel = String(h.nodeRef.suffixIndex);
    }
    const textEl = document.createElementNS("http://www.w3.org/2000/svg", "text");
    textEl.setAttribute("x", h.x - minX + 50);
    textEl.setAttribute("y", h.y + 55);
    textEl.setAttribute("fill", "white");
    textEl.setAttribute("font-weight", "bold");
    textEl.setAttribute("text-anchor", "middle");
    textEl.textContent = nodeLabel;
    svg.appendChild(textEl);
  }
}
