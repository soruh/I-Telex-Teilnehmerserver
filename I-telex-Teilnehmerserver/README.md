#I-telex-Teilnehmerserver
---
#TODO:
- don't delete deleted entrys, but give them a "tag" deleted or something
- jquery validata
---
##Setup
(under Linux)

### install mysql and node
```
$ sudo apt install mysql-server nodejs
```
### install pm2
```
$ npm install pm2 -g
```

### install node modules
```
$ npm install
```
### create database, tables and user
this can be done manually, or with a supplied script.
The script uses the config file, so it is important to at least configure `mySqlConnectionOptions` before executing it.

```
$ node I-telex-Teilnehmerserver/init_mysql [mysql-root user] [mysql-root-password] all
```
If you want to create the database and the user manually do so and execute
```
$ node I-telex-Teilnehmerserver/init_mysql [mysql-root user] [mysql-root-password] tables
```
for help on the script write

```
$ node I-telex-Teilnehmerserver/init_mysql --help
```

the user defaults to <user_name>`@localhost`,which makes it only accessible from `loaclhost`.This should be sufficient for normal use, but if you don't want that you will have to change it manually.

---
##Starting/Stoping Server
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

---
##Config

The following can be configured in `config.json`

###mySqlConnectionOptions:
  - host: the mysql database host \*
  - user: the mysql user \*
  - password: the mysql users password \*
  - database: the mysql database name \*

  \* required for `init_mysql` script
###SERVERPIN

  The pin for updates between servers
###UPDATEQUEUEINTERVAL
  The interval in which to look for changed entrys and write them to the queue
###QUEUE_SEND_INTERVAL
  The interval in which to try to send the queue
###QWD_STDOUT_LOG
  The File to which the queuewatchdog should write it's standard logging

  "" will write to stdout

  "\-" will discard all messages
###QWD_STDERR_LOG
  The File to which the queuewatchdog should write it's errors

  "" will write to stderr

  "\-" will discard all messages
###BINARYPORT
  The port on which the binaryserver should listen
###LOGGING_VERBOSITY
  The level of logging verbosity
###WEBSERVERPORT
  The port on which to server the webinterface
###WEBINTERFACEPASSWORD
  The password for the webinterface
