// =========== main.js ===========

import { SuffixTree } from './suffixTree.js';

let suffixTree = null;
let currentStepIndex = 0;

// DOM elements
const inputStringEl = document.getElementById('inputString');
const buildTreeBtn = document.getElementById('buildTreeBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const stepIndicatorEl = document.getElementById('stepIndicator');
const treeContainerEl = document.getElementById('treeContainer');
const patternInputEl = document.getElementById('patternInput');
const searchBtn = document.getElementById('searchBtn');
const allMatchesBtn = document.getElementById('allMatchesBtn');
const lrsBtn = document.getElementById('lrsBtn');
const susBtn = document.getElementById('susBtn');
const resultContainerEl = document.getElementById('resultContainer');

// Build the tree
buildTreeBtn.addEventListener('click', () => {
  const userInput = inputStringEl.value.trim().toUpperCase();
  if (!userInput) return;

  // Ensure a terminal symbol is appended
  const text = userInput.endsWith('$') ? userInput : userInput + '$';
  suffixTree = new SuffixTree(text);
  currentStepIndex = 0;
  updateStepIndicator();
  renderStep(currentStepIndex);
});

// Step navigation
prevBtn.addEventListener('click', () => {
  if (!suffixTree || suffixTree.steps.length === 0) return;
  currentStepIndex = Math.max(0, currentStepIndex - 1);
  updateStepIndicator();
  renderStep(currentStepIndex);
});

nextBtn.addEventListener('click', () => {
  if (!suffixTree || suffixTree.steps.length === 0) return;
  currentStepIndex = Math.min(suffixTree.steps.length - 1, currentStepIndex + 1);
  updateStepIndicator();
  renderStep(currentStepIndex);
});

// Operations
searchBtn.addEventListener('click', () => {
  if (!suffixTree) return;
  const pattern = patternInputEl.value.trim().toUpperCase();
  if (!pattern) return;
  const found = suffixTree.search(pattern);
  resultContainerEl.textContent = found
    ? `Pattern "${pattern}" found in the text.`
    : `Pattern "${pattern}" NOT found.`;
});

allMatchesBtn.addEventListener('click', () => {
  if (!suffixTree) return;
  const pattern = patternInputEl.value.trim().toUpperCase();
  if (!pattern) return;
  const positions = suffixTree.findAllMatches(pattern);
  if (positions.length > 0) {
    resultContainerEl.textContent = `Pattern "${pattern}" found at positions: ${positions.join(', ')}`;
  } else {
    resultContainerEl.textContent = `Pattern "${pattern}" not found.`;
  }
});

lrsBtn.addEventListener('click', () => {
  if (!suffixTree) return;
  const lrs = suffixTree.longestRepeatedSubstring();
  if (lrs && lrs.length > 0) {
    resultContainerEl.textContent = `Longest Repeated Substring (LRS): "${lrs}"`;
  } else {
    resultContainerEl.textContent = "No repeated substring found.";
  }
});

susBtn.addEventListener('click', () => {
  if (!suffixTree) return;
  const sus = suffixTree.shortestUniqueSubstring();
  if (sus && sus.length > 0) {
    resultContainerEl.textContent = `Shortest Unique Substring (SUS): "${sus}"`;
  } else {
    resultContainerEl.textContent = "No unique substring found.";
  }
});

// Helper to update the step label
function updateStepIndicator() {
  if (!suffixTree || suffixTree.steps.length === 0) {
    stepIndicatorEl.textContent = "Step 0 of 0";
  } else {
    stepIndicatorEl.textContent = `Step ${currentStepIndex + 1} of ${suffixTree.steps.length}`;
  }
}

// Render a particular step in the #treeContainer
function renderStep(stepIndex) {
  if (!suffixTree || suffixTree.steps.length === 0) {
    treeContainerEl.textContent = "No steps to display.";
    return;
  }
  const stepData = suffixTree.steps[stepIndex];

  // Clear old content
  treeContainerEl.innerHTML = "";

  // Show step message
  const msgEl = document.createElement('p');
  msgEl.textContent = stepData.message;
  treeContainerEl.appendChild(msgEl);

  // Option 1: Minimal text-based representation
  // We'll do a DFS and print edges. 
  // You can replace this with a real drawing if you like (e.g., with D3).
  const treeLines = [];
  dfsPrint(stepData.snapshotRoot, 0, treeLines, suffixTree.text, suffixTree.leafEnd);
  const pre = document.createElement('pre');
  pre.textContent = treeLines.join('\n');
  treeContainerEl.appendChild(pre);

  // Show active info
  const info = document.createElement('p');
  info.textContent = `active_node.start=${stepData.activeNodeStart}, active_edge=${stepData.activeEdge}, active_length=${stepData.activeLength}, remainder=${stepData.remainder}`;
  treeContainerEl.appendChild(info);
}

// A simple DFS to print edges
function dfsPrint(node, depth, output, text, leafEnd) {
  if (!node) return;
  if (node.start !== -1) {
    // Indent
    let indent = "  ".repeat(depth);
    let labelLen = node.edgeLength(leafEnd);
    let label = text.substring(node.start, node.start + labelLen);
    output.push(`${indent}(${node.start},${node.end}) "${label}"  [suffixIndex=${node.suffixIndex}]`);
  }
  // Print children
  for (let i = 0; i < 27; i++) {
    if (node.children[i]) {
      dfsPrint(node.children[i], depth + 1, output, text, leafEnd);
    }
  }
}
