import { colorize } from "../lib/ui";
import {
  FNVal,
  MK,
  NativeFNVal,
  ObjectValue,
  RuntimeValue,
} from "../runtime/values";
import { Luna } from "../luna";

import Environment from "../lib/env";
import PromptSync from "prompt-sync";
import { evaluateFunctionCall, stringify } from "../runtime/evaluation/eval";

let prompt = PromptSync();

export type fnDec = {
  name: string;
  nativeName?: string;
  knownas?:
    | {
        backend: string;
        web: string;
      }
    | string;
  body: (args: RuntimeValue[], scope: Environment) => RuntimeValue;
};

type Functions = {
  functions: fnDec[];
  nativelib: {
    exportAs: string;
    nativename?: string;
    knownas?: string;
    collection: fnDec[];
    variables?: {
      name: string;
      value: RuntimeValue;
    }[];
    public: boolean;
  }[];

  variables: { name: string; value: RuntimeValue }[];
};

const sleep = (i: number) => {
  var waitTill = new Date(new Date().getTime() + i);
  while (waitTill > new Date());
};

let native: Functions = {
  nativelib: [
    {
      nativename: "global",
      knownas: "globalThis",
      exportAs: "globalThis",
      public: true,
      collection: [
        {
          name: "length",
          knownas: "(i) => i.length",
          nativeName: "globalThis → LENGTH",
          body: (args: RuntimeValue[]): RuntimeValue => {
            switch (args[0]?.type) {
              case "string":
                return MK.number(args[0].value.length);
              case "array":
                return MK.number(args[0].value.length);
              case "object":
                return MK.number(Object.keys(args[0].value).length);
              case "number":
                return MK.number(args[0].value);
              case "boolean":
                return MK.number(args[0].value ? 1 : 0);
              case "null":
              case "undef":
                return MK.number(0);
              default:
                return MK.number(-1);
            }
          },
        },

        {
          name: "keys",
          knownas: "(i) => Object.keys(i)",
          nativeName: "globalThis → KEYS",

          body: (args: RuntimeValue[]): RuntimeValue => {
            switch (args[0]?.type) {
              case "object":
                return MK.array(
                  Array.from((args[0] as ObjectValue).properties.keys()).map(
                    (a) => MK.string(a)
                  )
                );
              default:
                return MK.array([]);
            }
          },
        },

        {
          name: "src",
          knownas: "(i) => null",

          nativeName: "globalThis → SRC",

          body: (args: RuntimeValue[]): RuntimeValue => {
            let func = args[0] as FNVal;

            if (func.type != "fn") return MK.nil();
            else {
              return MK.string(
                (func.export ? "out ".green : "") +
                  "fn ".magenta +
                  func.name.blue +
                  func.parameters.map((a) => a.assigne.value).join(" ").green +
                  "{".grey +
                  "\n" +
                  func.body.map((a) => "  " + stringify(a)).join("\n") +
                  "\n" +
                  "}".grey
              );
            }
          },
        },
      ],
    },
    {
      nativename: "math",
      knownas: "Math",
      exportAs: "math",
      public: false,
      collection: [
        {
          name: "parse",
          nativeName: "Math → PARSE",
          knownas: "parseInt",
          body: (args: RuntimeValue[]): RuntimeValue => {
            try {
              return MK.number(parseFloat(args[0].value?.toString()));
            } catch {
              return MK.NaN();
            }
          },
        },

        {
          name: "int",
          knownas: "parseInt",
          nativeName: "Math → INT",
          body: (args: RuntimeValue[]): RuntimeValue => {
            try {
              return MK.number(parseInt(args[0].value?.toString()));
            } catch {
              return MK.NaN();
            }
          },
        },

        {
          name: "float",
          nativeName: "Math → FLOAT",
          body: (args: RuntimeValue[]): RuntimeValue => {
            try {
              return MK.number(parseFloat(args[0].value?.toString()));
            } catch {
              return MK.NaN();
            }
          },
        },

        {
          name: "cos",
          nativeName: "Math → cos",
          body: (args) => {
            return MK.number(Math.cos(args[0].value || undefined));
          },
        },

        {
          name: "sin",
          nativeName: "Math → sin",
          body: (args: RuntimeValue[]) => {
            return MK.number(Math.sin(args[0].value || undefined));
          },
        },

        {
          name: "is_nan",
          nativeName: "Math → IS_NAN",
          body: (args, scope): RuntimeValue => {
            return MK.bool(isNaN(args[0]?.value));
          },
        },
      ],

      variables: [
        {
          name: "pi",
          value: MK.number(Math.PI),
        },
      ],
    },

    {
      nativename: "io",
      exportAs: "@DEFAULT",
      public: true,

      collection: [
        {
          name: "print",
          knownas: "console.log",
          nativeName: "System → IO → PRINT",

          body(args): RuntimeValue {
            console.log(args.map((arg) => colorize(arg, false, true)).join(""));

            return MK.undefined();
          },
        },

        {
          name: "puts",
          knownas: {
            backend: "process.stdout.write",
            web: "console.log",
          },
          nativeName: "System → IO → PUTS",

          body(args): RuntimeValue {
            let string = args
              .map((arg) => colorize(arg, false, true))
              .join(" ");
            process.stdout.write(string);

            return MK.nil();
          },
        },

        {
          name: "input",
          nativeName: "System → IO → input",
          knownas: {
            backend: "require('prompt-sync')()",
            web: "prompt",
          },
          body: (args, scope): RuntimeValue => {
            try {
              return MK.string(prompt(args[0].value?.toString()));
            } catch {
              return MK.string("");
            }
          },
        },
      ],
    },

    {
      nativename: "time",
      exportAs: "@DEFAULT",
      public: false,

      collection: [
        {
          name: "sleep",
          nativeName: "System → Time → SLEEP",
          knownas: `function sleep(ms) {
                var waitTill = new Date(new Date().getTime() + ms);
                while (waitTill > new Date());
                return true;
              }`,

          body(args) {
            sleep(parseFloat(args[0].value));

            return MK.nil();
          },
        },

        {
          name: "time",
          knownas: "performance.now",
          nativeName: "System → Time → TIME",
          body: (): RuntimeValue => {
            return MK.number(performance.now());
          },
        },
      ],
    },

    {
      nativename: "unsafe",
      exportAs: "unsafe",
      public: true,

      collection: [
        {
          name: "eval",
          nativeName: "Unsafe → EVALUATE",
          body: (args, scope): RuntimeValue => {
            let luna = new Luna();

            let result;

            try {
              result = luna.evaluate(args[0]?.value.toString() || "");
            } catch (e) {
              console.log(e);
            }

            return result || MK.undefined();
          },
        },
      ],
    },

    {
      nativename: "process",
      exportAs: "process",
      public: true,

      collection: [
        {
          name: "exit",
          knownas: {
            backend: "process.exit",
            web: "() => try { window.close() } catch {}",
          },
          nativeName: "System → Process → EXIT",
          body: (args, scope): RuntimeValue => {
            process.exit(0);
          },
        },

        {
          name: "argv",
          knownas: {
            backend:
              "() => process.argv.slice(process.argv[0] === 'node' ? 2 : 1)",
            web: "() => [window.location.href]",
          },
          nativeName: "System → Process → GET_ARGV",
          body: (args, scope): RuntimeValue => {
            return MK.array(
              typeof process !== "undefined"
                ? process.argv
                    .slice(process.argv[0] === "node" ? 2 : 1)
                    .map((a) => MK.string(a))
                : []
            );
          },
        },
      ],
    },

    {
      nativename: "string",
      exportAs: "string",
      public: false,

      collection: [
        {
          name: "trim",
          nativeName: "String → TRIM",
          body: (args, scope): RuntimeValue => {
            try {
              return MK.string(args[0].value?.toString().trim());
            } catch {
              return MK.string("");
            }
          },
        },

        {
          name: "split",
          nativeName: "String → SPLIT",
          body: (args, scope): RuntimeValue => {
            try {
              return MK.array(
                args[0].value
                  ?.toString()
                  .split(args[1]?.value?.toString() || "")
                  .map((a: any) => MK.string(a))
              );
            } catch {
              return MK.array([]);
            }
          },
        },

        {
          name: "join",
          nativeName: "String → JOIN",
          body: (args, scope): RuntimeValue => {
            try {
              return MK.string(
                args[0].value
                  ?.toString()
                  .split(args[1]?.value?.toString() || "")
                  .join(args[2]?.value?.toString() || "")
              );
            } catch {
              return MK.string("");
            }
          },
        },

        {
          name: "replace",
          nativeName: "String → REPLACE",
          body: (args, scope): RuntimeValue => {
            try {
              return MK.string(
                args[0].value
                  ?.toString()
                  .replace(
                    args[1]?.value?.toString() || "",
                    args[2]?.value?.toString() || ""
                  )
              );
            } catch {
              return MK.string("");
            }
          },
        },

        {
          name: "includes",
          nativeName: "String → INCLUDES",
          body: (args, scope): RuntimeValue => {
            try {
              return MK.bool(
                args[0].value
                  ?.toString()
                  .includes(args[1]?.value?.toString() || "")
              );
            } catch {
              return MK.bool(false);
            }
          },
        },

        {
          name: "charAt",
          nativeName: "String → CHAR_AT",
          body: (args, scope): RuntimeValue => {
            try {
              return MK.string(
                args[0].value?.toString().charAt(args[1]?.value || 0)
              );
            } catch {
              return MK.string("");
            }
          },
        },

        {
          name: "charCodeAt",
          nativeName: "String → CHAR_CODE_AT",
          body: (args, scope): RuntimeValue => {
            try {
              return MK.number(
                args[0].value?.toString().charCodeAt(args[1]?.value || 0)
              );
            } catch {
              return MK.number(0);
            }
          },
        },

        {
          name: "at",
          nativeName: "String → AT",
          body: (args, scope): RuntimeValue => {
            try {
              return MK.string(
                args[0].value?.toString().at(args[1]?.value || 0)
              );
            } catch {
              return MK.string("");
            }
          },
        },
      ],
    },

    {
      nativename: "array",
      exportAs: "array",
      public: false,

      collection: [
        {
          name: "filter",
          nativeName: "globalThis → FILTER",
          knownas: "(arr, fn) => arr.filter(fn)",
          body: (args: RuntimeValue[]): RuntimeValue => {
            let array = args[0];
            let fn = args[1] as NativeFNVal | FNVal;

            if (
              array.type !== "array" ||
              !fn ||
              (fn.type !== "fn" && (fn as any).type !== "native-fn")
            ) {
              return MK.undefined();
            } else {
              if ((fn as FNVal).type === "fn") {
                let i = 0;

                let result = [];

                while (i < array.value.length) {
                  let v = array.value[i];

                  let r = evaluateFunctionCall(
                    fn as FNVal,
                    [v, MK.number(i)],
                    (fn as FNVal).declarationEnv
                  );

                  if (r.value) {
                    result.push(v);
                  }

                  i++;
                }

                return MK.array(result);
              } else {
                let i = 0;

                let result = [];

                while (i < array.value.length) {
                  let v = array.value[i];

                  let r = (fn as NativeFNVal).call(
                    [v, MK.number(i)],
                    new Environment()
                  );

                  if (r.value) {
                    result.push(r);
                  }

                  i++;
                }

                return MK.array(result);
              }
            }
          },
        },

        // map
        {
          name: "map",
          nativeName: "globalThis → MAP",
          knownas: "(arr, fn) => arr.map(fn)",
          body: (args: RuntimeValue[]): RuntimeValue => {
            let array = args[0];
            let fn = args[1] as FNVal | NativeFNVal;

            if (
              array.type !== "array" ||
              !fn ||
              (fn.type !== "fn" && (fn as any).type !== "native-fn")
            ) {
              return MK.undefined();
            } else {
              if ((fn as FNVal).type === "fn") {
                let i = 0;

                let result = [];

                while (i < array.value.length) {
                  let v = array.value[i];

                  let r = evaluateFunctionCall(
                    fn as FNVal,
                    [v, MK.number(i)],
                    (fn as FNVal).declarationEnv
                  );

                  result.push(r);

                  i++;
                }

                return MK.array(result);
              } else {
                let i = 0;

                let result = [];

                while (i < array.value.length) {
                  let v = array.value[i];

                  let r = (fn as NativeFNVal).call(
                    [v, MK.number(i)],
                    new Environment()
                  );

                  result.push(r);

                  i++;
                }

                return MK.array(result);
              }
            }
          },
        },

        {
          name: "each",
          nativeName: "globalThis → EACH",
          knownas: "(arr, fn) => arr.forEach(fn)",
          body: (args: RuntimeValue[]): RuntimeValue => {
            let array = args[0];
            let fn = args[1] as FNVal;

            if (!array || array.type !== "array" || !fn || fn.type !== "fn") {
              return MK.undefined();
            } else {
              let i = 0;

              while (i < array.value.length) {
                let v = array.value[i];

                evaluateFunctionCall(fn, [v, MK.number(i)], fn.declarationEnv);

                i++;
              }

              return MK.undefined();
            }
          },
        },

        {
          name: "add",
          knownas: "(arr, val) => arr.concat(val)",
          nativeName: "Array → ADD",
          body: (args, scope): RuntimeValue => {
            try {
              let array = args[0];
              if (!array || array.type !== "array") return MK.undefined();

              array.value.push(args[1] || "");

              return array;
            } catch {
              return MK.array([]);
            }
          },
        },

        // each(array, fn)
        {
          name: "each",
          nativeName: "Array → EACH",
          knownas: "(arr, fn) => arr.forEach(fn)",
          body: (args, scope): RuntimeValue => {
            let array = args[0];
            let fn = args[1] as FNVal;

            if (!array || array.type !== "array" || !fn || fn.type !== "fn") {
              return MK.undefined();
            } else {
              let i = 0;

              while (i < array.value.length) {
                let v = array.value[i];

                console.log(fn.declarationEnv);
                evaluateFunctionCall(
                  fn,
                  [v, MK.number(i)],
                  fn.declarationEnv || scope
                );

                i++;
              }

              return MK.undefined();
            }
          },
        },

        {
          name: "pop",
          knownas: "(arr) => arr.pop()",
          nativeName: "Array → POP",
          body: (args, scope): RuntimeValue => {
            try {
              return MK.array(args[0].value?.pop() || []);
            } catch {
              return MK.array([]);
            }
          },
        },

        // cut(array, start, end)
        {
          name: "cut",
          nativeName: "Array → CUT",
          knownas: "(arr, start, end) => arr.slice(start, end)",
          body: (args, scope): RuntimeValue => {
            try {
              return MK.array(
                args[0].value?.slice(args[1]?.value, args[2]?.value) || []
              );
            } catch {
              return MK.array([]);
            }
          },
        },

        // join(array, separator)
        {
          name: "join",
          nativeName: "Array → JOIN",
          knownas: "(arr, separator) => arr.join(separator)",
          body: (args, scope): RuntimeValue => {
            try {
              return MK.string(
                args[0].value
                  .map((i: any) => i.value)
                  .join(args[1]?.value?.toString() || "")
              );
            } catch {
              return MK.string("");
            }
          },
        },
      ],
    },

    {
      nativename: "mother",
      exportAs: "mother",
      public: false,

      collection: [
        {
          name: "name",
          nativeName: "Mother → name",
          body: (args, scope): RuntimeValue => {
            return MK.string("node");
          },
        },
        {
          name: "import",
          nativeName: "Mother → import",
          knownas: {
            backend: `function (str) {
              if (str.startsWith("pkg:")) {
                try {
                  return require(str.replace("pkg:", ""));
                } catch {
                  return undefined;
                }
              }

              else return eval(str);
            }`,
            web: `function (str) {
              if (!str.startsWith("pkg:")) {
                try {
                  return eval(str);
                  } catch {
                    return undefined;
                  }
                }
              else return undefined;
            }`,
          },
          body: (args, scope): RuntimeValue => {
            let name = args[0];

            if (!name || !name?.value) {
              return MK.nil();
            }

            function parse(
              nativeProp: string,
              isDirect: boolean = false
            ): RuntimeValue {
              let propNAT = isDirect
                ? nativeProp
                : globalThis[nativeProp as keyof typeof globalThis];

              if (typeof nativeProp === "string" && nativeProp.includes(".")) {
                let props = nativeProp.split(".");

                let obj = globalThis[props[0] as keyof typeof globalThis];

                if (!obj) return MK.undefined();

                for (let i = 1; i < props.length; i++) {
                  obj = obj[props[i] as keyof typeof obj];

                  if (!obj) return MK.undefined();
                }

                return parse(obj, true);
              }

              isDirect = typeof nativeProp !== "string";

              if (!isDirect && nativeProp.startsWith("pkg:")) {
                try {
                  propNAT = require(nativeProp.replace("pkg:", ""));
                } catch {}
              }

              switch (typeof propNAT) {
                case "undefined":
                  return MK.undefined();
                case "bigint":
                case "number":
                  return MK.number(propNAT as number);
                case "boolean":
                  return MK.bool(propNAT);
                case "function":
                  let keys = Object.keys(propNAT);
                  let fn = MK.nativeFunc((args) => {
                    if (typeof propNAT === "function") {
                      let f = propNAT(...args.map((_) => _.value));

                      return parse(f, true);
                    } else return MK.undefined();
                  }, "NATIVE → " + (isDirect ? propNAT.name : nativeProp).toUpperCase());

                  if (keys.length === 0) return fn;
                  else {
                    keys.forEach((key) => {
                      let prop = propNAT[key];

                      fn.prototypes = fn.prototypes || {};

                      fn.prototypes[key] = parse(prop, true);
                    });

                    return fn;
                  }
                case "string":
                  return MK.string(propNAT);
                case "object":
                  let object = propNAT;
                  let target: {
                    [key: string]: RuntimeValue;
                  } = {};

                  if ([null, undefined].includes(propNAT)) return MK.nil();

                  if (Array.isArray(propNAT)) {
                    const obj = {};
                    for (let i = 0; i < propNAT.length; i++) {
                      object[i] = parse(propNAT[i], false);
                    }

                    return MK.object(obj);
                  }

                  let getKeys = function (obj: any) {
                    let keysArr = [];
                    for (var key in obj) {
                      keysArr.push(key);
                    }
                    return keysArr;
                  };

                  let alternateWay = function (obj: any) {
                    return Object.getOwnPropertyNames(obj);
                  };

                  let props = getKeys(object);

                  if (props.length === 0) {
                    props = alternateWay(object);
                  }

                  props.forEach((i) => {
                    let obj;

                    try {
                      obj = object[i];
                    } catch {
                      obj = Object.getOwnPropertyDescriptor(object, i)?.value;
                    }

                    target[i as keyof typeof target] = parse(obj, true);
                  });

                  return MK.object(target);

                default:
                  console.log("Unknown Native Property".green);
                  return MK.NaN();
              }
            }

            return parse(name?.value);
          },
        },
      ],
    },
  ],

  functions: [],

  variables: [
    {
      name: "true",
      value: MK.bool(true),
    },

    {
      name: "false",
      value: MK.bool(false),
    },

    {
      name: "null",
      value: MK.nil(),
    },

    {
      name: "NaN",
      value: MK.NaN(),
    },

    {
      name: "infinity",
      value: MK.number(Infinity),
    },

    {
      name: "__envScript",
      value: MK.bool(
        !(
          typeof process !== "undefined" &&
          process.release &&
          process.release.name === "node"
        )
      ),
    },
  ],
};

export default native;
