#!/usr/bin/env node
"use strict";
process.env.USE_MYSQL = 1;

let path = require('path');
let sql = require(path.join(__dirname, '../src/shared/SQL'));

global.logger = console;

function getPassword(){ // TODO: use
	return new Promise((resolve, reject) => {
		var readline = require('readline');
		var { Writable } = require('stream');

		var mutableStdout = new Writable({
			write: function(chunk, encoding, callback) {
				if (!this.muted)
				process.stdout.write(chunk, encoding);
				callback();
			}
		});

		mutableStdout.muted = false;

		var rl = readline.createInterface({
			input: process.stdin,
			output: mutableStdout,
			terminal: true
		});

		rl.question('Enter password: ', function(password) {
			resolve(password);
			rl.close();
		});

		mutableStdout.muted = true;
	});
}

async function connectToDb(){
	try{
		await sql.connectToDb();
	}catch(err){
		console.log(err.code);
	}
}

connectToDb();