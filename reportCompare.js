/**
 * This is to check the report end points from the FTS beta 
 * against the classic API funding values grouped by donor and recipient
 * 
 * Call from node.js console pass in FlowPlanID and AppealID 
 * 
 */
"use strict";
var dto = require("./dto.js");
var fs = require("fs");
var config = require("./config.js");

// let the user specify the plan id
var planId = process.argv[2];
if(isNaN(planId)){
  console.error("Invalid plan id");
  throw ("Invalid plan id");
}

var appealId = process.argv[3];
if(isNaN(appealId)){
  console.error("Invalid appeal id");
  throw ("Invalid appeal id");
}

var outputFilepath = config.localfileOutputPath; 

var uContributions1 = config.url_ftsapi + `funding.json?appeal=${appealId}&groupby=donor`;
var uContributions2 = config.url_ftsapi + `funding.json?appeal=${appealId}&groupby=recipient`;
var uAppeal = config.url_ftsapi + `appeal/id/${appealId}.json`;

var uPlan = config.url_hpcapi + `flow/reports/plan/${planId}`;


//var uPlan01 = "http://service.stage.hpc.568elmp02.blackmesh.com/v0/fts-beta/plan?filter=false";
//var uapiFlow01 = "http://service.stage.hpc.568elmp02.blackmesh.com/v0/fts-beta/flow/reports/plan/";


console.log("Start:");
var t1 = Date.now();

// get plan data from API
var oPlanReport = new dto.sourceAPI(uPlan);
var p1 = oPlanReport.getAPIData()
.then((jdata)=>{
  howlong("p1");
  oPlanReport.jdata = jdata;
  let a1 = readCategories(jdata);   
  let a2 = readReport(jdata);
  oPlanReport.processedData = [a1,a2];
  
  // output the simplified categories and report into a file for reference
  fs.writeFile(`${outputFilepath}testCategory${planId}.json`,JSON.stringify(a1), (err)=>{
    if(err){ console.error(err);}
  });
  fs.writeFile(`${outputFilepath}testReport${planId}.json`,JSON.stringify(a2), (err)=>{
    if(err){ console.error(err);}
  });

  return [a1,a2]; // 2 reports!  Note that the categories has length, and reports has length 4
})
.catch(function(err){
  console.error(err);
});  
 

// get classic total appeals
var oAppeal = new dto.sourceAPI(uAppeal);
var p2 = oAppeal.getAPIData()
.then((jdata)=>{
  howlong("p2");
  oAppeal.jdata = jdata;
  return getClassicAppeal(jdata);
});

// get total by donor
var oAppealFundingByDonor = new dto.sourceAPI(uContributions1);
var p3 = oAppealFundingByDonor.getAPIData()
.then((jdata)=>{
  howlong("p3");
  oAppealFundingByDonor.jdata = jdata;
  return jdata.grouping;
});

// get total by recipient
var oAppealFundingByRecipient = new dto.sourceAPI(uContributions2);
var p4 = oAppealFundingByRecipient.getAPIData()
.then((jdata)=>{
  howlong("p4");
  oAppealFundingByRecipient.jdata = jdata;
  return jdata.grouping;
});



// when all are done, output to screen so can see the values.
Promise.all([p1,p2,p3,p4])
.then(values=>{
  
  let res = {};

  // first test the total values
  res.title = values[1].title;
  res.TestTotal = compareTotalRep1(values[0][0], values[1]); 

  // then compare report 1 against expected values
  res.TestReport1_Donor = compareReportValues(values[0][1][0], values[2]);

  // compare report 2 against expected values
  res.TestReport2_Immediate = compareReportValues(values[0][1][1], values[3]);
  
  // compare report 3 against expected values
  res.TestReport3_Ultimate = compareReportValues(values[0][1][2], values[3]);

  console.log(res);
  fs.writeFile(`${outputFilepath}${res.title}.json`,JSON.stringify(res), (err)=>{
    if(err){ console.error(err);}
  });

})
.then(()=>{
  howlong('Overall');
});





//================== comparison function ======================

/**
 * function to compare the appeal totals first
 * 
 * @returns {JSON} json object of results
 */
function compareTotalRep1(flowData, classicData){
  var r1 = flowData[0].sum;
  var r2 = classicData.funding;
  var s = {"FlowTotal": r1, "ClassicTotal": r2};
  var diff = Number(r1) - Number(r2);
  if(diff != 0 ){
    s.check = 'FAIL!';
    s.Diff= diff;
  }
  else{
    s.check = 'OK!';
  }
  return s;
}

/**
 * function to compare reports against classic data
 * 
 * @param {Array} flowData - this is the processed reports array, apecify the correct item
 * @param {Array} classicData - part of the classic api output 
 * @returns {JSON} json object of results
 */
