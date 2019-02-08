#!/usr/bin/env node
"use strict";
const path = require('path');
const sql = require(path.join(__dirname, '../src/shared/SQL'));
const config = require(path.join(__dirname, '../src/shared/config')).default;

config.useMysql = true;
config.mysql.multipleStatements = true;

global.logger = console;

logger.error('\x1b[31mThis script is W.I.P.\x1b[0m');

function getInput(message, muted){ // TODO: use
	return new Promise((resolve, reject) => {
		const readline = require('readline');
		const { Writable } = require('stream');

		const mutableStdout = new Writable({
			write: function(chunk, encoding, callback) {
				if (!this.muted) process.stdout.write(chunk, encoding);
				callback();
			}
		});

		mutableStdout.muted = false;

		const rl = readline.createInterface({
			input: process.stdin,
			output: mutableStdout,
			terminal: true,
		});

		rl.question(message+': ', function(password) {
			rl.close();
			if(muted) process.stdout.write('\n');
			resolve(password);
		});

		mutableStdout.muted = muted;
	});
}

async function connectToDb(){
	try{
		await sql.connectToDb();
	}catch(err){
		if(err.code !== 'ECONNREFUSED') throw(err);

		const username = await getInput('Enter username', false);
		const password = await getInput('Enter password', true);

		config.mysql.user = username;
		config.mysql.password = password;
		
		try{
			await sql.connectToDb();
		}catch(err){
			if(err.code === 'ECONNREFUSED'){
				console.log("connection refused");
			}else throw(err);
		}
	}
}

(async ()=>{
	try{
		await connectToDb();
	}catch(err){
		throw(err);
	}
});