module.exports = {
  apps : [
    {
      name: "binaryserver",
      script: "src/BINARYSERVER/main.js",
      output: 'logs/binaryserver/out.log',
      error: 'logs/binaryserver/error.log',
      process_id: 0,
    },
    {
      name: "webserver",
      script: "src/WEBSERVER/main.js",
      output: 'logs/webserver/out.log',
      error: 'logs/webserver/error.log',
      process_id: 1,
    }
  ]
};
