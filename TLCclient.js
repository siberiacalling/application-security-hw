'use strict';
const tls = require('tls');
const fs = require('fs');
const PORT = 1337;
const HOST = '127.0.0.1';

const options = {
    key: fs.readFileSync('private-key.pem'),
    cert: fs.readFileSync('public-cert.pem'),
    rejectUnauthorized: false
};

const client = tls.connect(PORT, HOST, options, function () {
    if (client.authorized) {
        console.log("Connection authorized by a Certificate Authority.");
    } else {
        console.log("Connection not authorized: " + client.authorizationError)
    }
    client.write("I am the client sending you a message.");
});

client.on("data", function (data) {
    console.log('Received: %s [it is %d bytes long]',
        data.toString().replace(/(\n)/gm, ""),
        data.length);
    client.end();
});

client.on('close', function () {
    console.log("Connection closed");
});

client.on('error', function (error) {
    console.error(error);
    client.destroy();
});