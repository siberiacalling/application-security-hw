const fs = require('fs');
const net = require('net');
const http = require('http');
const https = require('https');
const urlapi = require('url');

const httpAddress = 3001;
const httpsAddress = 3002;
const httpsOptions = {
  key: fs.readFileSync('./conf/localhost+1-key.pem'),
  cert: fs.readFileSync('./conf/localhost.pem')
};


const httpConnection = (req, res) => {
  console.log("http");
  const currentUrl = urlapi.parse(req.url);
  const options = {
    host: currentUrl.hostname,
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
}

const httpsConnection = (req, res) => {
  console.log("https");
  // res.setHeader('Content-Type', 'text/html');
  // res.setHeader('X-Foo', 'bar');
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('ok\n');
  // const currentUrl = urlapi.parse(req.url);
  // const options = {
  //   host: currentUrl.hostname,
  //   port: currentUrl.port,
  //   path: currentUrl.pathname,
  //   method: req.method,
  //   headers: req.headers,
  // };

  // const serverRequest = https.request(options, (serverResponse) => {
  //   res.writeHead(serverResponse.statusCode, serverResponse.headers);
  //   serverResponse.pipe(res);
  // });
  // req.pipe(serverRequest);
}

http.createServer(httpConnection).listen(httpAddress);
https.createServer(httpsOptions, httpsConnection).listen(httpsAddress);
