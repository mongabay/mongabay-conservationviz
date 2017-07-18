//
// Global declarations
//
// data variables
var rawdata; 
var lookup = {};

// offsets lookup, calculated from the data itself on load
var offsets = {};

// map
var MAP;
var MIN_ZOOM = 2;
var MAX_ZOOM = 18;

// row heights and widths, rectangle withs
var grph = 20;
var rectw = 20;
var rowmargin = 10;

// themes to display on top and bottom charts
var themes = {
  top: "theme",
  bottom: "variable"
}

// register events to emit & listen for via d3 dispatch
var dispatch = d3.dispatch("load", "leaflet", "statechange");

// get data and a callback when download is complete
d3.queue()
    .defer(d3.csv, 'data/countries.csv')
    .defer(d3.csv, 'data/lookup.csv')
    .defer(d3.csv, 'data/data.csv')
    .await(main);

// callback from queue
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
// these will set the max dimensions for the top and bottom svg containers
// and could be extended to the map container in the future as well
dispatch.on("load.setup", function(options) {
  // svg width: - top will be a (percentage? fixed amount?) of the screen width
  //            - bottom will be single column on mobile, or 3 cols on Desktop
  // for now, we'll just make this up
  var topwidth    = 680;
  var bottomwidth = 300;

  // calc height and width needed for top data
  var data = nest(rawdata,themes.top);
  calcOffsets(data,topwidth,themes.top);

  // calc offsets etc. needed for bottom data
  var data = nest(rawdata,themes.bottom);
  calcOffsets(data, bottomwidth,themes.bottom);
});

// register a listener for "load" and create dropdowns for various fiters
dispatch.on("load.menus", function(options) {
  
  // 
  // COUNTRY FILTER
  // 
  var select = d3.select("select#country");

  // append options to select dropdown
  select.selectAll("option")
      .data(options["countries"])
    .enter().append("option")
      .attr("value", function(d) { return d.trim(); })
      .text(function(d) { return d.trim(); });

  // 
  // STRENGTH FILTER
  // 
  var select = d3.select("select#strength");

  // append strengthoptions to select dropdown
  select.selectAll("option")
      .data(options["stengths"])
    .enter().append("option")
      .attr("value", function(d) { return d; })
      .text(function(d) { return lookup[d]["name"].trim(); });

  //
  // SORT OPTIONS
  //
  // Note here: defined directly as html option vals and text

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
// initial map setup after data load
//
dispatch.on("load.leaflet", function(data) {

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
  L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_only_labels/{z}/{x}/{y}.png', {
    attribution: '©OpenStreetMap, ©CartoDB',
    pane: 'labels'
  });

  // add div icons to the map for each distinct country where count > 1
  // count is the number of studies in that country in the raw data 
  var countries_keyed = data.countries_keyed;
  var countries = Object.keys(countries_keyed);
  var markers = L.featureGroup().addTo(MAP);
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
    }
  });
  MAP.fitBounds(markers.getBounds());
}); // load.leaflet


// inital chart setup after data load
dispatch.on("load.topchart", function(map) {

  // layout properties specific to the top chart
  var margin      = { top: 0, right: 30, bottom: 0, left: 40 };
  var svgwidth    = 800 - margin.left;
  var svgwidthscaled = svgwidth - 140; // TO DO, why are <g>s bigger than SVG?

  // svg height: Number of chart rows X square height plus spacing between rows
  var nrows     = offsets[themes.top]["themerows"] - 1;
  var rowheight = offsets[themes.top]["chartrows"] * rectw;
  var svgheight = rowheight + (nrows * rowmargin);

  // INITIAL SVG SETUP
  // create an svg element to hold our chart parts
  var svg = d3.select("svg.top")
    .attr("width", svgwidth)
    .attr("height", svgheight)
    .append("g")
      .attr("transform", "translate(" + margin.left + ",0)")
      .attr("class","outergroup")

  // define a transition, will occur over 750 milliseconds
  var tfast = svg.transition().duration(750);

  // register a callback to be invoked which updates the chart when "statechange" occurs
  dispatch.on("statechange.topchart", function(data) {
    var data = nest(data,themes.top);
    update(data, svg, svgwidthscaled, tfast, themes.top);
  });

});

