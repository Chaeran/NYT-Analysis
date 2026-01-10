// ===============================
// main.js - Shared state & coordination
// ===============================

console.log("main.js loaded");

// 1) Shared state (global app state)
window.state = {
  selectedSection: null,
  selectedKeyword: null
};

// 2) Initialize all views once after DOM is ready
window.addEventListener("DOMContentLoaded", () => {
  console.log("DOM ready -> initialize views");

  // NOTE: These init functions must exist in each view file.
  // If a view file doesn't have initXxx yet, see the notes below.
  if (typeof initTreemap === "function") initTreemap("#treemapArea");
  if (typeof initYearlyBar === "function") initYearlyBar("#yearlyBar");
  if (typeof initKeywordGraph === "function") initKeywordGraph("#keywordGraph");
  if (typeof initBurst === "function") initBurst("#burstChart");

  // Initial coordinated update (optional but useful)
  updateAll();
});

// 3) Update function: call view-specific update functions (if they exist)
window.updateAll = function () {
  // Each update should be able to handle null state values gracefully.
  if (typeof updateTreemap === "function") updateTreemap(window.state);
  if (typeof updateYearlyBar === "function") updateYearlyBar(window.state);
  if (typeof updateKeywordGraph === "function") updateKeywordGraph(window.state);
  if (typeof updateBurst === "function") updateBurst(window.state);
};
