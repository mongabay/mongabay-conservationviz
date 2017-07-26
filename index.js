//
// Global declarations
//
// data variables
var rawdata; 
var lookup = {};

// map constants
var map;
var markers;
var min_zoom= 2;
var max_zoom= 18;

// define a transition, will occur over 750 milliseconds
// TO DO: Best place to put this? 
var tfast = d3.transition().duration(750);

// register events to emit & listen for via d3 dispatch
var dispatch = d3.dispatch("load", "leaflet", "statechange");

// get data and a callback when download is complete
d3.queue()
    .defer(d3.csv, 'data/lookup.csv')
    .defer(d3.csv, 'data/data.csv')
    .await(main);

// set a window resize callback
$(window).on("resize", _.debounce(function () {
  updateall();
  $("div.top.outergroup").height(config[themes.top]["height"]);
  $("div.bottom.outergroup").height(config[themes.bottom]["height"]);
}, 250));

// callback from d3.queue()
// countries TO DO: save this with the lookup, to have a single source
function main(error, lookups, data) {
  if (error) throw error;
  
  // Pre-processing of lookup table: parse lookup list into a global lookup object
  lookups.forEach(function(d) {
    lookup[d.key] = d;    
  });
  
  // Pre-processing of data
  // 1) get a count of countries in the data, and save to countries_keyed
  // 2) coerce string valence into intenger
  // 3) generate list of strengths present in the data
  countries_keyed = {};
  strengthlist = [];
  data.forEach(function(d) {
    // d.country can be a list of countries, so check for that, and split if so
    var names = d.fips.indexOf(",") ? d.fips.split(",") : [d.fips];
    names.forEach(function(fips){
      // trim whitespace
      if (fips == "") return;
      fips = fips.trim();
      if (typeof countries_keyed[fips] === "undefined") countries_keyed[fips] = {"count": 0};
      countries_keyed[fips]["count"] += 1;
      countries_keyed[fips]["name"] = lookup[fips]["name"];
      countries_keyed[fips]["latitude"] = lookup[fips]["latitude"];
      countries_keyed[fips]["longitude"] = lookup[fips]["longitude"];
    });  
    // transform string valence into intenger
    d.valence = +d.valence;
    // generate list of strengths present in the data
    strengthlist.push(d.strength.trim());
    
  });

  // Post-processing:
  // - sort and remove duplicates, then generate select options
  strengthlist = _.without(_.uniq(strengthlist.sort()), "");
  // - keep global reference to raw data
  rawdata = data;

  // Data prep all done: 
  // call our dispatch events with `this` context, and corresponding data
  dispatch.call("load", this, {stengths: strengthlist, countries_keyed: countries_keyed}); 
  dispatch.call("statechange", this, data);

}

// listen for "load" and calculate global container dimensions based on incoming data
// these will set the height for the top and bottom svg containers
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
  // get countries names from countries_keyed
  var countries = _.map(options["countries_keyed"], function(c) {return c.name});

  // COUNTRY FILTER
  var select = d3.select("select#country");
  // append options to select dropdown
  select.selectAll("option")
      .data(countries)
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


// Top chart setup after data load
dispatch.on("load.topchart", function(map) {
  // select the element to hold our top charts
  var container = d3.select(".top")
    .style("width", config[themes.top]["width"] + "px")
    .style("height", config[themes.top]["height"] + "px")
    .classed("outergroup",true);

  // register a callback to be invoked which updates the chart when "statechange" occurs
  dispatch.on("statechange.topchart", function(data) {
    var data = nest(data,themes.top);
    calcOffsets(data,themes.top);
    update(data, container, tfast, themes.top);
  });
});

// Bottom chart setup after data load
dispatch.on("load.bottomchart", function(map) {
  // select the element to hold our bottom charts
  var container = d3.select(".bottom")
    .style("width", config[themes.bottom]["width"] + "px")
    .style("height", config[themes.bottom]["height"] + "px")
    .classed("outergroup",true);

  // register a callback to be invoked which updates the chart when "statechange" occurs
  dispatch.on("statechange.bottomchart", function(data) {
    var data = nest(data,themes.bottom);
    calcOffsets(data, themes.bottom);
    update(data, container, tfast, themes.bottom);
  });
});

