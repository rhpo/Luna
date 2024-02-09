import { AssignmentExpr, ReactRequirements, Statement } from "../lib/ast";
import Environment from "../lib/env";
import { Err } from "../lib/error";
import { evaluateFunctionCall, stringify } from "./evaluation/eval";

import unescapeJs from "unescape-js";
function unescapeSafe(s: string): string {
  try {
    return unescapeJs(s);
  } catch (e) {
    return s;
  }
}

export type ValueType =
  | "null"
  | "undef"
  | "void"
  | "number"
  | "boolean"
  | "string"
  | "function"
  | "return"
  | "native-fn"
  | "fn"
  | "array"
  | "NaN"
  | "object";

export interface RuntimeValue {
  type?: ValueType;
  value: any;

  properties?: Map<string, RuntimeValue>;
  reactiveCallbacks?: ReactRequirements[];

  export?: boolean;

  informations: Record<string, any>;

  owner?: RuntimeValue;
  rendered?: boolean;

  returned?: boolean;

  prototypes?: {
    [key: string]: RuntimeValue;
  };

  id?: number;
}

export interface NullValue extends RuntimeValue {
  type: "null";
  value: null;
}

export interface ArrayValue extends RuntimeValue {
  type: "array";
  value: RuntimeValue[];
  prototypes?: any;
}

export interface NaNValue extends RuntimeValue {
  type: "NaN";
  value: number;
}

export interface UndefinedValue extends RuntimeValue {
  type: "undef";
  value: undefined;
}

export interface NumberValue extends RuntimeValue {
  type: "number";
  value: number;
}

export interface VoidValue extends RuntimeValue {
  type: "void";
  value: undefined;
}

export interface BooleanValue extends RuntimeValue {
  type: "boolean";
  value: boolean;
}

export interface StringValue extends RuntimeValue {
  type: "string";
  value: string;
  prototypes?: any;
}

export interface FunctionValue extends RuntimeValue {
  type: "function";
  value: object;

  prototypes: {
    // *** FUNCTION PROTOTYPE ***
    str: FNVal;
  };
}

export interface ObjectValue extends RuntimeValue {
  type: "object";
  properties: Map<string, RuntimeValue>;
}

export type FunctionCall = (
  args: RuntimeValue[],
  env: Environment
) => RuntimeValue;

export interface NativeFNVal extends RuntimeValue {
  type: "native-fn";
  name: string;
  call: FunctionCall;
}

export interface FNVal extends RuntimeValue {
  type: "fn";
  name: string;
  declarationEnv: Environment;
  parameters: AssignmentExpr[];
  body: Statement[];
  export: boolean;
}

interface PrototypeItem {
  name: string;
  value:
    | RuntimeValue
    | ((args: RuntimeValue[], scope?: Environment) => RuntimeValue);
}

/**
 * @type {object} MK (MAKE)
 * @description Macroes for ${systemDefaults.name}
 */
