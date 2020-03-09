const fs = require('fs');
const net = require('net');
const http = require('http');
const https = require('https');
const urlapi = require('url');


const baseAddress = 8080;
const httpAddress = 3001;
const httpsAddress = 3002;
const httpsOptions = {
  key: fs.readFileSync('./key.pem'),
  cert: fs.readFileSync('./cert.pem')
};

const tcpConnection = (conn) => {
  conn.once('data', function (buf) {
    // A TLS handshake record starts with byte 22.
    const address = (buf[0] === 22) ? httpsAddress : httpAddress;
    const proxy = net.createConnection(address, () => {
      proxy.write(buf);
      conn.pipe(proxy).pipe(conn);
    });
  });
}

const httpConnection = (req, res) => {
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
  console.log("HTTPS");

  res.writeHead(200, { 'Content-Length': '5' });
  res.end('HTTPS');
}

net.createServer(tcpConnection).listen(baseAddress);
http.createServer(httpConnection).listen(httpAddress);
https.createServer(httpsOptions, httpsConnection).listen(httpsAddress);