// 
// Map setup after data load
//
dispatch.on("load.leaflet", function(data) {

  // set the map width from config
  document.selectElementbyId('map').style.setAttr("height",config[])

  // init the map with some basic settings
  map = L.map('map',{
    minZoom:min_zoom,
    maxZoom:max_zoom,
    keyboard: false,
    scrollWheelZoom: false,
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
  markers = L.featureGroup().addTo(map);
  countries.forEach(function(name){
    // skip countries that don't have matching name, counts, lat/lngs, etc.
    if (countries_keyed[name] === undefined) return;
    if (countries_keyed[name].count === undefined || countries_keyed[name].count == 0) return;
    if (countries_keyed[name].latitude === undefined || countries_keyed[name].longitude === undefined) return;
    if (countries_keyed[name].latitude === "" || countries_keyed[name].longitude === "") return;
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
        setTimeout(function() {map.closePopup()}, 800); 
      });
    }
  });
  map.fitBounds(markers.getBounds());
}); // load.leaflet

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
    .style("left", function(d) {
      var x = 0; // col offset
      // which column are we in?
      var col = config[group][d.key]["col"];
      // define the start x position, column * colwidth, minus one colwidth
      var fullcol = config[group]["colwidth"];
      var x = (col * fullcol) - fullcol;
      if (x > 0) x += config[group]["colmargin"];
      return x + "px";
    })
    .style("top", function(d) {
      var y = config[group][d.key]["offset_y"]; // row offset
      return y + "px";
    })
    .style("height", function(d,i) {
      return (config[group][d.key]["totalrows"] * config[group]["sqsize"]) + "px"
    });

  // create new rows if our updated dataset has more than the previous
  var rowenter = rows.enter().append("div")
    .attr("class", "row")
    .style("left", function(d) {
      var x = 0; // col offset
      // which column are we in?
      var col = config[group][d.key]["col"];
      // define the start x position, column * colwidth, minus one colwidth
      var fullcol = config[group]["colwidth"];
      var x = (col * fullcol) - fullcol;
      if (x > 0) x += config[group]["colmargin"];
      return x + "px";
    })
    .style("top", function(d) {
      var y = config[group][d.key]["offset_y"]; // row offset
      return y + "px";
    })
    .style("height", function(d,i) {
      return (config[group][d.key]["totalrows"] * config[group]["sqsize"]) + "px"
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
    .style("width", (config[group]["textwidth"] - config[group]["textpadding"] ) + "px")
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
    .style("left", config[group]["textwidth"] + "px")
    .style("top", function(d, i) {
      var key = d3.select(this.parentNode).datum().key;
      var offset = i == 1 ? config[group][key]["chartoffset"] : 0;
      return offset + "px";
    })
    .style("height",function(d) {
      var len   = d.values.length * config[group]["sqsize"];
      var width = (config[group]["colwidth"] - config[group]["textwidth"]);
      var rows  = Math.ceil(len/width)
      return (rows * config[group]["sqsize"]) + "px";
    });


  // 
  // CHARTS: outer svg wrapper
  // 

  charts = rows.selectAll("div.chart");
  var chartcontainers = charts.selectAll("svg")
    .data(function(d) { return [d] }, function(d) { return d.key });

  // exit
  chartcontainers.exit()
    .remove();

  // update
  chartcontainers
    .attr("class","chartcontainer")
    .attr("width", (config[group]["colwidth"] - config[group]["textwidth"]) + "px")
    .attr("height",function(d) {
      var len   = d.values.length * config[group]["sqsize"];
      var width = (config[group]["colwidth"] - config[group]["textwidth"]);
      var rows  = Math.ceil(len/width)
      return (rows * config[group]["sqsize"]) + "px";
    });

  // enter
  chartcontainers.enter().append("svg")
    .attr("class","chartcontainer")
    .attr("width", (config[group]["colwidth"] - config[group]["textwidth"]) + "px")
    .attr("height",function(d) {
      var len   = d.values.length * config[group]["sqsize"];
      var width = (config[group]["colwidth"] - config[group]["textwidth"]);
      var rows  = Math.ceil(len/width)
      return (rows * config[group]["sqsize"]) + "px";
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
    .classed("neutral",function(d) { return d.valence == 0 })
    .classed("plus",function(d) { return d.valence > 0 })
    .classed("minus",function(d) { return d.valence < 0 })
    .classed("weak", function(d) {return d.strength != "strength3" ? true : false})
    .style("width",function(d) {return config[group]["sqsize"] - 1})
    .style("height",function(d) {return config[group]["sqsize"] - 1})
    .on("mouseover", mouseoverTooltip)
    .on("mousemove", mousemoveTooltip)
    .on("mouseout", mouseoutTooltip)
    .transition(tfast)
      .attr("x",function(d,i) {
        var x = calcx(i, config[group]["colwidth"] - config[group]["textwidth"], config[group]["sqsize"]);
        return x;
      })
      .attr("y", function(d,i) {
        var y = calcy(i, config[group]["colwidth"] - config[group]["textwidth"], config[group]["sqsize"]);
        return y;
      });

  // make new squares
  var sqenter = squares.enter()
      .append("rect")
      .classed("neutral",function(d) { return d.valence == 0 })
      .classed("plus",function(d) { return d.valence > 0 })
      .classed("minus",function(d) { return d.valence < 0 })
      .classed("weak", function(d) {return d.strength != "strength3" ? true : false})
      .style("width",function(d) {return config[group]["sqsize"] - 1})
      .style("height",function(d) {return config[group]["sqsize"] - 1})
      .on("mouseover", mouseoverTooltip)
      .on("mousemove", mousemoveTooltip)
      .on("mouseout", mouseoutTooltip)
      .transition(tfast)
        .attr("x",function(d,i) {
          var x = calcx(i, config[group]["colwidth"] - config[group]["textwidth"], config[group]["sqsize"]);
          return x;
        })
        .attr("y", function(d,i) {
          var y = calcy(i, config[group]["colwidth"] - config[group]["textwidth"], config[group]["sqsize"]);
          return y;
        });

} // update

// NAMED FUNCTIONS
function handleMarkerClick(markerdata) {
  // several benefits: other filters are applied, and the dropdown state mirrors map state
  $("select#country").val(markerdata.name).trigger("change");

  // update the icons
  $("div.country-icon").removeClass("selected");
  $(event.target).parent().addClass("selected");
}

function selectMarker(country) {
  markers.eachLayer(function(layer){
    if (layer.data.name == country) {
      $("div.country-icon").removeClass("selected");
      L.DomUtil.addClass(layer._icon, "selected");
    }
  });
}

// define tooltip behavior on mouseover
function mouseoverTooltip(d) {
  d3.select(this).classed("hover", true);
  var split = d.zb_id.split(".");
  var id = (split[0] + "." + split[1]) * 1;
  tooltip.text(lookup[id].name);
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
  d3.select(this).classed("hover", false);
  tooltip.style("visibility", "hidden");
}

var tooltip = d3.select("body")
    .append("div")
    .attr("class","tooltip");


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
    updateall();
  });
}

