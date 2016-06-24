

var a = 100;
var b = a;
b++;

//console.log(`a is ${a}`);
//console.log(`b is ${b}`);



function t(e){
  var c = 50;
  return c += e;
}

function s(callback){
  console.log('s');
  var i = 1;
  return callback(i);
}


var h = s(t);
console.log(h);


// example use of closure for maintaining a state

var operation = function() {
  var state = 100;
  return function(adjust) {
    state += adjust;
    return state;
  };
}();

console.dir(operation(5));
console.dir(operation(10));


var o = function(a){
 var s = 100;
 s += a;
 return s; 
}

console.log(o(2));
console.log(o(4));


/*
var operation = function() {
  var privateState = {
    internalState : 100
  };
  
  var publicObject = { };
  publicObject.uu = function(adjust) {
    privateState.internalState += adjust;
    return privateState.internalState;
  };
  
  return publicObject;
}();


console.dir(operation.uu(3));
*/



/*

// In state.js
var privateState = {
  state : 100
};

exports.operation = function(adjust) {
  privateState.state += adjust;
  return privateState.state;
};

// In app.js
var state = require('./state');

console.log(state.operation(100));

*/