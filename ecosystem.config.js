exports = {
  apps : [
    {
      name: "binaryserver",
      script: "./compiled/BINARYSERVER/binaryserver.js",
/*
      interpreter: "0x",
      interpreter_args:" -D flamegraph_binaryserver",
      kill_timeout: 30000
*/
    },
    {
      name: "webserver",
      script: "./compiled/WEBSERVER/bin/webserver.js",
/*
      interpreter: "0x",
      interpreter_args:" -D flamegraph_webserver",
      kill_timeout: 30000
*/
    }
  ]
};
