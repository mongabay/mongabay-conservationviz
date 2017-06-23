// initial D3 setup
var width = 1000,
    barHeight = 20;

var x = d3.scale.linear()
    .domain([0, 10])
    .range([0, width]);

// Select and append DOM elements to hold the chart viz
var summary_chart = d3.select("body").append("table").attr("class","summary");
var primary_chart = d3.select("body").append("table").attr("class","main");

// Get the data and, when ready, create the charts
d3.csv("data.csv", function(data) {
  
  // First, make the summary chart, by theme
  makeChart(data, 'theme', summary_chart)

  // Next, make the "primary chart", by variable
  makeChart(data, 'variable', primary_chart, true)

}); // d3.csv
  
////////////////////////////////////////////////////
// Utility functions
////////////////////////////////////////////////////

/**
 * makes a chart of squares
 * @param data:    An array of data
 * @param group:   An item in the data array on which to base chart rows
 * @param chart:   The chart DOM element returned from a d3.select().append()
 * @param tooltip: When true, tooltips will be added to the chart elements
 */
function makeChart(data, group, chart, tooltip=false) {
  // pre-processing....
  // filter data to get just the current theme?
  // var filtered = data.filter(function(d) {return d.theme == 'ENV'});

  // Start by getting a distinct list of the groups that make up the rows in the chart
  var groups = get_distinct(data, group);
  var summaries = [];
  groups.forEach(function(g){
    out = {};
    out["name"]  = g;
    out["plus"]  = [];
    out["minus"] = [];
    out["count"] = 0;
    data.forEach(function(row){
      if (row[group] == g) {
        out.count += 1;
        row.valence > 0 ? out["plus"].push(row) : out["minus"].push(row);
      }
    });
    summaries.push(out);    
  });
  var tr = chart.selectAll("tr")
    .data(summaries).enter()
    .append("tr");

  tr.append('td')
    .attr('class', 'name')
    .html(function(d) { return d.name; });

  var cell = tr.append("td")
    .attr('class','chart');
  
  var plus = cell.append("div")
    .attr('class','plus-div');

  var minus = cell.append("div")
    .attr('class','minus-div');

  plusItems = plus.selectAll("span")
    .data(function(d) {
      // map just the values we need for each individual chart square
      var raw = d.plus.map(function(g) { return {"valence": g.valence, "id": g.zb_id} });
      return raw;
    })
    .enter().append('span')
    .attr('class','plus');

  minusItems = minus.selectAll("span")
    .data(function(d) {
      // map just the values we need for each individual chart square
      var raw = d.minus.map(function(g) { return {"valence": g.valence, "id": g.zb_id} });
      var sorted = _.sortBy(raw, 'valence');
      return sorted;
    })
    .enter().append('span')
    .attr('class','minus')
    .classed('neutral',function(d){
      return d.valence == '' || d.valence == 0; 
    });

    if (tooltip == true) {
      [plusItems, minusItems].forEach(function(item){
        item.on("mouseover", mouseoverTooltip);
        item.on("mousemove", mousemoveTooltip);
        item.on("mouseout", mouseoutTooltip);
      });
    }

  // return something? Why not
  return [plus, minus];
}

// define tooltip behavior on mouseover
function mouseoverTooltip(d) {
  tooltip.text("study: " + d.id);
  tooltip.style("visibility","visible");
}

// define tooltip behavior on mousemove
function mousemoveTooltip(d) {
  tooltip
    .style("top",(d3.event.pageY-10)+"px")
    .style("left",(d3.event.pageX+10)+"px")
    .style("top",(d3.event.pageY-30)+"px");
}

// define tooltip behavior on mouseout
function mouseoutTooltip(d) {
  tooltip.style("visibility", "hidden");
}

var tooltip = d3.select("body")
    .append("div")
    .attr("class","tooltip");

// utility function to turn an integer into an array from 0 to n
function range(n) {
  var foo = [];
  for (var i = 0; i <= n - 1; i++) {
    foo.push(i)
  }
  return foo;
}

function get_distinct(array, key) {
  var unique = {};
  var distinct = [];
  for( var i in array ){
    if( typeof(unique[array[i][key]]) == "undefined"){
      distinct.push(array[i][key]);
    }
    unique[array[i][key]] = 0;
  }
  return distinct;
}

function compare(a,b) {
  if (a.last_nom < b.last_nom)
    return -1;
  if (a.last_nom > b.last_nom)
    return 1;
  return 0;
}