function updateall() {
  // start with the raw data
  var data = rawdata;

  // apply country filter, if there is one
  var countryoption = d3.select("select#country").node().value;
  if (countryoption) {
    data = filter(data, "country", countryoption);
    selectMarker(countryoption);
  }

  // apply strength filter, if there is one
  var strengthoption = d3.select("select#strength").node().value;
  if (strengthoption) data = filter(data, "strength", strengthoption);

  // All done. Dispatch!
  dispatch.call("statechange",this,data);
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

// Iterate through data in order to calc:
// - overall chart and column area width and height
// - row offsets (spacing between rows)
// - col offsets
// - chart offset, for spacing between plus and minus rows
function calcOffsets(data,group) {
  // placeholder, for the data iteration, below
  var nextoffset = 0; 

  // some initial settings 
  config[group]["chartrows"] = 0; // the actual chart rows (plus and minus)
  config[group]["grouprows"] = data.length - 1; // the named theme rows for this group

  // set some names for convenience
  var sqsize = config[group]["sqsize"];

  // calculate total width of this groups chart
  // as a function of the main container width
  // this will be applied to div.outergroup
  var width = $("div.main").width();
  config["width"] = width;

  // get ncols as configured for this screen width
  var ncols = getCols(width, group);

  // calc col width based on this ncols
  // first, aadjust for margin padding 
  var margin = ncols > 1 ? (ncols - 1) * config[group]["colmargin"] : 0;
  var colwidth = (width - margin) / ncols;
  config[group]["colwidth"]   = colwidth;

  // loop through the chart data to an initial layout of chart rows,
  // and importantly, a total height in one column
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
    var number_that_fit = Math.floor( (colwidth - config[group]["textwidth"]) / sqsize);
    var plusrows = Math.ceil(plus / number_that_fit);
    var minusrows = Math.ceil(minus / number_that_fit);
    var totalrows = plusrows + minusrows;
    config[group][d.key]["totalrows"] = totalrows; // save this for use when rendering
    // calc chart offsets for the minus chart, for this one row
    // this is based on the total count of plus rows, considering overflow
    config[group][d.key]["chartoffset"] = plusrows * sqsize;

    // Next, calc the row offset: rows * the height of one square, plus the bottom margin
    nextoffset = nextoffset + (totalrows * sqsize) + config[group]["rowpadding"];

    // add plus/minus counts at this level (to facilitate sorting)
    config[group][d.key]["pluscount"] = plus;
    config[group][d.key]["minuscount"] = minus;

    // keep a count of rows, from which to calculate total height
    config[group]["chartrows"] += totalrows;

  });

  // all done inital loop, add some calcs based on the sums we've just done
  var charts_height          = config[group]["chartrows"] * sqsize;
  var pad_height             = config[group]["rowpadding"] * config[group]["grouprows"];
  var single_col_height      = (charts_height + pad_height) / ncols;
  config[group]["height"]    = single_col_height;

  // if we have multiple cols, loop again to update offsets, based on col heights we just calc'd
  if (ncols > 1) {
    var curr_height = 0; 
    var nextoffset = 0; var nextcol = 1;
    data.forEach(function(d,i) {
      // Set the current "y" offset, will be zero when i = 0, or when a column resets
      config[group][d.key]["offset_y"] = nextoffset;
      // keep a note of which row this key belongs in 
      config[group][d.key]["col"] = nextcol;

      // check our chart height against the col height and adjust y_offset accordingly
      curr_height += (config[group][d.key]["totalrows"] * sqsize) + config[group]["rowpadding"];
      if (curr_height > single_col_height) {
        // if height > single_col_height, reset nextoffset
        // reset curr_height, and add a column count
        nextoffset = 0;
        nextcol += 1;
        curr_height = 0;
      } else {
        // if not, carry on as before
        nextoffset = nextoffset + (config[group][d.key]["totalrows"] * sqsize) + config[group]["rowpadding"];
      }
    });
  }
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

// scale i per row width, so that the count is based in terms of row width, 
// not a continous linear scale. This makes 13 into 3, 17 into 2, etc. 
function scale_count_per_range(i, number) {
  var row = Math.floor( i / number );
  i = i - (row * number);
  return i;
}

function getCols(w, group) {
  return w > 1200 ? config[group]["ncols_lg"] :
         w > 992  ? config[group]["ncols_md"] :
         w > 768  ? config[group]["ncols_sm"] :
                    config[group]["ncols_xs"];
}