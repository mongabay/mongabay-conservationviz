// theme groups (identified as a column in each data.csv row)
// by which to group rows on top and bottom charts
var themes = {
  top: "theme",
  bottom: "variable"
}

// global configuration of colors, sizes, spacing, for top and bottom charts
// all measures are in pixels
// Note: additional config variables are calculated at runtime and added to this structure
var config = {};
config[themes.top] = {
  svgmargin:  { top:    0,        // margins around the svg container
                bottom: 0,        
                right:  0, 
                left:   100 },    // left margin will hold the text labels
  svgwidth:   580,                // width of the svg container, TO DO
  ncols:      1,                  // number of chart cols
  sqsize:     15,                 // width and hight of chart squares
  rowpadding: 10,                 // padding between rows
};
config[themes.bottom] = {
  svgwidth:   700,       
  svgmargin:  { top:    0,        
                bottom: 0,        
                right:  0, 
                left:   120 },      
  ncols:      3,                 
  sqsize:     20,                 
  rowpadding: 10,                 
};

// update things that depend on the above config being set
// ahh the mysteries of svg
config[themes.top]["svgwidthscaled"] = config[themes.top]["svgwidth"] - (config[themes.top]["svgmargin"]["left"] * 1.2);
config[themes.bottom]["svgwidthscaled"] = config[themes.bottom]["svgwidth"] - config[themes.bottom]["svgmargin"]["left"] - 100;
