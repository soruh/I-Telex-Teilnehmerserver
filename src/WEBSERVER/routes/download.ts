import { SqlQuery } from "../../SHARED/misc";
import { peerList } from "../../BINARYSERVER/ITelexCom";

async function download(req, res, next) {
		switch(req.query.type){
			case "xls":
				res.setHeader('Content-disposition', 'attachment; filename=list.xls');
				res.setHeader('Content-type', 'application/xls');
	
				let data:peerList = await SqlQuery('select number,name,type,hostname,ipaddress,port,extension from teilnehmer where disabled!=1;');
				if(data&&data.length>0){
					let header = Object.keys(data[0]);
					res.write(header.join('\t')+'\n');
	
					for(let row of data){
						for(let field of header){
							res.write((row[field]||'').toString());
							if(field !== header[header.length-1]) res.write('\t');
						}
						res.write('\n');
					}
	
					res.end();
				}else{
					res.end("no data");  
				}
				break;
			default:
				res.end("requested an invalid file type");
				break;
		}
}
export default download;