export const MK = {
  auto(n: number | string | boolean | object | undefined) {
    switch (typeof n) {
      case "number":
        return MK.number(n);
      case "string":
        return MK.string(n);
      case "boolean":
        return MK.bool(n);
      case "undefined":
        return MK.undefined();
      case "object":
        if (Number.isNaN(n)) {
          return MK.NaN();
        } else return MK.object(n);
    }
  },

  number(n: number = 0): NumberValue {
    return { type: "number", value: n } as NumberValue;
  },

  // means nothing to show...
  void(): VoidValue {
    return { type: "void", value: undefined } as VoidValue;
  },

  string(s: string = ""): StringValue {
    return {
      type: "string",
      value: unescapeSafe(s),
      prototypes: prototypelist.string
        .map((k) => {
          if (typeof k.value === "function") {
            k.value = MK.nativeFunc(k.value, k.name);
            k.value.rendered = true;
          } else if (!k.value.rendered) k.value = MK.auto(k.value);
          return k;
        })
        .reduce((result: any, item) => {
          result[item.name] = item.value;
          return result;
        }, {}),
    } as StringValue;
  },

  bool(b: boolean = true): BooleanValue {
    return { type: "boolean", value: b } as BooleanValue;
  },

  object(o: object): ObjectValue {
    return {
      type: "object",
      value: true,
      properties: new Map(Object.entries(o)),
      prototypes: prototypelist.object
        .map((k) => {
          if (typeof k.value === "function") {
            k.value = MK.nativeFunc(k.value, k.name);
            k.value.rendered = true;
          } else if (!k.value.rendered) k.value = MK.auto(k.value);
          return k;
        })
        .reduce((result: any, item) => {
          result[item.name] = item.value;
          return result;
        }, {}),
    } as ObjectValue;
  },

  array(elements: RuntimeValue[]): ArrayValue {
    let arr = {
      type: "array",
      value: elements,
      prototypes: prototypelist.array
        .map((k) => {
          if (typeof k.value === "function") {
            k.value = MK.nativeFunc(k.value, k.name);
            k.value.rendered = true;
          } else if (!k.value.rendered) k.value = MK.auto(k.value);
          return k;
        })
        .reduce((result: any, item) => {
          result[item.name] = item.value;
          return result;
        }, {}),
    } as ArrayValue;

    Object.setPrototypeOf(arr, null);

    return arr;
  },

  nil(): NullValue {
    return { type: "null", value: null } as NullValue;
  },

  undefined(): UndefinedValue {
    return { type: "undef", value: undefined } as UndefinedValue;
  },

  NaN(): NaNValue {
    return { type: "NaN", value: NaN } as NaNValue;
  },

  nativeFunc(call: FunctionCall, name: string) {
    return { type: "native-fn", value: true, call, name } as NativeFNVal;
  },

  func(
    name: string,
    parameters: AssignmentExpr[],
    body: Statement[],
    exported: boolean,
    env: Environment
  ) {
    return {
      type: "fn",
      name,
      body,
      parameters,
      export: exported,
      declarationEnv: env,
      prototypes: prototypelist.func
        .map((k) => {
          if (typeof k.value === "function") {
            k.value = MK.nativeFunc(k.value, k.name);
          } else k.value = MK.auto(k.value);
          return k;
        })
        .reduce((result: any, item) => {
          result[item.name] = item.value;
          return result;
        }, {}),
    } as FNVal;
  },
};

function reassignproto(runtimeValue: RuntimeValue) {
  let v = runtimeValue.value;
  switch (typeof v) {
    case "string":
      Object.setPrototypeOf(v, String.prototype);
      break;

    case "number":
      Object.setPrototypeOf(v, Number.prototype);
      break;

    case "boolean":
      Object.setPrototypeOf(v, Boolean.prototype);
      break;

    case "object":
      if (Array.isArray(v)) {
        Object.setPrototypeOf(v, Array.prototype);
      } else {
        Object.setPrototypeOf(v, Object.prototype);
      }
      break;
  }

  runtimeValue.value = v;
  return runtimeValue;
}

