"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function serialEachPromise(iterable, promiseFunction) {
    let promiseGenerator = function* ( /*iterable:Iterable<T>, promiseFunction:(value:T, key:number)=>any*/) {
        for (let i in iterable)
            yield (promiseFunction(iterable[i], +i));
    };
    let consumePromiseGenerator = (generator) => new Promise((resolve, reject) => {
        let results = [];
        let consumeNextPromise = ( /*generator:Generator*/) => {
            let next = generator.next();
            if (next.done) {
                resolve(results);
            }
            else {
                next.value
                    .then(res => {
                    results.push(res);
                    consumeNextPromise( /*generator*/);
                })
                    .catch(err => {
                    generator.return();
                    reject(err);
                });
            }
        };
        consumeNextPromise( /*generator*/);
    });
    return consumePromiseGenerator(promiseGenerator( /*iterable, promiseFunction*/));
}
exports.default = serialEachPromise;
// serialEachPromise([8,7,6,5,4,3,2,1,0,-1,-2,-3,-4,-5,-6,-7,-8], (value,key)=>new Promise((resolve,reject)=>setTimeout(resolve,100,value*key)))
//     .then(res=>console.log("results:\n",res))
//     .catch(err=>{console.error("serialAllPromises caught:",err);});
