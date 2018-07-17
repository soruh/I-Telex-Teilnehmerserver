//#region imports
import * as mysql from "mysql";
//#endregion

var pool:mysql.Pool;
function setPool(value:mysql.Pool){
    pool = value;
}
function getPool(){
    return pool;
}
export {
    setPool,
    getPool
};