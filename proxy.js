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


const execOneCommand = async (command, i) => {
  try {
    const { stdout, stderr } = await exec(command, { cwd: './conf' });
  } catch (error) {
    console.error(error);
  }
}

const execAllCommands = async (commands) => {
  await execOneCommand(commands[0], 0);
  await execOneCommand(commands[1], 1);
  await execOneCommand(commands[2], 2);
  await execOneCommand(commands[3], 3);
  await execOneCommand(commands[4], 4);
}

const generateOptionsByHostName = async (hostname) => {

  if (!(fs.existsSync("./conf/" + hostname + ".key") && fs.existsSync("./conf/" + hostname + ".key"))) {
    const commands = [
      "openssl genrsa -out " + hostname + ".key " + " 2048",
      "openssl req -new -sha256 -key " + hostname + ".key -subj \"/C=US/ST=CA/O=MyOrg, Inc./CN=" + hostname + "\"" + " -out " + hostname + ".csr",
      "openssl req -in " + hostname + ".csr -noout -text",
      "openssl x509 -req -in " + hostname + ".csr -CA rootCA.crt -CAkey rootCA.key -CAcreateserial -out " + hostname + ".crt -days 500 -sha256",
      "openssl x509 -in " + hostname + ".crt -text -noout"];
    await execAllCommands(commands);
  }
  const options = {
    key: () => {
      try {
        fs.readFileSync("./conf/" + hostname + ".key")
      } catch (e) {
        console.error(error);
      }
    },
    cert: () => {
      try {
        fs.readFileSync("./conf/" + hostname + ".crt")
      } catch (e) {
        console.error(error);
      }
    }
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

  tlsProxy.on('error', (error) => {
    // console.log("\n\ntlsProxy socket ", error);
  });

  proxyRequest.on('error', (error) => {
    // console.log("\n\nproxyRequest socket ", error);
  });
});

