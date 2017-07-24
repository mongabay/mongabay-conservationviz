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
// This could be extended to the map container in the future as well

dispatch.on("load.setup", function(options) {
  // calc height and width needed for top data, saved to config
  var data = nest(rawdata,themes.top);
  calcOffsets(data,themes.top);

  testText(data);

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
  // select the element to hold our top charts
  var container = d3.select(".top")
    .attr("width", config[themes.top]["svgwidth"])
    .attr("height", config[themes.top]["svgheight"])
    .append("div")
      .attr("transform", "translate(" + config[themes.top]["svgmargin"]["left"] + ",0)")
      .attr("class","outergroup")

  // register a callback to be invoked which updates the chart when "statechange" occurs
  dispatch.on("statechange.topchart", function(data) {
    var data = nest(data,themes.top);
    calcOffsets(data,themes.top);
    update(data, container, tfast, themes.top);
  });
});

// Bottom chart setup after data load
dispatch.on("load.bottomchart", function(map) {

  // INITIAL SVG SETUP
  // select the element to hold our bottom charts
  var container = d3.select(".bottom")
    .attr("width", config[themes.bottom]["svgwidth"])
    .attr("height", config[themes.bottom]["svgheight"])
    .append("g")
      .attr("transform", "translate(" + config[themes.bottom]["svgmargin"]["left"] + ",0)")
      .attr("class","outergroup")

  // register a callback to be invoked which updates the chart when "statechange" occurs
  dispatch.on("statechange.bottomchart", function(data) {
    var data = nest(data,themes.bottom);
    calcOffsets(data, themes.bottom);
    update(data, container, tfast, themes.bottom);
  });

});