const prototypelist: Record<string, PrototypeItem[]> = {
  number: [
    {
      name: "toInt",
      value: MK.nativeFunc((args: RuntimeValue[]) => {
        return MK.number(args[0].value) as RuntimeValue;
      }, "PNumber.stringify"),
    },
  ],

  array: [
    {
      name: "length",
      value(args: RuntimeValue[]) {
        args = args.map(reassignproto);
        return MK.number(args[0].value.length);
      },
    },

    {
      name: "at",
      value(args: RuntimeValue[]) {
        args = args.map(reassignproto);
        return args[0].value[args[1].value];
      },
    },

    {
      name: "push",
      value(args: RuntimeValue[]) {
        args = args.map(reassignproto);
        args[0].value[args[0].value.length] = args[1];
        return MK.nil();
      },
    },

    {
      name: "pop",
      value(args: RuntimeValue[]) {
        args = args.map(reassignproto);
        return args[0].value.pop();
      },
    },

    {
      name: "shift",
      value(args: RuntimeValue[]) {
        args = args.map(reassignproto);
        return args[0].value.shift();
      },
    },

    {
      name: "unshift",
      value(args: RuntimeValue[]) {
        args = args.map(reassignproto);
        return args[0].value.unshift(args[1]);
      },
    },

    {
      name: "slice",
      value(args: RuntimeValue[]) {
        args = args.map(reassignproto);
        return MK.array(args[0].value.slice(args[1].value, args[2].value));
      },
    },

    {
      name: "splice",
      value(args: RuntimeValue[]) {
        args = args.map(reassignproto);
        return MK.array(
          args[0].value.splice(args[1].value, args[2].value, args[3])
        );
      },
    },

    {
      name: "reverse",
      value(args: RuntimeValue[]) {
        args = args.map(reassignproto);
        return MK.array(args[0].value.reverse());
      },
    },

    {
      name: "sort",
      value(args: RuntimeValue[], scope: any) {
        args = args.map(reassignproto);
        let func = args[1] as any as FNVal;

        return MK.array(
          args[0].value.sort(
            (a: RuntimeValue, b: RuntimeValue) =>
              evaluateFunctionCall(func, [a, b], scope).value
          )
        );
      },
    },

    {
      name: "map",
      value(args: RuntimeValue[], scope: any) {
        args = args.map(reassignproto);
        return MK.array(
          args[0].value.map((e: RuntimeValue) =>
            evaluateFunctionCall(args[1] as any as FNVal, [e], scope)
          )
        );
      },
    },

    {
      name: "filter",
      value(args: RuntimeValue[], scope: any) {
        args = args.map(reassignproto);
        return MK.array(
          args[0].value.filter(
            (e: RuntimeValue) =>
              evaluateFunctionCall(args[1] as any as FNVal, [e], scope).value
          )
        );
      },
    },

    {
      name: "reduce",
      value(args: RuntimeValue[], scope: any) {
        args = args.map(reassignproto);
        return args[0].value.reduce((a: RuntimeValue, b: RuntimeValue) =>
          evaluateFunctionCall(args[1] as any as FNVal, [a, b], scope)
        );
      },
    },

    {
      name: "join",
      value(args: RuntimeValue[]) {
        args = args.map(reassignproto);
        return MK.string(
          args[0].value.map((e: any) => e.value).join(args[1].value)
        );
      },
    },

    {
      name: "has",
      value(args: RuntimeValue[]) {
        args = args.map(reassignproto);
        return MK.bool(
          args[0].value.some((e: RuntimeValue) => {
            return e.type === args[1].type && e.value === args[1].value;
          })
        );
      },
    },

    {
      name: "find",
      value(args: RuntimeValue[], scope: any) {
        args = args.map(reassignproto);
        let func = args[1] as any as FNVal;

        return args[0].value.find((e: RuntimeValue) => {
          return evaluateFunctionCall(func, [e], scope).value;
        });
      },
    },

    {
      name: "index",
      value(args: RuntimeValue[], scope: any) {
        args = args.map(reassignproto);
        let func = args[1] as any as FNVal;

        return MK.number(
          args[0].value.findIndex((e: RuntimeValue) => {
            return evaluateFunctionCall(func, [e], scope).value;
          })
        );
      },
    },

    {
      name: "each",
      value(args, scope: any) {
        args = args.map(reassignproto);
        let func = args[1] as any as FNVal;

        args[0].value.forEach((e: RuntimeValue, idx: number) => {
          evaluateFunctionCall(func, [e, MK.number(idx)], scope);
        });

        return MK.nil();
      },
    },
  ],

  func: [
    {
      name: "call",
      value(args, scope: any) {
        let fn = args.splice(0, 1)[0];

        return evaluateFunctionCall(
          fn as any as FNVal,
          args as RuntimeValue[],
          scope
        );
      },
    },

    {
      name: "source",
      value(args) {
        return MK.string(
          (args[0] as any as FNVal).body.map((t) => stringify(t)).join("\n")
        );
      },
    },
  ],

  object: [
    {
      name: "keys",
      value(args) {
        let this_ = args[0] as any as ObjectValue;

        // return MK.object(
        //   Object.assign(
        //     {},
        //     [...this_.properties.keys()].map((k) => MK.auto(k))
        //   )
        // );

        // return array instead of object

        return MK.array([...this_.properties.keys()].map((k) => MK.auto(k)));
      },
    },

    {
      name: "values",
      value(args) {
        let this_ = args[0] as any as ObjectValue;

        return MK.array([...this_.properties.values()].map((k) => MK.auto(k)));
      },
    },

    {
      name: "entries",
      value(args) {
        let this_ = args[0] as any as ObjectValue;

        return MK.array(
          [...this_.properties.entries()].map((k) =>
            MK.array(k.map((v) => MK.auto(v)))
          )
        );
      },
    },

    {
      name: "has",
      value(args) {
        let this_ = args[0] as any as ObjectValue;

        return MK.bool(this_.properties.has(args[1].value));
      },
    },

    {
      name: "set",
      value(args) {
        let this_ = args[0] as any as ObjectValue;

        this_.properties.set(args[1].value, args[2]);

        return MK.nil();
      },
    },

    {
      name: "delete",
      value(args) {
        let this_ = args[0] as any as ObjectValue;

        this_.properties.delete(args[1].value);

        return MK.nil();
      },
    },
  ],

  string: [
    {
      name: "reverse",
      value(args) {
        if (args[0].value)
          return MK.string(args[0].value.split("").reverse().join(""));
        else return MK.nil();
      },
    },

    {
      name: "int",
      value(args) {
        if (args[0].value) return MK.number(parseInt(args[0].value));
        else return MK.nil();
      },
    },

    {
      name: "float",
      value(args) {
        if (args[0].value) return MK.number(parseFloat(args[0].value));
        else return MK.nil();
      },
    },

    {
      name: "replace",
      value(args) {
        if (args[0].value) {
          let string = args[0].value;
          let a = args[1]?.value;
          let b = args[2]?.value;

          if (typeof a === "undefined")
            throw Err("ArgumentError", "Argument A is not a type of string");
          if (typeof b === "undefined")
            throw Err("ArgumentError", "Argument B is not a type of string");

          return MK.string(string.replaceAll(a, b));
        } else return MK.nil();
      },
    },

    {
      name: "split",
      value(args) {
        if (args[0].value) {
          let string = args[0].value;
          let a = args[1]?.value;

          if (typeof a === "undefined")
            throw Err("ArgumentError", "Argument A is not a type of string");

          return MK.array(string.split(a).map((s: any) => MK.string(s)));
        } else return MK.nil();
      },
    },

    {
      name: "replace",
      value(args) {
        if (args[0].value) {
          let string = args[0].value;
          let a = args[1]?.value;
          let b = args[2]?.value;

          if (typeof a === "undefined")
            throw Err("ArgumentError", "Argument A is not a type of string");
          if (typeof b === "undefined")
            throw Err("ArgumentError", "Argument B is not a type of string");

          return MK.string(string.replaceAll(a, b));
        } else return MK.nil();
      },
    },

    {
      name: "charAt",
      value(args) {
        if (args[0].value) {
          let string = args[0].value;
          let a = args[1]?.value;

          if (typeof a === "undefined")
            throw Err("ArgumentError", "Argument A is not a type of string");

          return MK.string(string.charAt(a));
        } else return MK.nil();
      },
    },

    {
      name: "charCodeAt",
      value(args) {
        if (args[0].value) {
          let string = args[0].value;
          let a = args[1]?.value;

          if (typeof a === "undefined")
            throw Err("ArgumentError", "Argument A is not a type of string");

          return MK.number(string.charCodeAt(a));
        } else return MK.nil();
      },
    },

    {
      name: "concat",
      value(args) {
        if (args[0].value) {
          let string = args[0].value;
          let a = args[1]?.value;

          if (typeof a === "undefined")
            throw Err("ArgumentError", "Argument A is not a type of string");

          return MK.string(string.concat(a));
        } else return MK.nil();
      },
    },

    {
      name: "includes",
      value(args) {
        if (args[0].value) {
          let string = args[0].value;
          let a = args[1]?.value;

          if (typeof a === "undefined")
            throw Err("ArgumentError", "Argument A is not a type of string");

          return MK.bool(string.includes(a));
        } else return MK.nil();
      },
    },

    {
      name: "indexOf",
      value(args) {
        if (args[0].value) {
          let string = args[0].value;
          let a = args[1]?.value;

          if (typeof a === "undefined")
            throw Err("ArgumentError", "Argument A is not a type of string");

          return MK.number(string.indexOf(a));
        } else return MK.nil();
      },
    },

    {
      name: "lastIndexOf",
      value(args) {
        if (args[0].value) {
          let string = args[0].value;
          let a = args[1]?.value;

          if (typeof a === "undefined")
            throw Err("ArgumentError", "Argument A is not a type of string");

          return MK.number(string.lastIndexOf(a));
        } else return MK.nil();
      },
    },

    {
      name: "match",
      value(args) {
        if (args[0].value) {
          let string = args[0].value;
          let a = args[1]?.value;

          if (typeof a === "undefined")
            throw Err("ArgumentError", "Argument A is not a type of string");

          return MK.array(string.match(a).map((s: any) => MK.string(s)));
        } else return MK.nil();
      },
    },
  ],
};

export const PROTO = {
  auto(n: string) {
    switch (n) {
      case "number":
        return prototypelist.number;
      case "object":
        return prototypelist.object;

      default:
        return null;
    }
  },
};
