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
  margin:     { top:    0,      // margins around the svg container
                bottom: 0,        
                right:  0, 
                left:   100 },  // left margin will hold the text labels
  ncols:      1,                // number of chart cols
  sqsize:     15,               // width and hight of chart squares
  rowpadding: 10,               // padding between rows
  textwidth:  100,              // width of the text label "column"   
};
config[themes.bottom] = {
  margin:     { top:    0,        
                bottom: 0,        
                right:  0, 
                left:   140 },      
  ncols:      3,                 
  sqsize:     17,                 
  rowpadding: 10,
  textwidth:  180,                 
};

