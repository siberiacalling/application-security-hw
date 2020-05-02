const http = require("http");
const urlapi = require("url");
const tls = require("tls");
const fs = require("fs");
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const Datastore = require('nedb');
const path = require('path');

const stdin = process.openStdin();

const directory = 'conf';

const getIndicesOf = (toSearch, str) => {
  let indices = [];
  for (let pos = str.indexOf(toSearch); pos !== -1; pos = str.indexOf(toSearch, pos + 1)) {
    indices.push(pos);
  }
  return indices;
}

const findHost = (request) => {
  const hostIndex = request.indexOf("Host: ");
  const hostBegin = hostIndex + 6;
  let host = "";
  let i = hostBegin;
  
  while (request.charAt(i) != '\n') {
    host += request.charAt(i);
    i++;
  }
  console.log("HOST:");
  console.log(host);
  return host;
}

stdin.addListener("data", (data) => {
  const requestId = Number(data.toString().trim());
  currentResponse = "";

  db.find({ id: requestId }, (err, obj) => {
     console.log(obj);
    console.log(obj[0].request);
    const hostname = findHost(obj[0].request);
    try {
      const proxyRequest = tls.connect(port || 80, hostname, options, () => {
        proxyRequest.write(obj[0].request);
        // proxyRequest.pipe(process.stdout);
      });
      proxyRequest.on('error', (error) => {
        console.log("\n\Request by id socket ", error);
      });

      proxyRequest.on('data', (data) => {
        console.log("DATA: ");
         console.log(data.toString("ascii"));
          currentResponse += data.toString("ascii");
      });

      proxyRequest.on('end', () => {
        console.log("Repeat request with id" +
    requestId + ":" );
console.log(currentResponse)
      });
        
    } catch (error) {
      // console.error(error);
    }
  });
});

fs.readdir(directory, (err, files) => {
  if (err) throw err;

  for (const file of files) {
    if ((file !== "rootCA.crt") && (file !== "rootCA.key")) {
      fs.unlink(path.join(directory, file), err => {
        if (err) throw err;
      });
    }
  }
});

fs.unlink('requests', (err) => {
  if (err && err.code == 'ENOENT') {
    // throw err;
  };
});

const db = new Datastore({ filename: 'requests' });
db.loadDatabase();

let requestsAmount = 0;
console.log("Proxy running on port 8080");
console.log("Type request id in console to repeat request");
const httpConnection = (req, res) => {
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




const createSubstringsByIndex = (string, allIndexes) => {
  let requests = [];
  if (allIndexes.length > 1) {
    for (let i = 0; i < allIndexes.length - 1; i++) {
      requests.push(string.substr(allIndexes[i], allIndexes[i + 1]));
    }
    requests.push(string.substr(allIndexes[allIndexes.length - 1], string.length));
  }
  return requests;
}

const parseString = (string) => {
  let getIndexes = getIndicesOf("GET ", string, true);
  let postIndexes = getIndicesOf("POST ", string, true);
  let allIndexes = getIndexes.concat(postIndexes);
  allIndexes = allIndexes.sort((a, b) => { return a - b });
  let requestsArray = [];
  if (allIndexes.length > 1) {
    requestsArray = createSubstringsByIndex(string, allIndexes);
  } else {
    requestsArray.push(string);
  }
  return requestsArray;
}

const proxy = http.createServer(httpConnection).listen(8080);
proxy.on("connect", async (req, browserSocket, head) => {

  let currentRequest = ""
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
          proxyRequest.pipe(tlsProxy);
        });
        proxyRequest.on('error', (error) => {
          // console.log("\n\nproxyRequest socket ", error);
        });

        tlsProxy.on('data', (data) => {
          currentRequest += data.toString("ascii");
          proxyRequest.write(data);
        });

      } catch (error) {
        // console.error(error);
      }

      tlsProxy.on('end', (data) => {
        if (currentRequest !== "") {
          const requestsArray = parseString(currentRequest);
          requestsArray.forEach((req) => {
            requestsAmount++;
            db.insert({ id: requestsAmount, request: req });
            console.log("\nREQUEST ID", requestsAmount);
            console.log(req);
            console.log("END");
          });
        }
      });
    });
});
