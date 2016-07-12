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
  po.jdata = jdata;
  jdata.forEach(element=>{ // just get the contribution id's into an array
    aryContributions.push(element.id);
  });

  console.log("length = " + aryContributions.length);
  
  // now throttle process the array of contribution id's
  throttle(aryContributions,0,50);

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
    if(current === tlength){ // if last batch and no more to process
      console.log("output " + aryResults.length);
      fs.writeFile(outputFilepath,JSON.stringify(aryResults), (err)=>{
          if(err){ console.error(err);}
      });
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

