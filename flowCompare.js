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
var urlcontri = config.url_ftsapi + "contribution/emergency/";

// let the user specify the emergency id
var emergencyId = process.argv[2];
if(isNaN(emergencyId)){
  console.error("Invalid emergencyId");
  throw ("Invalid emergencyId");
}
var outputFilepath = config.localfileOutputPath + "CheckData_" + emergencyId + ".json"; 

// global arrays
var aryContributions = [];
var aryResults = [];

console.log("start");

// get the contribution API output first
var oContribution = new dto.sourceAPI(urlcontri + emergencyId + ".json");
var p0 = oContribution.getAPIData()
.then(jdata=>{
  oContribution.jdata = jdata;
  jdata.forEach(element=>{ // just get the contribution id's into an array
    aryContributions.push(element.id);
  });

  console.log("length = " + aryContributions.length);
  
  // now throttle process the array of contribution id's
  throttle(aryContributions,0,25);

})
.catch(function(err){
  console.error(err);
});  

/** @global {int} current - to keep track of the current position for the batch processing */
var current;
/**
 * to batch process an array of contribution id's, recursive call
 * @param {array} ary - of contribution id's
 * @param {int} start - the position to use to start and continue the array processing
 * @param {int} batchsize - the batch size
 */
function throttle(ary, start, batchsize){
  
  current = start;

  console.log("throttle "+ current);

  // logic to work out how many to left to process and adjust the batchsize accordingly
  var tlength = ary.length;
  var remainder = tlength % batchsize;
  var limit = tlength - remainder;
  if(current === limit){
    batchsize = remainder;
  }
  else if(tlength < batchsize){
    batchsize = tlength;
  }

  var lary = [];
  // get the current batch to process
  for(let i=0; i < batchsize; i++){
    lary[i] = ary[current];
    current++;
  }

  // process the current batch
  var P = processFlows(lary);
  P.then(()=>{
    if(current === tlength){ // if last batch and no more to process then output

      console.log("output " + aryResults.length);
      fs.writeFile(outputFilepath,JSON.stringify(aryResults), (err)=>{
          if(err){ console.error(err);}
      });

      let comparison = compare(oContribution.jdata, aryResults);
      console.dir(comparison);

      return true;

    }
    else{ // recursive call to next batch
      throttle(ary,current,batchsize);
    }
    
  });

}




/**
 * to process an array of contribution id's
 * @param {array} of contribution id's
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



/**
 * To loop over the outputs from the Classic API and compare against the output from the HPC service
 * @param {array} aryClassic - the classic API output
 * @param {array} aryHPC - the processed output from HPC
 */
function compare(aryClassic, aryHPC){

  var results = [];

  var compareProperty = function(classic, hpc){
    return (classic == hpc);
  }

  // for each classic element, check the equivalent HPC
  aryClassic.forEach((classicElement)=>{  

    let r = {};
    r.classicId = classicElement.id;

    let match = aryHPC.find((hpcElement)=>{
      return hpcElement.legacyId === classicElement.id;
    });
    if(match == undefined){
      r.flowId = null; // not found, return!
      return;
    }
    
    // now assign values and compare each
    r.flowId = match.id;
    r.check_amount = compareProperty(classicElement.amount, match.amountUSD);

    // loop over properties of the classic and check on the hpc
    var classicProperties = Object.getOwnPropertyNames(classicElement);
    classicProperties.forEach((classicProperty)=>{
      let hpcProperty = mapping[classicProperty];
      if(hpcProperty == undefined){return;}
      if(classicElement[classicProperty] == match[hpcProperty]){
        r[classicProperty] = true;
      }
      else{
        if(classicElement[classicProperty] == "" && match[hpcProperty] == null){
          r[classicProperty] = true;
        }
        else{
           r[classicProperty] = `${classicElement[classicProperty]} != ${match[hpcProperty]}`;
        }
      }
    });

    results.push(r);
  });

  return results;
}

var mapping = [];
mapping["amount"] = "amountUSD";
//mapping["decision_date"] = "decisionDate";
mapping["original_currency_amount"] = "origAmount";

