interface queueRow {
	uid: number;
	server: number;
	message: number;
	timestamp: number;
}

interface serversRow {
	 uid: number;
	 address: string;
	 port: number;
	 version: number;
}

interface teilnehmerRow {
	uid: number;
	number: number;
	name: string;
	type: number;
	hostname: string;
	ipaddress: string;
	port: number;
	extension: string;
	pin: number;
	disabled: number;
	timestamp: number;
	changed: number;
}

export {queueRow, serversRow, teilnehmerRow}