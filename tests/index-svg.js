// globals
var DATA_COUNTRIES = {};
var DATA = {};

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
        refreshTable(null, data, "theme");

      }); // d3.csv

  }); // d3.csv countries

}

function refreshTable(sortfield, data, group){
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
    out["count"] = 0;
    data.forEach(function(row){
      if (row[group] == g) {
        out.count += 1;
        row.valence > 0 ? out["plus"].push(row) : out["minus"].push(row);
      }
    });
    summaries.push(out);    
  });
  
  console.log(summaries);

  var rows = rowsGrp.selectAll("g.row")
  .data(summaries, function(d){ return d.id; });
  
  // create rows  
  var rowsEnter = rows.enter().append("svg:g")
    .attr("class","row")
    .attr("transform", function (d, i){
      return "translate(0," + (i+1) * (fieldHeight+1) + ")";
    });

  // select cells
  var cells = rows.selectAll("g.cell").data(function(d){
    // debugger;
    return [d.name, d];
  });
  
  // create cells
  var cellsEnter = cells.enter().append("svg:g")
    .attr("class", "cell")
    .attr("transform", function (d, i){
      return "translate(" + i * fieldWidth + ",0)";
    });
    
  cellsEnter.append("rect")
    .attr("width", fieldWidth-1)
    .attr("height", fieldHeight); 
    
  cellsEnter.append("text")
    .attr("x", fieldWidth / 2)
    .attr("y", fieldHeight / 2)
    .attr("dy", ".35em")
    .attr("class", function(d) {return typeof d === "string" ? "label" : "chart"})
    .text(function(d) {return typeof d === "string" ? d : ""} );
  
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
