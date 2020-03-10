const http = require('http');
const net = require('net');
const urlapi = require('url');

const httpConnection = (req, res) => {
  console.log("httpConnection handler");

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


const proxy = http.createServer(httpConnection).listen(8080);
proxy.on('connect', (req, clientSocket, head) => {
  const { port, hostname } = new urlapi.URL(`http://${req.url}`);

  console.log(port, hostname);
  const serverSocket = net.connect(port || 80, hostname, () => {
    clientSocket.write('HTTP/1.1 200 Connection Established\r\n' +
      'Proxy-agent: Node.js-Proxy\r\n' +
      '\r\n');
    serverSocket.write(head);
    serverSocket.pipe(clientSocket);
    clientSocket.pipe(serverSocket);
  });
});