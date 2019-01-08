#!/usr/bin/env node
"use strict";

const config = require("../src/shared/config.js").default;
const path = require("path");
const fs = require("fs");

const ports = [config.RESTServerPort, config.binaryPort, config.webServerPort];
const portString = ports.map(port=>`-p ${port}:${port}`).join(' ');

fs.writeFileSync(path.join(__dirname, 'exposed_ports'), portString);
