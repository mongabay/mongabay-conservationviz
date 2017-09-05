// theme groups (identified as a column in each data.csv row)
// by which to group rows on top and bottom charts
var groups = {
  top: "theme",
  bottom: "variable"
}

// keys to the column groups. These will be used below, and throughout to 
// identify and organize groups from the data
var colgroups = ["env", "soc", "econ"];

// colors for the theme groups
var colors = {};
colors[colgroups[0]] = "#1B9E77";
colors[colgroups[1]] = "#E16802";
colors[colgroups[2]] = "#757ECF";

// descriptive summaries for the theme groups
var words = {};
words[colgroups[0]] = "some words about env";
words[colgroups[1]] = "some words about soc";
words[colgroups[2]] = "some words about econ";

var description = "<p>Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut\
wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure\
dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto.</p>\
<p>Better definition and explanation would all go here. Lorem ipsum dolor sit amet, cons ectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt\
ut laoreet dolore magna aliquam erat volutpat.</p>\
<p>Same definition and explanation would all go here. Lorem ipsum dolor sit amet, cons ectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt\
ut laoreet dolore magna aliquam erat volutpat.</p>\
<p>Worse definition and explanation would all go here. Lorem ipsum dolor sit amet, cons ectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt\
ut laoreet dolore magna aliquam erat volutpat. dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper</p>";

// map circle areas, in km2
var circleareas = {
  min: 15000, 
  max: 1300000,
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
  container:   ".top-col",       // selector for this chart's container
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
  ncols_lg:    1, 
  ncols_md:    1, 
  ncols_sm:    1, 
  ncols_xs:    1, 
  container:   ".bottom-col",
  colmargin:   10,                
  sqsize:      17,                 
  rowpadding:  30,
  labelsize:   13,
  countsize:   11,
  textwidth:   180,                 
  textpadding: 10,               
};

