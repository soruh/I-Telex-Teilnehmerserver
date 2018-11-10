# Setup
(under Linux)

## Prerequisites
```
node.js
npm
pm2
git

node-gyp
node-pre-gyp
```

## installation

clone the repository:
```
git clone https://github.com/soruh/I-Telex-Teilnehmerserver/
```

move into the project folder:
```
cd I-Telex-Teilnehmerserver
```

install dependencies:
```
npm install
```

## create database and setup tables
You can do this manually using a sqlite3 CLI and the tables.sql file or use the supplied script.

If you want to use the supplied script please configure the [DBPath](./config#DBPath) config option first.

Then execute:
```
node createDb.js
```
in the project folder