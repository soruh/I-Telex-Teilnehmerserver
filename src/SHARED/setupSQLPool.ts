import * as mysql from "mysql";
import * as util from "util";

declare global {
	namespace NodeJS {
		interface Global {
			sqlPool: mysql.Pool;
		}
	}
}

async function setupSQLPool(options:mysql.PoolConfig){
	let sqlPool = mysql.createPool(options);
	global.sqlPool = sqlPool;
	let connection = await util.promisify(sqlPool.getConnection.bind(sqlPool))();
	connection.release();
}

export default setupSQLPool;
