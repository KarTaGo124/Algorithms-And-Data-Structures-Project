// =========== main.js ===========

import { SuffixTree } from "./suffixTree.js";

// Referencias DOM
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
const stringRepresentationEl = document.getElementById("stringRepresentation");

let suffixTree = null;
let currentStepIndex = 0;

// Construir el árbol
buildTreeBtn.addEventListener("click", () => {
  const userInput = inputStringEl.value.trim().toUpperCase();
  if (!userInput) return;
  // Asegurar el símbolo terminal
  const text = userInput.endsWith("$") ? userInput : userInput + "$";
  
  suffixTree = new SuffixTree(text);
  currentStepIndex = 0;
  updateStepIndicator();
  renderStep(currentStepIndex);
});

// Botón Prev
prevBtn.addEventListener("click", () => {
  if (!suffixTree || suffixTree.steps.length === 0) return;
  currentStepIndex = Math.max(0, currentStepIndex - 1);
  updateStepIndicator();
  renderStep(currentStepIndex);
});

// Botón Next
nextBtn.addEventListener("click", () => {
  if (!suffixTree || suffixTree.steps.length === 0) return;
  currentStepIndex = Math.min(
    suffixTree.steps.length - 1,
    currentStepIndex + 1
  );
  updateStepIndicator();
  renderStep(currentStepIndex);
});

// Operaciones
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
    resultContainerEl.textContent = `Pattern "${pattern}" found at positions: ${positions.join(", ")}`;
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

// Actualizar indicador de paso
function updateStepIndicator() {
  if (!suffixTree || suffixTree.steps.length === 0) {
    stepIndicatorEl.textContent = "Step 0 of 0";
  } else {
    stepIndicatorEl.textContent = `Step ${currentStepIndex + 1} of ${
      suffixTree.steps.length
    }`;
  }
}

// Renderizar un paso específico
function renderStep(stepIndex) {
  if (!suffixTree || suffixTree.steps.length === 0) {
    treeContainerEl.textContent = "No steps to display.";
    return;
  }
  const stepData = suffixTree.steps[stepIndex];

  // 1) Mostrar mensaje del paso
  treeContainerEl.innerHTML = "";
  const msgEl = document.createElement("p");
  msgEl.textContent = stepData.message;
  treeContainerEl.appendChild(msgEl);

  // 2) Resaltar los caracteres hasta el índice "pos" en este paso
  renderStringRepresentation(suffixTree.text, stepData.pos);

  // 3) Dibujar el árbol en este estado, usando leafEndSnapshot en vez de suffixTree.leafEnd
  drawTreeSVG(
    stepData.snapshotRoot,
    suffixTree.text,
    stepData.leafEndSnapshot,  // <-- Usamos el leafEnd correspondiente a este paso
    treeContainerEl
  );

  // 4) Mostrar info de puntos activos
  const info = document.createElement("p");
  info.textContent =
    `active_node.start=${stepData.activeNodeStart}, ` +
    `active_edge=${stepData.activeEdge}, ` +
    `active_length=${stepData.activeLength}, ` +
    `remainder=${stepData.remainder}`;
  treeContainerEl.appendChild(info);
}

/**
 * Dibuja la palabra ingresada como una serie de recuadros
 * y resalta los caracteres hasta highlightPos.
 */
function renderStringRepresentation(text, highlightPos) {
  if (!stringRepresentationEl) return;
  stringRepresentationEl.innerHTML = "";
  for (let i = 0; i < text.length; i++) {
    const span = document.createElement("span");
    span.classList.add("char-box");
    if (i <= highlightPos) {
      span.classList.add("highlighted");
    }
    span.textContent = text[i];
    stringRepresentationEl.appendChild(span);
  }
}

// Dibuja el snapshot del árbol como un árbol horizontal usando D3.js
function drawTreeSVG(rootNode, text, leafEnd, containerEl) {
  const hierarchyData = buildHierarchy(rootNode, "", text, leafEnd);
  if (!hierarchyData) {
    containerEl.textContent = "Empty tree snapshot.";
    return;
  }
  containerEl.innerHTML = "";
  const svgWidth = 800, svgHeight = 600;
  const margin = { top: 60, right: 60, bottom: 60, left: 60 };
  const width = svgWidth - margin.left - margin.right;
  const height = svgHeight - margin.top - margin.bottom;
  const rootD3 = d3.hierarchy(hierarchyData, d => d.children);

  // Ajustar layout y separación para aumentar el espaciado vertical
  const treeLayout = d3.tree()
    .size([height, width])
    .separation((a, b) => 2);

  treeLayout(rootD3);

  const svg = d3.select(containerEl)
    .append("svg")
    .attr("width", svgWidth)
    .attr("height", svgHeight)
    .style("background-color", "#f9f9f9");

  // Definir marcador de flecha para los suffix links
  const defs = svg.append("defs");
  defs.append("marker")
    .attr("id", "arrow")
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 10)
    .attr("refY", 0)
    .attr("markerWidth", 6)
    .attr("markerHeight", 6)
    .attr("orient", "auto")
    .append("path")
    .attr("d", "M0,-5L10,0L0,5")
    .attr("fill", "blue");

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Dibujar aristas del árbol
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

  // Dibujar etiquetas de las aristas
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
      let angle = Math.atan2(x2 - x1, y2 - y1) * 180 / Math.PI;
      if (angle > 90) angle -= 180;
      else if (angle < -90) angle += 180;
      return `translate(${y1 + (y2 - y1) / 2}, ${x1 + (x2 - x1) / 2}) rotate(${angle}) translate(0, -7)`;
    })
    .text(d => d.target.data.edgeLabel);

  // Dibujar nodos
  const nodes = rootD3.descendants();
  const nodeGroup = g.selectAll("g.node")
    .data(nodes)
    .enter()
    .append("g")
    .attr("class", "node")
    .attr("transform", d => `translate(${d.y},${d.x})`);

  nodeGroup.append("circle")
    .attr("r", 15)
    .attr("fill", "#f66")
    .attr("stroke", "#333")
    .attr("stroke-width", 1);

  nodeGroup.append("text")
    .attr("dy", 5)
    .attr("text-anchor", "middle")
    .attr("fill", "white")
    .attr("font-weight", "bold")
    .text(d => {
      return (d.data.nodeRef && d.data.nodeRef.suffixIndex !== -1)
        ? String(d.data.nodeRef.suffixIndex)
        : "•";
    });

  // Dibujar flechas para los suffix links
  let nodeMap = new Map();
  nodes.forEach(d => {
    nodeMap.set(d.data.nodeRef, d);
  });

  let suffixLinks = [];
  nodes.forEach(d => {
    let srcNode = d.data.nodeRef;
    if (srcNode.suffixLink) {
      let targetD3 = nodeMap.get(srcNode.suffixLink);
      if (targetD3) {
        suffixLinks.push({ source: d, target: targetD3 });
      }
    }
  });

  g.selectAll("line.suffixLink")
    .data(suffixLinks)
    .enter()
    .append("line")
    .attr("class", "suffixLink")
    .attr("x1", d => d.source.y)
    .attr("y1", d => d.source.x)
    .attr("x2", d => d.target.y)
    .attr("y2", d => d.target.x)
    .attr("stroke", "blue")
    .attr("stroke-dasharray", "5,5")
    .attr("stroke-width", 2)
    .attr("marker-end", "url(#arrow)");
}

// Construir jerarquía para D3.js a partir del snapshot del árbol
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
