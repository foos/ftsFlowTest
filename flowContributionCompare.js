/**
 * 
 */

"use strict";
var dto = require("./dto.js");
var fs = require("fs");
var config = require("./config.js");

var urlFlow = config.url_hpcapi + "flow/id/";



// get all flow id's from custom search API 
// get legacy contribution id's from list of flow id's
var customurl = "http://service.stage.hpc.568elmp03.blackmesh.com/v0/public/fts/flow?emergencyID=1899";

//"http://service.stage.hpc.568elmp03.blackmesh.com/v0/public/fts/flow?countryISO3=MMR&year=2013&boundary=incoming&flowstatus=paid,commitment";

/*
var oCustomAPI = new dto.sourceAPI(customurl);
var p1 = oCustomAPI.getAPIData()
.then((jdata)=>{
  // now parse the json data to get the list of flow id's
  var oflows = jdata.data.flows;
  aryContributions = oflows.map((obj)=>{
    return Number(obj.id);
  });

  if(jdata.meta.nextLink !== undefined){

  }

  console.log(aryContributions.length);
  throttle(aryContributions,0,25);
});
*/


var aryjdata = [];
function customAPI(url){

  let oAPI = new dto.sourceAPI(url);
  let p1 = oAPI.getAPIData()
  .then((jdata)=>{
    aryjdata.push(jdata);
    console.log("jdata1 " + jdata.data.flows.length);
    if(jdata.meta.nextLink !== undefined){
      console.log("next page " + jdata.meta.nextLink)
      // recursive call
      return customAPI(jdata.meta.nextLink);
    }
    
  });
  return p1;
  
}

// now call it 
customAPI(customurl)
.then(()=>{

  console.log("ARYDATA= ")
  console.log(aryjdata.length);

  // loop over the flows in the API pages
  aryjdata.forEach((ele,index)=>{
    let aryContributions = ele.data.flows.map((obj)=>{
      let v = {flowid: Number(obj.id), amt: obj.amountUSD, boundary: obj.boundary}; // in case using solr api and not postgres api, set the amt
      return v;
    });

    // for each flow record, process
    console.log(aryContributions.length);
    let aryResult = [];
    throttle(aryContributions,0,25, aryResult ,index);
  });
});






//===================== MOVE OUT WHEN HAVE TIME ================


/**
 * to batch process an array of contribution id's, recursive call
 * @param {array} ary - of contribution id's
 * @param {int} start - the position to use to start and continue the array processing
 * @param {int} batchsize - the batch size
 */
function throttle(ary, start, batchsize, aryResults, thread){
  
  let current = start;

  console.log("throttle thread=" + thread + " n=" + current);

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
  var P = processFlows(lary, aryResults);
  P.then(()=>{
    if(current === tlength){ // if last batch and no more to process then output

      console.log("output " + aryResults.length);

      let output = "";
      aryResults.forEach((element)=>{
        output +=   element.legacyId + "," + element.id  + "," + element.amountUSD + "," + element.boundary + "\n";
      });

      fs.writeFile(config.localfileOutputPath + thread + "flow.csv", output, (err)=>{
          if(err){ console.error(err);}
      });


      return true;

    }
    else{ // recursive call to next batch
      throttle(ary,current,batchsize, aryResults, thread);
    }
    
  });

}



/**
 * to process an array of flows
 * 
 * @param {array} flows
 * @param {array} flowSimple
 */
function processFlows(aryFlows, aryResults){
  var aryP = [];
  
  aryFlows.forEach(element=> {
    // call the individual flow api to get the legacy id
    let oflow = new dto.sourceAPI(urlFlow + element.flowid);
    //console.log(element);

    let p1 = oflow.getAPIData()
    .then((jdata)=>{
      let n = dto.flowSimple(jdata.data);
      n.amountUSD = element.amt; // overwrite the amt value in case it is  from the flow public API
      n.boundary = element.boundary;
      aryResults.push(n);
      
    })
    .catch(function(err){
      console.error(err + " ,id = " + element);
    });  
    aryP.push(p1);
  });

  // when all the promises are done then output results
  return Promise.all(aryP);
}

