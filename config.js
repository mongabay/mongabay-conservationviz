// theme groups (identified as a column in each data.csv row)
// by which to group rows on top and bottom charts
var groups = {
  top: "theme",
  bottom: "variable"
}

// url to "full screen" version of app
var fullscreen = "https://greeninfo-network.github.io/mongabay-conservationviz/fullscreen/"

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
words[colgroups[0]] = "Mostly positive";
words[colgroups[1]] = "Inconclusive (little evidence)";
words[colgroups[2]] = "Inconclusive (mixed results)";

var description = '<h4>How to read this infographic</h4><p>The map shows countries where scientists have measured the effectiveness of FSC certification or Reduced Impact Logging. Try hovering or clicking on a circle &mdash; the more evidence there is, the larger the circle.</p><p>The squares below show the results of the studies we have reviewed (see <a href="" target="_blank">methods</a>). Each square (try clicking on one) represents one data point extracted from <a href="" target="_blank">scientific, peer-reviewed literature</a>.</p>';

var legend_text = [
  "Certified better than conventional",
  "Certified same as conventional",
  "Certified worse than conventional"
]

// map circle areas, in km2
var circleareas = {
  min: 15000, 
  max: 1300000,
}

// global configuration of sizes, spacing, for top and bottom charts
// all measures are in pixels
var config = {
  map_height:   250,   // map height in px
  sqsize:       17,    // width and hight of chart squares
  rowpadding:   15,    // padding between rows
  labelsize:    13,    // size of text label size in pixels
  textwidth:    210,   // width of the text label "column"   
  textpadding:  10,    // right side padding of text label
  toprowpad:    20,    // padding around the top "summary" row in each column
  buttonheight: 34,    // height of the button headers at top of row
};


