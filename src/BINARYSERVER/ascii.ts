"use strict";

import config from '../SHARED/config';
import * as util from 'util';
import * as dns from 'dns';
import * as ip from 'ip';
import { inspect, Client } from '../SHARED/misc';
import { SqlQuery, SqlAll, SqlEach, SqlGet, SqlExec } from '../SHARED/SQL';

import { peerList, Peer } from './ITelexCom';
import serialEachPromise from '../SHARED/serialEachPromise';

async function asciiLookup(data: Buffer, client: Client) {
	const match = /q[0-9]+/.exec(data.toString());
	const number: string = match[1];
	if (number&&(!isNaN(parseInt(number)))) {
		logger.log('debug', inspect`starting lookup for: ${number}`);
		try {
			let result:Peer = await SqlGet(`SELECT * FROM teilnehmer WHERE number=? and disabled!=1 and type!=0;`, [number]);
			if (!result) {
				let send: string = "";
				send += "fail\r\n";
				send += number + "\r\n";
				send += "unknown\r\n";
				send += "+++\r\n";
				client.connection.end(send, function() {
					logger.log('debug', inspect`Entry not found/visible`);
					logger.log('debug', inspect`sent:\n${send}`);
				});
			} else {
				let send: string = "";
				let res = result;
				send += "ok\r\n";
				send += res.number + "\r\n";
				send += res.name + "\r\n";
				send += res.type + "\r\n";
				if ([2, 4, 5].indexOf(res.type) > -1) {
					send += res.ipaddress + "\r\n";
				} else if ([1, 3, 6].indexOf(res.type) > -1) {
					send += res.hostname + "\r\n";
				}
				/* else if (res.type == 6) {
					send += res.hostname + "\r\n";
				}*/
				else {
					send += "ERROR\r\n";
				}
				send += res.port + "\r\n";
				send += (res.extension || "-") + "\r\n";
				send += "+++\r\n";
				client.connection.end(send, function() {
					logger.log('debug', inspect`Entry found`);
					logger.log('debug', inspect`sent:\n${send}`);

				});
			}
		}catch(err){
			logger.log('error', inspect`${err}`);
		}
	} else {
		client.connection.end();
	}
}

async function checkIp(data: number[] | Buffer, client: Client) {
	if (config.doDnsLookups) {
		const arg:string = data.slice(1).toString().split("\n")[0].split("\r")[0];
		logger.log('debug', inspect`checking if belongs to any participant`);

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
				client.connection.end("error\r\nnot a valid host or ip\r\n");
				logger.log('debug', inspect`${e}`);
				return;
			}
		}

		if (ip.isV4Format(ipAddr) || ip.isV6Format(ipAddr)) {
			try{
				let peers:peerList = await SqlAll("SELECT  * FROM teilnehmer WHERE disabled != 1 AND type != 0;", []);
				let ipPeers: Array<{
					peer: Peer,
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
					client.connection.end(`ok\r\n${matches.join("\r\n")}\r\n+++\r\n`);
				} else {
					client.connection.end("fail\r\n+++\r\n");
				}
			}catch(err){
				logger.log('error', inspect`${err}`);
			}
		} else {
			client.connection.end("error\r\nnot a valid host or ip\r\n");
		}
	} else {
		client.connection.end("error\r\nthis server does not support this function\r\n");
	}
}

export{
	asciiLookup,
	checkIp
};
