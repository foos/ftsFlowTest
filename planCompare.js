"use strict";
var dto = require("./dto.js");
var fs = require("fs");
var config = require("./config.js");

// let the user specify the year
var year = process.argv[2];
if(isNaN(year)){
  console.error("Invalid year");
  throw ("Invalid year");
}

var outputfilePath = config.localfileOutputPath + `test${year}.json`;
var uAppeal = config.url_ftsapi + `appeal/year/${year}.json`;
var uPlan = config.url_hpcapi + `flow/plan/overview/snapshot/${year}`;

//var uPlan01 = "http://service.stage.hpc.568elmp02.blackmesh.com/v0/fts-beta/plan?filter=false";


console.log("Start:");

// get classic data from API 
var oClassic = new dto.sourceAPI(uAppeal);
var p1 = oClassic
.getAPIData()
.then(readClassicJSON)
.then((ary)=>{
  oClassic.processedData = ary;
  return ary;
})
.catch(function(err){
  console.error(err);
});


// get plan data from API
var oPlan = new dto.sourceAPI(uPlan);
var p2 = oPlan.getAPIData()
.then(readFlowJSONMultiple)
.then((ary)=>{
  oPlan.processedData = ary;
  return ary;
})
.catch(function(err){
  console.error(err);
});  

Promise.all([p1,p2])
.then(values=>{
  var aryMap = dto.createFullMapping(oPlan.processedData,oClassic.processedData);
  console.log("Comparing data for " + aryMap.length + " records");
  
  //console.log(aryMap);
  
  fs.writeFile(outputfilePath,JSON.stringify(aryMap), (err)=>{
    if(err){ console.error(err);}
  });
  
});





//================================== LOCAL CALLBACK FUNCTIONS ===================================
/**
 * to read the JSON from classic db
 * @param {object} apisource - object of type sourceAPI
 * @return (array) of simple plan object
 */
function readClassicJSON(data){
  //if list of data 
  var ary = []; //array of simple plan objects
  
  data.forEach( (item)=>{
    var op = new dto.planSimple(item.id, item.title, "classic");
    op.funding = item.funding;
    op.requirements = item.current_requirements;
    ary.push(op);
  });
  return ary;
  
}




/**
 * to read the JSON from flow db for multiple plan ids from Tim's API
 * @param {object} data - JSON data
 * @return (array) of simple plan object
 */
function readFlowJSONMultiple(data) { 
  //if list of data  
  var ary = []; // array of simple plan objects    
  data.data[0].plan_totals.forEach( (item)=>{
    var op = new dto.planSimple(item.plan_id, item.plan_name, "flow");
    op.funding = item.total_funding;
    op.requirements = item.total_requirements;
    ary.push(op);
  });    
  return ary;    
}





