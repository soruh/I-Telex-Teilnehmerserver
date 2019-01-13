import * as mysql from "mysql";
import * as sqlite3 from "sqlite3";

interface RunResult {
	changes: number;
}

declare	function SqlEach<T>(query: string, values: any[], callback:(err:Error, row:T)=>void, verbose?:boolean):Promise<number>;
declare	function SqlAll<T>(query: string, values: any[], verbose?:boolean):Promise<T[]>;
declare	function SqlGet<T>(query: string, values: any[], verbose?:boolean):Promise<T>;
declare	function SqlRun(query: string, values: any[], verbose?:boolean):Promise<RunResult|sqlite3.RunResult>;
declare function connectToDb():Promise<mysql.Pool|sqlite3.Database>;


interface sql_types {
	SqlEach:     typeof SqlEach;
	SqlAll:      typeof SqlAll;
	SqlGet:      typeof SqlGet;
	SqlRun:      typeof SqlRun;
	connectToDb: typeof connectToDb;
}

export default sql_types;

