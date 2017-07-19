//
// Global declarations
//
// data variables
var rawdata; 
var lookup = {};

// map constants
var map;
var min_zoom= 2;
var max_zoom= 18;


// define a transition, will occur over 750 milliseconds
// TO DO: Best place to put this? 
var tfast = d3.transition().duration(750);

// register events to emit & listen for via d3 dispatch
var dispatch = d3.dispatch("load", "leaflet", "statechange");

// get data and a callback when download is complete
d3.queue()
    .defer(d3.csv, 'data/countries.csv')
    .defer(d3.csv, 'data/lookup.csv')
    .defer(d3.csv, 'data/data.csv')
    .await(main);

// callback from d3.queue()
// countries TO DO: save this with the lookup, to have a single source
function main(error, countries, lookups, data) {
  if (error) throw error;
  
  // Pre-processing of lookup table: parse lookup list into a global lookup object
  lookups.forEach(function(d) {
    lookup[d.key] = d;    
  });
  
  // Pre-processing of country data:  
  // 1) parse country data, and add a count field, for use in Leaflet
  var countries_keyed = _.keyBy(countries, o => o.name);
  _.mapValues(countries_keyed, function(val) {
    val.count = 0;
  });
  
  // Pre-processing of data
  // 1) get a count of countries in the data, and save to countries_keyed
  data.forEach(function(d) {
    // d.country can be a list of countries, so check for that, and split if so
    var names = d.country.indexOf(",") ? d.country.split(",") : [d.country];
    names.forEach(function(name){
      // trim whitespace, and skip bad matches 
      name = name.trim();
      if (countries_keyed[name] === undefined) return;
      countries_keyed[name]["count"] = countries_keyed[name]["count"] += 1;
    

    });  
  });

  // 2) generate a list of countries present in data
  // TO DO: combine 1 & 2
  var countrylist = [];
  data.forEach(function(d) {
    // d.country can be a list of countries, so check for that, and split if so
    var country = d.country;
    country = country.indexOf(",") ? country.split(",") : [country];
    countrylist = _.union(countrylist, country.map(function(c) { return c.trim() }));
  });

  // misc: 
  var strengthlist = [];
  data.forEach(function(d) {
    // transform string valence into intenger
    d.valence = +d.valence;
    // generate list of strengths present in the data
    strengthlist.push(d.strength.trim());
  });
  // sort and remove duplicates, then generate select options
  strengthlist = _.without(_.uniq(strengthlist.sort()), "");

  // keep global reference to raw data
  rawdata = data;

  // call our dispatch events with `this` context, and corresponding data
  dispatch.call("load", this, {countries: countrylist, stengths: strengthlist, countries_keyed: countries_keyed}); 
  dispatch.call("statechange", this, data);

}

// listen for "load" and calculate global container dimensions based on incoming data
// these will set the height for the top and bottom svg containers
// spacing of chart squares and chart rows, spacing of group rows etc. 
// This could be extended to the map container in the future as well
dispatch.on("load.setup", function(options) {
  // calc height and width needed for top data, saved to config
  var data = nest(rawdata,themes.top);
  calcOffsets(data,themes.top);

  // calc offsets etc. needed for bottom data, saved to config
  var data = nest(rawdata,themes.bottom);
  calcOffsets(data,themes.bottom);
});

// register a listener for "load" and create dropdowns for various fiters
dispatch.on("load.menus", function(options) {
  
  // COUNTRY FILTER
  var select = d3.select("select#country");
  // append options to select dropdown
  select.selectAll("option")
      .data(options["countries"])
    .enter().append("option")
      .attr("value", function(d) { return d.trim(); })
      .text(function(d) { return d.trim(); });

  // STRENGTH FILTER
  var select = d3.select("select#strength");
  // append strengthoptions to select dropdown
  select.selectAll("option")
      .data(options["stengths"])
    .enter().append("option")
      .attr("value", function(d) { return d; })
      .text(function(d) { return lookup[d]["name"].trim(); });

  // SORT OPTIONS
  // Defined directly in html as <options>, vals and text

  // hack: style the dropdowns using Select2, then show
  $("select").each(function() {
    var select = $(this);
    select.select2({
      placeholder: select.attr("placeholder"),
      minimumResultsForSearch: Infinity,
      allowClear: true
    }).show();
  });
  // because we're using select2, and these options are added dynamically, 
  // we have to use event delegation to listen for changes
  delegate_event("select#country");
  delegate_event("select#strength");
  delegate_event("select#sort");
}); // load.menu

