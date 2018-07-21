
interface configFile {
  "cv":(level:number)=>boolean,
  "mySqlConnectionOptions": {
    "host": string,
    "user": string,
    "password": string,
    "database": string,
    "insecureAuth" ? : boolean,

    "connectTimeout" ? : number,
    "aquireTimeout" ? : number,
    "timeout" ? : number
  },
  "DynIpUpdateNameDifference": number,

  "setChangedOnNewerEntry": boolean,
  "allowInvalidPackageSizes": boolean,

  "logLineNumbers": boolean,
  "logDate": boolean,
  "bufferLogWithWhitespace": boolean,
  "repairPm2Colors": boolean,
  "logITelexCom": boolean,
  "logFullBuffer":boolean,
  "explainBuffers":number,

  "logConnectionChanges": boolean,
  "serverPin": number,
  "allowFullQueryInReadonly": boolean,
  "allowLoginInReadonly": boolean,
  "doDnsLookups": boolean,
  // "updateQueueInterval": number,
  "queueSendInterval": number,
  "fullQueryInterval": number,
  "fullQueryServer": string,
  "connectionTimeout": number,
  "stdoutLog": string,
  "stderrLog": string,
  "binaryPort": number,
  "loggingVerbosity": number,
  "disableColors": boolean,

  "webServerPort": number,
  "webInterfacePassword": string,

  "deleteErrorsOnReconnect":boolean,
  "warnAtErrorCounts": number[],

  "eMail": {
    "useTestAccount": boolean,
    "account": {
      "host": string,
      "port": number,
      "secure": boolean,
      "auth": {
        "user": string,
        "pass": string
      },
      "tls": {
        "rejectUnauthorized": boolean
      }
    },
    "to": string,
    "from": string,
    "messages": {
      "new": {
        "subject": string,
        "html": string
      },
      "invalidNumber": {
        "subject": string,
        "html": string
      },
      "wrongDynIpPin": {
        "subject": string,
        "html": string
      },
      "wrongDynIpType": {
        "subject": string,
        "html": string
      },
      "wrongServerPin": {
        "subject": string,
        "html": string
      },
      "ServerError": {
        "subject": string,
        "html": string
      }
    }
  }
}

var collection:any = {};

var eMail:any = {};
Object.assign(eMail,require("../../config/mailAccount.json"));
Object.assign(eMail,require("../../config/mailMessages.json"));

Object.assign(collection,{eMail});

Object.assign(collection,require("../../config/mysql.json"));
Object.assign(collection,require("../../config/logging.json"));
Object.assign(collection,require("../../config/misc.json"));
Object.assign(collection,require("../../config/timings.json"));

const config:configFile = collection;

config.cv = level => level <= config.loggingVerbosity;

export default config;