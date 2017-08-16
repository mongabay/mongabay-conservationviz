//
// Global declarations
//
// data variables
var rawdata; 
var lookup = {};
var selectedgroup = {};

// constants for the map
var map;
var points;
var circles;
var circleScale;
var minzoom= 2;
var maxzoom= 18;

// circle colors on map, for selected and unselected
var circlecolors = {
  "default": "#64b0e0",
  "selected": "#7E3177",
}
defaultStyle  = {"fillColor": circlecolors["default"], "color": circlecolors["default"]};
selectedStyle = {"fillColor": circlecolors["selected"], "color": circlecolors["selected"]};

// define the tooltips
var tooltip = d3.select("div.tooltip");
tooltip.select("span.tooltip-close")
  .on("click", function() { d3.select(this.parentNode).style("display","none") });

// close tooltips when hovering outside the chart
// otherwise they get in the way of the selects and other controls at the top
$("div#select-container").on("mouseover", function() { d3.select("div.tooltip").style("display","none") });

// define a transition in milliseconds
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
  // recalc offets for all groups, then trigger a statechange
  dispatch.call("statechange",this,rawdata);

  // then, resize the containers
  // only needed here if not included in "Statechange"
  resizeContainers();
}, 250));

// callback from d3.queue()
function main(error, lookups, data) {
  if (error) throw error;
  
  // Pre-processing of lookup table: parse lookup list into a global lookup object
  lookups.forEach(function(d) {
    lookup[d.key] = d;    
  });
  
  // Pre-processing of data, several tasks
  // 1) get a count of countries in the data, and save to countries_keyed
  // 2) coerce string valence into intenger
  // 3) generate list of strengths present in the data
  var countries_keyed = calcCountryKeys(data);
  strengthlist = [];
  var max_count = 0;
  data.forEach(function(d){
    // transform string valence into intenger
    d.valence = +d.valence;
    // generate list of strengths present in the data
    strengthlist.push(d.type.trim()); 
  })

  // Post-processing:
  // - sort and remove duplicates, then generate select options
  strengthlist = _.without(_.uniq(strengthlist.sort()), "");
  // - keep global reference to raw data
  rawdata = data;

  // set up a scale for the map circles
  // first get max count by country
  var max = 0;
  Object.keys(countries_keyed).forEach(function(c) {
    if (countries_keyed[c].count > max) max = countries_keyed[c].count;
  });
  var cmin = circleareas["min"] * 1000000;
  var cmax = circleareas["max"] * 1000000;
  circleScale = d3.scaleSqrt().domain([1, max]).range([cmin,cmax]);

  // Data prep all done!
  // call our dispatch events with `this` context, and corresponding data
  dispatch.call("load", this, {stengths: strengthlist, countries_keyed: countries_keyed}); 
  dispatch.call("statechange", this, data);
  // finally, fit the map to bounds one time, this will always be the extent, despite state changes
  // cannot fit bounds to circles for some reason, so we fit to points instead
  map.fitBounds(points.getBounds());

}

// listen for "load" and calculate global container dimensions based on incoming data
// these will set the height for the top and bottom svg containers
dispatch.on("load.setup", function(options) {
  // calc offsets for top and bottom
  var data = nest(rawdata, groups.top);
  calcOffsets(data, groups.top);

  var data = nest(rawdata,groups.bottom);
  calcOffsets(data, groups.bottom);

  // and then (optionally) resize: we could resize here, or on "statechange"
  // but if not done on "statechange" then we do have to do it on "resize"
  resizeContainers(); 

});

