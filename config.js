///////////////////////////////////////////////
// Strategy-specific variables
////////////////////////////////////////////////

// define the universe of strategies. These same acronyms are also expected in the url switch that tells the app which strategy to show, e.g. localhost:8000/?cfm
var strategies = ["fsc","pes","cfm","pas"];

// the link back to the article on mb.com
var articlelink = {};
articlelink["fsc"] = "https://news.mongabay.com/2017/09/does-forest-certification-really-work/";
articlelink["pes"] = "https://news.mongabay.com/2017/10/cash-for-conservation-do-payments-for-ecosystem-services-work/";
articlelink["cfm"] = "https://news.mongabay.com/2017/11/does-community-based-forest-management-work-in-the-tropics";
articlelink["pas"] = "https://news.mongabay.com/2017/12/do-protected-areas-work-in-the-tropics/";

// keys to the column groups. These will be used below, and throughout to identify and organize groups from the data
var colgroups = {};
colgroups["fsc"] = ["env", "soc", "econ"];
colgroups["pes"] = ["env", "soc", "econ"];
colgroups["cfm"] = ["env", "soc", "econ"];
colgroups["pas"] = ["env", "soc", "econ"];

// descriptive summaries for the theme groups
var words = {};
words["fsc"] = [];
words["fsc"][colgroups["fsc"][0]] = "Mostly positive";
words["fsc"][colgroups["fsc"][1]] = "More evidence needed";
words["fsc"][colgroups["fsc"][2]] = "Inconclusive (mixed results)";
words["pes"] = [];
words["pes"][colgroups["pes"][0]] = "Moderately positive, some red flags";
words["pes"][colgroups["pes"][1]] = "Mostly little change, some red flags";
words["pes"][colgroups["pes"][2]] = "More evidence needed";
words["cfm"] = [];
words["cfm"][colgroups["cfm"][0]] = "Mostly no or positive changes";
words["cfm"][colgroups["cfm"][1]] = "Inconclusive (mixed results)";
words["cfm"][colgroups["cfm"][2]] = "Inconclusive (insufficient evidence)";
words["pas"] = [];
words["pas"][colgroups["pas"][0]] = "Mostly positive change";
words["pas"][colgroups["pas"][1]] = "Inconclusive (insufficient evidence)";
words["pas"][colgroups["pas"][2]] = "Inconclusive (insufficient evidence)";

// fullscreen titles, subtitles
var fullscreentitle = {};
fullscreentitle["fsc"] = "The scientific evidence on tropical forest certification";
fullscreentitle["pes"] = "The scientific evidence on Payments for Ecosystem Services";
fullscreentitle["cfm"] = "The scientific evidence on community-based forest management";
fullscreentitle["pas"] = "The scientific evidence on protected areas";
var fullscreensubtitle = {};
fullscreensubtitle["fsc"] = "Is certified forest management really better than conventional logging for the environment, people, and logging companies’ bottom lines?";
fullscreensubtitle["pes"] = "Is paying landowners in the tropics for providing ecosystem services better for the environment and the landowners than doing nothing?";
fullscreensubtitle["cfm"] = "Is community-based forest management good for forests in countries that lie in the tropics, and the people who live near those forests?";
fullscreensubtitle["pas"] = "Are protected areas good for forests in the tropics and the people who live near them?";

// the description, below the map, to the left of the legend
// Note: enter this as HTML. Also: use single quotes outside, and double-quotes inside (e.g. target="_blank")
var description = {};
description["fsc"] = '<h3>How to read this infographic</h3><p>The map shows countries where scientists have measured the effectiveness of FSC certification or Reduced Impact Logging. Try hovering or clicking on a circle &mdash; the more evidence there is, the larger the circle.</p><p>The squares below show the results of the studies we have reviewed (see <a href="https://news.mongabay.com/conservation-effectiveness/how-we-reviewed-the-evidence/" target="_blank">methods</a>). Each square (try clicking on one) represents one data point extracted from <a href="https://news.mongabay.com/conservation-effectiveness/references-for-story-on-forest-certification/" target="_blank">scientific, peer-reviewed literature</a>.</p>';
description["pes"] = '<h3>How to read this infographic</h3><p>The map shows countries where scientists have measured the effectiveness of Payments for Ecosystem Services (PES). Try hovering or clicking on a circle — the more evidence there is, the larger the circle.</p><p>The squares below show the results of the studies we have reviewed (see <a href="https://news.mongabay.com/conservation-effectiveness/how-we-reviewed-the-evidence/" target="_blank">methods</a>). Each square (try clicking on one) represents one data point extracted from <a href="https://news.mongabay.com/conservation-effectiveness/references-for-story-on-PES/" target="_blank">scientific, peer-reviewed literature</a>.</p>';
description["cfm"] = '<h3>How to read this infographic</h3><p>The map shows countries where scientists have measured the effectiveness of community forest management initiatives. Try hovering or clicking on a circle — the more evidence there is, the larger the circle.</p><p>The squares below show the results of the studies we have reviewed (see <a href="https://news.mongabay.com/conservation-effectiveness/how-we-reviewed-the-evidence/" target="_blank">methods</a>). Each square (try clicking on one) represents one data point extracted from <a href="https://news.mongabay.com/conservation-effectiveness/references-for-does-community-based-forest-management-work-in-the-tropics/" target="_blank">scientific, peer-reviewed literature</a>.</p>';
description["pas"] = '<h3>How to read this infographic</h3><p>The map shows countries where scientists have measured the effectiveness of strict protected areas. Try hovering or clicking on a circle — the more evidence there is, the larger the circle.</p><p>The squares below show the results of the studies we have reviewed (see <a href="https://news.mongabay.com/conservation-effectiveness/how-we-reviewed-the-evidence/" target="_blank">methods</a>). Each square (try clicking on one) represents one data point extracted from <a href="https://news.mongabay.com/conservation-effectiveness/references-for-do-protected-areas-work-in-the-tropics/" target="_blank">scientific, peer-reviewed literature</a>.</p>';

// horizontal legend text
var legend_text = {};
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
legend_text["pas"] = [
  "PA better than no PA",
  "PA same as no PA",
  "PA worse than no PA"
];

//////////////////////////////////////////////////////////
// Global configuration of various element sizes, spacing
//////////////////////////////////////////////////////////

// Min and Max map circle areas, in km2
var circleareas = {
  min: 15000, 
  max: 1300000,
}

// other sizes and spacing
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

///////////////////////////////////////////////
// Theme groups
////////////////////////////////////////////////

// theme groups (identified as a column in each data.csv row)
// by which to group rows on top and bottom charts
// these were more relevant in the previous versions of the app which had charts both above and below the map
var groups = {
  top: "theme",
  bottom: "variable"
}
