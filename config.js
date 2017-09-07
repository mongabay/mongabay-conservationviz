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
config[groups.bottom] = {
  sqsize:       17,               // width and hight of chart squares
  rowpadding:   15,               // padding between rows
  labelsize:    13,               // size of text label size in pixels
  textwidth:    210,              // width of the text label "column"   
  textpadding:  10,               // right side padding of text label
  toprowpad:    20,               // padding around the top "summary" row in each column
  buttonheight: 34,               // height of the button headers at top of row
};


