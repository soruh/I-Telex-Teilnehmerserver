"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const misc_1 = require("./misc");
async function serialEachPromise(iterable, promiseFunction) {
    let results = [];
    for (let key in iterable) {
        try {
            logger.log('silly', misc_1.inspect `starting promiseFunction ${promiseFunction.name ? promiseFunction.name + " " : ""}called with key: ${key} value: ${iterable[key]} `);
            results.push(await promiseFunction(iterable[key], key));
            logger.log('silly', misc_1.inspect `finished promiseFunction ${promiseFunction.name ? promiseFunction.name + " " : ""}called with key: ${key} value: ${iterable[key]}`);
        }
        catch (e) {
            logger.log('silly', misc_1.inspect `error in promiseFunction ${promiseFunction.name ? promiseFunction.name + " " : ""}called with key: ${key} value: ${iterable[key]}`);
            logger.log('error', misc_1.inspect `${e}`);
        }
    }
    return results;
}
exports.default = serialEachPromise;
