import { SqlQuery } from "../../SHARED/misc";

async function download(req, res, next) {
		switch(req.query.type){
			case "xls":
				res.setHeader('Content-disposition', 'attachment; filename=list.xls');
				res.setHeader('Content-type', 'application/xls');
	
				let data = await SqlQuery('select number,name,type,hostname,ipaddress,port,extension from teilnehmer where disabled!=1;');
				if(data&&data.length>0){
					let header = Object.keys(data[0]);
					for(let i in header){
						res.write(header[i]);
						if(+i === header.length-1){
							res.write('\n');
						}else{
							res.write('\t');
						}
					}
	
					for(let row of data){
						let values = Object.values(row);
						for(let i in values){
							res.write((values[i]||'').toString());
							if(+i === values.length-1){
								res.write('\n');
							}else{
								res.write('\t');
							}
						}
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
