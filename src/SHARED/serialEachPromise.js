"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const misc_1 = require("./misc");
"use strict";
function serialEachPromise(iterable, promiseFunction) {
    return __awaiter(this, void 0, void 0, function* () {
        let results = [];
        for (let key in iterable) {
            try {
                logger.log('silly', misc_1.inspect `starting promiseFunction ${promiseFunction.name ? promiseFunction.name + " " : ""}called with key: ${key} value: ${iterable[key]} `);
                results.push(yield promiseFunction(iterable[key], key));
                logger.log('silly', misc_1.inspect `finished promiseFunction ${promiseFunction.name ? promiseFunction.name + " " : ""}called with key: ${key} value: ${iterable[key]}`);
            }
            catch (e) {
                logger.log('silly', misc_1.inspect `error in promiseFunction ${promiseFunction.name ? promiseFunction.name + " " : ""}called with key: ${key} value: ${iterable[key]}`);
                logger.log('error', misc_1.inspect `${e}`);
            }
        }
        return results;
    });
}
exports.default = serialEachPromise;
