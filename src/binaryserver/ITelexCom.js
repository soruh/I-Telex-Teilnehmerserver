"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
//#region imports
const ip = require("ip");
const config_js_1 = require("../shared/config.js");
const colors_js_1 = require("../shared/colors.js");
const constants = require("../shared/constants.js");
const misc_js_1 = require("../shared/misc.js");
const stream_1 = require("stream");
//#endregion
Buffer.prototype.readNullTermString = function readNullTermString(offset = 0, byteLength = this.length - offset, encoding = "utf8") {
    const end = offset + byteLength;
    const firstZero = this.indexOf(0, offset);
    const stop = firstZero >= offset && firstZero <= end ? firstZero : end;
    return this.toString(encoding, offset, stop);
};
function inspectBuffer(buffer) {
    return Array.from(buffer).map(x => x.toString(16).padStart(2, "0")).join(" ");
}
function explainPackagePart(buffer, name, color) {
    if (config_js_1.default.explainBuffers > 1) {
        return ` ${color}[${name}: ${inspectBuffer(buffer)}]${colors_js_1.default.Reset}`;
    }
    else {
        return ` [${name}: ${inspectBuffer(buffer)}]`;
    }
}
function explainPackage(pkg) {
    let res = (config_js_1.default.explainBuffers > 1 ? colors_js_1.default.Reset : "") + "<Buffer";
    const type = pkg[0];
    const datalength = pkg[1];
    res += explainPackagePart(Buffer.from([type]), "type", "\x1b[036m");
    res += explainPackagePart(Buffer.from([datalength]), "datalength", "\x1b[032m");
    switch (type) {
        case 1:
            res += explainPackagePart(pkg.slice(2, 6), "number", "\x1b[034m");
            res += explainPackagePart(pkg.slice(6, 8), "pin", "\x1b[031m");
            res += explainPackagePart(pkg.slice(8, 10), "port", "\x1b[042m");
            break;
        case 2:
            res += explainPackagePart(pkg.slice(2, 6), "ipaddress", "\x1b[043m");
            break;
        case 3:
            res += explainPackagePart(pkg.slice(2, 6), "number", "\x1b[034m");
            res += explainPackagePart(pkg.slice(6, 7), "version", "\x1b[106m");
            break;
        case 4:
            res += " ";
            break;
        case 5:
            res += explainPackagePart(pkg.slice(2, 6), "number", "\x1b[034m");
            res += explainPackagePart(pkg.slice(6, 46), "name", "\x1b[000m");
            res += explainPackagePart(pkg.slice(46, 48), "flags", "\x1b[047m");
            res += explainPackagePart(pkg.slice(48, 49), "type", "\x1b[035m");
            res += explainPackagePart(pkg.slice(49, 89), "hostname", "\x1b[033m");
            res += explainPackagePart(pkg.slice(89, 93), "ipaddress", "\x1b[043m");
            res += explainPackagePart(pkg.slice(93, 95), "port", "\x1b[042m");
            res += explainPackagePart(pkg.slice(95, 96), "extension", "\x1b[045m");
            res += explainPackagePart(pkg.slice(96, 98), "pin", "\x1b[031m");
            res += explainPackagePart(pkg.slice(98, 102), "timestamp", "\x1b[047m");
            break;
        case 6:
            res += explainPackagePart(pkg.slice(2, 3), "version", "\x1b[106m");
            res += explainPackagePart(pkg.slice(3, 7), "serverpin", "\x1b[041m");
            break;
        case 7:
            res += explainPackagePart(pkg.slice(2, 3), "version", "\x1b[106m");
            res += explainPackagePart(pkg.slice(3, 7), "serverpin", "\x1b[041m");
            break;
        case 8:
            res += " ";
            break;
        case 9:
            res += " ";
            break;
        case 10:
            res += explainPackagePart(pkg.slice(2, 3), "version", "\x1b[106m");
            res += explainPackagePart(pkg.slice(3, 43), "pattern", "\x1b[000m");
            break;
        default:
            res = inspectBuffer(pkg);
    }
    res += ">";
    return res;
}
exports.explainPackage = explainPackage;
class ChunkPackages extends stream_1.Transform {
    constructor(options) {
        super(options);
        this.buffer = Buffer.alloc(0);
    }
    _transform(chunk, encoding, callback) {
        this.buffer = Buffer.concat([this.buffer, chunk]);
        let packageLength = (this.buffer[1] + 2) || Infinity;
        while (packageLength <= this.buffer.length) {
            this.push(this.buffer.slice(0, packageLength));
            this.buffer = this.buffer.slice(packageLength);
            packageLength = (this.buffer[1] + 2) || Infinity;
        }
        callback();
    }
}
exports.ChunkPackages = ChunkPackages;
function encPackage(pkg) {
    logger.log('iTelexCom', misc_js_1.inspect `encoding package: ${pkg}`);
    if (pkg.datalength == null) {
        if (pkg.type === 255) {
            if (pkg.data.message != null)
                pkg.datalength = pkg.data.message.length;
        }
        else {
            const length = constants.PackageSizes[pkg.type];
            if (typeof length === "number") {
                pkg.datalength = length;
            }
            else {
                // use the largest known package size, as all excess data is discarded anyways.
                pkg.datalength = Math.max(...length);
            }
        }
    }
    let buffer = Buffer.alloc(pkg.datalength + 2);
    buffer[0] = pkg.type;
    buffer[1] = pkg.datalength;
    switch (pkg.type) {
        case 1:
            buffer.writeUIntLE(pkg.data.number || 0, 2, 4);
            buffer.writeUIntLE(+pkg.data.pin || 0, 6, 2);
            buffer.writeUIntLE(+pkg.data.port || 0, 8, 2);
            break;
        case 2:
            {
                let normalizedIp = misc_js_1.normalizeIp(pkg.data.ipaddress);
                if (normalizedIp && normalizedIp.family === 4) {
                    ip.toBuffer(normalizedIp.address, buffer, 2); // error in @types/ip: buffer should be of type Buffer
                }
            }
            break;
        case 3:
            buffer.writeUIntLE(pkg.data.number || 0, 2, 4);
            buffer.writeUIntLE(pkg.data.version || 0, 6, 1);
            break;
        case 4:
            break;
        case 5:
            let flags = pkg.data.disabled ? 2 : 0;
            buffer.writeUIntLE(pkg.data.number || 0, 2, 4);
            buffer.write(pkg.data.name || "", 6, 40);
            buffer.writeUIntLE(flags || 0, 46, 2);
            buffer.writeUIntLE(pkg.data.type || 0, 48, 1);
            buffer.write(pkg.data.hostname || "", 49, 40);
            {
                let normalizedIp = misc_js_1.normalizeIp(pkg.data.ipaddress);
                if (normalizedIp && normalizedIp.family === 4) {
                    ip.toBuffer(normalizedIp.address, buffer, 89);
                }
            }
            buffer.writeUIntLE(pkg.data.port || 0, 93, 2);
            buffer.writeUIntLE(misc_js_1.encodeExt(pkg.data.extension) || 0, 95, 1);
            buffer.writeUIntLE(pkg.data.pin || 0, 96, 2);
            buffer.writeUIntLE((pkg.data.timestamp || 0) + 2208988800, 98, 4);
            break;
        case 6:
            buffer.writeUIntLE(pkg.data.version || 0, 2, 1);
            buffer.writeUIntLE(pkg.data.serverpin || 0, 3, 4);
            break;
        case 7:
            buffer.writeUIntLE(pkg.data.version || 0, 2, 1);
            buffer.writeUIntLE(pkg.data.serverpin || 0, 3, 4);
            break;
        case 8:
            break;
        case 9:
            break;
        case 10:
            buffer.writeUIntLE(pkg.data.version || 0, 2, 1);
            buffer.write(pkg.data.pattern || "", 3, 40);
            break;
        case 255:
            buffer.write(pkg.data.message || "", 2, pkg.datalength);
            break;
    }
    logger.log('iTelexCom', misc_js_1.inspect `encoded: ${(config_js_1.default.explainBuffers > 0 ? explainPackage(buffer) : buffer)}`);
    return buffer;
}
exports.encPackage = encPackage;
function decPackage(buffer) {
    let pkg = {
        type: buffer[0],
        datalength: buffer[1],
        data: null,
    };
    logger.log('iTelexCom', misc_js_1.inspect `decoding package: ${(config_js_1.default.explainBuffers > 0 ? explainPackage(buffer) : buffer)}`);
    let minSize = constants.PackageSizes[pkg.type];
    if (minSize instanceof Array) {
        minSize = Math.min(...minSize);
    }
    if (pkg.datalength < minSize) {
        logger.log('iTelexCom', `discarded package, which was too small (${pkg.datalength} < ${minSize})`);
        return null;
    }
    switch (pkg.type) {
        case 1:
            pkg.data = {
                number: buffer.readUIntLE(2, 4),
                pin: buffer.readUIntLE(6, 2),
                port: buffer.readUIntLE(8, 2),
            };
            break;
        case 2:
            pkg.data = {
                ipaddress: ip.toString(buffer, 2, 4),
            };
            if (pkg.data.ipaddress === "0.0.0.0")
                pkg.data.ipaddress = "";
            break;
        case 3:
            pkg.data = {
                number: buffer.readUIntLE(2, 4),
                version: buffer.slice(6, 7).length > 0 ? buffer.readUIntLE(6, 1) : 1,
            };
            break;
        case 4:
            pkg.data = {};
            break;
        case 5:
            const flags = buffer.readUIntLE(46, 2);
            // <Call-number 4b> 0,4
            // <Name 40b> 		4,44
            // <Flags 2b>		44,46
            // <Type 1b>		46,47
            // <Addr 40b>		47,87
            // <IPAdr 4b>		87,91
            // <Port 2b>		91,93
            // <Extension 1b>	93,94
            // <DynPin 2b>		94,96
            // <Date 4b>		96,100
            pkg.data = {
                number: buffer.readUIntLE(2, 4),
                name: buffer.readNullTermString(6, 40),
                disabled: (flags & 2) / 2,
                type: buffer.readUIntLE(48, 1),
                hostname: buffer.readNullTermString(49, 40),
                ipaddress: ip.toString(buffer, 89, 4),
                port: buffer.readUIntLE(93, 2),
                pin: buffer.readUIntLE(96, 2),
                timestamp: buffer.readUIntLE(98, 4) - 2208988800,
                extension: misc_js_1.decodeExt(buffer.readUIntLE(95, 1)),
            };
            if (pkg.data.ipaddress === "0.0.0.0")
                pkg.data.ipaddress = "";
            break;
        case 6:
            pkg.data = {
                version: buffer.readUIntLE(2, 1),
                serverpin: buffer.readUIntLE(3, 4),
            };
            break;
        case 7:
            pkg.data = {
                version: buffer.readUIntLE(2, 1),
                serverpin: buffer.readUIntLE(3, 4),
            };
            break;
        case 8:
            pkg.data = {};
            break;
        case 9:
            pkg.data = {};
            break;
        case 10:
            pkg.data = {
                version: buffer.readUIntLE(2, 1),
                pattern: buffer.readNullTermString(3, 40),
            };
            break;
        case 255:
            pkg.data = {
                message: buffer.readNullTermString(2),
            };
            break;
        default:
            logger.log('warning', misc_js_1.inspect `recieved a package of invalid/unsupported type: ${pkg.type}`);
            return null;
    }
    return pkg;
}
exports.decPackage = decPackage;
