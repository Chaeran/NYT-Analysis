// ---- 0. Global state ----
// currentMode: "raw" for absolute counts, "normalized" for yearly share
let currentMode = "raw";
let currentKeyword = null;

// 1. SVG layout setup
const margin = { top: 40, right: 30, bottom: 40, left: 80 };
const width = 600;// - margin.left - margin.right;
const height = 400 - margin.top - margin.bottom;


function initBurst(containerSelector) {
  // Main SVG group with margin convention
  const svg = d3
    .select(containerSelector)
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Tooltip container (absolutely positioned div in HTML)
  const tooltip = d3.select("#tooltip");

  // Title text at the top, showing keyword + mode description
  const titleText = svg
    .append("text")
    .attr("class", "chart-title")
    .attr("x", width / 2)
    .attr("y", -15)
    .attr("text-anchor", "middle")
    .style("font-weight", "bold")
    .text("");

  // 2. Load dataset
  d3.csv("data/keyword_year_count_with_norm.csv").then(data => {
    // Convert numeric fields
    data.forEach(d => {
      d.year = +d.year;
      d.count = +d.count;
      d.normalized = +d.normalized; // 0–1 ratio (share of yearly articles)
    });

    // Collect and sort the list of years (used for the x scale domain)
    const years = Array.from(new Set(data.map(d => d.year))).sort(
      (a, b) => a - b
    );

    // Select top keywords (top 50 by total raw count)
    const totalByKeyword = d3.rollup(
      data,
      v => d3.sum(v, d => d.count),
      d => d.keyword
    );

    const topKeywords = Array.from(totalByKeyword, ([keyword, total]) => ({
      keyword,
      total
    }))
      .sort((a, b) => d3.descending(a.total, b.total))
      .slice(0, 50);

    // Populate the keyword dropdown
    const select = d3.select("#keyword-select");
    select
      .selectAll("option")
      .data(topKeywords)
      .enter()
      .append("option")
      .attr("value", d => d.keyword)
      .text(d => `${d.keyword} (${d.total})`);

    // Use the most frequent keyword as the initial selection
    currentKeyword = topKeywords[0].keyword;

    // 3. Define scales and axes

    // X scale: use a point scale so each year is centered at a discrete position
    const xScale = d3
      .scalePoint()
      .domain(years)
      .range([0, width])
      .padding(0.5); // add some padding at both ends

    const xAxis = d3.axisBottom(xScale);

    const xAxisG = svg
      .append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0, ${height})`)
      .call(xAxis);

    // Y scale: domain is updated depending on keyword + mode
    const yScale = d3.scaleLinear().range([height, 0]);
    const yAxisG = svg.append("g").attr("class", "y-axis");

    // Axis labels
    const xLabel = svg
      .append("text")
      .attr("class", "x-label")
      .attr("x", width / 2)
      .attr("y", height + 40)
      .attr("text-anchor", "middle")
      .text("Year");

    const yLabel = svg
      .append("text")
      .attr("class", "y-label")
      .attr("x", -height / 2)
      .attr("y", -55)
      .attr("transform", "rotate(-90)")
      .attr("text-anchor", "middle")
      .text("Number of articles");

    // 3-1. Helpers: choose y accessor / ticks / domain based on mode

    // Returns the accessor function for the current mode (raw or normalized)
    function getYValueAccessor() {
      if (currentMode === "normalized") {
        return d => d.normalized;
      } else {
        return d => d.count;
      }
    }

    // Build the y-axis with an appropriate tick format
    function makeYAxis() {
      if (currentMode === "normalized") {
        // Show normalized values as percentages
        return d3
          .axisLeft(yScale)
          .tickFormat(d => (d * 100).toFixed(1) + "%");
      } else {
        // Raw counts (default numeric ticks)
        return d3.axisLeft(yScale);
      }
    }

    // Compute y domain with a small headroom above the maximum
    function getYDomain(filtered) {
      const yValue = getYValueAccessor();
      const maxVal = d3.max(filtered, yValue) || 0;
      return [0, maxVal * 1.1]; // add ~10% padding at the top
    }

    // Update y-axis label according to the current mode
    function updateYAxisLabel() {
      if (currentMode === "normalized") {
        yLabel.text("Share of yearly articles");
      } else {
        yLabel.text("Number of articles");
      }
    }

    // Update the title text at the top of the chart
    function updateTitle(keyword) {
      const modeLabel =
        currentMode === "normalized"
          ? "Normalized share of yearly articles"
          : "Raw article count";
      titleText.text(`${keyword} – ${modeLabel}`);
    }

    // 4. Main update function for a given keyword & current mode
    function update(keyword) {
      currentKeyword = keyword;

      // Filter data for the selected keyword and sort by year
      const filtered = data
        .filter(d => d.keyword === keyword)
        .sort((a, b) => d3.ascending(a.year, b.year));

      // Update y scale domain based on filtered data
      const yDomain = getYDomain(filtered);
      yScale.domain(yDomain).nice();

      // Update y-axis and labels
      const yAxis = makeYAxis();
      yAxisG.transition().duration(500).call(yAxis);
      updateYAxisLabel();
      updateTitle(keyword);

      const yValue = getYValueAccessor();

      // Join: one spike (group) per year
      const spikes = svg.selectAll(".spike").data(filtered, d => d.year);

      // Exit: remove spikes that are no longer needed
      spikes.exit().remove();

      // Enter: create a group with line (stem) + circle (dot)
      const spikesEnter = spikes
        .enter()
        .append("g")
        .attr("class", "spike")
        // Start from the bottom for the entry animation
        .attr("transform", d => `translate(${xScale(d.year)}, ${height})`);

      spikesEnter
        .append("line")
        .attr("class", "stem")
        .attr("y1", 0)
        .attr("y2", 0)
        .attr("stroke", "#555")
        .attr("stroke-width", 2);

      spikesEnter
        .append("circle")
        .attr("class", "dot")
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("r", 3)
        .attr("fill", "#d95f02");

      const spikesMerge = spikesEnter.merge(spikes);

      // Move each spike group to its x position and animate vertically
      spikesMerge
        .transition()
        .duration(600)
        .attr("transform", d => `translate(${xScale(d.year)}, 0)`);

      // Animate spike height (line from bottom up to the data value)
      spikesMerge
        .select(".stem")
        .transition()
        .duration(600)
        .attr("y1", height)
        .attr("y2", d => yScale(yValue(d)));

      // Animate dot position and size (larger dot for peak years)
      spikesMerge
        .select(".dot")
        .transition()
        .duration(600)
        .attr("cy", d => yScale(yValue(d)))
        .attr("r", d => {
          const val = yValue(d);
          // Highlight high values in the top ~30% of the y-range
          return val >= yDomain[1] * 0.7 ? 6.5 : 4.5;
        })
        .attr("class", d => {
          const val = yValue(d);
          // "big-dot" class is used in CSS to style peak years
          return val >= yDomain[1] * 0.7 ? "dot big-dot" : "dot";
        });

      // Tooltip events for each spike (group)
      spikesMerge
        .on("mouseover", (event, d) => {
          const val = yValue(d);
          const valText =
            currentMode === "normalized"
              ? (val * 100).toFixed(2) + "%"
              : val;

          tooltip
            .style("opacity", 1)
            .html(
              `<strong>${keyword}</strong><br/>Year: ${d.year}<br/>Value: ${valText}`
            )
            .style("left", event.pageX + 10 + "px")
            .style("top", event.pageY - 20 + "px");
        })
        .on("mousemove", event => {
          tooltip
            .style("left", event.pageX + 10 + "px")
            .style("top", event.pageY - 20 + "px");
        })
        .on("mouseout", () => {
          tooltip.style("opacity", 0);
        });
    }
    window.addEventListener("keywordchange", (e) => {
      update(e.detail.value);
      select.property("value", e.detail.value);
      console.log("Keyword changed:", e);
    });
    // 5. Keyword dropdown change handler
    select.on("change", event => {
      const keyword = event.target.value;
      update(keyword);
    });

    // 6. Mode (raw / normalized) radio button change handler
    d3.selectAll("input[name='mode']").on("change", event => {
      currentMode = event.target.value;
      update(currentKeyword);
    });

    // Initial render with the default keyword
    update(currentKeyword);
  });
}

window.initBurst = initBurst;

// // ---- 0. Global state ----
// let currentMode = "raw";
// let currentKeyword = null;

// function initBurst(containerSelector) {
//   // 0) Use the container provided by the dashboard
//   const root = d3.select(containerSelector);

//   // 1) Create required UI elements INSIDE this container (so we don't depend on HTML)
//   // If you already created these in HTML, you can skip this block and just select them.
//   root.html(""); // clear container once

//   // Controls row (dropdown + mode radios)
//   const controls = root.append("div").attr("class", "burst-controls");

//   controls.append("label").text("Keyword: ");
//   const select = controls.append("select").attr("id", "keyword-select");

//   controls.append("span").style("margin-left", "16px").text("Mode: ");

//   const modeWrap = controls.append("span").attr("class", "mode-wrap");
//   modeWrap
//     .append("label")
//     .html(`<input type="radio" name="mode" value="raw" checked /> Raw`);
//   modeWrap
//     .append("label")
//     .style("margin-left", "8px")
//     .html(`<input type="radio" name="mode" value="normalized" /> Normalized`);

//   // Tooltip (create it here so it always exists)
//   const tooltip = root
//     .append("div")
//     .attr("id", "tooltip")
//     .style("position", "absolute")
//     .style("opacity", 0);

//   // Chart area
//   const chartDiv = root.append("div").attr("class", "burst-chart");

//   // 2) SVG layout setup (your original code, but now uses chartDiv instead of #chart)
//   const margin = { top: 40, right: 30, bottom: 40, left: 80 };
//   const width = 900 - margin.left - margin.right;
//   const height = 400 - margin.top - margin.bottom;

//   const svg = chartDiv
//     .append("svg")
//     .attr("width", width + margin.left + margin.right)
//     .attr("height", height + margin.top + margin.bottom)
//     .append("g")
//     .attr("transform", `translate(${margin.left},${margin.top})`);

//   const titleText = svg
//     .append("text")
//     .attr("class", "chart-title")
//     .attr("x", width / 2)
//     .attr("y", -15)
//     .attr("text-anchor", "middle")
//     .style("font-weight", "bold")
//     .text("");

//   // 3) Load dataset  ✅ IMPORTANT: path changed for group folder structure
//   d3.csv("data/keyword_year_count_with_norm.csv").then(data => {
//     data.forEach(d => {
//       d.year = +d.year;
//       d.count = +d.count;
//       d.normalized = +d.normalized;
//     });

//     const years = Array.from(new Set(data.map(d => d.year))).sort((a, b) => a - b);

//     const totalByKeyword = d3.rollup(
//       data,
//       v => d3.sum(v, d => d.count),
//       d => d.keyword
//     );

//     const topKeywords = Array.from(totalByKeyword, ([keyword, total]) => ({ keyword, total }))
//       .sort((a, b) => d3.descending(a.total, b.total))
//       .slice(0, 50);

//     // Populate dropdown (select is the one we created above)
//     select
//       .selectAll("option")
//       .data(topKeywords)
//       .enter()
//       .append("option")
//       .attr("value", d => d.keyword)
//       .text(d => `${d.keyword} (${d.total})`);

//     currentKeyword = topKeywords[0].keyword;

//     // Scales and axes
//     const xScale = d3.scalePoint().domain(years).range([0, width]).padding(0.5);
//     const xAxis = d3.axisBottom(xScale);

//     svg.append("g")
//       .attr("class", "x-axis")
//       .attr("transform", `translate(0, ${height})`)
//       .call(xAxis);

//     const yScale = d3.scaleLinear().range([height, 0]);
//     const yAxisG = svg.append("g").attr("class", "y-axis");

//     const yLabel = svg
//       .append("text")
//       .attr("class", "y-label")
//       .attr("x", -height / 2)
//       .attr("y", -55)
//       .attr("transform", "rotate(-90)")
//       .attr("text-anchor", "middle")
//       .text("Number of articles");

//     function getYValueAccessor() {
//       return currentMode === "normalized" ? d => d.normalized : d => d.count;
//     }

//     function makeYAxis() {
//       return currentMode === "normalized"
//         ? d3.axisLeft(yScale).tickFormat(d => (d * 100).toFixed(1) + "%")
//         : d3.axisLeft(yScale);
//     }

//     function getYDomain(filtered) {
//       const yValue = getYValueAccessor();
//       const maxVal = d3.max(filtered, yValue) || 0;
//       return [0, maxVal * 1.1];
//     }

//     function updateYAxisLabel() {
//       yLabel.text(currentMode === "normalized" ? "Share of yearly articles" : "Number of articles");
//     }

//     function updateTitle(keyword) {
//       const modeLabel =
//         currentMode === "normalized"
//           ? "Normalized share of yearly articles"
//           : "Raw article count";
//       titleText.text(`${keyword} – ${modeLabel}`);
//     }

//     function update(keyword) {
//       currentKeyword = keyword;

//       const filtered = data
//         .filter(d => d.keyword === keyword)
//         .sort((a, b) => d3.ascending(a.year, b.year));

//       const yDomain = getYDomain(filtered);
//       yScale.domain(yDomain).nice();

//       yAxisG.transition().duration(500).call(makeYAxis());
//       updateYAxisLabel();
//       updateTitle(keyword);

//       const yValue = getYValueAccessor();

//       const spikes = svg.selectAll(".spike").data(filtered, d => d.year);
//       spikes.exit().remove();

//       const spikesEnter = spikes
//         .enter()
//         .append("g")
//         .attr("class", "spike")
//         .attr("transform", d => `translate(${xScale(d.year)}, ${height})`);

//       spikesEnter.append("line")
//         .attr("class", "stem")
//         .attr("y1", 0)
//         .attr("y2", 0)
//         .attr("stroke", "#555")
//         .attr("stroke-width", 2);

//       spikesEnter.append("circle")
//         .attr("class", "dot")
//         .attr("cx", 0)
//         .attr("cy", 0)
//         .attr("r", 3);

//       const spikesMerge = spikesEnter.merge(spikes);

//       spikesMerge.transition().duration(600)
//         .attr("transform", d => `translate(${xScale(d.year)}, 0)`);

//       spikesMerge.select(".stem").transition().duration(600)
//         .attr("y1", height)
//         .attr("y2", d => yScale(yValue(d)));

//       spikesMerge.select(".dot").transition().duration(600)
//         .attr("cy", d => yScale(yValue(d)))
//         .attr("r", d => (yValue(d) >= yDomain[1] * 0.7 ? 6.5 : 4.5));

//       spikesMerge
//         .on("mouseover", (event, d) => {
//           const val = yValue(d);
//           const valText = currentMode === "normalized" ? (val * 100).toFixed(2) + "%" : val;

//           tooltip
//             .style("opacity", 1)
//             .html(`<strong>${keyword}</strong><br/>Year: ${d.year}<br/>Value: ${valText}`)
//             .style("left", event.pageX + 10 + "px")
//             .style("top", event.pageY - 20 + "px");
//         })
//         .on("mousemove", event => {
//           tooltip.style("left", event.pageX + 10 + "px").style("top", event.pageY - 20 + "px");
//         })
//         .on("mouseout", () => tooltip.style("opacity", 0));
//     }

//     // UI events
//     select.on("change", event => update(event.target.value));

//     d3.select(root.node()).selectAll("input[name='mode']").on("change", event => {
//       currentMode = event.target.value;
//       update(currentKeyword);
//     });

//     // Initial render
//     update(currentKeyword);

//     // Expose an update hook for main.js coordination (optional)
//     window.updateBurst = function (state) {
//       if (state && state.selectedKeyword) {
//         update(state.selectedKeyword);
//         // Also sync dropdown UI
//         select.property("value", state.selectedKeyword);
//       }
//     };
//   });
// }

// // Expose init function globally so main.js can call it
// window.initBurst = initBurst;
