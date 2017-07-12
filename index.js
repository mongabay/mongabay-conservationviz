  // global declarations

  // data variables
  var rawdata;
  var countrylist;
  
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
      // skip bad matches 
      if (countries_keyed[d.country] === undefined) return;
      countries_keyed[d.country]["count"] = countries_keyed[d.country]["count"] += 1;
    });

    // generate list of countries present in data
    var countries = [];
    data.forEach(function(d) {
      // d.country can be a list of countries, so check for that, and split if so
      var country = d.country;
      country = country.indexOf(",") ? country.split(",") : [country];
      countries = _.union(countries, country.map(function(c) { return c.trim() }));
    });
    // sort, remove duplicates, then create the country select options
    countries = _.without(_.uniq(countries.sort()), "");
    countries.forEach(function(country) {
      d3.select("select#country")
        .append("option")
        .text(country)
        .attr("value",country.trim())
    });
    
    // keep global references to raw data
    rawdata = data;
    countrylist = countries;

    // nest the data based on a given attribute
    var nested = nest(data,"theme",false);

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

  // register a listener for "load" and create a dropdown / select elem
  // TO DO: this is quite different from the CH example,
  // for now simply ignoring "map" and loading the global countries array
  dispatch.on("load.menu", function(countries) {
    // add listener to select#country that calls "statechange"
    var select = d3.select("select#country")
      .on("change", function() {
        var site = this.value;
        dispatch.call(
          "statechange",
          this,
          // TO DO: update for the country filter use case
          // map.get(site)
          nest(rawdata,"theme",{key: "country", value: site})
        );
    });

    // append options to select dropdown
    select.selectAll("option")
        .data(countrylist)
      .enter().append("option")
        .attr("value", function(d) { return d; })
        .text(function(d) { return d; });

    // set the current dropdown option to value of last statechange
    // ## TA TODO we don't actually want to trigger change yet on this
    //     dont think this is relevant  at the moment
    // dispatch.on("statechange.menu", function(site) {
    //   debugger;
    //   select.property("value", site.key);
    // });

    // hack: style the dropdown using Select2, then show
    // $("select#country").select2({
    //   placeholder: "Select a country",
    //   minimumResultsForSearch: Infinity
    // }).show();

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
    var countries = Object.keys(countries_keyed);
    var markers = L.featureGroup().addTo(MAP);
    countries.forEach(function(name){
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
          // console.log(e.target.data);
          handleMarkerClick(e.target.data); 
        });

      }

    });

    MAP.fitBounds(markers.getBounds());



  });


  // inital chart setup after data load
  dispatch.on("load.chart", function(map) {
    // layout properties
    var margin      = { top: 0, right: 30, bottom: 0, left: 80 };
    var svgwidth    = 1200 - margin.left - margin.right;
    var svgheight   = 200; // TO DO: This will vary considerably between upper and lower charts

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
        .data(function(d) {return d}, function(d) {return d.key});

      // remove old rows
      rows.exit().remove();

      // update existing ones left over
      rows.attr("class", "row")
        .transition(tfast)
        .attr("transform", function(d, i) {
          return "translate(50," + rowh * i + ")"
        });

      // create new rows if our updated dataset has more then the previous
      var rowenter = rows.enter().append("g")
        .attr("class", "row")
        .attr("transform", function(d, i) {
          return "translate(50," + rowh * i + ")"
        })

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
        .data(function(d) { return d.values; }, function(d) {return d.key});

      // get rid of the old ones we don't need when doing an update
      charts.exit().remove();

      // update existing ones left over
      charts.attr("class", "chart")
        .attr("transform", function(d, i) {
          return "translate(-20," + ((i * grph) + 10) + ")"
        });

      // create new ones if our updated dataset has more then the previous
      charts.enter().append("g")
        .attr("class", "chart")
        .attr("class","chart")
        .attr("transform", function(d, i) {
          return "translate(-20," + ((i * grph) + 10) + ")"
        });

      // reselect the chart groups, so that we get any new ones that were made
      // our previous selection would not contain them
      charts = rows.selectAll("g.chart");

      //
      // SQUARES: bind data
      //
      var squares = charts.selectAll("rect")
        .data(function(d) { return d.values; }, function(d) {return d.zb_id});

      // get rid of ones we don't need anymore, fade them out
      squares.exit()
        .transition(tslow)
          .style("opacity", 1e-6)
          .remove();

      // update existing squares, transition
      squares
        .style("fill-opacity", 1)
        .transition(tfast)
          .attr("x",function(d, i) {
            var x = i * rectw;  
            return i * rectw
          });

      // make new squares
      squares.enter().append("rect")
        .classed("neutral",function(d) { return d.valence == 0 })
        .classed("plus",function(d) { return d.valence > 0 })
        .classed("minus",function(d) { return d.valence < 0 })
        .classed("weak", function(d) {return d.strength != "Direct correlation" ? true : false})
        .transition(tfast)
          .attr("x",function(d, i) { 
            return i * rectw
          });

    }); // statechange.chart

  }); // load.chart


  // NAMED FUNCTIONS
  function handleMarkerClick(markerdata) {
    dispatch.call(
      "statechange",
      this,
      nest(rawdata,"theme",{key: "country", value: markerdata.name})
    );
  }



  // UTILITY FUNCTIONS

  // generic dispatch call
  function update(data, theme, key, value) {
    dispatch.call(
      "statechange",
      this,
      nest(data,theme,{key: key, value: value})
    );
  }

  // dispatch call from current data, to facilitate chaining filters
  function update_current(key, value) {
    // get currently displayed data
    var data = d3.select("svg").selectAll("g.row").data();

//     data = _.filter(data, function(d) {
//       _.filter(d.values, function(e){
//         _.filter(e.values, function(f) {
//           console.log(f["strength"]);
//           return f[key] === value;
//         })
//       })
//     })
// console.log(data);

    dispatch.call(
      "statechange",
      this,
      data
    );
  }  

  // nest our data on selected field, then either "plus" or "minus",
  //   depending on value of "valence"
  // optionally pass a filter object in the form of 
  //   {key: "fieldname to filter", value: "value to match"}
  function nest(data,field,filter) {
    if (filter) {
      data = data.filter(function(d) {
        // country requires more permissive filtering (match one country in a list)
        return filter.key == "country" ? d["country"].indexOf(filter.value) > -1  : d[filter.key] == filter.value
      })
    }

    return d3.nest()
        .key(function(d) { return d[field] })
        .key(function(d) {  if (d.valence > 0) { return 'plus'; } return 'minus'; }).sortKeys(d3.descending)
        .entries(data);
  
  } // nest
