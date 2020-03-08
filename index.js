const express = require('express');
const http = require('http');
const urlapi = require('url');


const app = express();

app.all("*", (req, res) => {
  if(req.secure){
    console.log("console puk");
    res.end("puk");
  }
  const currentUrl = urlapi.parse(req.url);
  const options = {
    host : currentUrl.hostname,
    port: currentUrl.port,
    path: currentUrl.pathname,
    method: req.method,
    headers: req.headers,
  };
  if (!options.port) {
    options.port = 80;
  }

  const serverRequest = http.request(options, (serverResponse) => {
    res.writeHead(serverResponse.statusCode, serverResponse.headers);
    serverResponse.pipe(res);
  });
  req.pipe(serverRequest);
});

app.listen(8080);