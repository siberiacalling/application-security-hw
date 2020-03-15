const http = require("http");
const urlapi = require("url");
const tls = require("tls");
const fs = require("fs");
const util = require('util');
const exec = util.promisify(require('child_process').exec);

let requestsAmount = 0;
console.log("Proxy running on port 8080");
const httpConnection = (req, res) => {
  // console.log("httpConnection handler");

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
  serverRequest.on('error', (error) => {
    // console.log("\n\nproxyRequest socket ", error);
  });
  req.pipe(serverRequest);
}


const execOneCommand = async (command) => {
  try {
    const { stdout, stderr } = await exec(command, { cwd: './conf' });
  } catch (error) {
    // console.error(error);
  }
  return;
}

const execAllCommands = async (commands) => {
  try {
    await execOneCommand(commands[0]);
  } catch (error) {
    // console.error(error);
  }
  try {
    await execOneCommand(commands[1]);
  } catch (error) {
    // console.error(error);
  }
  try {
    await execOneCommand(commands[2]);
  } catch (error) {
    // console.error(error);
  }
  try {
    await execOneCommand(commands[3]);
  } catch (error) {
    // console.error(error);
  }
  try {
    await execOneCommand(commands[4]);
  } catch (error) {
    // console.error(error);
  }
  return;
}

const generateOptionsByHostName = async (hostname) => {
  if (!(fs.existsSync("./conf/" + hostname + ".key") && fs.existsSync("./conf/" + hostname + ".crt"))) {
    const commands = [
      "openssl genrsa -out " + hostname + ".key " + " 2048",
      "openssl req -new -sha256 -key " + hostname + ".key -subj \"/C=US/ST=CA/O=MyOrg, Inc./CN=" + hostname + "\"" + " -out " + hostname + ".csr",
      "openssl req -in " + hostname + ".csr -noout -text",
      "openssl x509 -req -in " + hostname + ".csr -CA rootCA.crt -CAkey rootCA.key -CAcreateserial -out " + hostname + ".crt -days 500 -sha256",
      "openssl x509 -in " + hostname + ".crt -text -noout"];
    try {
      await execAllCommands(commands);
    } catch (error) {
      // console.error(error);
    }
  }

  const options = {
    rejectUnauthorized: false,
    key: (() => {
      try {
        return fs.readFileSync("./conf/" + hostname + ".key")
      } catch (error) {
        // console.error(error);
      }
    })(),
    cert: (() => {
      try {
        return fs.readFileSync("./conf/" + hostname + ".crt")
      } catch (error) {
        // console.error(error);
      }
    })(),
  };
  return options;
}

const proxy = http.createServer(httpConnection).listen(8080);

proxy.on("connect", async (req, browserSocket, head) => {

  let currentRequest = "";
  browserSocket.on('error', (error) => {
    // console.log("\n\nproxyRequest socket ", error);
  });

  browserSocket.write("HTTP/1.1 200 Connection Established\r\n" +
    "Proxy-agent: Node.js-Proxy\r\n" +
    "\r\n", async () => {
      const optionsTLC = {
        key: fs.readFileSync('./conf/rootCA.key'),
        cert: fs.readFileSync('./conf/rootCA.crt'),
        isServer: true,
      };

      const tlsProxy = new tls.TLSSocket(browserSocket, optionsTLC);
      tlsProxy.on('error', (error) => {
        // console.log("\n\ntlsProxy socket ", error);
      });

      const { port, hostname } = new urlapi.URL(`http://${req.url}`);
      let options;
      try {
        options = await generateOptionsByHostName(hostname);
      } catch (error) {
        // console.error(error);
      }

      try {
        const proxyRequest = tls.connect(port || 80, hostname, options, () => {
          if (proxyRequest.authorized) {
            // console.log("Autorized", hostname);
          } else {
            // console.log("NOT Autorized", hostname);
          }
          proxyRequest.write(head);
          //tlsProxy.pipe(proxyRequest).pipe(tlsProxy);
          proxyRequest.pipe(tlsProxy);
        });
        proxyRequest.on('error', (error) => {
          // console.log("\n\nproxyRequest socket ", error);
        });

        tlsProxy.on('data', (data) => {
          currentRequest += data.toString("ascii");
          //console.log(data.toString("ascii"));
          proxyRequest.write(data);
        });

      } catch (error) {
        // console.error(error);
      }
      tlsProxy.on('end', (data) => {
        requestsAmount++;
        console.log(currentRequest);
        console.log("END ", requestsAmount, "\n");
        //currentRequest = "";
      });
    });
});
