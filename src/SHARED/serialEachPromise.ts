import { inspect } from "./misc";



"use strict";
async function serialEachPromise<T,U>(iterable:Iterable<T>, promiseFunction:(value:T, key:string)=>Promise<U>){
  let results = [];
  for(let key in iterable){
    try{
      logger.log('silly', inspect`starting promiseFunction ${promiseFunction.name?promiseFunction.name+" ":""}called with key: ${key} value: ${iterable[key]} `);
      results.push(await promiseFunction(iterable[key], key));
      logger.log('silly', inspect`finished promiseFunction ${promiseFunction.name?promiseFunction.name+" ":""}called with key: ${key} value: ${iterable[key]}`);
    }catch(e){
      logger.log('silly', inspect`error in promiseFunction ${promiseFunction.name?promiseFunction.name+" ":""}called with key: ${key} value: ${iterable[key]}`);
      logger.log('error', inspect`${e}`);
    }
  }
  return results;
}

export default serialEachPromise;