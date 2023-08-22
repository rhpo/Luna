import { colorize } from "../lib/ui";
import { MK, RuntimeValue } from "../runtime/values";
import { Luna } from "../luna";

import Environment from "../lib/env";
import PromptSync from "prompt-sync";

let prompt = PromptSync();

export type fnDec = {
  name: string;
  nativeName?: string;
  body: (args: RuntimeValue[], scope: Environment) => RuntimeValue;
};

type Functions = {
  functions: fnDec[];
  nativelib: {
    exportAs: string;
    nativename?: string;
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
      nativename: "math",
      exportAs: "math",
      public: false,
      collection: [
        {
          name: "parse",
          nativeName: "Math → PARSE",
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
          nativeName: "System → IO → PRINT",

          body(args): RuntimeValue {
            console.log(args.map((arg) => colorize(arg, false, true)).join(""));

            return MK.nil();
          },
        },

        {
          name: "puts",
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

          body(args) {
            sleep(parseFloat(args[0].value));

            return MK.nil();
          },
        },

        {
          name: "time",
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
          nativeName: "System → Process → EXIT",
          body: (args, scope): RuntimeValue => {
            process.exit(0);
          },
        },
      ],
    },
  ],

  functions: [],

  variables: [
    {
      name: "unsafe",
      value: MK.object({
        import: MK.nativeFunc((args) => {
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

            if (!isDirect && nativeProp.startsWith("motherlang:")) {
              try {
                propNAT = require(nativeProp.replace("motherlang:", ""));
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
                return MK.nativeFunc(
                  (args) => {
                    return parse(propNAT(...args.map((_) => _.value)), true);
                  },
                  "NATIVE → " +
                    (isDirect ? propNAT.name : nativeProp).toUpperCase()
                );
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

                let props = Object.getOwnPropertyNames(propNAT);

                props.forEach((i) => {
                  target[i as keyof typeof target] = parse(object[i], true);
                });

                return MK.object(target);

              default:
                return MK.NaN();
            }
          }

          return parse(name?.value);
        }, "SYS_UNSAFE_IMPORT"),
      }),
    },

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
      name: "PI",
      value: MK.number(Math.PI),
    },

    {
      name: "E",
      value: MK.number(Math.E),
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
