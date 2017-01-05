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
var customurl = "http://service.stage.hpc.568elmp03.blackmesh.com/v0/public/fts/flow?planid=938&limit=10000";

//"http://service.stage.hpc.568elmp03.blackmesh.com/v0/public/fts/flow?year=2014&organizationabbrev=UNICEF&limit=100000";

//"http://service.stage.hpc.568elmp03.blackmesh.com/v0/public/fts/flow?year=2014,2015"; 
//"http://service.stage.hpc.568elmp03.blackmesh.com/v0/public/fts/flow?planid=914";
//"http://service.stage.hpc.568elmp03.blackmesh.com/v0/public/fts/flow?organizationabbrev=Sweden&year=2014";
//"http://service.stage.hpc.568elmp03.blackmesh.com/v0/public/fts/flow?countryISO3=ETH,ERI&year=2014,2015";
//"http://service.stage.hpc.568elmp03.blackmesh.com/v0/public/fts/flow?organizationabbrev=UNICEF&year=2014&globalClustercode=EDU";
//"http://service.stage.hpc.568elmp03.blackmesh.com/v0/public/fts/flow?organizationabbrev=Germany,UNICEF&year=2014"
//"http://service.stage.hpc.568elmp03.blackmesh.com/v0/public/fts/flow?countryISO3=SDN&year=2014,2015";
//"http://service.stage.hpc.568elmp03.blackmesh.com/v0/public/fts/flow?planCode=HSDN15&organizationabbrev=Sudan%20CHF,WFP";

//"http://service.stage.hpc.568elmp03.blackmesh.com/v0/public/fts/flow?countryISO3=MMR&year=2015,2016";
//"http://service.stage.hpc.568elmp03.blackmesh.com/v0/public/fts/flow?globalClustercode=EDU&year=2014";
//"http://service.stage.hpc.568elmp03.blackmesh.com/v0/public/fts/flow?organizationabbrev=France&year=2014" ;
// https://service.stage.hpc.568elmp03.blackmesh.com/v0/public/fts/flow?organizationabbrev=Germany&year=2015
//"http://service.stage.hpc.568elmp03.blackmesh.com/v0/public/fts/flow?countryISO3=SDN&year=2014";
// "http://service.stage.hpc.568elmp03.blackmesh.com/v0/public/fts/flow?emergencyID=1846" ;
//"http://service.stage.hpc.568elmp03.blackmesh.com/v0/public/fts/flow?countryISO3=MMR&year=2013&boundary=incoming&flowstatus=paid,commitment";


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

    /* special  to view specific types of flows */
    let tem = [];
    ele.data.flows.forEach((obj)=>{
      if(obj.boundary === "incoming"){
      // get the original values from the api
        
        //let v = {flowid: Number(obj.id), boundary: obj.boundary, amt: obj.amountUSD};
        //obj.sourceObjects.forEach((e)=>{ if(e.type==="Location" && e.name === "Japan" ){ v.s = e.name; } });
        //obj.destinationObjects.forEach((e)=>{ if(e.type==="Location" ){ v.d =  e.name; } });
        //if(v.s !== undefined){
        //  tem.push(v);
       // //}

        let forg = false;
        obj.sourceObjects.forEach((e)=>{ 
          if(e.type==="Organization" ){ forg=true; } 
        });
        if(!forg){
          tem.push({flowid: Number(obj.id), boundary: obj.boundary, amt: obj.amountUSD});
        }

        //return v;
      }
    });
    

    /*
    let total = 0;
    let out = 0;
    tem.forEach((e)=>{
      if(e.boundary === "incoming" || e.boundary === "internal"){
        total += e.amt;
      }
      if(e.boundary === "outgoing"){
        out += e.amt;
      }
    });
    console.log(`total=${total} and out=${out} and remainder =${total-out} ` ); */

      
    console.log(tem);
    let t = 0;
    tem.forEach((d)=>{
      t += d.amt;
    });
    console.log(t);
    //=====================
    

    /*============== */
    // get all
    /*
    let aryContributions = ele.data.flows.map((obj)=>{
      // in case using solr api and not postgres api, get the original values from the api
      let v = {flowid: Number(obj.id), amt: obj.amountUSD, boundary: obj.boundary, status: obj.status}; 
      return v;
    });
    */

    // get some only
    /*
    let aryContributions = [];
    ele.data.flows.forEach((obj)=>{ 
      let b = false; 
      obj.sourceObjects.forEach((e)=>{  
        if(e.type==="Location" && e.name === "Japan" ){ b = true;  } 
      });
      if(b === true){ 
        // in case using solr api and not postgres api, get the original values from the api
        let v = {flowid: Number(obj.id), amt: obj.amountUSD, boundary: obj.boundary, status: obj.status}; 
        aryContributions.push(v);
      }
    });


    // for each flow record, process
    console.log("a=" + aryContributions.length);
    let aryResult = [];
    throttle(aryContributions,0, 25, aryResult ,index);
    */

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
        output +=   element.legacyId + "," + element.id  + "," 
        + element.amountUSD + "," + element.boundary + "," + element.status + "\n";
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
 * to process an array of flows to get the legacy id from postgres (add any additional params if needed)
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
      n.status = element.status;
      aryResults.push(n);
      
    })
    .catch(function(err){
      console.error(err + " ,id = " + element.flowid);
    });  
    aryP.push(p1);
  });

  // when all the promises are done then output results
  return Promise.all(aryP);
}

