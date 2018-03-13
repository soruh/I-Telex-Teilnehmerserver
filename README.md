# I-Telex-Teilnehmerserver
---
# Introduction:

The program consists of 2 processes:
###### the web interface:

which allows manual altering of the database over http
###### the binary server:
which responds to binary (and ASCII) requests

---
## Setup
(under Linux)

### install mysql and node.js
```
$ sudo apt install mysql-server nodejs
```
if npm doesn't come with your node installation you'll have to install it manually using
```
$ sudo apt install npm
```
### update node.js using npm
```
$ sudo npm cache clean -f
$ sudo npm install -g n
$ sudo n latest
```
if `latest` does not work try using `9.2.0` instead.
### install pm2
```
$ npm install pm2 -g
```

### install node modules
```
$ npm install
```
### create SQL database, tables and user
this can be done manually, or with the supplied script.
The script uses the config file, so it is important to at least configure `mySqlConnectionOptions` before executing it.

```
$ node I-Telex-Teilnehmerserver/init_mysql [mysql-root user] [mysql-root-password] all
```
If you want to create the database and the user manually do so and execute
```
$ node I-Telex-Teilnehmerserver/init_mysql \[mysql-root-user\] \[mysql-root-password\] tables
```
for help on the script execute

```
$ node I-Telex-Teilnehmerserver/init_mysql --help
```
You might have to run ```chmod u+x init_mysql``` to be able to execute the script.


If you are using mariadb you might have to run:
```
$ sudo mysql -u root
> USE mysql;
> UPDATE user SET Plugin='' WHERE Plugin='unix_pipe';
> FLUSH PRIVILEGES;
> exit
```

the user defaults to <user_name>`@localhost`, which only makes it accessible from `localhost`. This should be sufficient for normal use, but if you want to host your database on a different machine you will have to change the user manually.

### managing servers

The servers are stored in the servers database.

They can be managed manually using MySQL or with the supplied script.
```
$ node I-Telex-Teilnehmerserver/manage_servers --help
```
You might have to run ```chmod u+x manage_servers``` to be able to execute the script.

---
## Starting/Stopping Server
the following must be executed in the root directory of the git
### to start:
```
$ npm start
```

### to stop:
```
$ npm stop
```

### to restart:
```
$ npm restart
```
### to list running processes:
```
$ pm2 list
```

### to show logs:
```
$ pm2 logs
```
I suggest reading the help page of pm2 for further information:
```
$ pm2 help
```

---
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

Print line date before log messages

### bufferLogWithWhitespace

Print whitespace before log messages, to allow for a consistent indentation

### repairPm2Colors

Have consistent color after newlines in the pm2 log
!!This is quite performance hungry and should be deactivated in production!!

### serverPin
  The pin for updates between servers

  If set to null the server enters read-only mode (see "read-only mode")
### allowFullQueryInReadonly

Respond to Full_Querys in read-only mode

### allowLoginInReadonly

Accept Logins in read-only mode

### updateQueueInterval
  The interval in which to look for changed entries and write them to the queue
### queueSendInterval
  The interval in which to try to send the queue
### fullQueryInterval
  The interval in which to perform a `Full_Query`
### fullQueryServer
  The server on which to perform a `Full_Query`.

  If left empty, or if the chosen server is not in the `servers` table `ALL` known servers will be queried!

### doDnsLookups

Do a DNS-lookup when receiving entries to allow for a quicker response to "c"(check if an IP-address belongs to a registered participant)

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

multiple values should be separated by spaces

### eMail

  #### account
  E-mail account, to which to send messages

  #### useTestAccount
  if true a link to an online service, for previewing emails will be printed to the console, after a message was sent!

  messages will not be sent to the account specified above!

  #### messages
  customized messages  
  [value] will be replaced with the corresponding value

### logLineNumbers
  print line numbers in front of log messages

## read-only mode
  The server enters read-only mode if the "serverPin" is set to null.

  In read-only the servers doesn't perform logins on other servers.  
  It does however still perform Full_Querys (simulated by Peer_Query with search-pattern "").


  if "allowFullQueryInReadonly" is set to true it also responds to FullQuerys.  
  similarly if "allowLoginInReadonly" is set to true it accepts Logins.