// register a listener for "load" and create dropdowns for various fiters
dispatch.on("load.dropdowns", function(options) {
  // get countries names from countries_keyed
  var countries = _.map(options["countries_keyed"], function(c) {return c});

  // COUNTRY FILTER
  // hack in a placeholder 
  countries.unshift({name:'', fips:''});
  var select = d3.select("select#country");
  // append options to select dropdown
  select.selectAll("option")
      .data(countries)
    .enter().append("option")
      .attr("value", function(d) { return d.fips.trim(); })
      .text(function(d) { return d.name.trim(); });

  // EVIDENCE FILTER
  var strengths = options["stengths"]
  strengths.unshift("");
  var select = d3.select("select#evidence");
  // append strengthoptions to select dropdown
  select.selectAll("option")
      .data(strengths)
    .enter().append("option")
      .attr("value", function(d) { return d; })
      .text(function(d) { return d != "" ? lookup[d]["name"].trim() : ""; });

  // SORT OPTIONS
  // Defined directly in html as <options>, vals and text

  // hack: style the dropdowns using Select2, then show
  $("select").each(function() {
    var select = $(this);
    select.select2({
      placeholder: select.attr("placeholder"),
      minimumResultsForSearch: Infinity,
      allowClear: false
    }).show();
  });
  // because we're using select2, and these options are added dynamically, 
  // we have to use event delegation to listen for changes
  delegate_event("select#country");
  delegate_event("select#evidence");
  delegate_event("select#sort");
}); // load.menu


// register a callback to be invoked which updates the chart when "statechange" occurs
dispatch.on("statechange.charts", function(data) {
  // filter the data given current selections
  filtered = apply_options(data);
  
  // Top chart: nest, and draw
  data = nest(filtered,groups.top);
  calcOffsets(data,groups.top);
  var container = d3.select(".top");
  drawchart(data, container, tfast, groups.top);

  // Bottom chart: nest, and draw
  data = nest(filtered,groups.bottom);
  calcOffsets(data,groups.bottom);
  var container = d3.select(".bottom");
  drawchart(data, container, tfast, groups.bottom);

  // resize
  // resizeContainers(); // an option, but this means containers resize to fit charts, and everything bounces around

  // draw the map 
  var countries_keyed = calcCountryKeys(filtered);
  drawmap(countries_keyed);
});

// 
// Initial map setup after data load
//
dispatch.on("load.map", function(data) {
  // set the map width from config
  document.getElementById('map').style.height = config["map_height"] + "px";

  // init the map with some basic settings
  map = L.map('map',{
    minZoom:minzoom,
    maxZoom:maxzoom,
    keyboard: false,
    scrollWheelZoom: false,
    attributionControl: false,
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
    pane: 'labels'
  });

  new L.controlCredits({
      image: './libs/images/greeninfo.png',
      link: 'https://www.greeninfo.org/',
      text: 'Interactive mapping<br/>by GreenInfo Network'
  }).addTo(this.map);

  var attribution = L.control.attribution({
      position: 'bottomright',
  }).addTo(this.map);

  // create feature groups for circles and points and add them to the map
  circles = L.featureGroup().addTo(map);
  points = L.featureGroup().addTo(map);

}); // load.map


