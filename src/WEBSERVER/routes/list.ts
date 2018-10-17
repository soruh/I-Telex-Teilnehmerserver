import { SqlQuery } from "../../SHARED/misc";
import config from "../../SHARED/config";

async function list(req, res) {
		// tslint:disable:no-var-keyword
		if(req.body.password === config.webInterfacePassword){
			var query = "SELECT uid,number,name,type,hostname,ipaddress,port,extension,disabled,timestamp FROM teilnehmer";
		}else{
			var query = "SELECT uid,number,name,type,hostname,ipaddress,port,extension,timestamp FROM teilnehmer where type!=0 and disabled=0;";
		}
		// tslint:enable:no-var-keyword
		res.header("Content-Type", "application/json; charset=utf-8");
		
		try{
			let data = await SqlQuery(query);
			
			if(!data) throw(new Error('no data'));
			res.json({
				successful: true,
				result: data,
			});
		}catch(error){
			res.json({
				successful: false,
				error,
			});
		}
}
export default list;
