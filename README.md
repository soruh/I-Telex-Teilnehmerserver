# I-Telex-Teilnehmerserver
---
# Introduction:

The program consists of 2 processes:
###### the web interface:

which allows manual altering of the database over http
###### the binary server:
which responds to binary (and ascii) requests

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

They can be managed manually using mysql or with the supplied script.
```
$ node I-Telex-Teilnehmerserver/manage_servers --help
```
You might have to run ```chmod u+x manage_servers``` to be able to execute the script.

---
## Starting/Stoping Server
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

Print linenumbers before log messages

### serverPin

  The pin for updates between servers
### updateQueueInterval
  The interval in which to look for changed entrys and write them to the queue
### queueSendInterval
  The interval in which to try to send the queue
### fullQueryInterval
  The interval in which to perform a `Full_Query`
### fullQueryServer
  The server on which to perform a `Full_Query`.


  If left empty, or if the chosen server is not in the `servers` table `ALL` known servers will be queried!
### connectionTimeout
  The Timeout duration for client connections
### stdoutLog
  The File to which the programm should write it's standard logging

  "" will write to the stdout

### stderrLog
  The File to which the programm should write it's errors

  "" will write to the stderr

### binaryPort
  The port on which the binaryserver should listen
### loggingVerbosity
  The level of logging verbosity:

  0 -> only errors

  1 -> only relevant information

  2 -> debug
  
  3 -> all
### webServerPort
  The port on which to serve the webinterface
### webInterfacePassword
  The password for the webinterface

### eMail

  #### account
  E-mail account, to which to send messages

  #### useTestAccount
  if true a link to an online service, for previewing emails will be printed in the console, after a message was sent
  !messages will not be sent to the above specified account!

  #### messages
  customized messages [value] will be replaced with the value

### logLineNumbers
  print line numbers in front of log messages
