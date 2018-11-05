module.exports = {
  apps : [
    {
      name: "binaryserver",
      script: "src/BINARYSERVER/main.js",
      output: 'logs/binaryserver/out.log',
      error: 'logs/binaryserver/error.log',
      merge_logs: true
    },
    {
      name: "webserver",
      script: "src/WEBSERVER/main.js",
      output: 'logs/webserver/out.log',
      error: 'logs/webserver/error.log',
      merge_logs: true
    },
    {
      name: "REST api",
      script: "src/RESTSERVER/main.js",
      output: 'logs/restserver/out.log',
      error: 'logs/restserver/error.log',
      merge_logs: true
    }
  ]
};
