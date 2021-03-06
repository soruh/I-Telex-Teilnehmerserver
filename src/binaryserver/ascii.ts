"use strict";

import config from '../shared/config';
import * as util from 'util';
import * as dns from 'dns';
import * as ip from 'ip';
import { inspect, Client, decodeExt } from '../shared/misc';
import { SqlAll, SqlEach, SqlGet, SqlRun, teilnehmerRow } from '../shared/SQL';


import serialEachPromise from '../shared/serialEachPromise';

async function asciiLookup(data: Buffer, client: Client) {
	const match = /q([0-9]+)/.exec(data.toString());
	const number = match?match[1]:'';

	let fail = "";
	fail += "fail\r\n";
	fail += number + "\r\n";
	fail += "unknown\r\n";
	fail += "+++\r\n";

	if (number&&(!isNaN(parseInt(number)))) {
		logger.log('debug', inspect`starting lookup for: ${number}`);
		try {
			let result = await SqlGet<teilnehmerRow>(`SELECT * FROM teilnehmer WHERE number=? and disabled!=1 and type!=0;`, [number]);
			if (!result) {
				client.socket.end(fail, function() {
					logger.log('debug', inspect`Entry not found/visible`);
					logger.log('debug', inspect`sent:\n${fail}`);
				});
			} else {
				let send = "";
				const res = result;
				send += "ok\r\n";
				send += res.number + "\r\n";
				send += res.name + "\r\n";
				send += res.type + "\r\n";
				if ([2, 4, 5].indexOf(res.type) > -1) {
					send += res.ipaddress + "\r\n";
				} else if ([1, 3, 6].indexOf(res.type) > -1) {
					send += res.hostname + "\r\n";
				} /* else if (res.type == 6) {
					send += res.hostname + "\r\n";
				}*/ else {
					// send fail if entry has wrong type
					send = "";
					send += "fail\r\n";
					send += number + "\r\n";
					send += "wrong type\r\n";
					send += "+++\r\n";

					client.socket.end(send, function() {
						logger.log('debug', inspect`Entry had invalid type`);
						logger.log('debug', inspect`sent:\n${send}`);
	
					});

					return;
				}
				send += res.port + "\r\n";
				send += (res.extension || "-") + "\r\n";
				send += "+++\r\n";
				client.socket.end(send, function() {
					logger.log('debug', inspect`Entry found`);
					logger.log('debug', inspect`sent:\n${send}`);

				});
			}
		}catch(err){
			logger.log('error', inspect`${err}`);
		}
	} else {
		client.socket.end(fail, function() {
			logger.log('debug', inspect`No number supplied`);
			logger.log('debug', inspect`sent:\n${fail}`);
		});
	}
}

async function checkIp(data: number[] | Buffer, client: Client) {
	if (config.doDnsLookups) {
		const arg:string = data.slice(1).toString().split("\n")[0].split("\r")[0];
		logger.log('debug', inspect`checking if ${arg} belongs to any participant`);

		let ipAddr = "";
		if (ip.isV4Format(arg) || ip.isV6Format(arg)) {
			ipAddr = arg;
		} else {
			try {
				let {
					address,
					family,
				} = await util.promisify(dns.lookup)(arg);
				ipAddr = address;
				logger.log('debug', inspect` resolved to ${ipAddr}`);
			} catch (e) {
				client.socket.end("error\r\nnot a valid host or ip\r\n");
				logger.log('debug', inspect`${e}`);
				return;
			}
		}

		if (ip.isV4Format(ipAddr) || ip.isV6Format(ipAddr)) {
			try{
				let peers = await SqlAll<teilnehmerRow>("SELECT  * FROM teilnehmer WHERE disabled != 1 AND type != 0;", []);
				let ipPeers: Array<{
					peer: teilnehmerRow,
					ipaddress: string
				}> = [];
				await serialEachPromise(peers, peer =>
					new Promise((resolve, reject) => {
						if ((!peer.ipaddress) && peer.hostname) {
							// logger.log('debug', inspect`hostname: ${peer.hostname}`)
							dns.lookup(peer.hostname, {}, function(err, address, family) {
								// if (err) logger.log('debug', inspect`${err}`);
								if (address) {
									ipPeers.push({
										peer,
										ipaddress: address,
									});
									// logger.log('debug', inspect`${peer.hostname} resolved to ${address}`);
								}
								resolve();
							});
						} else if (peer.ipaddress && (ip.isV4Format(peer.ipaddress) || ip.isV6Format(peer.ipaddress))) {
							// logger.log('debug', inspect`ip: ${peer.ipaddress}`);
							ipPeers.push({
								peer,
								ipaddress: peer.ipaddress,
							});
							resolve();
						} else {
							resolve();
						}
					})
				);
				let matches = ipPeers.filter(peer => ip.isEqual(peer.ipaddress, ipAddr)).map(x => x.peer.name);
				logger.log('debug', inspect`matching peers: ${matches}`);
				if (matches.length > 0) {
					client.socket.end(`ok\r\n${matches.join("\r\n")}\r\n+++\r\n`);
				} else {
					client.socket.end("fail\r\n+++\r\n");
				}
			}catch(err){
				logger.log('error', inspect`${err}`);
			}
		} else {
			client.socket.end("error\r\nnot a valid host or ip\r\n");
		}
	} else {
		client.socket.end("error\r\nthis server does not support this function\r\n");
	}
}

export{
	asciiLookup,
	checkIp
};
