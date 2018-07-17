//#region imports
import * as misc from "../BINARYSERVER/misc.js";
//#endregion

var transporter:misc.MailTransporter;
function setTransporter(value:misc.MailTransporter){
    transporter = value;
}
function getTransporter(){
    return transporter;
}
export {
    getTransporter,
    setTransporter
};