//
// Main map redraw function
//
function drawmap(countries_keyed) {
  // first clear any existing layers
  circles.clearLayers();
  points.clearLayers();

  // add div icons to the map for each distinct country where count > 1
  // count is the number of studies in that country in the raw data 
  var countries = Object.keys(countries_keyed);
  // sort countries by count, to ensure smaller ones are stacked on top of larger ones
  countries.sort(function(a,b) {
    return countries_keyed[b].count - countries_keyed[a].count
  });
  // go over countries, and make circles. 
  // Before we start figure out what style to use
  var style = somethingSelected() ? selectedStyle : defaultStyle;
  countries.forEach(function(name){
    // skip countries that don't have matching name, counts, lat/lngs, etc.
    if (countries_keyed[name] === undefined) return;
    if (countries_keyed[name].count === undefined || countries_keyed[name].count == 0) return;
    if (countries_keyed[name].latitude === undefined || countries_keyed[name].longitude === undefined) return;
    if (countries_keyed[name].latitude === "" || countries_keyed[name].longitude === "") return;
    if (countries_keyed[name].count > 0) {
      var country = countries_keyed[name];
      // can't fit bound to L.cicles for some reason, so we make null marker icons instead
      var nullicon = L.divIcon({ className: 'null-icon'});
      var point = L.marker([country.latitude, country.longitude], {icon: nullicon, interactive: false});
      point.addTo(points);
      // get an area from scale function, calc the radius, and then add the circles      
      var area = circleScale(country.count);
      var radius = Math.sqrt(area/Math.PI);
      var circle = L.circle([country.latitude, country.longitude], {radius: radius}).setStyle(style).addTo(circles);
      // add interactivity
      circle.data = country;
      circle.on('click',function(e) { 
        handleMarkerClick(e.target.data); 
      });
      circle.bindPopup(country.name + ": " + country.count);
      circle.on('mouseover', function (e) {
        // first clear any selected circles selected by other means
        clearCircles();
        this.openPopup();
        this.setStyle(selectedStyle);
        selectSquares({key: "fips", value: e.target.data.fips});
      });
      circle.on('mouseout', function (e) {
        map.closePopup();
        // clear style, but only if a country is NOT selected in the country dropdown
        if ($("select#country").val() == "") this.setStyle(defaultStyle);
        clearSquares();
      });
    }

    // on mobile only, pan the map to the selected place(s)
    if (isMobile() ) { map.panTo(points.getBounds().getCenter());} 

  });
}

