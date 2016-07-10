/*
 * Specify the some legacy contribution ids 
 * Construct the flow URL and read it  
 * Loop over each result and then construct the simple view
 * 
 */

"use strict";
var dto = require("./dto.js");
var fs = require("fs");
var config = require("./config.js");

var outputFilepath = config.localfileOutputPath + "spotCheckData.json"; 

var url = config.url_hpcapi + "flow/legacy/";

var legacyIds = []; 
legacyIds.push(223962);// Donor to recipient in emergency
legacyIds.push(212912); // donor to unknown recipient in emergency
legacyIds.push(213596); // donor to project in appeal

var aryResults = [];
var aryP = [];

// for each id get the flow
legacyIds.forEach(element=> {
	let oflow = new dto.sourceAPI(url + element);

	let p1 = oflow.getAPIData()
	.then((jdata)=>{
		oflow.jdata = jdata;
		aryResults.push(dto.flowSimple(jdata.data.flow));

	});

	aryP.push(p1);

});

// when all the promises are done then output results
Promise.all(aryP)
.then(values=>{
	//console.log(aryResults);

	fs.writeFile(outputFilepath,JSON.stringify(aryResults), (err)=>{
    if(err){ console.error(err);}
  });
});

// output results

