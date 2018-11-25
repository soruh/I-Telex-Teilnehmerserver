This file is old and largely false

## Config

Rename `config_template.json` to `config.json` and remove the fist line.

The following can then be configured in `config.json`



### mySqlConnectionOptions:
  - host: the mysql database host \*
  - user: the mysql user \*
  - password: the mysql users password \*
  - database: the mysql database name \*

  \* required for `init_mysql` script
### logLineNumbers

Print line numbers before log messages

### logDate

Print date before log messages

### bufferLogWithWhitespace

Print whitespace before log messages, to allow for a consistent indentation

### repairPm2Colors

Have consistent color after newlines in the pm2 log  

**!!This is very performance hungry and should be deactivated in production!!**

### serverPin
The pin for updates between servers

If set to `null` the server enters [read-only mode](#readonly)
### allowFullQueryInReadonly

Respond to Full_Querys in [read-only mode](#readonly)

### allowLoginInReadonly

Accept Logins in [read-only mode](#readonly)

This enables anyone to change and read entries on your server!

### allowInvalidPackageSizes
  Handle Packages which don't have the correct size

### updateQueueInterval
  The interval in which to look for changed entries and write them to the queue
### queueSendInterval
  The interval in which to try to send the queue
### fullQueryInterval
  The interval in which to perform a `Full_Query`
### fullQueryServer
  The server on which to perform a `Full_Query`.  

  Should be formated like: `host`:`port`  

  If left empty, or if the specified server is not in the `servers` table **ALL** known servers will be queried!
### doDnsLookups

Respond to "c"+("ip"||"hostname")(check if an IP-address or host belongs to a registered participant)

### connectionTimeout
  The Timeout duration for client connections
### stdoutLog
  The File to which the program should write it's standard logging

  "" will write to the stdout

### stderrLog
  The File to which the program should write it's errors

  "" will write to the stderr

### binaryPort
  The port on which the binary server should listen
### loggingVerbosity
  The level of logging verbosity:

  0 -> only errors

  1 -> only relevant information

  2 -> debug

  3 -> all
### webServerPort
  The port on which to serve the web interface
### webInterfacePassword
  The password for the web interface

### warnAtErrorCounts

Send an EMAIL to the configured account when a server wasn't reachable n times.

### eMail

  #### account
  E-mail account, to which to send messages

  #### useTestAccount
  if true a link to an online service, for previewing emails will be printed to the console, after a message was sent!

  **messages will not be sent to the account specified above!**

  #### messages
  customized messages  
  [value] will be replaced with the corresponding value

### logLineNumbers
  print line numbers in front of log messages

## <a name="readonly">read-only mode</a>
  aThe server enters read-only mode if the "serverPin" is set to null.

  In read-only the servers doesn't perform logins on other servers.  
  It does however still perform Full_Querys (simulated by Peer_Query with search-pattern "").


  if "allowFullQueryInReadonly" is set to true it also responds to FullQuerys.  
  similarly if "allowLoginInReadonly" is set to true it accepts Logins.
