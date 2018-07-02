//#region imports
import * as ITelexCom from "../BINARYSERVER/ITelexCom.js";
//#endregion

var transporter:ITelexCom.MailTransporter;
function setTransporter(value:ITelexCom.MailTransporter){
    transporter = value;
}
function getTransporter(){
    return transporter;
}
export {
    getTransporter,
    setTransporter
};