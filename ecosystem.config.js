module.exports = {
  apps : [
    {
      name: "binaryserver",
      script: "./BINARYSERVER/binaryserver.js",
/*
      interpreter: "0x",
      interpreter_args:" -D flamegraph_binaryserver",
      kill_timeout: 30000
*/
    },
    {
      name: "",
      script: "./WEBSERVER/bin/webserver.js",
/*
      interpreter: "0x",
      interpreter_args:" -D flamegraph_webserver",
      kill_timeout: 30000
*/
    }
  ]
}