function update(data, container, tfast, group) {

  console.log("statechange data: ", data);

  // bind our new piece of data to our container element
  // could also do `container.data([data.values]);`
  container.datum(data);  

  // 
  // ROWS
  //
  // create row groups for each data grouping (the top level of nest())
  var rows = container.selectAll("div.row")
    .data(function(d,i) { return d; }, function(d) {return d.key});

  // remove old rows
  rows.exit().remove();

  // update existing ones left over
  rows.attr("class", "row")
    .transition(tfast)
    .style("left", function(d,i) {
      var x = 0; // col offset
      // which column are we in? Row is zero indexed, so add 1 to it
      var col = Math.ceil((i + 1)/config[group]["rowspercol"]);
      // define the start x position, column * colwidth, minus one colwidth
      var fullcol = config[group]["colwidth"] + config[group]["svgmargin"]["left"];
      var x = (col * fullcol) - fullcol;
      return x + "px";
    })
    .style("top", function(d, i) {
        // var y = config[group][d.key]["offset_y"]; // row offset
        // return y;
        return i * 40 + "px";
    });

  // create new rows if our updated dataset has more than the previous
  var rowenter = rows.enter().append("div")
    .attr("class", "row")
    .style("left", function(d,i) {
      var x = 0; // col offset
      // which column are we in? Row is zero indexed, so add 1 to it
      var col = Math.ceil((i + 1)/config[group]["rowspercol"]);
      // define the start x position, column * colwidth, minus one colwidth
      var fullcol = config[group]["colwidth"] + config[group]["svgmargin"]["left"];
      var x = (col * fullcol) - fullcol;
      return x + "px";
    })
    .style("top", function(d, i) {
        // var y = config[group][d.key]["offset_y"]; // row offset
        // return y;
        return i * 80 + "px";
    });


  //
  // TEXT LABELS
  //
  var rows = container.selectAll("div.row");
  var text = rows.selectAll("div.text")
    .data(function(d) {return [d]}, function(d) {return d.key});

  // exit
  text.exit().remove();

  // update
  text.text(function(d) {return lookup[d.key]["name"]});

  // enter
  text.enter().append("div")
    .attr("class","text")
    .text(function(d) {return lookup[d.key]["name"]});


  //
  // CHART GROUPS
  //
  // create chart groups for each of our chart categories
  // there are currently only two: plus and minus
  var rows = container.selectAll("div.row");
  var charts = rows.selectAll("div.chart")
    .data(function(d) { return d.values; }, function(d) {return d.key});

  // get rid of the old ones we don't need when doing an update
  charts.exit().remove();

  // calc the start of the chart <g> given the width of the longest text
  // the chart <g> starts at 100 of outergroup
  // here we use 90 or longest, whichever is longer, plus a margin of 15px
  // var longest = find_longest_text_node(svg);
  // var chartstart = longest > 100 ? longest - 100 + 15 : 0;

  // update existing ones left over
  charts.attr("class", "chart")
    .style("top", function(d, i) {
      var key = d3.select(this.parentNode).datum().key;
      var offset = i == 1 ? config[group][key]["chartoffset"] : 0;
      return offset + "px";
    });

  // create new ones if our updated dataset has more then the previous
  charts.enter().append("div")
    .attr("class","chart")
    .style("left", "100px")
    .style("top", function(d, i) {
      var key = d3.select(this.parentNode).datum().key;
      var offset = i == 1 ? config[group][key]["chartoffset"] : 0;
      return offset + "px";
    });
    // .attr("transform", function(d, i) {
    //   // get the offset, saved in config{} by the parent node's key
    //   var key = d3.select(this.parentNode).datum().key;
    //   // offset never applies to the first row (plus), but only the second row (minus)
    //   // and only when the first row has to wrap, which we pre-calculated in load.setup
    //   var offset = i == 1 ? config[group][key]["chartoffset"] : 0;
    //   return "translate(" + 0 + ", " + offset + ")";
    // });


  // 
  // CHARTS: outer svg wrapper
  // 

  charts = rows.selectAll("div.chart");
  var chartcontainers = charts.selectAll("svg")
    .data(function(d) { return [d] }, function(d) { return d.key });

  // exit
  chartcontainers.exit()
    .remove();

  // enter
  chartcontainers.enter().append("svg")
    .attr("class","chartcontainer")
    .attr("width", function(d) {
      return config[group]["colwidth"];
    });

  //
  // SQUARES: bind data
  //

  // reselect the chart groups, so that we get any new ones that were made
  // our previous selection would not contain them
  charts = rows.selectAll("svg");
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
        var x = calcx(i, config[group]["colwidth"], config[group]["sqsize"]);
        return x;
      })
      .attr("y", function(d,i) {
        var y = calcy(i, config[group]["svgwidthscaled"], config[group]["sqsize"]);
        return y;
      });

  // make new squares
  squares.enter()
    // .append("svg")
      .append("rect")
      .classed("neutral",function(d) { return d.valence == 0 })
      .classed("plus",function(d) { return d.valence > 0 })
      .classed("minus",function(d) { return d.valence < 0 })
      .classed("weak", function(d) {return d.strength != "strength3" ? true : false})
      .style("width",function(d) {return config[group]["sqsize"] - 1})
      .style("height",function(d) {return config[group]["sqsize"] - 1})
      .transition(tfast)
        .attr("x",function(d,i) {
          var x = calcx(i, config[group]["colwidth"], config[group]["sqsize"]);
          return x;
        })
        .attr("y", function(d,i) {
          var y = calcy(i, config[group]["colwidth"], config[group]["sqsize"]);
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
// also calc chart offset, for spacing between plus and minus, given chart count and overflow
// finally, calc and save some sums used to set the overall <svg> height based on all of the above
function calcOffsets(data,group) {
  var nextoffset = 0; 
  var sqsize = config[group]["sqsize"];
  // width, "scaled", and accounting for ncols
  var width = config[group]["svgwidthscaled"];
  config[group]["chartrows"] = 0;
  config[group]["themerows"] = data.length - 1; // why -1?

  // some math to help figure out column lengths and offsets from rows
  config[group]["rowspercol"] = Math.ceil(data.length / config[group]["ncols"]);
  var colwidth = width / config[group]["ncols"];
  config[group]["colwidth"]   = colwidth;

  // loop through the actual chart data and calc more things
  data.forEach(function(d,i) {
    // Add an empty object for this group, e.g. config.theme.ENV
    config[group][d.key] = {};

    // Set the current "y" offset, will be zero when i = 0, or when a column resets
    config[group][d.key]["offset_y"] = nextoffset;

    // Now calc the next one, for the next iteration
    // first look through values and get sums for plus and minus
    var plus = 0;
    var minus = 0;
    d.values.forEach(function(d) {
      if (d.key == "plus") plus = d.values.length;
      if (d.key == "minus") minus = d.values.length;
    });

    // from these counts, figure out how many rows this takes
    var number_that_fit = Math.floor( colwidth / sqsize);
    var plusrows = Math.ceil(plus / number_that_fit);
    var minusrows = Math.ceil(minus / number_that_fit);
    var totalrows = plusrows + minusrows;
    config[group][d.key]["totalrows"] = totalrows; // save this for use when rendering
    // calc chart offsets for the minus chart, for this one row
    // this is based on the total count of plus rows, considering overflow
    config[group][d.key]["chartoffset"] = plusrows * sqsize;

    // Next, calc the row offset: rows * the height of one square, plus the bottom margin
    nextoffset = nextoffset + (totalrows * sqsize) + config[group]["rowpadding"];

    // but wait! what row are we in? If we've just spilled over to the next column, reset nextoffset to 0
    var j = scale_count_per_range(i, config[group]["rowspercol"]);
    if (j + 1 == config[group]["rowspercol"]) nextoffset = 0; 

    // add plus/minus counts at this level to facilitate sorting
    config[group][d.key]["pluscount"] = plus;
    config[group][d.key]["minuscount"] = minus;

    // keep a count of rows, from which to calculate total SVG height
    config[group]["chartrows"] += totalrows;

  });

  // all done looping, add some final calcs based on the sums we've just done
  config[group]["rowheight"] = config[group]["chartrows"] * sqsize;
  config[group]["svgheight"] = config[group]["rowheight"] + config[group]["themerows"] * config[group]["rowpadding"]; 

}

// calc x position of rectangles, given container width, and square size
function calcx(i,width,sqsize) {
  var number_that_fit = Math.floor(width / sqsize);

  // scale i per row width, so that the count is based in terms of row width, 
  // not a continous linear scale. This makes 13 into 3, 17 into 2, etc. 
  i = scale_count_per_range(i, number_that_fit);

  // now compare our position to the number that fit to get an offset
  var rawx = i + 1 > number_that_fit ? i - number_that_fit : i;
  var x = rawx * sqsize;
  return x; 
}

// calc y position of rectangles, given container width, and square size
function calcy(i,width,sqsize) {
  var number_that_fit = Math.floor(width / sqsize);
  var this_row = Math.floor(i / number_that_fit);
  var y = this_row * sqsize;
  return y;
}

function find_longest_text_node(container) {
  // find longest text
  var textw = 0;
  container.selectAll("text")
    .each(function(t) {
      var text = d3.select(this).node();
      var thiswidth = text.getComputedTextLength();
      textw = thiswidth > textw ? thiswidth : textw;
    });
  return textw;
}

function fitsvg() {
  var svg = d3.select("svg.bottom").node();
  var bbox = svg.getBBox();
  svg.attr("width", bbox.x + bbox.width);
  svg.attr("height", bbox.y + bbox.height);
}

// test text widths. Note if we wrap multiple lines, this could also impact row spacing 
function testText(data) {
  var svg = d3.select("body").append("svg")
    .append("g")
    .attr("class","test-text")
    // .style("display","none");

  var rawtext = data.map(function(d) {return d.key});
  var texts = rawtext.map(function(t) { return lookup[t].name });

  svg.selectAll("text")
    .data(texts)
    .enter()
    .append("text")
    .text(function(d) {return d});

  var longest = find_longest_text_node(svg);
  
  d3.select(".test-text").remove();

}

function wrap(text, width) {
  text.each(function() {
    var text = d3.select(this),
        words = text.text().split(/\s+/).reverse(),
        word,
        line = [],
        lineNumber = 0,
        lineHeight = 1.1, // ems
        y = text.attr("y"),
        // we don't have dy attributes
        // dy = parseFloat(text.attr("dy")),
        dy = 0,
        tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");
    while (word = words.pop()) {
      line.push(word);
      tspan.text(line.join(" "));
      if (tspan.node().getComputedTextLength() > width) {
        line.pop();
        tspan.text(line.join(" "));
        line = [word];
        tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
      }
    }
  });
}

// scale i per row width, so that the count is based in terms of row width, 
// not a continous linear scale. This makes 13 into 3, 17 into 2, etc. 
function scale_count_per_range(i, number) {
  var row = Math.floor( i / number );
  i = i - (row * number);
  return i;
}