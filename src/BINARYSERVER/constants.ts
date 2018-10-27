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
const PackageSizes:{
	[index:number]: 0|4|5|8|41|100
} = {
	1: 8,
	2: 4,
	3: 5,
	4: 0,
	5: 100,
	6: 5,
	7: 5,
	8: 0,
	9: 0,
	10: 41,
};
const states = {
	STANDBY: Symbol("STANDBY"),
	RESPONDING: Symbol("RESPONDING"),
	FULLQUERY: Symbol("FULLQUERY"),
	LOGIN: Symbol("LOGIN"),
};
export {
	PackageNames,
	PackageSizes,
	states
};