// 
// Map setup after data load
//
dispatch.on("load.leaflet", function(data) {
  // init the map with some basic settings
  map = L.map('map',{
    minZoom:min_zoom,
    maxZoom:max_zoom,
    keyboard: false,
  });
  // add a positron basemap, without labels
  var positron = L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_nolabels/{z}/{x}/{y}.png', {
    attribution: '©OpenStreetMap, ©CartoDB'
  }).addTo(map);

  // then create a tile pane for the labels, and add positron labels to it (only at high zoom)
  map.createPane('labels');
  map.getPane('labels').style.zIndex = 650;
  map.getPane('labels').style.pointerEvents = 'none';
  L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_only_labels/{z}/{x}/{y}.png', {
    attribution: '©OpenStreetMap, ©CartoDB',
    pane: 'labels'
  });

  // add div icons to the map for each distinct country where count > 1
  // count is the number of studies in that country in the raw data 
  var countries_keyed = data.countries_keyed;
  var countries = Object.keys(countries_keyed);
  var markers = L.featureGroup().addTo(map);
  countries.forEach(function(name){
    // skip countries that don't have matching name, counts, lat/lngs, etc.
    if (countries_keyed[name] === undefined) return;
    if (countries_keyed[name].count === undefined) return;
    if (countries_keyed[name].latitude === undefined || countries_keyed[name].longitude === undefined) return;
    if (countries_keyed[name].count > 0) {
      var country = countries_keyed[name];
      var icon = L.divIcon({
        className: 'country-icon',
        html: '<span class="icon-text">'+ country.count +'</span>'
      });
      var marker = L.marker([country.latitude, country.longitude], {icon: icon}).addTo(markers);
      marker.data = country;
      marker.on('click',function(e) { 
        handleMarkerClick(e.target.data); 
      });
      marker.bindPopup(country.name);
      marker.on('mouseover', function (e) {
        this.openPopup();
      });
      marker.on('mouseout', function (e) {
        // this.closePopup();
      });


    }
  });
  map.fitBounds(markers.getBounds());
}); // load.leaflet

// Top chart setup after data load
dispatch.on("load.topchart", function(map) {

  // INITIAL SVG SETUP
  // create an svg element to hold our chart parts
  var svg = d3.select("svg.top")
    .attr("width", config[themes.top]["svgwidth"])
    .attr("height", config[themes.top]["svgheight"])
    .append("g")
      .attr("transform", "translate(" + config[themes.top]["svgmargin"]["left"] + ",0)")
      .attr("class","outergroup")

  // register a callback to be invoked which updates the chart when "statechange" occurs
  dispatch.on("statechange.topchart", function(data) {
    var data = nest(data,themes.top);
    calcOffsets(data,themes.top);
    update(data, svg, tfast, themes.top);
  });
});

// Bottom chart setup after data load
dispatch.on("load.bottomchart", function(map) {

  // INITIAL SVG SETUP
  // create an svg element to hold our chart parts
  var svg = d3.select("svg.bottom")
    .attr("width", config[themes.bottom]["svgwidth"])
    .attr("height", config[themes.bottom]["svgheight"])
    .append("g")
      .attr("transform", "translate(" + config[themes.top]["svgmargin"]["left"] + ",0)")
      .attr("class","outergroup")

  // register a callback to be invoked which updates the chart when "statechange" occurs
  dispatch.on("statechange.bottomchart", function(data) {
    var data = nest(data,themes.bottom);
    calcOffsets(data, themes.bottom);
    update(data, svg, tfast, themes.bottom);
  });

});

