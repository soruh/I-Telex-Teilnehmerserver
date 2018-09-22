module.exports = {
  apps : [
    {
      name: "binaryserver",
      script: "src/BINARYSERVER/main.js",
      output: 'logs/binaryserver/out.log',
      error: 'logs/binaryserver/error.log',
    },
    {
      name: "webserver",
      script: "src/WEBSERVER/bin/webserver.js",
      output: 'logs/webserver/out.log',
      error: 'logs/webserver/error.log',
    }
  ]
};