//
// Main chart redraw function
//
function drawchart(data, container, tfast, group) {

  console.log("statechange data: ", data);

  // bind our new piece of data to our container element
  // could also do `container.data([data.values]);`
  container.datum(data);  

  // 
  // ROWS
  //
  // create row groups for each data grouping (the top level of nest())
  var rows = container.selectAll("div.chartrow")
    .data(function(d,i) { return d; }, function(d) {return d.key});

  // remove old rows
  rows.exit().remove();

  // update existing ones left over
  rows.attr("class", "chartrow")
    .style("width", config[group]["colwidth"] + "px")
    .transition(tfast)
    .style("left", function(d) {
      var x = 0; // col offset
      // which column are we in?
      var col = config[group][d.key]["col"];
      // define the start x position, column * colwidth, minus one colwidth
      var fullcol = config[group]["colwidth"];
      var x = (col * fullcol) - fullcol;
      // not sure why this works, multiplying by col-1
      if (col > 1) x += (config[group]["colmargin"] * (col - 1));
      return x + "px";
    })
    .style("top", function(d) {
      var y = config[group][d.key]["offset_y"]; // row offset
      return y + "px";
    })
    .style("height", function(d,i) {
      return (config[group][d.key]["totalrows"] * config[group]["sqsize"]) + "px";
    });

  // create new rows if our updated dataset has more than the previous
  var rowenter = rows.enter().append("div")
    .attr("class", "chartrow")
    .style("left", function(d) {
      var x = 0; // col offset
      // which column are we in?
      var col = config[group][d.key]["col"];
      // define the start x position, column * colwidth, minus one colwidth
      var fullcol = config[group]["colwidth"];
      var x = (col * fullcol) - fullcol;
      // not sure why this works, multiplying by col-1
      if (col > 1) x += (config[group]["colmargin"] * (col - 1));
      return x + "px";
    })
    .style("top", function(d) {
      var y = config[group][d.key]["offset_y"]; // row offset
      return y + "px";
    })
    .style("height", function(d,i) {
      return (config[group][d.key]["totalrows"] * config[group]["sqsize"]) + "px";
    })
    .style("width", config[group]["colwidth"] + "px");

  //
  // TEXT LABEL WRAPPERS
  //
  var rows = container.selectAll("div.chartrow");
  var textwrappers = rows.selectAll("div.textwrapper")
    .data(function(d) {return [d]}, function(d) {return d.key});

  // exit
  textwrappers.exit().remove();

  // enter
  textwrappers.enter().append("div")
    .attr("class","textwrapper")
    .attr("class", function(d) { return d3.select(this).attr("class") + " " + d.key.toLowerCase(); })
    .style("width", (config[group]["textwidth"] - config[group]["textpadding"] ) + "px");

  //
  // TEXT LABELS THEMSELVES
  // 
  var textwrappers = container.selectAll("div.textwrapper");
  var text = textwrappers.selectAll("div.text")
    .data(function(d) {return [d]}, function(d) {return d.key});

  // update
  text
    .text(function(d) {
      return lookup[d.key]["name"]
    })
    // .style("font-size", function() { return config[group]["labelsize"] + "px"; })
    .style("color",function(d) {
      // color the text by the value defined in the lookup for this key
      var parent = lookup[d.key]["parent"];
      return colors[parent];
  });

  // enter
  text.enter().append("div")
    .attr("class","text")
    .text(function(d) {
      return lookup[d.key]["name"]
    })
    .style("font-size", function() { return config[group]["labelsize"] + "px"; })
    .style("color",function(d) {
      // color the text by the value defined in the lookup for this key
      var parent = lookup[d.key]["parent"];
      return colors[parent];
    })
    .on("mouseover", function(d) { 
      d3.select(this).style("color", function() { 
        return shadeColor(colors[lookup[d.key]["parent"]],-0.3);
      });  
    })
    .on("mouseout", function(d) { d3.select(this).style("color", colors[lookup[d.key]["parent"]]) })
    .on("click", function(d) {
      // update the selected group details, so we can track this, and apply with other filters 
      // value is simply the data key of the clicked upon label
      selectedgroup["value"] = d.key;
      // key is dependent on hierarchy, first get the first datum; every one of these should have at least one datum or it wouldn't be on the screen
      var datum = d.values[0].values[0]; 
      if (typeof datum == "undefined") return; 
      // if the theme (e.g. "ENV") is equal to the data label of the clicked item (e.g. ENV for "environmental"), then we are filtering by "theme"
      // if not, then we are filtering by "variable" 
      // a bit more hardcoding of these category names than I would like, but I am told that the use of theme and variable will be consistent across datasets
      selectedgroup["key"] = datum["theme"] == selectedgroup["value"] ? "theme" : "variable"; 
      
      // all done, dispatch!
      dispatch.call("statechange",this,rawdata);

    });

  // exit
  text.exit().remove();

  //
  // TEXT ATTRIBUTE FOR STUDY COUNT
  //
  var textwrappers = container.selectAll("div.textwrapper");
  var textcount = textwrappers.selectAll("div.count")
    .data(function(d) {return [d]}, function(d) {return d.key});

  // update
  textcount
    .text(function(d) {
      var count = config[group][d.key]["totalcount"]; 
      var studies_text = count == 1 ? " study" : " studies";
      return  count + studies_text;
    })
    .style("font-size", config[group]["countsize"] + "px");

  // enter
  textcount.enter().append("div")
    .attr("class","count")
    .text(function(d) {
      var count = config[group][d.key]["totalcount"]; 
      var studies_text = count == 1 ? " study" : " studies";
      return  count + studies_text;
    })
    .style("font-size", config[group]["countsize"] + "px");

  // exit
  textcount.exit().remove();

  //
  // CHART GROUPS
  //
  // create chart groups for each of our chart categories
  // there are currently only two: plus and minus
  var rows = container.selectAll("div.chartrow");
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
    // sort data by valence and type
    .data(function(d) { return _.sortBy(d.values,"valence","type") }, function(d) {return d.zb_id});

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
    .classed("type1", function(d) {return d.type == "type1"})
    .classed("type2", function(d) {return d.type == "type2"})
    .classed("type3", function(d) {return d.type == "type3"})
    .classed("type4", function(d) {return d.type == "type4"})
    .attr("height", config[group]["sqsize"] - 1)
    .attr("width", config[group]["sqsize"] - 1)
    .on("mouseenter", mouseenterSquare)
    // .on("mousemove", mousemoveSquare)
    .on("mouseleave", mouseleaveSquare)
    // .on("click", clickSquare)
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
      .classed("type1", function(d) {return d.type == "type1"})
      .classed("type2", function(d) {return d.type == "type2"})
      .classed("type3", function(d) {return d.type == "type3"})
      .classed("type4", function(d) {return d.type == "type4"})
      .attr("width", config[group]["sqsize"] - 1)
      .attr("height", config[group]["sqsize"] - 1)
      .on("mouseenter", mouseenterSquare)
      // .on("mousemove", mousemoveSquare)
      .on("mouseleave", mouseleaveSquare)
      // .on("click", clickSquare)
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
  // simply trigger change on the counry select, which offers some nice side benefits:
  // other filters are applied, and the dropdown state mirrors map state
  $("select#country").val(markerdata.fips).trigger("change");

  // then simply update the icons
  $("div.country-icon").removeClass("selected");
  $(event.target).parent().addClass("selected");
}

