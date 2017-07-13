// global declarations

// data variables
var rawdata, countrylist, strengthlist;

// map
var MAP;
var MIN_ZOOM = 2;
var MAX_ZOOM = 18;

// row heights and widths, rectangle withs
var rowh = 55;
var grph = 20;
var rectw = 20;

// register events to emit & listen for via d3 dispatch
var dispatch = d3.dispatch("load", "leaflet", "statechange");

// get data and a callback when download is complete
d3.queue()
    .defer(d3.csv, 'data/countries.csv')
    .defer(d3.csv, 'data/data.csv')
    .await(main);

function main(error, countries, data) {
  if (error) throw error;
  
  // parse country data, and add a count field, for use in Leaflet
  var countries_keyed = _.keyBy(countries, o => o.name);
  _.mapValues(countries_keyed, function(val) {
    val.count = 0;
  });
  
  // parse raw data
  data.forEach(function(d) {
    // transform string valence into intenger
    d.valence = +d.valence;
  });

  // get a count of countries in the data, and save to countries_keyed
  data.forEach(function(d) {
    var names = d.country.indexOf(",") ? d.country.split(",") : [d.country];
    names.forEach(function(name){
      // trim whitespace, and skip bad matches 
      name = name.trim();
      if (countries_keyed[name] === undefined) return;
      countries_keyed[name]["count"] = countries_keyed[name]["count"] += 1;
    });  
  });

  // generate list of countries present in data
  var countries = [];
  data.forEach(function(d) {
    // d.country can be a list of countries, so check for that, and split if so
    var country = d.country;
    country = country.indexOf(",") ? country.split(",") : [country];
    countries = _.union(countries, country.map(function(c) { return c.trim() }));
  });
  // sort, remove duplicates, remove blanks, and then generate select options
  countries = _.without(_.uniq(countries.sort()), "");
  countries.forEach(function(country) {
    d3.select("select#country")
      .append("option")
      .text(country)
      .attr("value",country.trim())
  });
  
  // generate list of strengths present in the data
  var strengths = [];
  data.forEach(function(d) {
    strengths.push(d.strength.trim());
  });
  // sort and remove duplicates, then generate select options
  strengths = _.without(_.uniq(strengths.sort()), "");
  strengths.forEach(function(strength) {
    d3.select("select#strength")
      .append("option")
      .text(strength)
      .attr("value",strength.trim())
  });

  // keep global references to raw data
  rawdata = data;
  countrylist = countries;
  strengthlist = strengths;

  // nest the data based on a given attribute
  var nested = nest(data,"theme");

  // construct a new d3 map, not as in geographic map, but more like a "hash"
  // TA Interesting structure, not sure if we'll use it here or not
  var map = d3.map(nested, function(d) { return d.key; });

  // call our dispatch events with `this` context, and corresponding data
  // TO DO: what version of data gets dispatched?
  // How to attach buttons? Other controls?
  dispatch.call("load", this, map);
  dispatch.call("leaflet", this, countries_keyed);
  dispatch.call("statechange", this, nested);

}

// register a listener for "load" and create dropdowns for various fiters
dispatch.on("load.menus", function(countries) {
  
  // 
  // COUNTRY FILTER
  // 
  var select = d3.select("select#country");

  // append options to select dropdown
  select.selectAll("option")
      .data(countrylist)
    .enter().append("option")
      .attr("value", function(d) { return d; })
      .text(function(d) { return d; });

  // hack: style the dropdowns using Select2, then show
  $("select#country").select2({
    placeholder: "Select a country",
    minimumResultsForSearch: Infinity,
    allowClear: true
  }).show();

  // 
  // STRENGTH FILTER
  // 
  var select = d3.select("select#strength");

  // append options to select dropdown
  select.selectAll("option")
      .data(strengthlist)
    .enter().append("option")
      .attr("value", function(d) { return d; })
      .text(function(d) { return d; });

  // hack: style the dropdowns using Select2, then show
  $("select").each(function() {
    var select = $(this);
    select.select2({
      placeholder: select.attr("placeholder"),
      minimumResultsForSearch: Infinity,
      allowClear: true
    }).show();
  });

  // and use event delegation to listen for changes
  delegate_event("select#country");
  delegate_event("select#strength");
  delegate_event("select#sort");

  // SORT OPTIONS


}); // load.menu

// 
// initial map setup after data load
//
dispatch.on("leaflet", function(countries_keyed) {

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
}); // leaflet


