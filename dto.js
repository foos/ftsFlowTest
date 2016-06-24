"use strict";
var http = require("http");
var bl = require("bl"); // external package bl    
    
//========================================== DEFINITIONS ===========================


/**
* simple plan object definition
*
*/
exports.planSimple = function(id, title, source){
  this.source = source;
  this.id = id;
  this.title = title;
  this.funding = null;
  this.requirements = null;
  
}

/**
* object of mapped flowId's to appealId's
*
*/
exports.mapAppealToPlan = function(AppealId, PlanId){
  this.AppealId = AppealId;
  this.PlanId = PlanId;
}


/**
 * simple flow data object
 */
exports.flowSimple = function(flow){
  this.id = flow.id;
  this.amountUSD = flow.amountUSD;

  // loop over array and add dynamic properties to this object
  /*
  if(flow.flowObjects != null){
    for(let i=0; i<flow.flowObjects.length; i++){
    let item = flow.flowObjects[i];
    this[item.key] = item.name;
    }
  }
  */

  // loop over array and add dynamic properties to this object
  if(flow.categories != null){
  for(let i=0; i<flow.categories.length; i++){
    let item = flow.categories[i];
    this[item.group] = item.name;
    } 
  }
  
}



/**
 * simple boundary object
 */
exports.boundarySimple = function(type, sum, aryFlows){
  this.type = type;
  this.sum = sum;
  this.flows = aryFlows;
}


/**
 * simple report object
 */
exports.reportSimple = function(type, name, aryFlows){
  this.type = type;
  this.name = name;
  this.flows = aryFlows;
}




/**
 * Object for source API, to get data and hold it
 * @param {string} url - api to read
 * @param {boolean} isMultiple - to define if the JSON is expected to return multiple or single values
 */
exports.sourceAPI = function(url){
  const CLASSIC = "classic";
  const FLOW = "flow";
  
  this.jdata; //raw JSON data
  this.processedData; // processed data
  this.url = url;
    
  this.apitype;
  this.setClassic = ()=>{this.apitype = CLASSIC;};
  this.setFlow = ()=>{this.apitype = FLOW;};  
  this.isClassic = ()=>{return (this.apitype == CLASSIC)};
  this.isFlow = ()=>{return (this.apitype == FLOW)};      
  if(url.includes("fts.unocha.org")){
    this.setClassic();
  }
  else if(url.includes("http://service.") || url.includes("hpc.tools")){
    this.setFlow();
  }
      
  // function to get the data as JSON object
  this.getAPIData = ()=>{
    var lurl = this.url; // convert to local as promises don't take "this." values!
    var ldata;
    var p1 = new Promise(function(resolve,reject){ 
     http.get(lurl, function(response){ 
       response.pipe(bl(function(err,data){
         if(data.toString().length === 0){
            reject("No data for " + lurl);
         }
         else if(data.toString().startsWith('<')){
            reject("Error with response for " + lurl);
         }
         else{
            ldata = JSON.parse(data.toString()); // success, parse the data
            this.jdata =  ldata; // this doesn't work?!
            resolve(ldata); // callback function on final data
         }               
       }));
     });    
   });
   
   return p1;
  }  
   
// close object defn   
}
 

/**
 * to take array of simple plans for flow and appeal, and create an array that has mapped id's to each other.  This will also include appeal ids with no mapped plan id and vice versa
 * @param {Array} sourceflow - array of simple plan object from flow API
 * @param {Array} sourceclassic - array of simple plan object from classic API
 * @return {Array} of mapped data MapAppealToPlan objects
 */
exports.createFullMapping = function(sourceflow, sourceclassic){
  
  //console.log("create mapping");
  
  var isfl = sourceflow.length;
  var iscl = sourceclassic.length;
  var ary = [];
  var aryFull = [];
  console.log(`${iscl} ${isfl}`);
  
  for(let i = 0; i<isfl; i++){
    // create the mapped object first with plan id
  
    var omapped = new this.mapAppealToPlan(0, sourceflow[i].id); 
    let appealfound = 0;
    for(let j = 0; j<iscl; j++){      
      // if matching appeal title found, add it to the mapped object
      if(sourceflow[i].title == sourceclassic[j].title){ 
        appealfound = j;
        omapped.AppealId = sourceclassic[j].id;
      }      
    }
    if(appealfound == 0){
      aryFull.push(new this.matrixRow(undefined, sourceflow[i]));
    }
    else{
      aryFull.push(new this.matrixRow(sourceclassic[appealfound], sourceflow[i]));
    } 
    ary.push(omapped); 
  }
  
  // now do the other way around to check for appeal id's that have matched no plan id's
  for(let i=0; i<iscl; i++){
    var f = false;
    ary.forEach((mapped)=>{
      if(sourceclassic[i].id === mapped.AppealId){
        f = true;
      }
    });
    if(!f){
      ary.push(new this.mapAppealToPlan(sourceclassic[i].id, null));
      aryFull.push(new this.matrixRow(sourceclassic[i],null));
    }
  }
  
  
  return aryFull;
}


/**
 * function to take a simple appeal and plan object and then set a list of properties
 */
exports.matrixRow = function(appeal, plan){
  
  this.AppealId = (appeal !== undefined) ? appeal.id : null;
  this.AppealTitle = (appeal !== undefined) ? appeal.title : null;
  this.AppealFunding = (appeal !== undefined) ? appeal.funding : null;
  this.AppealRequirements = (appeal !== undefined) ? appeal.requirements : null;
  
  this.PlanId = (plan !== undefined) ? plan.id  : null;
  this.PlanTitle = (plan !== undefined) ? plan.title : null;
  this.PlanFunding = (plan !== undefined) ? plan.funding : null;
  this.PlanRequirements = (plan !== undefined) ? plan.requirements : null;
  

  this.FundingDiff = function(){
    let af = (appeal === undefined) ? 0 : appeal.funding;
    let pf = (plan === undefined) ? 0 : plan.funding;
    return af - pf;
  }();
  this.RequirementsDiff = function(){
    let ar = (appeal === undefined) ? 0 : appeal.requirements;
    let pr = (plan === undefined) ? 0 : plan.requirements;
    return ar - pr;
  }();
  
}
