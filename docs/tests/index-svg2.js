// globals
var DATA_COUNTRIES = {};
var DATA;

var headerGrp, rowsGrp, previousSort, format;
var jsonData = [
{ "id": 3, "name": "Richy", "male": true, "born": "Sun May 05 2013", "amount": 12000},
{ "id": 1, "name": "Susi", "male": false, "born": "Mon May 13 2013", "amount": 2000},
{ "id": 2, "name": "Patrick", "male": true, "born": "Thu Jun 06 2013", "amount": 17000},
{ "id": 4, "name": "Lorenz", "male": true, "born": "Thu May 09 2013", "amount": 15000},
{ "id": 5, "name": "Christina", "male": false, "born": "Mon Jul 01 2013", "amount": 16000}
];
var fieldHeight = 30;
var fieldWidth = 90;

var cellHeight = 19;
var cellWidth = 19;

var chart;

$(document).ready(function(){
  initD3();
});

function initD3() {

  var margin = {top: 20, right: 30, bottom: 30, left: 40},
    width = 960 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;

  var canvas = d3.select("svg.main")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  headerGrp = canvas.append("g").attr("class", "headerGrp");
  rowsGrp = canvas.append("g").attr("class","rowsGrp");

  previousSort = null;
  format = d3.time.format("%a %b %d %Y");
  //var dateFn = function(date) { return format.parse(d.created_at) };

  // Get country data, and structure county centoids for use below
  d3.csv("data/countries.csv", function(countries){
      countries.forEach(function(country){
        var c = {
          lat: country.latitude,
          lng: country.longitude,
          abbreviation: country.country,
          count: 0,
          data: []
        }
        DATA_COUNTRIES[country.name] = c;
      });

      // country data ready: Now get the table data and, when ready, create the charts
      d3.csv("data/data.csv", function(data) {
        data.forEach(function(d){
          // keep a reference to data
          DATA = data;

          var countries = d.country.split(',');
          // at present, sum all - so studies with multiple countries will get multiple icons
          countries.forEach(function(country) {
            // skip bad matches
            if (DATA_COUNTRIES[country] === undefined) return;
            DATA_COUNTRIES[country]["count"] = DATA_COUNTRIES[country]["count"] += 1;
            DATA_COUNTRIES[country]["data"].push(d);
          });
        });

        // data ready: make the chart
        init(null, data, "theme");

      }); // d3.csv

  }); // d3.csv countries

}


function update() {

  var chart = d3.selectAll("rect.chart")
    .select("g")
    .data(function(d) {
      var val = range(getRandom(2,10));
      return typeof d === "string" ? "" : val; 
    })
      .append("g")
    .attr("transform", function(d,i){
      return "translate(" + i * 20 + ",0)";
    });

}

function init(sortfield, data, group){
  // create the table header  
  var header = headerGrp.selectAll("g")
    .data(["first", "second"])
    .enter().append("g")
    .attr("class", "header")
    .attr("transform", function (d, i){
      return "translate(" + i * fieldWidth + ",0)";
    })
    .on("click", function(d){ return refreshTable(d);});
  
  header.append("rect")
    .attr("width", fieldWidth-1)
    .attr("height", fieldHeight);
    
  header.append("text")
    .attr("x", fieldWidth / 2)
    .attr("y", fieldHeight / 2)
    .attr("dy", ".35em")
    .text(String);
  
  // fill the table 
  // select rows

  // Start by getting a distinct list of the groups that make up the rows in the chart
  var groups = get_distinct(data, group);
  var summaries = [];
  groups.forEach(function(g,i){
    out = {};
    out['id']    = i + 1;
    out["name"]  = g;
    out["plus"]  = [];
    out["minus"] = [];
    out["count"] = [1,2,3,4,5];
    data.forEach(function(row){
      if (row[group] == g) {
        out.count += 1;
        row.valence > 0 ? out["plus"].push(row) : out["minus"].push(row);
      }
    });
    summaries.push(out);    
  });

  var rows = rowsGrp.selectAll("g.row")
  .data(summaries, function(d){ return d.id; });
  
  // create rows  
  var rowsEnter = rows.enter().append("svg:g")
    .attr("class","row")
    .attr("transform", function (d, i){
      return "translate(0," + (i+1) * (fieldHeight+1) + ")";
    });

  rows.exit().remove();

  // select cells
  var cells = rows.selectAll("g.cell")
    .data(function(d){
      return [d.name, d];
    });
  
  cells.exit().remove();

  // create cells
  var cellsEnter = cells.enter().append("svg:g")
    .attr("class", "cell")
    .attr("transform", function (d, i){
      return "translate(" + i * fieldWidth + ",0)";
    });
    
  cellsEnter.append("rect")
    .attr("width", fieldWidth-1)
    .attr("height", fieldHeight) 
    .attr("class", function(d) {return typeof d === "string" ? "label" : "chart"});
    
  cellsEnter.append("text")
    .attr("x", fieldWidth / 2)
    .attr("y", fieldHeight / 2)
    .attr("dy", ".35em")
    .text(function(d) {return typeof d === "string" ? d : ""} );
  
  chart = cellsEnter.selectAll("rect.chart")
    .select("g")
    .data(function(d) {
      console.log(d.id);
      var val = range(getRandom(2,10));
      // console.log(val);
      return typeof d === "string" ? "" : val; 
    }), function(d) {return d.id};
  
  chart.exit().remove();
  
  var chartEnter = chart.enter()
    .append("g")
    .attr("transform", function(d,i){
      return "translate(" + i * 20 + ",0)";
    });

  chartEnter.append("rect")
    .attr("width", cellWidth-1)
    .attr("height", cellHeight) 
    .attr("class", "chartcell");


  //update if not in initialisation
  if(sortfield !== null) {
      // update rows
      if(sortfield != previousSort){
        rows.sort(function(a,b){return sort(a[sortfield], b[sortfield]);});     
        previousSort = sortfield;
      }
      else{
        rows.sort(function(a,b){return sort(b[sortfield], a[sortfield]);});
        previousSort = null;
      }
      rows.transition()
        .duration(500)
        .attr("transform", function (d, i){
          return "translate(0," + (i+1) * (fieldHeight+1) + ")";
        });
        
      //update cells
      // rows.selectAll("g.cell").select("text").text(String);
  }
}

function sort(a,b){
  if(typeof a == "string"){
    var parseA = format.parse(a);
    if(parseA){
      var timeA = parseA.getTime();
      var timeB = format.parse(b).getTime();
      return timeA > timeB ? 1 : timeA == timeB ? 0 : -1;
    }
    else 
      return a.localeCompare(b);
  }
  else if(typeof a == "number"){
    return a > b ? 1 : a == b ? 0 : -1;
  }
  else if(typeof a == "boolean"){
    return b ? 1 : a ? -1 : 0;
  }
}

// get distinct list by key from an array of objects 
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

// utility function to turn an integer into an array from 0 to n
function range(n) {
  var array = [];
  for (var i = 0; i <= n - 1; i++) {
    array.push(i)
  }
  return array;
}


function getRandom(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}