function compareReportValues(flowData, classicData){
  var orgListNames = flowData.map(item=>{
     let o = item;
     o.name = o.name.replace(', Government of',""); // remove the extra string for donors
     return o;
  });

  var ary = [];
  var ok = 0;
  var fail = 0;
  var sanitycheck = 0;

  // loop over and match the names of the source/destination organisations to compare values
  orgListNames.forEach(item=>{

    var o = new Object();
    o.flowSide = item.name;
    o.flowValue = item.total;
    sanitycheck += item.total;

    classicData.find(inneritem=>{
      if(item.name === inneritem.type){
        //o.appealDonor = inneritem.type;
        o.appealValue = inneritem.amount;
      }
    }); 
   
    if(o.flowValue === o.appealValue){
      o.TEST = "OK!";
      ok++;
    }
    else{
      o.TEST = "FAIL!";
      fail++
    }

    if(o.TEST == "FAIL!"){ // only get the errors
      o.diff = o.flowValue - o.appealValue;
      ary.push(o);
    }
  });

  // now loop over the classic and see what was not matched
  var arynotfound = [];
  classicData.forEach(item=>{
    let b = 0;
    for(let i=0; i<orgListNames.length; i++){
      if(item.type === orgListNames[i].name){
        b++;
      }
    }

    if(b === 0 && item.amount > 0){
      arynotfound.push(item);
    }
  });
  
  var res = {"CheckTotal":sanitycheck, "ok":ok, "fail":fail, "Problems": ary, "NotInflow":arynotfound};
  return res;

}




// how long?
function howlong(description){
  let t2 = (Date.now() - t1)/1000;
  console.log(description + ": " + t2 + " seconds");
}




//============== LOCAL CALL BACK FUNCTIONS TO PROCESS THE API OUTPUTS ===========================

/**
 * to get the summary data and get array of simple report data
 */
function readCategories(data){
  let ary = [];
  
  ary.push(new dto.boundarySimple('inbound',data.summary.categories.inbound.sum, getFlowId(data.summary.categories.inbound.flows)));

  ary.push(new dto.boundarySimple('outbound',data.summary.categories.outbound.sum, getFlowId(data.summary.categories.outbound.flows)));

  ary.push(new dto.boundarySimple('internal',data.summary.categories.internal.sum, getFlowId(data.summary.categories.internal.flows)));

  return ary;
}

/**
 * To get the report data, pass in object property
 */
function readReport(data){
  var ary = [];
   
  // REPORT 1 first!
  var obj1 =  data.summary.reports.report1;
  var obj2 =  data.summary.reports.report2;
  var obj3 =  data.summary.reports.report3;
  var obj4 =  data.summary.reports.report4;
  
  var res1 = [];
  var res2 = [];
  var res3 = [];
  var res4 = [];

  for(let i in obj1){
    //arytemp[i] = obj[i];
    let o = new Object;
    o.name = i;
    let total = 0;
    obj1[i].forEach((flow)=>{
      let f =  Number(flow.amountUSD);
      total += f;

    });
    o.total = total;
    res1.push(o);   


  }

  for(let i in obj2){
    //arytemp[i] = obj[i];
    let o = new Object;
    o.name = i;
    o.total = obj2[i].sum;
    res2.push(o);
  }

  for(let i in obj3){
    //arytemp[i] = obj[i];
    let o = new Object;
    o.name = i;
    o.total = obj3[i].amount;
    res3.push(o);
  }

  for(let i in obj4){
    //arytemp[i] = obj[i];
    let o = new Object;
    o.name = i;
    let total = 0;
    obj4[i].forEach((flow)=>{
      let f =  Number(flow.amountUSD);
      total += f;
    });
    o.total = total;
    res4.push(o);
  }


  ary.push(res1);
  ary.push(res2);
  ary.push(res3);
  ary.push(res4);
  
  return ary;
}



/**
 * to get flow data for each report
 * 
 * @param {Array} data - this is the array of flow data, which as "id"" as a property
 */
function getFlowId(data){
  // loop through and get all flows
  var ary = [];
  for(let i = 0; i < data.length; i++){
    //let ofd = new dto.flowSimple(data[i]);
    ary.push(data[i].id);
  }
  return ary;
}



/**
 *  to read the classic api for appeal/id/###.json for appeal funding
 * 
 *  @param {JSON} jdata - this is the output from the classic API
 *  @return {object} of simple appeal
 */
function getClassicAppeal(jdata){
  var item = jdata[0];
  var op = new dto.planSimple(item.id, item.title, "classic");
  op.funding = item.funding;
  op.reqirements = item.current_requirements;

  return op;
}