function update(data, svg, tfast, group) {

  console.log("statechange data: ", data);

  // bind our new piece of data to our svg element
  // could also do `svg.data([data.values]);`
  svg.datum(data);  

  // 
  // ROWS
  //
  // create svg groups for each data grouping (the top level of nest())
  var rows = svg.selectAll("g.row")
    .data(function(d,i) { return d; }, function(d) {return d.key});

  // remove old rows
  rows.exit().remove();

  // update existing ones left over
  rows.attr("class", "row")
    .transition(tfast)
    .attr("transform", function(d,i) {
      var offset = config[group][d.key]["offset"];
      return "translate(0," + offset + ")";
    });

  // create new rows if our updated dataset has more then the previous
  var rowenter = rows.enter().append("g")
    .attr("class", "row")
    .attr("transform", function(d,i) {
      var offset = config[group][d.key]["offset"];
      return "translate(0," + offset + ")";
    });


  // 
  // TEXT GROUPS
  //
  
  var rows = svg.selectAll("g.row");
  var textgroups = rows.selectAll("g.text")
    .data(function(d) {return [d]}, function(d) {return d.key});

  // get rid of ones we don't need
  textgroups.exit().remove();

  // update existing ones left over
  // no changes it would appear
  // textgroups.attr("class","text")
      
  // add new ones
  textgroups.enter().append("g")
    .attr("class","text")
    .append("text")
    .text(function(d) {return lookup[d.key]["name"]})
    // outergroup adds 40 to left
    // rows add 50 to left
    // so, here pull x back 90
    .attr("x", "-90")
    .attr("y", function(d) {
      var totalheight = config[group][d.key]["totalrows"] * config[group]["sqsize"];
      // TO DO: text is currently 14px, not sure why the
      // addition of 5 seems to center things, but it does
      var y = (totalheight / 2) + 5;
      return y;
    });

  //
  // TEXT LABELS
  //
  var textgroups = rows.selectAll("g.text");
  var text = textgroups.selectAll("text")
    .data(function(d) {return [d]}, function(d) {return d.key});

  // exit
  text.exit().remove();

  // update
  text.text(function(d) {return lookup[d.key]["name"]})
    // outergroup adds 40 to left
    // rows add 50 to left
    // so, here pull x back 90
    .attr("x", "-90")
    .attr("y", function(d) {
      var totalheight = config[group][d.key]["totalrows"] * config[group]["sqsize"];
      // TO DO: text is currently 14px, not sure why the
      // addition of 5 seems to center things, but it does
      var y = (totalheight / 2) + 5;
      return y;
    });

  // enter
  text.enter().append("text")
    .text(function(d) {return lookup[d.key]["name"]})
    // outergroup adds 40 to left
    // rows add 50 to left
    // so, here pull x back 90
    .attr("x", "-90")
    .attr("y", function(d) {
      var totalheight = config[group][d.key]["totalrows"] * config[group]["sqsize"];
      // TO DO: text is currently 14px, not sure why the
      // addition of 5 seems to center things, but it does
      var y = (totalheight / 2) + 5;
      return y;
    });

  //
  // CHART GROUPS
  //
  // tell d3 we want svg groups for each of our chart categories
  // there are currently only two: plus and minus
  // same select-again issue as below?  appears to be so
  var rows = svg.selectAll("g.row");
  var charts = rows.selectAll("g.chart")
    .data(function(d) { return d.values; }, function(d) {return d.key});

  // get rid of the old ones we don't need when doing an update
  charts.exit().remove();

  // calc the start of the chart <g> given the width of the longest text
  // the chart <g> starts at 90 because of outergroup 40 and row 50
  // here we use 90 or longest, whichever is longer, plus a margin of 15px
  var longest = find_longest_text_node(svg);
  var chartstart = longest > 90 ? longest - 90 + 15 : 0;

  // update existing ones left over
  charts.attr("class", "chart")
    .attr("transform", function(d, i) {
      // get the offset, saved in offset{} by the parent node's key
      var key = d3.select(this.parentNode).datum().key;
      // offset never applies to the first row (plus), but only the second row (minus)
      // and only when the first row has to wrap, which we pre-calculated in load.setup
      var offset = i == 1 ? config[group][key]["chartoffset"] : 0;
      return "translate(" + chartstart + ", " + offset + ")";
    });

  // create new ones if our updated dataset has more then the previous
  charts.enter().append("g")
    .attr("class","chart")
    .attr("transform", function(d, i) {
      // get the offset, saved in config{} by the parent node's key
      var key = d3.select(this.parentNode).datum().key;
      // offset never applies to the first row (plus), but only the second row (minus)
      // and only when the first row has to wrap, which we pre-calculated in load.setup
      var offset = i == 1 ? config[group][key]["chartoffset"] : 0;
      return "translate(" + chartstart + ", " + offset + ")";
    });

  // reselect the chart groups, so that we get any new ones that were made
  // our previous selection would not contain them
  charts = rows.selectAll("g.chart");

  //
  // SQUARES: bind data
  //
  var squares = charts.selectAll("rect")
    .data(function(d) { return _.sortBy(d.values,"valence","strength") }, function(d) {return d.zb_id});

  // get rid of ones we don't need anymore, fade them out
  squares.exit()
    .transition(tfast)
    .style("opacity", 1e-6)
      .remove();

  // update existing squares, transition
  squares
    .style("fill-opacity", 1)
    .transition(tfast)
      .attr("x",function(d,i) {
        var x = calcx(i, config[group]["svgwidthscaled"], config[group]["sqsize"]);
        return x * config[group]["sqsize"];
      })
      .attr("y", function(d,i) {
        var y = calcy(i, config[group]["svgwidthscaled"], config[group]["sqsize"]);
        return y;
      });

  // make new squares
  squares.enter().append("rect")
    .classed("neutral",function(d) { return d.valence == 0 })
    .classed("plus",function(d) { return d.valence > 0 })
    .classed("minus",function(d) { return d.valence < 0 })
    .classed("weak", function(d) {return d.strength != "strength3" ? true : false})
    .style("width",function(d) {return config[group]["sqsize"] - 1})
    .style("height",function(d) {return config[group]["sqsize"] - 1})
    .transition(tfast)
      .attr("x",function(d,i) {
        var x = calcx(i, config[group]["svgwidthscaled"], config[group]["sqsize"]);
        return x * config[group]["sqsize"];
      })
      .attr("y", function(d,i) {
        var y = calcy(i, config[group]["svgwidthscaled"], config[group]["sqsize"]);
        return y;
      });
} // update

