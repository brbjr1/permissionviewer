/*global process */
var fs = require('fs')
var http = require('http');
var https = require('https');
var express = require('express');
var jsforceAjaxProxy = require('./proxy');
var path = require('path');

var options = {
    
    maxAge: -1
};

options.key = fs.readFileSync('./ca.key');
options.cert =  fs.readFileSync('./ca.crt');

var app = express();

app.configure(function () {
  app.set('port', process.env.PORT || 8443);
});

app.configure('development', function () 
{
  app.use(express.errorHandler());
});

app.all('*', ensureSecure); // at top of routing calls

app.all('/proxy/?*', jsforceAjaxProxy({ enableCORS: true }));


app.get('/', function(req, res) {
  //res.send('JSforce AJAX Proxy');
  	//res.send('index.html');
  	res.redirect('test.html');
});


app.use(express.static('./http_docs/'));

function ensureSecure(req, res, next){
  if(req.secure){
    // OK, continue
    return next();
  };
  res.redirect('https://localhost:' + app.get('port')); // handle port numbers if you need non defaults
};

/*
http.createServer(app).listen(80, function () {
  console.log("Express server listening on port 80");
});
*/


var server = https.createServer(options, app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});

