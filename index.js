// globals
var MAP, LABELS, DATA;
DATA_COUNTRIES = {};
CENTROIDS = {};
var MIN_ZOOM = 2;
var MAX_ZOOM = 18;

$(document).ready(function(){
  initDOM();
  initD3();

});
  
////////////////////////////////////////////////////
// Named functions
////////////////////////////////////////////////////

function initDOM() {
  // Select and append DOM elements to hold the charts and map
  var summary_chart = d3.select("body").append("table").attr("class","summary");
  var map = d3.select('body').append("div").attr("id","map");
  var primary_chart = d3.select("body").append("table").attr("class","primary");

}

function initD3() {
  // initial D3 setup
  var width = 1000,
      barHeight = 20;

  var x = d3.scale.linear()
      .domain([0, 10])
      .range([0, width]);

  // structure county centoids for use below
  d3.csv("data/countries.csv", function(countries){
      countries.forEach(function(country){
        var c = {
          lat: country.latitude,
          lng: country.longitude,
          abbreviation: country.country,
          count: 0,
        }
        DATA_COUNTRIES[country.name] = c;
      });
  });

  // Get the data and, when ready, create the charts
  d3.csv("data/data.csv", function(data) {
    data.forEach(function(d){
      var countries = d.country.split(',');
      // at present, sum all - so stuides with multiple countries will get multiple icons
      countries.forEach(function(country) {
        // skip bad matches
        if (DATA_COUNTRIES[country] === undefined) return;
        DATA_COUNTRIES[country]["count"] = DATA_COUNTRIES[country]["count"] += 1;
      })
    })

    // First, make the summary chart, by theme
    makeChart(data, 'theme', d3.select("table.summary"));
    // Next, make the "primary chart", by variable
    makeChart(data, 'variable', d3.select("table.primary"), true);

    // now we have the data we need for the map
    initMap();

  }); // d3.csv
}


function initMap() {
  // init the map with some basic settings
  MAP = L.map('map',{
    minZoom: MIN_ZOOM,
    maxZoom: MAX_ZOOM,
    keyboard: false,
  });

  // add a positron basemap, without labels
  var positron = L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_nolabels/{z}/{x}/{y}.png', {
    attribution: '©OpenStreetMap, ©CartoDB'
  }).addTo(MAP);

  // then create a tile pane for the labels, and add positron labels to it (only at high zoom)
  MAP.createPane('labels');
  MAP.getPane('labels').style.zIndex = 650;
  MAP.getPane('labels').style.pointerEvents = 'none';
  LABELS = L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_only_labels/{z}/{x}/{y}.png', {
    attribution: '©OpenStreetMap, ©CartoDB',
    pane: 'labels'
  });

  // add div icons to the map for each distinct country where count > 1 
  var countries = Object.keys(DATA_COUNTRIES);
  var markers = L.featureGroup().addTo(MAP);
  countries.forEach(function(name){
    if (DATA_COUNTRIES[name] === undefined) return;
    if (DATA_COUNTRIES[name].count === undefined) return;
    if (DATA_COUNTRIES[name].lat === undefined || DATA_COUNTRIES[name].lng === undefined) return;
    if (DATA_COUNTRIES[name].count > 0) {
      var country = DATA_COUNTRIES[name];
      var icon = L.divIcon({
        className: 'country-icon',
        html: '<span class="icon-text">'+ country.count +'</span>'
      });
      var marker = L.marker([country.lat, country.lng], {icon: icon}).addTo(markers);
    }

  });

  MAP.fitBounds(markers.getBounds());

}


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


///////////////////////////////////////////////////////////////////////////////////
// Shims and utilities
///////////////////////////////////////////////////////////////////////////////////

// L.TopoJSON to pretend that TopoJSON is just plain ol' GeoJSON
L.TopoJSON=L.GeoJSON.extend({addData:function(a){var b=this;return"Topology"===a.type?Object.keys(a.objects).forEach(function(c){var d=topojson.feature(a,a.objects[c]);L.GeoJSON.prototype.addData.call(b,d)}):L.GeoJSON.prototype.addData.call(this,a),this}});

// utility function to turn an integer into an array from 0 to n
function range(n) {
  var array = [];
  for (var i = 0; i <= n - 1; i++) {
    array.push(i)
  }
  return array;
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
