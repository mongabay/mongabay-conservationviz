// index.js

var width = 1000,
    barHeight = 20;

var x = d3.scale.linear()
    .domain([0, 10])
    .range([0, width]);

var summary_chart = d3.select("body").append("table").attr("class","summary");
var primary_chart = d3.select("body").append("table").attr("class","main");

d3.csv("data.csv", function(data) {
  // pre-processing....
  // filter data to get just the current theme?
  // var filtered = data.filter(function(d) {return d.theme == 'ENV'});
  
  // get a distinct list of themes for this dataset
  // and generate the summary totals for the top of the app
  var themes = get_distinct(data, 'theme');
  var summaries = [];
  themes.forEach(function(theme){
    out = {};
    out["name"]  = theme;
    out["plus"]  = [];
    out["minus"] = [];
    out["count"] = 0;
    data.forEach(function(row){
      if (row.theme == theme) {
        out.count += 1;
        row.valence > 0 ? out["plus"].push(row) : out["minus"].push(row);
      }
    });
    summaries.push(out);  	
  });

  var tr = summary_chart.selectAll("tr")
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

  plus.selectAll("span")
    .data(function(d) {
      updateTooltip(d); 
      // map just the values we need for each individual chart square
      var raw = d.plus.map(function(g) { return {"valence": g.valence, "id": g.zb_id} });
      return raw;
    })
    .enter().append('span')
    .attr('class','plus')

  minus.selectAll("span")
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
    })

  // get a distinct list of variables from this subset
  var variables = get_distinct(data, 'variable');
  // create an array of objects keyed by variable, with data for that variable collected within
  var primary = [];
  variables.forEach(function(variable){
    out = {};
    out["name"]  = variable;
    out["plus"]  = [];
    out["minus"] = [];
    out["count"] = 0;
    data.forEach(function(row){
      if (row.variable == variable) {
        out.count += 1;
        row.valence > 0 ? out["plus"].push(row) : out["minus"].push(row);
      }
    });
    primary.push(out);
  });

  var tr = primary_chart.selectAll("tr")
    .data(primary).enter()
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

  plus.selectAll("span")
    .data(function(d) {
      updateTooltip(d); 
      // map just the values we need for each individual chart square
      var raw = d.plus.map(function(g) { return {"valence": g.valence, "id": g.zb_id} });
      return raw;
    })
    .enter().append('span')
    .attr('class','plus')
    .on("mouseover", function(d){updateTooltip(d);return tooltip.style("visibility", "visible");})
    .on("mousemove", function(){return tooltip.style("top",
        (d3.event.pageY-10)+"px").style("left",(d3.event.pageX+10)+"px").style("top",(d3.event.pageY-30)+"px");})
    .on("mouseout", function(){return tooltip.style("visibility", "hidden");});

  minus.selectAll("span")
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
    })
    .on("mouseover", function(d){updateTooltip(d); return tooltip.style("visibility", "visible");})
    .on("mousemove", function(){return tooltip.style("top",
        (d3.event.pageY-10)+"px").style("left",(d3.event.pageX+10)+"px").style("top",(d3.event.pageY-30)+"px");})
    .on("mouseout", function(){return tooltip.style("visibility", "hidden");});


}); // d3.csv
  

// Utility functions

function updateTooltip(d) {
  tooltip.text("study: " + d.id);
}

var tooltip = d3.select("body")
    .append("div")
    .style("background","rgba(255,255,255,0.75)")
    .style("box-shadow","1px 2px 4px rgba(0,0,0,0.25)")
    .style("padding","4px")
    .style("position", "absolute")
    .style("z-index", "10")
    .style("visibility", "hidden");


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


