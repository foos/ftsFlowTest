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

  var o = {};

  o.id = flow.id;
  o.amountUSD = flow.amountUSD;
  o.flowDate = flow.flowDate;
  o.decisionDate = flow.decisionDate;
  o.firstReportedDate = flow.firstReportedDate;
  o.budgetYear = flow.budgetYear;
  o.origAmount = flow.origAmount;
  o.origCurrency = flow.origCurrency;
  o.exchangeRate = flow.exchangeRate;
  o.restricted = flow.restricted;
  o.description = flow.description;
  o.createdAt = flow.createdAt;
  o.updatedAt = flow.updatedAt;
  o.legacyId = flow.legacy.legacyID;

  // loop over array and add dynamic properties to this object
  /*
  if(flow.flowObjects != null){
    for(let i=0; i<flow.flowObjects.length; i++){
    let item = flow.flowObjects[i];
    this[item.key] = item.name;
    }
  }
  */

  // mini function to process the attached objects
  o.addProperty = function(flowProperty, propertyName){
    if(flow[flowProperty] !== undefined && flow[flowProperty].length > 0){
      let aryProp = [];
      let pn = (propertyName == null) ? "name" : propertyName;
      for(let i = 0; i< flow[flowProperty].length; i++){
        let op = {};
        op.value = flow[flowProperty][i][pn];
        op.direction = flow[flowProperty][i].flowObject.refDirection;
        aryProp.push(op);
      }
      this[flowProperty] = aryProp;
    }
  }


  // loop over array and add dynamic properties to this object
  if(flow.categories !== null && flow.categories.length > 0){
    for(let i=0; i<flow.categories.length; i++){
      let item = flow.categories[i];
      o[item.group] = item.name;
    } 
  }

  /*
  if(flow.emergencies !== undefined && flow.emergencies.length > 0){
    o.emergencies = flow.emergencies[0].name;
    o.emergenciesDirection = flow.emergencies[0].flowObject.refDirection;
  }
  */

  o.addProperty("emergencies");
  o.addProperty("plans");
  o.addProperty("projects","code");
  o.addProperty("usageYears","year");
  o.addProperty("globalClusters");
  o.addProperty("locations");
  o.addProperty("organizations");
  o.addProperty("clusters");

  if(flow.children !== null && flow.children.length > 0){
    o.children = [];
    for(let i=0; i<flow.children.length; i++){
      let item = flow.children[i];
       o.children.push(item.childID);
    } 
  }

  return o;
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
  
    let omapped = new this.mapAppealToPlan(0, sourceflow[i].id); 
    let appealfound = undefined;
    for(let j = 0; j<iscl; j++){      
      // if matching appeal title found, add it to the mapped object
      if(sourceflow[i].title === sourceclassic[j].title){ 
        appealfound = j;
        omapped.AppealId = sourceclassic[j].id;
      }      
    }
    if(appealfound === undefined){ 
      aryFull.push(new this.matrixRow(undefined, sourceflow[i]));
    }
    else{
      aryFull.push(new this.matrixRow(sourceclassic[appealfound], sourceflow[i]));
    } 
    ary.push(omapped); 
  }
  
  // now do the other way around to check for appeal id's that have matched no plan id's
  /* for(let i=0; i<iscl; i++){
    let f = false;
    ary.forEach((mapped)=>{
      if(sourceclassic[i].id === mapped.AppealId){
        f = true;
      }
    });
    if(!f){
      //ary.push(new this.mapAppealToPlan(sourceclassic[i].id, null));
      aryFull.push(new this.matrixRow(sourceclassic[i],null));
    }
  }
  */
  
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
