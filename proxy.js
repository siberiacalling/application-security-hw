const http = require("http");
const net = require("net");
const urlapi = require("url");
const tls = require("tls");
const fs = require("fs");
const util = require('util');
const exec = util.promisify(require('child_process').exec);

const httpConnection = (req, res) => {
  console.log("httpConnection handler");

  const currentUrl = urlapi.parse(req.url);
  const options = {
    host: currentUrl.hostname,
    port: currentUrl.port || 80,
    path: currentUrl.pathname,
    method: req.method,
    headers: req.headers,
  };

  const serverRequest = http.request(options, (serverResponse) => {
    res.writeHead(serverResponse.statusCode, serverResponse.headers);
    serverResponse.pipe(res);
  });
  req.pipe(serverRequest);
}

const execAllCommands = async (command) => {
  //commands.forEach(async (command) => {
  const { stdout, stderr } = await exec(command);
  if (stderr) {
    console.log(`stderr: ${stderr}`);
    return;
  }
  if (stdout) {
    console.log(`stdout: ${stdout}`);
    return;
  }
  //});
}

// const execAllCommands = (commands) => {
//   commands.forEach((command) => {
//     exec(command, (error, stdout, stderr) => {
//       if (error) {
//         console.log("ERROR:\n", command);
//         console.log(`error: ${error.message}`);
//         return;
//       }
//       if (stderr) {
//         console.log(`stderr: ${stderr}`);
//         return;
//       }
//       if (stderr) {
//         console.log(`stdout: ${stdout}`);
//         return;
//       }
//     });
//   });
// }

const generateOptionsByHostName = (hostname) => {
  const commands = [
    // "openssl genrsa -out " + hostname + ".key " + " 2048",
    // "openssl req -new -sha256 -key " + hostname + ".key -subj \"/C=US/ST=CA/O=MyOrg, Inc./CN=" + hostname + "\"" + " -out " + hostname + ".csr",
    // "openssl req -in " + hostname + ".csr -noout -text",
    // "openssl x509 -req -in " + hostname + ".csr -CA rootCA.crt -CAkey rootCA.key -CAcreateserial -out " + hostname + ".crt -days 500 -sha256",
    // "openssl x509 -in " + hostname + ".crt -text -noout",
  ];

  // execAllCommands(commands);

  const options = {
    key: fs.readFileSync("./conf/" + hostname + ".key"),
    cert: fs.readFileSync("./conf/" + hostname + ".crt")
  };
  return options;
}

const proxy = http.createServer(httpConnection).listen(8080);

proxy.on("connect", (req, browserSocket, head) => {

  const { port, hostname } = new urlapi.URL(`http://${req.url}`);
  const options = generateOptionsByHostName(hostname);
  const proxyRequest = tls.connect(port || 80, hostname, options);

  browserSocket.write("HTTP/1.1 200 Connection Established\r\n" +
    "Proxy-agent: Node.js-Proxy\r\n" +
    "\r\n");

  const optionsTLC = {
    key: fs.readFileSync('./conf/rootCA.key'),
    cert: fs.readFileSync('./conf/rootCA.crt'),
    passphrase: '1234',
    isServer: true,
  };
  const tlsProxy = new tls.TLSSocket(browserSocket, optionsTLC);
  tlsProxy.pipe(proxyRequest).pipe(tlsProxy);

  tlsProxy.on('error', (error)=>{
    console.log(error);
  });

  tlsProxy.on('data', (chunck)=>{
    console.log(chunck.toString("ascii"));
  });
});

// const serverSocket = tls.connect(port || 80, hostname, options, () => {
//   clientSocket.write("HTTP/1.1 200 Connection Established\r\n" +
//     "Proxy-agent: Node.js-Proxy\r\n" +
//     "\r\n");
//   if (serverSocket.authorized) {
//     console.log("authorized");
//   } else {
//     console.log("NOT authorized: " + serverSocket.authorizationError)
//   }
//   serverSocket.write("I am the client sending you a message.");
//   // serverSocket.write(head);
//   // serverSocket.pipe(clientSocket);
//   // clientSocket.pipe(serverSocket);
// });

// serverSocket.on("error", (error) => {
//   console.error(error);
//   serverSocket.destroy();
// });

// serverSocket.on("data", function (data) {
//   console.log("Received: %s [it is %d bytes long]",
//     data.toString().replace(/(\n)/gm, ""),
//     data.length);
//   client.end();
// });

// serverSocket.on("close", function () {
//   console.log("Connection closed");
// });

// const serverSocket = net.connect(port || 80, hostname, () => {
//   clientSocket.write("HTTP/1.1 200 Connection Established\r\n" +
//     "Proxy-agent: Node.js-Proxy\r\n" +
//     "\r\n");
//   serverSocket.write(head);
//   serverSocket.pipe(clientSocket);
//   clientSocket.pipe(serverSocket);
// });