// define behavior on mouseenter square
function mouseenterSquare(d) {
  // first, clear any selected squares and circles
  clearCircles();
  Object.keys(groups).forEach(function(group) {
    d3.select("div." + group).selectAll("rect")
      .each(function(d) {
        d3.select(this).classed("selected",false);
      });
  });

  // add hover style to this square
  d3.select(this).classed("selected", true);  

  // add tooltips
  var split = d.zb_id.toString().split(".");
  var id = (split[0] + "." + split[1]);
  var text = lookup[id].name;
  tooltip.select("div.tooltip-name").text(lookup[id].name);
  tooltip.select("div.tooltip-author-year").text(lookup[id].author + ", " + lookup[id].pubyear);
  var conclusion = lookup[id].conclusion == "" ? "" : "<span>Conclusion:</span> " + lookup[id].conclusion;
  tooltip.select("div.tooltip-conclusion").html(conclusion);
  tooltip.select("div.tooltip-link").select("a").attr("href",lookup[id].url);
  tooltip.style("display","block");

  // position the tooltip
  // debugger;
  var xpos = isMobile() ? 10 : d3.select(this).node().getBoundingClientRect().right + 10;
  var ypos = isMobile() ? 20 : -30;
  tooltip
    .style("left",xpos + "px")
    .style("top", d3.event.pageY+ypos + "px");

  // update the map marker that contains this study
  selectCircle(d.fips);
}

// define behavior on mouseout square
function mouseleaveSquare(d) {
  // update styles
  // second thought, do not clear - so we can see what we selected (until we select another square)
  // d3.select(this).classed("selected", false);  

  // do not hide the tooltip itself, otherwise we can't click on the link inside
  // but do clear the selected circle from the map - only if the country isn't selected in a dropdown
  // if ($("select#country").val() == "") clearCircles();
}

// resize all the containers listed below from config
function resizeContainers() {
  d3.select(".top").style("height", config[groups.top]["height"] + "px"); 
  d3.select(".bottom").style("height", config[groups.bottom]["height"] + "px"); 
}

// nest our data on selected group, then either "plus" or "minus",
//   depending on value of "valence"
function nest(data,group) { 
  var nested = d3.nest()
    .key(function(d) { return d[group] })
    .key(function(d) {  if (d.valence > 0) { return 'plus'; } return 'minus'; }).sortKeys(d3.descending)
    .entries(data);

  // go ahead and apply a sort field, if there is one
  var sortoption = d3.select("select#sort").node().value;
  if (sortoption) nested = sort(nested, sortoption, group);

  return nested;

} // nest