// inital chart setup after data load
dispatch.on("load.chart", function(map) {
  // layout properties
  var margin      = { top: 0, right: 30, bottom: 0, left: 40 };
  var svgwidth    = 700 - margin.left;
  var svgwidthscaled = svgwidth - 70; // TO DO, why are <g>s bigger than SVG?
  var svgheight   = 230; // TO DO: This will vary considerably between upper and lower charts
                         // and needs to be updated depending on content

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
  var tslow = svg.transition().duration(3850);

  // register a callback to be invoked which updates the chart when "statechange" occurs
  dispatch.on("statechange.chart", function(data) {

    console.log("statechange data: ", data);

    // bind our new piece of data to our svg element
    // could also do `svg.data([data.values]);`
    svg.datum(data);  

    // 
    // ROWS
    //
    // create svg groups for each data grouping (the top level of nest())
    var rows = svg.selectAll("g.row")
      .data(function(d,i) {
        // calculate the origin of the next row, given this row's height 
        calcRowOffsets(d,svgwidthscaled);
        return d;
      }, function(d) {return d.key});

    // remove old rows
    rows.exit().remove();

    // update existing ones left over
    rows.attr("class", "row")
      .transition(tfast)
      .attr("transform", function(d,i) {
        var offset = ("offset" in d) ? d["offset"] : 0;
        return "translate(50," + ((rowh * i) + offset) + ")"
      });

    // create new rows if our updated dataset has more then the previous
    var rowenter = rows.enter().append("g")
      .attr("class", "row")
      .attr("transform", function(d,i) {
        var offset = ("offset" in d) ? d["offset"] : 0;
        return "translate(50," + ((rowh * i) + offset) + ")"
      });

    // append label
    rowenter.append("text")
        .text(function(d) {return d.key})
        .attr("transform", "translate(-90,35)");

    //
    // CHART GROUPS
    //
    // tell d3 we want svg groups for each of our chart categories
    // there are currently only two: plus and minus
    // same select-again issue as below?  appears to be so
    var rows = svg.selectAll("g.row")
    var charts = rows.selectAll("g.chart")
      .data(function(d) { calcChartOffsets(d,svgwidthscaled); return d.values; }, function(d) {return d.key});

    // get rid of the old ones we don't need when doing an update
    charts.exit().remove();

    // update existing ones left over
    charts.attr("class", "chart")
      .attr("transform", function(d, i) {
        var offset = ("offset" in d) ? d["offset"] : 0;
        return "translate(-20," + ((i * grph) + 10 + offset) + ")"
      });

    // create new ones if our updated dataset has more then the previous
    charts.enter().append("g")
      .attr("class","chart")
      .attr("transform", function(d, i) {
        var offset = ("offset" in d) ? d["offset"] : 0;
        return "translate(-20," + ((i * grph) + 10 + offset) + ")"
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
      .transition(tslow)
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
      .classed("weak", function(d) {return d.strength != "Direct correlation" ? true : false})
      .transition(tfast)
        .attr("x",function(d,i) {
          var x = calcx(i,svgwidthscaled); 
          return x * rectw;
        })
        .attr("y", function(d,i) {
          var y = calcy(i,svgwidthscaled);
          return y;
        });

  }); // statechange.chart

}); // load.chart


// NAMED FUNCTIONS
function handleMarkerClick(markerdata) {
  var data = filter(rawdata, {key: "country", value: markerdata.name});
  dispatch.call(
    "statechange",
    this,
    nest(data,"theme")
  );
}

// UTILITY FUNCTIONS

// additively apply filters to rawdata
function apply_filters() {
  // get the current filters
  var country = d3.select("select#country").node().value; 
  var strength = d3.select("select#strength").node().value; 
  var sort = d3.select("select#sort").node().value;

  // apply filters to the raw data, and feed that result filter again
  var data = country ? filter(rawdata, {key: "country", value: country}) : rawdata;
  data = strength ? filter(data, {key: "strength", value: strength}) : data;
  return data;
}

// generic dispatch call
function update(data, theme, key, value) {
  var filtered = filter(data, {key: key, value: value});
  dispatch.call(
    "statechange",
    this,
    nest(filtered,theme)
  );
}

// nest our data on selected field, then either "plus" or "minus",
//   depending on value of "valence"
function nest(data,field) { 
  return d3.nest()
      .key(function(d) { return d[field] })
      .key(function(d) {  if (d.valence > 0) { return 'plus'; } return 'minus'; }).sortKeys(d3.descending)
      .entries(data);
} // nest


// Filter data based on a filter object in the form of 
//   {key: "fieldname to filter", value: "value to match"}
function filter(data, filter) {
    var filtered = data.filter(function(d) {
      // country requires more permissive filtering (match one country in a list)
      var match;
      if (filter.key == "country") {
        match = d["country"].indexOf(filter.value) > -1; 
      } else {
        match = (d[filter.key] == filter.value);
      }
      return match;
    });
    return filtered;
}

function delegate_event(elem) {
  // use event delegation to dispatch change function from select2 options
  $("body").on("change", elem, function() {
      // apply all filters
      var data = apply_filters();
      dispatch.call(
        "statechange",
        this,
        nest(data,"theme")
      );
  });
}


// calculate row offsets given length of chart arrays and overflow
function calcRowOffsets(data,width) {
  var nextoffset = 0; 
  data.forEach(function(d) {
    // set this one
    d["offset"] = nextoffset;

    // calc the next one:
    // first get count of chart objects
    var plus = 0 in d.values ? d.values[0].values.length : 0;
    var minus = 1 in d.values ? d.values[1].values.length : 0;
    // figure out how many rows this takes
    var plusrows  = Math.ceil((plus * rectw) / width);
    var minusrows = Math.ceil((minus * rectw) / width);
    var totalrows = plusrows + minusrows;
    // and calc the offset: "extra" rows times the height of one square
    nextoffset = nextoffset + (totalrows - 2) * rectw;

    // while we're here, add plus/minus counts at this level to facilitate sorting
    d["pluscount"] = plus;
    d["minuscount"] = minus;

  });
}

// calculate chart offsets given length of chart arrays and overflow
function calcChartOffsets(data,width) {
  var nextoffset = 0; 
  data.values.forEach(function(d) {
    // set this one
    d["offset"] = nextoffset;
    // calc the next one:
    // first get count of chart objects
    var rows = d.values.length;
    // figure out how many rows this takes
    var totalrows = Math.ceil((rows * rectw) / width);
    // and calc the offset: "extra" rows times the height of one square
    nextoffset = nextoffset + (totalrows - 1) * rectw;
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
