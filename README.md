# I-Telex-Teilnehmerserver
---
# Introduction:

The program consists of 3 processes:
###### the web interface:

which allows manual altering of the database over http
###### the binary server:
which responds to binary (and ascii) requests
###### the queuewatchdog:
which checks if there have been any changes to the database and sends them to other servers.

---
## Setup
(under Linux)

### install mysql and node.js
```
$ sudo apt install mysql-server nodejs
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
this can be done manually, or with a supplied script.
The script uses the config file, so it is important to at least configure `mySqlConnectionOptions` before executing it.

```
$ node I-Telex-Teilnehmerserver/init_mysql [mysql-root user] [mysql-root-password] all
```
If you want to create the database and the user manually do so and execute
```
$ node I-Telex-Teilnehmerserver/init_mysql [mysql-root user] [mysql-root-password] tables
```
for help on the script execute

```
$ node I-Telex-Teilnehmerserver/init_mysql --help
```
You might have to run ```chmod u+x init_mysql``` to be able to execute the script.

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

The following can be configured in `config.json`

### mySqlConnectionOptions:
  - host: the mysql database host \*
  - user: the mysql user \*
  - password: the mysql users password \*
  - database: the mysql database name \*

  \* required for `init_mysql` script
### SERVERPIN

  The pin for updates between servers
### UPDATEQUEUEINTERVAL
  The interval in which to look for changed entrys and write them to the queue
### QUEUE_SEND_INTERVAL
  The interval in which to try to send the queue
### FULLQUERYINTERVAL
  The interval in which to perform a `Full_Query`
### FULL_QUERY_SERVER
  The server on which to perform a `Full_Query`.


  If left empty, or if the chosen server is not in the `servers` table `ALL` known servers will be queried!
### CONNECTIONTIMEOUT
  The Timeout duration for client connections
### QWD_STDOUT_LOG
  The File to which the queuewatchdog should write it's standard logging

  "" will write to the stdout of the binaryserver process

  "\-" will discard all messages
### QWD_STDERR_LOG
  The File to which the queuewatchdog should write it's errors

  "" will write to the stderr of the binaryserver process

  "\-" will discard all errors
### BINARYPORT
  The port on which the binaryserver should listen
### LOGGING_VERBOSITY
  The level of logging verbosity:

  0 -> only errors

  1 -> relevant information

  2 -> all (debug)
### WEBSERVERPORT
  The port on which to serve the webinterface
### WEBINTERFACEPASSWORD
  The password for the webinterface
