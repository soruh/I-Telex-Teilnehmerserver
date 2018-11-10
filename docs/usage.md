### managing servers

The servers are stored in the `servers` table in the database.

They can be managed manually using a sqlite3 CLI or with the supplied script.
```
$ node I-Telex-Teilnehmerserver/manage_servers --help
```
---
## Starting/Stopping Server
the following must be executed in the project directory
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

Please read the help page of pm2 or read their [documentation](https://pm2.io/doc/en/runtime/overview/) for further information:
```
$ pm2 help
```