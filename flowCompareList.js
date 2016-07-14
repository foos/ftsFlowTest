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

var urlFlow = config.url_hpcapi + "flow/legacy/";
var outputFilepath = config.localfileOutputPath + "CheckDataList"; 

// global arrays
var aryContributions = [];
aryContributions.push(214335); // flow coming out of an appeal to the emergency
aryContributions.push(191388); //  child flow linked to parked from ECHO
aryContributions.push(190217); // flow to CHF
aryContributions.push(190598); // flow to emergency
aryContributions.push(175930); // parked flow (total foreign 57275000 EUR)
aryContributions.push(223502); // flow to emergency recipient various
aryContributions.push(190144); // CERF allocation
aryContributions.push(182355); // carry over
aryContributions.push(195834); // misc emergency
aryContributions.push(201319); // allocation of unearmarked funds by WFP inside appeal
aryContributions.push(200509); // allocation of unearmarked funds by WFP emergency
aryContributions.push(249983); // various donors to WFP
aryContributions.push(249597); // various donors to IMC
aryContributions.push(249349); // misc emergency, various donors to UNICEF
aryContributions.push(245038); // various recipients
aryContributions.push(115440); // UN agencies/NGOs recipients
aryContributions.push(244321); // CHF allocation
aryContributions.push(243752); // Swiss to CERF
aryContributions.push(191666); // parked flow euro 36823764
aryContributions.push(228248); // flow linked to dummy emergency - should return null
aryContributions.push(97425); // katrina - restricted



var aryResults = [];

console.log("start");

var p = processFlows(aryContributions);
p.then(()=>{
  console.log(aryContributions.length + " vs " + aryResults.length)

  aryContributions.forEach((element)=> {
    let c = aryResults.find((val)=>{
      return val.legacyId == element;
    });
    if(!c){ console.log(element + " not found");}
  });

  aryResults.forEach((element)=>{
    let f = outputFilepath + "_" + element.legacyId + ".json";

    fs.writeFile(f,JSON.stringify(element), (err)=>{
      if(err){ console.error(err);}
    });
  });

});




/**
 * to process an array of contribution id's
 * @param {array} of contribution id's
 * @returns {Promise} promise of all items completed.
 * 
 */
function processFlows(aryFlows){
  var aryP = [];

  aryFlows.forEach(element=> {
    let oflow = new dto.sourceAPI(urlFlow + element);
    //console.log(element);

    let p1 = oflow.getAPIData()
    .then((jdata)=>{
      oflow.jdata = jdata;
      aryResults.push(dto.flowSimple(jdata.data.flow));
      
    })
    .catch(function(err){
      console.error(err);
    });  
    aryP.push(p1);
  });

  // when all the promises are done then output results
  return Promise.all(aryP);
}



