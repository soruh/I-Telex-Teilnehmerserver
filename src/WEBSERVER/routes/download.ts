import { SqlQuery } from "../../SHARED/misc";

async function download(req, res, next) {
		switch(req.query.type){
			case "xls":
				res.setHeader('Content-disposition', 'attachment; filename=list.xls');
				res.setHeader('Content-type', 'application/xls');
	
				let data = await SqlQuery('select number,name,type,hostname,ipaddress,port,extension from teilnehmer where disabled!=1;');
				if(data&&data.length>0){
					let header = Object.keys(data[0]);
					res.write(header.join('\t')+'\n');
	
					for(let row of data){
						let values = Object.values(row);
						res.write(values.join('\t')+'\n');
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
