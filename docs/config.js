// theme groups (identified as a column in each data.csv row)
// by which to group rows on top and bottom charts
var groups = {
  top: "theme",
  bottom: "variable"
}

// url to "full screen" version of app
var fullscreen = { fsc: '', pes: '', cfm: '' };
fullscreen["fsc"] = "https://mongabay-imgs.s3.amazonaws.com/vz/fullscreen/index.html?fsc"
fullscreen["pes"] = "https://mongabay-imgs.s3.amazonaws.com/vz/fullscreen/index.html?pes"
fullscreen["cfm"] = "https://mongabay-imgs.s3.amazonaws.com/vz/fullscreen/index.html?cfm"

// the link back to the article on mb.com
var articlelink = { fsc: '', pes: '', cfm: '' };
articlelink["fsc"] = "https://news.mongabay.com/2017/09/does-forest-certification-really-work/";
articlelink["pes"] = "https://news.mongabay.com/2017/10/cash-for-conservation-do-payments-for-ecosystem-services-work/";
articlelink["cfm"] = "https://news.mongabay.com/2017/10/cash-for-conservation-do-payments-for-ecosystem-services-work/";

// keys to the column groups. These will be used below, and throughout to 
// identify and organize groups from the data
var colgroups = ["env", "soc", "econ"];

// descriptive summaries for the theme groups
var words = { fsc: [], pes: [], cfm: [] };
words["fsc"][colgroups[0]] = "Mostly positive";
words["fsc"][colgroups[1]] = "More evidence needed";
words["fsc"][colgroups[2]] = "Inconclusive (mixed results)";
words["pes"][colgroups[0]] = "Moderately positive, some red flags";
words["pes"][colgroups[1]] = "Mostly little change, some red flags";
words["pes"][colgroups[2]] = "More evidence needed";
words["cfm"][colgroups[0]] = "Mostly no or positive changes";
words["cfm"][colgroups[1]] = "Inconclusive (mixed results)";
words["cfm"][colgroups[2]] = "Inconclusive (insufficient evidence)";

// fullscreen titles, subtitles
var fullscreentitle = { fsc: '', pes: '', cfm: '' };
fullscreentitle['fsc'] = 'The scientific evidence on tropical forest certification';
fullscreentitle['pes'] = 'The scientific evidence on Payments for Ecosystem Services';
var fullscreensubtitle = { fsc: '', pes: '', cfm: '' };
fullscreensubtitle['fsc'] = 'Is certified forest management really better than conventional logging for the environment, people, and logging companies’ bottom lines?';
fullscreensubtitle['pes'] = 'Is paying landowners in the tropics for providing ecosystem services better for the environment and the landowners than doing nothing?';
fullscreensubtitle['cfm'] = 'Is paying landowners in the tropics for providing ecosystem services better for the environment and the landowners than doing nothing?';

// the description, below the map, to the left of the legend
var description = { fsc: '', pes: '', cfm: '' };
description["fsc"] = '<h3>How to read this infographic</h3><p>The map shows countries where scientists have measured the effectiveness of FSC certification or Reduced Impact Logging. Try hovering or clicking on a circle &mdash; the more evidence there is, the larger the circle.</p><p>The squares below show the results of the studies we have reviewed (see <a href="https://news.mongabay.com/conservation-effectiveness/how-we-reviewed-the-evidence/" target="_blank">methods</a>). Each square (try clicking on one) represents one data point extracted from <a href="https://news.mongabay.com/conservation-effectiveness/references-for-story-on-forest-certification/" target="_blank">scientific, peer-reviewed literature</a>.</p>';
description["pes"] = '<h3>How to read this infographic</h3><p>The map shows countries where scientists have measured the effectiveness of Payments for Ecosystem Services (PES). Try hovering or clicking on a circle — the more evidence there is, the larger the circle.</p><p>The squares below show the results of the studies we have reviewed (see <a href="https://news.mongabay.com/conservation-effectiveness/how-we-reviewed-the-evidence/" target="_blank">methods</a>). Each square (try clicking on one) represents one data point extracted from <a href="https://news.mongabay.com/conservation-effectiveness/references-for-story-on-PES/" target="_blank">scientific, peer-reviewed literature</a>.</p>';
description["cfm"] = '<h3>How to read this infographic</h3><p>The map shows countries where scientists have measured the effectiveness of community forest management initiatives. Try hovering or clicking on a circle — the more evidence there is, the larger the circle.</p><p>The squares below show the results of the studies we have reviewed <a href="https://news.mongabay.com/conservation-effectiveness/how-we-reviewed-the-evidence/" target="_blank">methods</a>). Each square (try clicking on one) represents one data point extracted from <a href="https://news.mongabay.com/conservation-effectiveness/references-for-story-on-CFM/" target="_blank">scientific, peer-reviewed literature</a>.</p>';

// horizontal legend text
var legend_text = { fsc: [], pes: [], cfm: [] };
legend_text["fsc"] = [
  "Certified better than conventional",
  "Certified same as conventional",
  "Certified worse than conventional"
];
legend_text["pes"] = [
  "PES better than no PES",
  "PES same as no PES",
  "PES worse than no PES"
];
legend_text["cfm"] = [
  "CFM better than no CFM",
  "CFM same as no CFM",
  "CFM worse than no CFM"
];

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


