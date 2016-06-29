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


var app = express();

app.configure(function () {
  app.set('port', process.env.PORT || 80);
});

app.configure('development', function () 
{
  app.use(express.errorHandler());
});

app.all('*', ensureSecure); // at top of routing calls

app.all('/proxy/?*', jsforceAjaxProxy({ enableCORS: true }));


function ensureSecure(req, res, next)
{
  if (req.headers['x-forwarded-proto'] !== 'https') 
  {
    res.redirect('https://'+req.host+req.url);
  };
  return next();
};

/*
app.get('/', function(req, res) {
  //res.send('JSforce AJAX Proxy');
  	//res.send('index.html');
  	res.redirect('index.html');
});
*/

app.use(express.static('./http_docs/'));


http.createServer(app).listen(app.get('port'), function () {
  console.log("Express server listening on port " + app.get('port'));
});

/*
var server = https.createServer(options, app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
*/