// inital chart setup after data load
dispatch.on("load.bottomchart", function(map) {

  // layout properties specific to the bottom chart
  var margin      = { top: 0, right: 30, bottom: 0, left: 40 };
  var svgwidth    = 800 - margin.left;
  var svgwidthscaled = svgwidth - 140; // TO DO, why are <g>s bigger than SVG?
  var svgheight   = 1230; // TO DO, data specific

  // INITIAL SVG SETUP
  // create an svg element to hold our chart parts
  var svg = d3.select("svg.bottom")
    .attr("width", svgwidth)
    .attr("height", svgheight)
    .append("g")
      .attr("transform", "translate(" + margin.left + ",0)")
      .attr("class","outergroup")

  // define a transition, will occur over 750 milliseconds
  var tfast = svg.transition().duration(750);

  // register a callback to be invoked which updates the chart when "statechange" occurs
  dispatch.on("statechange.bottomchart", function(data) {
    var data = nest(data,themes.bottom);
    update(data, svg, svgwidthscaled, tfast, themes.bottom);
  });

});

function update(data, svg, svgwidthscaled, tfast, group) {

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
        var offset = offsets[group][d.key]["offset"];
        return "translate(50," + offset + ")";
      });

    // create new rows if our updated dataset has more then the previous
    var rowenter = rows.enter().append("g")
      .attr("class", "row")
      .attr("transform", function(d,i) {
        var offset = offsets[group][d.key]["offset"];
        return "translate(50," + offset + ")";
      });


    // 
    // TEXT
    //
    
    // append label
    var text = rowenter.append("text")
        .text(function(d) {return lookup[d.key]["name"]})
        // outergroup adds 40 to left
        // rows add 50 to left
        // so, here pull x back 90
        .attr("x", "-90")
        .attr("y", function(d) {
          var totalheight = offsets[group][d.key]["totalrows"] * rectw;
          // TO DO: text is currently 14px, not sure why the
          // addition of 5 seems to center things, but it does
          var y = (totalheight / 2) + 5;
          return y;
        });

    // calc the start of the chart <g> given the width of the longest text
    // the chart <g> starts at 90 because of outergroup 40 and row 50
    // here we use 90 or longest, whichever is longer, plus a margin of 15px
    var longest = find_longest_text_node(svg);
    var chartstart = longest > 90 ? longest - 90 + 15 : 0;

    //
    // CHART GROUPS
    //
    // tell d3 we want svg groups for each of our chart categories
    // there are currently only two: plus and minus
    // same select-again issue as below?  appears to be so
    var rows = svg.selectAll("g.row")
    var charts = rows.selectAll("g.chart")
      .data(function(d) { return d.values; }, function(d) {return d.key});

    // get rid of the old ones we don't need when doing an update
    charts.exit().remove();

    // update existing ones left over
    charts.attr("class", "chart")
      .attr("transform", function(d, i) {
        // get the offset, saved in offset{} by the parent node's key
        var key = d3.select(this.parentNode).datum().key;
        // offset never applies to the first row (plus), but only the second row (minus)
        // and only when the first row has to wrap, which we pre-calculated in load.setup
        var offset = i == 1 ? offsets[group][key]["chartoffset"] : 0;
        return "translate(" + chartstart + ", " + offset + ")";
      });

    // create new ones if our updated dataset has more then the previous
    charts.enter().append("g")
      .attr("class","chart")
      .attr("transform", function(d, i) {
        // get the offset, saved in offsets{} by the parent node's key
        var key = d3.select(this.parentNode).datum().key;
        // offset never applies to the first row (plus), but only the second row (minus)
        // and only when the first row has to wrap, which we pre-calculated in load.setup
        var offset = i == 1 ? offsets[group][key]["chartoffset"] : 0;
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
          var x = calcx(i,svgwidthscaled); 
          return x * rectw;
        })
        .attr("y", function(d,i) {
          var y = calcy(i,svgwidthscaled);
          return y;
        });

    // make new squares
    squares.enter().append("rect")
      .classed("neutral",function(d) { return d.valence == 0 })
      .classed("plus",function(d) { return d.valence > 0 })
      .classed("minus",function(d) { return d.valence < 0 })
      .classed("weak", function(d) {return d.strength != "strength3" ? true : false})
      .transition(tfast)
        .attr("x",function(d,i) {
          var x = calcx(i,svgwidthscaled); 
          return x * rectw;
        })
        .attr("y", function(d,i) {
          var y = calcy(i,svgwidthscaled);
          return y;
        });



}


