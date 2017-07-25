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
  margin:      { top:    0,      // margins around the svg container
                 bottom: 0,        
                 right:  0, 
                 left:   100 },  // left margin will hold the text labels
  ncols_lg:    1,                // number of chart cols for lg screens > 1200px
  ncols_md:    1,                // number of chart cols for md screens > 992px
  ncols_sm:    1,                // number of chart cols for sm screens > 768px
  ncols_xs:    1,                // number of chart cols for xs screens < 768px
  colmargin:   10,               // margin applied to right side of cols when ncols > 1
  sqsize:      15,               // width and hight of chart squares
  rowpadding:  10,               // padding between rows
  textwidth:   100,              // width of the text label "column"   
  textpadding: 10,               // right side padding of text label
};
config[themes.bottom] = {
  margin:      { top:    0,        
                 bottom: 0,        
                 right:  0, 
                 left:   140 },      
  ncols_lg:    3, 
  ncols_md:    3, 
  ncols_sm:    2, 
  ncols_xs:    1, 
  colmargin:   10,                
  sqsize:      17,                 
  rowpadding:  20,
  textwidth:   180,                 
  textpadding: 10,               
};