// Filter flat (not nested) data based on a key and a value
function filter(data, key, value) {
  var filtered = data.filter(function(d) {
    // country FIPS requires more permissive filtering:
    // FIPS can be a list, or a single country 
    var match;
    if (key == "fips") {
      match = d["fips"].indexOf(value) > -1; 
    } else {
      match = (d[key] == value);
    }
    return match;
  });
  return filtered;
}

function delegate_event(selected) {
  // use event delegation to dispatch change function from select2 options
  $("body").on("change", selected, function() {
    dispatch.call("statechange",this,rawdata);
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

// given flattened data, key an object by country, with counts and other salient details
// used by the map and for constructing select#country <options>
function calcCountryKeys(data) {
  // more work to do if we want to filter this by a single country
  // becuase country can be a list, count will be incremented for other countries in that list 
  // unless we trap that here
  var countryoption = d3.select("select#country").node().value;

  var result = {};
  data.forEach(function(d) {
    // d.country can be a list of countries, so check for that, and split if so
    var names = d.fips.indexOf(",") ? d.fips.split(",") : [d.fips];
    names.forEach(function(fips){
      // trim whitespace
      if (fips == "") return;
      fips = fips.trim();
      
      // when country option is set, return if the fips doesn't match 
      if (countryoption && fips != countryoption) return;

      // first time here, we need to set count to 0
      if (typeof result[fips] === "undefined") result[fips] = {"count": 0};
      result[fips]["count"] += 1;
      result[fips]["name"] = lookup[fips]["name"];
      result[fips]["fips"] = fips;
      result[fips]["latitude"] = lookup[fips]["latitude"];
      result[fips]["longitude"] = lookup[fips]["longitude"];
    });    
  });
  return result;
}

// Iterate through data in order to calc:
// - overall chart and column area width and height
// - row offsets (spacing between rows)
// - col offsets
// - chart offset, for spacing between plus and minus rows
function calcOffsets(data, group) {
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
  // if/when there are scroll bars, this will change the total available width!
  // on an initial pass (e.g. top chart) we have no way to know if there will be scrollbars
  // so always subtract 20px just in case
  // TODO: on subsequent updates, could check if there are scrollbars first? 
  var width = $(config[group]["container"]).width() - 20;

  // get ncols as configured for this screen width
  var ncols = getCols(width, group);

  // calc col width based on this ncols
  // first, aadjust for margin padding 
  var margin = ncols > 1 ? (ncols - 1) * config[group]["colmargin"] : 0;
  var colwidth = (width - margin) / ncols;
  config[group]["colwidth"]   = colwidth;

  // loop through the chart data to get an initial layout of chart rows,
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
    config[group][d.key]["totalcount"] = plus + minus;

    // keep a count of rows, from which to calculate total height
    config[group]["chartrows"] += totalrows;

    // and a placeholder for col, which will always be "1" on this initial pass
    config[group][d.key]["col"] = 1;

  });

  // all done inital loop, add some calcs based on the sums we've just done
  var charts_height              = config[group]["chartrows"] * sqsize;
  var pad_height                 = config[group]["rowpadding"] * config[group]["grouprows"];
  var single_col_height          = (charts_height + pad_height) / ncols;
  config[group]["height"]        = single_col_height;

  // if we have multiple cols, loop again to update offsets, based on col heights we just calc'd
  if (ncols > 1) {
    var curr_height = 0; 
    var max_col_height = 0;
    var nextoffset = 0; var nextcol = 1;
    data.forEach(function(d,i) {
      // Set the current "y" offset, will be zero when i = 0, or when a column resets
      config[group][d.key]["offset_y"] = nextoffset;
      // keep a note of which row this key belongs in 
      config[group][d.key]["col"] = nextcol;

      // check our chart height against the col height and adjust y_offset accordingly
      curr_height += (config[group][d.key]["totalrows"] * sqsize) + config[group]["rowpadding"];
      if (curr_height > single_col_height) {
        // keep a note of this col height, in order to find the tallest column
        max_col_height = curr_height > max_col_height ? curr_height : max_col_height;

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
    // set the final height equal to the height of the tallest column, minus the final rows padding
    config[group]["height"] = max_col_height - config[group]["rowpadding"];
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

// given a width, get the number of columns defined in config
function getCols(w, group) {
  return w > 1200 ? config[group]["ncols_lg"] :
         w > 992  ? config[group]["ncols_md"] :
         w > 768  ? config[group]["ncols_sm"] :
                    config[group]["ncols_xs"];
}

// do we need a scrollbar for this height? 
function scrollbar(height) {
  var windowHeight = window.innerHeight;
  return height > windowHeight ? true : false;
}

// apply these options to filter the flat (not filtered) data, in sequence
function apply_options(data) { 
  // apply country filter, if there is one
  var countryoption = d3.select("select#country").node().value;
  if (countryoption) {
    data = filter(data, "fips", countryoption);
  }

  // apply evidence filter, if there is one
  var evidenceoption = d3.select("select#evidence").node().value;
  if (evidenceoption) data = filter(data, "type", evidenceoption);

  // apply group selection, if there is one
  if (typeof selectedgroup.key !== "undefined") data = filter(data,selectedgroup.key,selectedgroup.value) 

  return data;
}

// shades a hex color darker or lighter, by a percentage param, for example in the form of 0.5 or -0.5
function shadeColor(hex, percent) {   
  var f=parseInt(hex.slice(1),16),t=percent<0?0:255,p=percent<0?percent*-1:percent,R=f>>16,G=f>>8&0x00FF,B=f&0x0000FF;
  return "#"+(0x1000000+(Math.round((t-R)*p)+R)*0x10000+(Math.round((t-G)*p)+G)*0x100+(Math.round((t-B)*p)+B)).toString(16).slice(1);
}

// clear all selections and filters, essentially reset the app state without a refresh
function clear_all() {
  // clear the vis (map will clear with change, below)
  clearSquares();

  // clear any group selection
  selectedgroup = {};

  // then reset the selects
  $('select#country').val('').trigger('change');  
  $('select#evidence').val('').trigger('change');  
  $('select#sort').val('').trigger('change');  
}

// is something selected among our filters?
function somethingSelected() {
  var value = false; 
  if ($('select#country').val()) value = true;
  if ($('select#evidence').val()) value = true;
  if (typeof selectedgroup.key !== 'undefined') value = true;
  return value;
}

// simple "mobile" detector
function isMobile() {
  return window.innerWidth < 768;
}

// select a country circle or circles, given a fips code or comma-separated list of fips
function selectCircle(fips) {
  // fips could be a list of countries, or could be a single country, so first devolve
  var fipslist = fips.indexOf(",") > -1 ? fips.split(",") : [fips]; 
  fipslist.forEach(function(fipscode) {
    circles.eachLayer(function(layer){
      if (layer.data.fips == fipscode) {
        layer.setStyle(selectedStyle);
      }
    });
  })
}

// unselect all currently selected circles
function clearCircles() {
  circles.eachLayer(function(layer) {
    layer.setStyle(defaultStyle);
  })
}

// select squares on the map given a matching data attribute key and value
function selectSquares(match) {
  var key = match.key; 
  var value = match.value;
  Object.keys(groups).forEach(function(group) {
    d3.select("div." + group).selectAll("rect")
      .each(function(d) {
        var self = d3.select(this);
        // because d[key] can be an "array", test for that and treat 
        var values = d[key].indexOf(",") > -1 ? d[key].split(",") : [d[key]];
        values.forEach(function(v) {
          if (v == value) {
            self.classed("selected",true);
          }
        }); 
      });
  });
}
// and the correlary: clear squares completely
function clearSquares() {
  Object.keys(groups).forEach(function(group) {
    d3.select("div." + group).selectAll("rect")
      .each(function(d) {
        d3.select(this).classed("selected",false);
      });
  });
}