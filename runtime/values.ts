import { AssignmentExpr, ReactRequirements, Statement } from "../lib/ast";
import Environment from "../lib/env";
import { Err } from "../lib/error";

export type ValueType =
  | "null"
  | "undefined"
  | "number"
  | "boolean"
  | "string"
  | "function"
  | "return"
  | "native-fn"
  | "fn"
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

  prototype?: {
    [key: string]: RuntimeValue;
  };

  id?: number;
}

export interface NullValue extends RuntimeValue {
  type: "null";
  value: null;
}

export interface NaNValue extends RuntimeValue {
  type: "NaN";
  value: number;
}

export interface UndefinedValue extends RuntimeValue {
  type: "undefined";
  value: undefined;
}

export interface NumberValue extends RuntimeValue {
  type: "number";
  value: number;
}

export interface BooleanValue extends RuntimeValue {
  type: "boolean";
  value: boolean;
}

export interface StringValue extends RuntimeValue {
  type: "string";
  value: string;
  prototype?: any;
}

export interface FunctionValue extends RuntimeValue {
  type: "function";
  value: object;

  prototype: {
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
  value: RuntimeValue | ((args: RuntimeValue[]) => RuntimeValue);
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

  string(s: string = ""): StringValue {
    return {
      type: "string",
      value: s,
      prototype: prototypes.string
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
      properties: new Map(Object.entries(o)),
    } as ObjectValue;
  },

  nil(): NullValue {
    return { type: "null", value: null } as NullValue;
  },

  undefined(): UndefinedValue {
    return { type: "undefined", value: undefined } as UndefinedValue;
  },

  NaN(): NaNValue {
    return { type: "NaN", value: NaN } as NaNValue;
  },

  nativeFunc(call: FunctionCall, name: string) {
    return { type: "native-fn", call, name } as NativeFNVal;
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
      prototype: prototypes.func
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

const prototypes: Record<string, PrototypeItem[]> = {
  number: [
    {
      name: "toInt",
      value: MK.nativeFunc((args: RuntimeValue[]) => {
        return MK.number(args[0].value) as RuntimeValue;
      }, "PNumber.stringify"),
    },
  ],

  func: [
    {
      name: "call",
      value(args) {
        return MK.number(args[0].value);
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
  ],
};

export const PROTO = {
  auto(n: string) {
    switch (n) {
      case "number":
        return prototypes.number;
      default:
        return null;
    }
  },
};
