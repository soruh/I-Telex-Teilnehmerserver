const PackageNames = {
	1: "Client_update",
	2: "Address_confirm",
	3: "Peer_query",
	4: "Peer_not_found",
	5: "Peer_reply",
	6: "Sync_FullQuery",
	7: "Sync_Login",
	8: "Acknowledge",
	9: "End_of_List",
	10: "Peer_search",
	255: "Error",
};
const PackageSizes = {
	1: 8,
	2: 4,
	3: [4, 5],
	// some clients don't send a version
	4: 0,
	5: 100,
	6: 5,
	7: 5,
	8: 0,
	9: 0,
	10: 41,
};
const peerProperties = ["number", "name", "type", "hostname", "ipaddress", "port", "extension", "pin", "disabled", "timestamp"];
const peerPropertiesPublic = peerProperties.filter(x=>!(x==='pin'||x==='disabled'));
const states = {
	STANDBY: Symbol("STANDBY"),
	RESPONDING: Symbol("RESPONDING"),
	FULLQUERY: Symbol("FULLQUERY"),
	LOGIN: Symbol("LOGIN"),
};


const loggingLevels = {
	REST: {
		levels:{
			"error": 0,
			"warning": 1,
			"admin": 2,
			"private": 3,
			"public": 4,			
			"others": 5,
			"sql": 6,
			"verbose sql": 7,
			"queue": 8,
			"debug": 9,
			"silly": 10,
		},
		colors:{
			"error": "red",
			"warning": "yellow",
			"admin": "magenta",
			"private": "blue",
			"public": "green",
			"others": "gray",
			"sql": "cyan",
			"verbose sql": "cyan",
			"queue": "gray",
			"debug": "magenta",
			"silly": 'bold',
		},
	},
	BIN:{
		levels:{
			"error": 0,
			"warning": 1,
			"sql": 2,
			"network": 3,			
			"verbose sql": 4,
			"verbose network": 5,
			"debug": 6,
			"queue": 7,
			"iTelexCom": 8,
			"silly":9,
		},
		colors:{
			"error": "red",
			"warning": "yellow",
			"sql": "green",
			"network": "cyan",
			"verbose sql": "green",
			"verbose network": "blue",
			"debug": "magenta",
			"queue": "gray",
			"iTelexCom": "underline",
			"silly": "bold",
		},
	},
	WEB:{
		levels:{
			"error": 0,
			"warning": 1,
			"sql": 2,
			"http": 3,			
			"verbose sql": 4,
			"verbose http": 5,
			"debug": 6,
			"silly":7,
		},
		colors:{
			"error": "red",
			"warning": "yellow",
			"sql": "green",
			"http": "cyan",
			"verbose sql": "green",
			"verbose http": "blue",
			"debug": "magenta",
			"silly": "bold",
		},
	},
};

export {
	PackageNames,
	PackageSizes,
	states,
	peerProperties,
	peerPropertiesPublic,
	loggingLevels,
};
