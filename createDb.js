#!/usr/bin/env node
"use strict";
const sqlite = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");
const config = require("./src/SHARED/config.js").default;

const dbPath = path.isAbsolute(config.DBPath)?config.DBPath:path.join(__dirname, config.DBPath);
const dbExists = fs.existsSync(dbPath);
const dbPathExists = fs.existsSync(path.dirname(dbPath));


if(dbPathExists){
	console.log('database directory already exists');
}else{
	fs.mkdirSync(path.dirname(dbPath), {recursive: true});
	console.log('created database directory');
}

if(dbExists){
	console.log('database file already exists');
}

connectToDb()
.then(db=>new Promise((resolve, reject)=>{
	db.exec(fs.readFileSync('./tables.sql').toString(), err=>{
		if(err){
			reject(err);
			return;
		}
		console.log('created tables');
		resolve();
	});
}))
.catch((err) => {
	console.error(err.message);
});


function connectToDb() {
    return new Promise((resolve, reject) => {
        const db = new sqlite.Database(dbPath, (sqlite.OPEN_CREATE|sqlite.OPEN_READWRITE), err => {
            if (err) {
                reject(err);
                return;
			}
			if(!dbExists) console.log('created database file');
            resolve(db);
        });
    });
}
