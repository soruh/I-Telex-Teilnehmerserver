#!/usr/bin/env node
"use strict";

const config = require("../src/shared/config.js").default;
const path = require("path");
const fs = require("fs");

let dockerfile = fs.readFileSync(path.join(__dirname, '..', 'template.dockerfile')).toString();

const ports = [config.RESTServerPort, config.binaryPort, config.webServerPort];
const portString = ports.map(port=>`EXPOSE ${port}`).join('\n');
dockerfile = dockerfile.replace('###EXPOSE###', `${portString}`);


fs.writeFileSync(path.join(__dirname, '..', 'Dockerfile'), dockerfile);
