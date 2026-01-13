function initYearlySection(containerSelector) {
  const container = d3.select(containerSelector);
  container.html("");

  const chartWrapper = container
    .append("div")
    .style("width", "100%")
    .style("height", "500px");

  const svg = chartWrapper
    .append("svg")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("viewBox", "0 0 900 500")
    .attr("preserveAspectRatio", "xMidYMid meet");

  const width = 900;
  const height = 500;
  const margin = { top: 40, right: 30, bottom: 50, left: 60 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear().range([0, chartWidth]).domain([1999, 2019]);
  const y = d3.scaleLinear().range([chartHeight, 0]);

  const xAxis = d3.axisBottom(x).tickFormat(d3.format("d"));
  const yAxis = d3.axisLeft(y);

  const yGroup = g.append("g").attr("class", "y-axis");

  g.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${chartHeight})`)
    .call(xAxis);

  // X-axis label
  svg
    .append("text")
    .attr("class", "x-label")
    .attr("x", width / 2)
    .attr("y", height)
    .attr("text-anchor", "middle")
    .text("Year");

  // Y-axis label
  svg
    .append("text")
    .attr("class", "y-label")
    .attr("x", -height / 2)
    .attr("y", -5)
    .attr("transform", "rotate(-90)")
    .attr("text-anchor", "middle")
    .text("Number of articles");

  const lineGen = d3
    .line()
    .x((d) => x(d.year))
    .y((d) => y(d.count))
    .curve(d3.curveMonotoneX);

  const tooltip = d3
    .select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

  d3.csv("data/yearly_section_counts.csv", d3.autoType).then((data) => {
    const sections = data.columns.filter((d) => d !== "year");

    const select = d3.select("#section-select");
    select
      .selectAll("option")
      .data(sections)
      .join("option")
      .attr("value", (d) => d)
      .text((d) => d);

    function prepareData(section) {
      return data.map((d) => ({ year: d.year, count: d[section] }));
    }

    function update(chartData) {
      y.domain([0, d3.max(chartData, (d) => d.count) * 1.1]);
      yGroup.transition().duration(750).call(yAxis);

      //const xGroup = g.select(".x-axis");
      //xGroup.transition().duration(750).call(xAxis);
      const path = g.selectAll(".line-path").data([chartData]);

      path.exit().remove();

      path
        .enter()
        .append("path")
        .attr("class", "line-path")
        .merge(path)
        .transition()
        .duration(750)
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 3)
        .attr("d", lineGen);

      const points = g.selectAll(".data-point").data(chartData, (d) => d.year);

      points.exit().remove();

      points
        .enter()
        .append("circle")
        .attr("class", "data-point")
        .attr("r", 5)
        .attr("fill", "steelblue")
        .attr("stroke", "white")
        .attr("stroke-width", 1)
        .on("mouseover", (event, d) => {
          tooltip.transition().duration(200).style("opacity", 0.9);
          tooltip
            .html(`Year: ${d.year}<br>Articles: ${d.count}`)
            .style("left", event.pageX + 10 + "px")
            .style("top", event.pageY - 30 + "px");
        })
        .on("mouseout", () => {
          tooltip.transition().duration(500).style("opacity", 0);
        })
        .merge(points)
        .transition()
        .duration(750)
        .attr("cx", (d) => x(d.year))
        .attr("cy", (d) => y(d.count));
    }

    const initialSection = window.state.selectedSection || sections[0];
    window.state.selectedSection = initialSection;

    update(prepareData(initialSection));

    select.on("change", function () {
      window.state.selectedSection = this.value;
      update(prepareData(window.state.selectedSection));
      if (typeof window.updateAll === "function") {
        window.updateAll();
      }
    });

    window.updateYearlySection = function (state) {
      const sec = state.selectedSection || sections[0];
      update(prepareData(sec));
      select.property("value", sec);
    };
  });
}

window.initYearlySection = initYearlySection;
