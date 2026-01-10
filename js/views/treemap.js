
// Generative AI Disclosure:
// This implementation uses patterns for the "Zoomable Treemap" adapted from 
// D3.js community examples. 
// Generative AI (Gemini 3) was used to:
// 1. Debug the 'foreignObject' text wrapping logic.
// 2. Refine the transition logic within the 'zoom' function.
let globalRoot; 
let globalZoomFunction;
function resetZoom() {
    if(globalRoot && globalZoomFunction) globalZoomFunction(globalRoot);
}

function initTreemap(containerSelector){
// Set 21-color scheme https://www.r-bloggers.com/2013/02/the-paul-tol-21-color-salute/
const color = d3.scaleOrdinal([
  "#771155", "#AA4488", "#CC99BB", "#114477", "#4477AA", "#77AADD", "#117777", 
  "#44AAAA", "#77CCCC", "#117744", "#44AA77", "#88CCAA", "#777711", "#AAAA44", 
  "#DDDD77", "#774411", "#AA7744", "#DDAA77", "#771122", "#AA4455", "#DD7788"])


d3.json("data/treedata.json").then(data => {
  plotTreeMap(data);
});


const plotTreeMap = function(data) {
  const width = 1600, height = 680;
  
  const x = d3.scaleLinear().domain([0, width]).rangeRound([0, width]);
  const y = d3.scaleLinear().domain([0, height]).rangeRound([0, height]);

  d3.select(containerSelector).selectAll("*").remove();
  
  const svg = d3.select(containerSelector)
    .append("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("width", width)
    .attr("height", height)
    .attr("style", "max-width: 100%; height: auto; height: intrinsic;")
    .attr("font-family", "sans-serif")
    .attr("font-size", "10px");


  // 1. Create the hierarchical layout with d3.hierarchy
  // Ref: https://d3js.org/d3-hierarchy/hierarchy
  const root = d3.hierarchy(data)
    // Define the variable to be sum on the hierarchy
    .sum(d => d.value)
    // Define the sorting method for nodes
    .sort((a, b) => d3.descending(a.value, b.value));


  // 2. Compute the treemap layout
  // Ref: https://d3js.org/d3-hierarchy/treemap
  d3.treemap()
      .tile(d3.treemapSquarify)
      .size([width, height])
      .padding(0) // remove padding as the layout becomes weird with the smaller sections and later color in the nodes themselves
    (root);

  //console.log(root);
  // add interactive zoom logic
  globalZoomFunction = zoom;
  globalRoot = root;

   let group = svg.append("g")
        .call(render, root);

  // Rendering Logic, Adapted from: Mike Bostock, "Zoomable Treemap"
  // Original Source: https://observablehq.com/@d3/zoomable-treemap
  function render(group, root) {
        const nodes = root.children;

        const node = group
            .selectAll("g")
            .data(nodes)
            .join("g");

        node.filter(d => d.children)
            .attr("cursor", "pointer")
            .on("click", (event, d) => zoom(d));

        node.append("title")
            .text(d => `${d.data.name}\n${d3.format(",")(d.value)} articles`);

        node.append("rect")
            .attr("fill", d => {
                const key = d.depth > 1 ? d.parent.data.name : d.data.name;
                return color(key);
            })
            .attr("fill-opacity", d => d.data.name.includes("Others") ? 0.7 : 1)
          
            .attr("stroke", "#fff") 
            .attr("stroke-width", 1);
        
        // Using foreignObject for HTML text wrapping inside SVG
        // Ref: https://developer.mozilla.org/en-US/docs/Web/SVG/Element/foreignObject
        node.append("foreignObject")
            .attr("pointer-events", "none")
            .append("xhtml:div")
            .attr("class", "node-label")
            .style("color", "white")
            .text(d => d.data.name);

        position(group, root);
    }
// Here is the function to calculate node positions based on the zoom scale
// Ref: adapted from: https://observablehq.com/@d3/zoomable-treemap
    function position(group, root) {
        group.selectAll("g")
            .attr("transform", d => `translate(${x(d.x0)},${y(d.y0)})`);

        group.selectAll("rect")
            .attr("width", d => Math.max(0, x(d.x1) - x(d.x0))) 
            .attr("height", d => Math.max(0, y(d.y1) - y(d.y0))); 

        group.selectAll("foreignObject")
            .attr("width", d => Math.max(0, x(d.x1) - x(d.x0)))
            .attr("height", d => Math.max(0, y(d.y1) - y(d.y0)));
    }
// Zoom in and out transition logic,
// Ref: also adapted from: https://observablehq.com/@d3/zoomable-treemap
    function zoom(d) {
        const header = document.getElementById("header");
        if(d === globalRoot) header.innerText = "NYT Archive | All Sections";
        else header.innerText = "Back to All Sections |  " + d.data.name;

        const group0 = group.attr("pointer-events", "none");
        const group1 = group = svg.insert("g", "*").call(render, d);

        x.domain([d.x0, d.x1]);
        y.domain([d.y0, d.y1]);

        svg.transition()
            .duration(750)
            .call(t => group0.transition(t).remove()
                .call(position, d.parent))
            .call(t => group1.transition(t)
                .attrTween("opacity", () => d3.interpolate(0, 1))
                .call(position, d));
    }
    
    window.addEventListener("resize", () => {
         plotTreeMap(data);
    });
}


}