// NAMED FUNCTIONS
function handleMarkerClick(markerdata) {
  var data = filter(rawdata, "country", markerdata.name);
  dispatch.call("statechange", this, data);
}

// UTILITY FUNCTIONS

// additively apply filters to rawdata
// function apply_filters() {
//   // get the current filters
//   var country = d3.select("select#country").node().value; 
//   var strength = d3.select("select#strength").node().value; 
//   var sort = d3.select("select#sort").node().value;

//   // apply filters to the raw data, and feed that result filter again
//   var data = country ? filter(rawdata, {key: "country", value: country}) : rawdata;
//   data = strength ? filter(data, {key: "strength", value: strength}) : data;
//   return data;
// }

// generic dispatch call
// function update(data, theme, key, value) {
//   var filtered = filter(data, key, value);
//   dispatch.call(
//     "statechange",
//     this,
//     nest(filtered,theme)
//   );
// }

// nest our data on selected field, then either "plus" or "minus",
//   depending on value of "valence"
function nest(data,field) { 
  var nested = d3.nest()
      .key(function(d) { return d[field] })
      .key(function(d) {  if (d.valence > 0) { return 'plus'; } return 'minus'; }).sortKeys(d3.descending)
      .entries(data);

    // work sort in here before nesting?
    // apply a sort field, if there is one
    var sortoption = d3.select("select#sort").node().value;
    if (sortoption) nested = sort(nested, sortoption);

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

    // for sorting, see nest() call

    // All done. Dispatch!
    dispatch.call("statechange",this,data);
  });
}

// custom sort data with optional order
function sort(data, sortoption) {
  var sortoptions = sortoption.split("#");
  var sortfield = sortoptions[0]; 
  var reverse = sortoptions[1];

  var sorted = _.sortBy(data,sortfield);
  if (typeof reverse != "undefined") sorted = sorted.reverse(); 
  return sorted;
}

// calculate row offsets (spacing between rows) given length of chart arrays and overflow
function calcOffsets(data,width,group) {
  var nextoffset = 0; 
  offsets[group] = {};
  offsets[group]["chartrows"] = 0;
  offsets[group]["themerows"] = data.length;
  data.forEach(function(d,i) {
    // Add objects for this group
    offsets[group][d.key] = {};

    // Set this offset
    offsets[group][d.key]["offset"] = nextoffset;

    // Now calc the next one, for the next iteration
    // first get count of chart objects
    var plus = 0 in d.values ? d.values[0].values.length : 0;
    var minus = 1 in d.values ? d.values[1].values.length : 0;
    // figure out how many rows this takes
    var plusrows  = Math.ceil((plus * rectw) / width);
    var minusrows = Math.ceil((minus * rectw) / width);
    var totalrows = plusrows + minusrows;
    // and calc the offset: rows * the height of one square, plus the bottom margin
    nextoffset = nextoffset + (totalrows * rectw) + rowmargin;

    // add plus/minus counts at this level to facilitate sorting
    offsets[group][d.key]["pluscount"] = plus;
    offsets[group][d.key]["minuscount"] = minus;

    // keep a count of rows, from which to calculate total SVG height
    offsets[group]["chartrows"] += totalrows;

    // now calc chart offsets for this one row
    calcChartOffsets(d, width, d.key, group);
  });
}

// calculate chart offsets (spacing between the two charts in one row) 
// given length of chart arrays and overflow
function calcChartOffsets(data,width,key,group) {
  var nextoffset = 0; 
  // save row count for text spacing
  offsets[group][key]["totalrows"] = 0;
  data.values.forEach(function(d) {
    // set this one
    offsets[group][key]["chartoffset"] = nextoffset;
    // calc the next one:
    // first get count of chart objects
    var rows = d.values.length;
    // figure out how many rows this takes
    var totalrows = Math.ceil((rows * rectw) / width);
    // and calc the offset: rows * height of one square
    nextoffset = nextoffset + (totalrows * rectw);

  // save row count for text spacing
    offsets[group][key]["totalrows"] += totalrows;
  });
}

// calc x position of rectangles, given container width
function calcx(i,width) {
  var number_that_fit = Math.floor(width / rectw);
  return x = i + 1 > number_that_fit ? i - number_that_fit : i;
}

function calcy(i,width) {
  var number_that_fit = Math.floor(width / rectw);
  var this_row = Math.floor(i / number_that_fit);
  var y = this_row * rectw;
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