// NAMED FUNCTIONS
function handleMarkerClick(markerdata) {
  var data = filter(rawdata, "country", markerdata.name);
  dispatch.call("statechange", this, data);
}

// UTILITY FUNCTIONS

// nest our data on selected group, then either "plus" or "minus",
//   depending on value of "valence"
function nest(data,group) { 
  var nested = d3.nest()
    .key(function(d) { return d[group] })
    .key(function(d) {  if (d.valence > 0) { return 'plus'; } return 'minus'; }).sortKeys(d3.descending)
    .entries(data);

  // far from ideal spot to do this:
  // apply a sort field, if there is one
  var sortoption = d3.select("select#sort").node().value;
  if (sortoption) nested = sort(nested, sortoption, group);

  return nested;

} // nest

// Filter data based on a key and a value
function filter(data, key, value) {
    var filtered = data.filter(function(d) {
      // country requires more permissive filtering:
      // country can be a list, or a single country 
      var match;
      if (key == "country") {
        match = d["country"].indexOf(value) > -1; 
      } else {
        match = (d[key] == value);
      }
      return match;
    });
    return filtered;
}

function delegate_event(elem) {
  // use event delegation to dispatch change function from select2 options
  $("body").on("change", elem, function() {
    // start with the raw data
    var data = rawdata;

    // apply country filter, if there is one
    var countryoption = d3.select("select#country").node().value;
    if (countryoption) data = filter(data, "country", countryoption);

    // apply strength filter, if there is one
    var strengthoption = d3.select("select#strength").node().value;
    if (strengthoption) data = filter(data, "strength", strengthoption);

    // All done. Dispatch!
    dispatch.call("statechange",this,data);
  });
}

