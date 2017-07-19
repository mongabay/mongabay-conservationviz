// theme groups (identified as a column in each data.csv row)
// by which to group rows on top and bottom charts
var themes = {
  top: "theme",
  bottom: "variable"
}

// global configuration of colors, sizes, spacing, for top and bottom charts
// all measures are in pixels
var config = {};
config[themes.top] = {
  svgwidth:   680,                // width of the svg container, TO DO
  svgwidthscaled: 680 - 140,      // TO DO, why is <g> bigger than <svg>?
  svgmargin:  { top:    0,        // margins around the svg container
                bottom: 0,        // TO DO, needs more investigation
                right:  0, 
                left:   100 }, 
  ncols:      1,                  // number of chart cols
  sqsize:     15,                 // width and hight of chart squares
  rowpadding: 10,                 // padding between rows
};
config[themes.bottom] = {
  svgwidth:   800,                // width of the svg container, TO DO
  svgwidthscaled: 809 - 140,      // TO DO, why is <g> bigger than <svg>?
  svgmargin:  { top:    0,        // margins around the svg container
                bottom: 0,        // TO DO, needs more investigation
                right:  0, 
                left:   0 }, 
  ncols:      3,                  // number of chart cols
  sqsize:     20,                 // width and hight of chart squares
  rowpadding: 10,                 // padding between rows
};
