// theme groups (identified as a column in each data.csv row)
// by which to group rows on top and bottom charts
var groups = {
  top: "theme",
  bottom: "variable"
}

// colors for the theme groups
var colors = {
  env: "#1B9E77",
  soc: "#E16802",
  econ: "#757ECF",
}

// map circle areas, in km2
var circleareas = {
  min: 15000, 
  max: 1300000,
}

// circle colors on map, for selected and unselected
var circlecolors = {
  // "default": "#6aa6cc",
  "default": "#64b0e0",
  "selected": "#FACB57",
}

// global configuration of sizes, spacing, for top and bottom charts
// all measures are in pixels
var config = {};
// configuration general
config["map_height"] = 250,      // map height in px
// configuration of the top chart
config[groups.top] = {
  ncols_lg:    1,                // number of chart cols for lg screens > 1200px
  ncols_md:    1,                // number of chart cols for md screens > 992px
  ncols_sm:    1,                // number of chart cols for sm screens > 768px
  ncols_xs:    1,                // number of chart cols for xs screens < 768px
  colmargin:   10,               // margin applied to right side of cols when ncols > 1
  sqsize:      15,               // width and hight of chart squares
  rowpadding:  10,               // padding between rows
  labelsize:   15,               // size of text label size in pixels
  countsize:   10,               // size of study count text in pixels
  textwidth:   130,              // width of the text label "column"   
  textpadding: 10,               // right side padding of text label
};
// configuration of the bottom chart
config[groups.bottom] = {
  ncols_lg:    3, 
  ncols_md:    3, 
  ncols_sm:    2, 
  ncols_xs:    1, 
  colmargin:   10,                
  sqsize:      17,                 
  rowpadding:  30,
  labelsize:   13,
  countsize:   11,
  textwidth:   180,                 
  textpadding: 10,               
};