// custom sort data with optional order
function sort(data, sortoption, group) {
  var sortoptions = sortoption.split("#");
  var sortfield = sortoptions[0]; 
  var reverse = sortoptions[1];

  var sorted = data.sort(function(a,b) {
    var compare = config[group][a.key][sortfield] - config[group][b.key][sortfield];
    return compare;
  });

  if (typeof reverse != "undefined") sorted = sorted.reverse(); 
  return sorted;

}

// calculate row offsets (spacing between rows) given length of chart arrays and overflow
function calcOffsets(data,group) {
  var nextoffset = 0; 
  var sqsize = config[group]["sqsize"];
  var width = config[group]["svgwidthscaled"];
  config[group]["chartrows"] = 0;
  config[group]["themerows"] = data.length - 1;
  // loop through the data and calc some things
  data.forEach(function(d,i) {
    // Add objects for this group
    config[group][d.key] = {};

    // Set this offset
    config[group][d.key]["offset"] = nextoffset;

    // Now calc the next one, for the next iteration
    // first look through values and get sums for plus and minus
    var plus = 0;
    var minus = 0;
    d.values.forEach(function(d) {
      if (d.key == "plus") plus = d.values.length;
      if (d.key == "minus") minus = d.values.length;
    })

    // from these counts, figure out how many rows this takes
    var plusrows  = Math.ceil((plus * sqsize) / width);
    var minusrows = Math.ceil((minus * sqsize) / width);
    var totalrows = plusrows + minusrows;
    // and calc the offset: rows * the height of one square, plus the bottom margin
    nextoffset = nextoffset + (totalrows * sqsize) + config[group]["rowpadding"];

    // add plus/minus counts at this level to facilitate sorting
    config[group][d.key]["pluscount"] = plus;
    config[group][d.key]["minuscount"] = minus;

    // keep a count of rows, from which to calculate total SVG height
    config[group]["chartrows"] += totalrows;

    // now calc chart offsets for this one row
    calcChartOffsets(d, width, d.key, group);
  });

  // all done looping, add some final calcs based on the sums we've just done
  config[group]["rowheight"] = config[group]["chartrows"] * sqsize;
  config[group]["svgheight"] = config[group]["rowheight"] + config[group]["themerows"] * config[group]["rowpadding"]; 

}

// calculate chart offsets (spacing between the two charts in one row) 
// given length of chart arrays and overflow
function calcChartOffsets(data,width,key,group) {
  var nextoffset = 0; 
  var sqsize = config[group]["sqsize"];
  // save row count for text spacing
  config[group][key]["totalrows"] = 0;
  data.values.forEach(function(d) {
    // set this one
    config[group][key]["chartoffset"] = nextoffset;
    // calc the next one:
    // first get count of chart objects
    var rows = d.values.length;
    // figure out how many rows this takes
    var totalrows = Math.ceil((rows * sqsize) / width);
    // and calc the offset: rows * height of one square
    nextoffset = nextoffset + (totalrows * sqsize);

    // save row count for text spacing
    config[group][key]["totalrows"] += totalrows;
  });
}

// calc x position of rectangles, given container width, and square size
function calcx(i,width,sqsize) {
  var number_that_fit = Math.ceil(width / sqsize);
  return x = i + 1 > number_that_fit ? i - number_that_fit : i;
}

// calc y position of rectangles, given container width, and square size
function calcy(i,width,sqsize) {
  var number_that_fit = Math.ceil(width / sqsize);
  var this_row = Math.floor(i / number_that_fit);
  var y = this_row * sqsize;
  return y;
}

function find_longest_text_node(svgcontainer) {
  // find longest text
  var textw = 0;
  svgcontainer.selectAll("text")
    .each(function(t) {
      var text = d3.select(this).node();
      var thiswidth = text.getComputedTextLength();
      textw = thiswidth > textw ? thiswidth : textw;
    });
  return textw;
}