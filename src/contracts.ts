import {
  queryContract,
  executeContract,
  getHeight
} from './bootstrap';
import { Coin, StdFee } from 'secretjs/types/types.js';
import { griptape, viewingKeyManager } from './index.js';

const QUERY_TYPE = 'query';
const MESSAGE_TYPE = 'message';

function getEntropyString(length: number): string {
  const characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  let result           = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

function getValue(object: any, key: string): any {
  let value;
  Object.keys(object).some(k => {
    if (k === key) {
      value = object[k];
      return true;
    }
    if (object[k] && typeof object[k] === 'object') {
      value = getValue(object[k], key);
      return value !== undefined;
    }
  });
  return value;
}

function hasOwnDeepProperty(obj: any, prop: string): boolean {
  if (typeof obj === 'object' && obj !== null) {
    if (obj.hasOwnProperty(prop)) {
      return true;
    }
    for (const p in obj) {
      if (obj.hasOwnProperty(p) &&
          hasOwnDeepProperty(obj[p], prop)) {
        return true;
      }
    }
  }
  return false;
}

function warn(func: any, result: any, msg: string): void {
  console.warn(`Cannot call ${func.type} -> ${JSON.stringify(result)}: ${msg}`);
}

export interface Context {
  address?: string;
  key?: string;
  padding?: string;
  height?: number;
}

export interface ContractExecuteRequest {
  handleMsg: Record<string, unknown>;
  memo?: string;
  transferAmount?: readonly Coin[];
  fee?: StdFee;
}

export type ContractRequest = Record<string, unknown>;

export function createContract(contract: Record<string, unknown>):
  Record<string, any> {

  const handler = {
    get(contract: Record<string, any>, prop: string) {
      if (typeof contract[prop] !== 'function') {
        return Reflect.get(contract, prop);
      }

      return new Proxy(contract[prop], {
        apply: async (func: any, thisArg: any, argumentsList: any) => {
          const { at: contractAddress } = contract;

          // Get all context variables.
          const address = griptape.address;
          const key = viewingKeyManager.get(contractAddress);
          const height = await getHeight();
          const padding = getEntropyString(12);

          // Set the context.
          const ctx = { address, key, height, padding } as Context;
          const args = [ctx, ...argumentsList];

          // Call the method, injecting the context.
          const result = Reflect.apply(func, thisArg, args);

          const hasAddress = getValue(result, 'address');
          if (hasOwnDeepProperty(result, 'address') && !hasAddress) {
            warn(func, result, 'No address available');
            return;
          }

          const hasKey = getValue(result, 'key');
          if (hasOwnDeepProperty(result, 'key') && !hasKey) {
            warn(func, result, 'No key available');
            return;
          }

          if (func.type === QUERY_TYPE) {
            return queryContract(contractAddress, result);
          } else if (func.type === MESSAGE_TYPE) {
            const {
              handleMsg,
              memo,
              transferAmount,
              fee
            } = result as ContractExecuteRequest;
            return executeContract(
              contractAddress,
              handleMsg,
              memo,
              transferAmount,
              fee
            );
          }

          return Reflect.apply(func, thisArg, argumentsList);
        }
      });
    }
  };

  const { id, at, definition: { queries: q, messages: m } }: any = contract;

  // Handling when no queries or messages are defined in the contract
  // definition.
  let queries = q || {};
  let messages = m || {};

  // Setting the type of queries and messages.
  Object.keys(queries).forEach(it => queries[it].type = QUERY_TYPE)
  Object.keys(messages).forEach(it => messages[it].type = MESSAGE_TYPE)

  // Define the target object.
  const target = { id, at, ...queries, ...messages };

  // Create a new proxy for that target.
  return new Proxy(target, handler);
}
