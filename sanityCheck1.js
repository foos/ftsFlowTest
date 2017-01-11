"use strict";
var dto = require("./dto.js");
var fs = require("fs");
var config = require("./config.js");

var year = process.argv[2];
if(isNaN(year)){
  console.error("Invalid year");
  throw ("Invalid year");
}

var uMap = "http://service.stage.hpc.568elmp03.blackmesh.com/v0/fts-beta/flow/global/homepage/map/" + year;
var uapiCountry = `http://service.stage.hpc.568elmp03.blackmesh.com/v0/public/fts/flow?year=${year}&groupby=country&report=2`;
var uapiDonor = `http://service.stage.hpc.568elmp03.blackmesh.com/v0/public/fts/flow?year=${year}&groupby=organization&report=1`;

var uapiPlanYear = `http://service.stage.hpc.568elmp03.blackmesh.com/v0/public/plan/year/${year}`;
var uapiPlan = "http://service.stage.hpc.568elmp03.blackmesh.com/v0/public/fts/flow?planid=";


console.log("Start:");
var dataMap, dataApiCountry, dataApiDonor, dataApiPlan;

// get MAP data from API 
var dMap = new dto.sourceAPI(uMap);
var p1 = dMap
.getAPIData()
.then((data)=>{
    dataMap = data;
    return data;
})
.catch(function(err){
  console.error(err);
});


var dapiC = new dto.sourceAPI(uapiCountry);
var p2 = dapiC
.getAPIData()
.then((data)=>{
    dataApiCountry = data.data.report2.fundingTotals.objects[0].singleFundingObjects;
    return dataApiCountry;
})
.catch(function(err){
  console.error(err);
});

var dapiD = new dto.sourceAPI(uapiDonor);
var p3 = dapiD
.getAPIData()
.then((data)=>{
    dataApiDonor = data.data.report1.fundingTotals.objects[0].singleFundingObjects;
    return dataApiDonor;
})
.catch(function(err){
  console.error(err);
});

// get plans
var dapiP = new dto.sourceAPI(uapiPlanYear);
var p4 = dapiP
.getAPIData()
.then((data)=>{
    let ary = [];
    data.data.forEach((item)=>{
        let url = uapiPlan + item.id;
        ary.push({name: item.name, id: item.id, revisedRequirements: item.revisedRequirements, url: url});
    });

    // now have to get each plan api separately
    let aryR = [];
    let aryP = [];
    ary.forEach((thing)=>{ 
        let t = new dto.sourceAPI(thing.url); 
        let p = t.getAPIData().then((data)=>{
            aryR.push({name: thing.name, id: thing.id, revisedRequirements: thing.revisedRequirements, funding: data.data.incoming.fundingTotal});
        });
        aryP.push(p); 
    });
    
    return Promise.all(aryP).then(()=>{
        dataApiPlan = aryR;
        return dataApiPlan;
    });
    
    
})
.catch(function(err){
  console.error(err);
});

Promise.all([p1,p2,p3,p4])
.then(values=>{
    //console.log(dataMap.data.funding_by_location[0]);
    // Sanity check on locations first
    let setText = setTextForBlock();
    dataApiCountry.sort((a,b)=>{
        let a1 = a.name.toLowerCase();
        let b1 = b.name.toLowerCase();
        if(a1<b1){return -1;}
        if(a1>b1){return 1;}
        return 0;
    });

    dataApiCountry.forEach((val)=>{ 
        let mv = "missing";
        dataMap.data.funding_by_location.forEach((mapitem)=>{ 
            if(mapitem.location_id === val.id){ mv = mapitem;}
        });

        if(mv === "missing"){            
            setText(val.name + " " + val.totalFunding + " missing in map");
        }
        else{
            if(mv.total_funding !== val.totalFunding){               
                setText(val.name + ` error map=${mv.total_funding} vs api=${val.totalFunding}`);
            }
            else{                
                setText(val.name + " OK " + val.totalFunding);
            }
        }
        
    });
    console.log("done 1");
    printToFile(setText(),1);


    // Sanity check on donor 
    setText = setTextForBlock();
    dataApiDonor.sort((a,b)=>{
        let a1 = a.name.toLowerCase();
        let b1 = b.name.toLowerCase();
        if(a1<b1){return -1;}
        if(a1>b1){return 1;}
        return 0;
    });
    dataApiDonor.forEach((val)=>{ 
        let mv = "missing";
        dataMap.data.funding_by_donor.forEach((mapitem)=>{ 
            if(mapitem.id === val.id){ mv = mapitem;}
        });

        if(mv === "missing"){
            setText(val.name + " " + val.totalFunding + " missing in map");
        }
        else{
            if(mv.total_funding !== val.totalFunding){ 
                setText(val.name + ` error map=${mv.total_funding} vs api=${val.totalFunding}`);
            }
            else{ setText(val.name + " OK " + val.totalFunding);}
        }
        
    });
    console.log("done 2");
    printToFile(setText(),2);

    // sanity check on plan
    setText = setTextForBlock();
    dataApiPlan.sort((a,b)=>{
        let a1 = a.name.toLowerCase();
        let b1 = b.name.toLowerCase();
        if(a1<b1){return -1;}
        if(a1>b1){return 1;}
        return 0;
    });

    dataApiPlan.forEach((val)=>{ 
        let mv = "missing";
        dataMap.data.funding_by_plan.forEach((mapitem)=>{ 
            if(mapitem.plan_id === val.id){ mv = mapitem;}
        });

        if(mv === "missing"){
            setText(val.name + " " + val.funding + " missing in map");
        }
        else{
            if(mv.total_funding !== val.funding){ 
                setText(val.name + ` error map=${mv.total_funding} vs api=${val.funding}`);
            }
            else{ setText(val.name + " OK " + val.funding);}
        }
        
    });
    console.log("done 3");
    printToFile(setText(),3);

})



/**
 * Helper function to print to file
 * @param {string} text - the text to print to file
 * @param {string} v - the string to append to the end of the file 
 */
function printToFile(text,v){
    fs.writeFile(config.localfileOutputPath  + "sanityMap" + v + ".txt", text, (err)=>{
          if(err){ console.error(err);}
    });
}

/**
 * function to set the text to print. Semi-Curry function.
 */
function setTextForBlock(){
    var innerText = "";
    return function(additionalText){
        innerText += " " + additionalText + "\n\r";
        return innerText;
    }
}

