import { fnDec } from "../native/func";
import { evaluateFunctionCall } from "../runtime/evaluation/eval";
import { evaluate } from "../runtime/interpreter";
import { FNVal, MK, ObjectValue, PROTO, RuntimeValue } from "../runtime/values";
import {
  ArrayLiteral,
  Expression,
  MemberExpr,
  MemberExprX,
  ReactRequirements,
  Statement,
  StringLiteral,
} from "./ast";
import { Err } from "./error";
import systemDefaults from "./sys";

export default class Environment {
  private global: boolean;
  parent?: Environment;
  variables: Map<string, RuntimeValue>;
  constants: Set<string>;
  properties: { [key: string]: any };

  constructor(
    parentENV?: Environment,
    properties: {
      [key: string]: any;
    } = {}
  ) {
    // if it doesn't have a parent element, it means it's the global scope
    this.global = !parentENV;
    this.parent = parentENV;
    this.variables = new Map();
    this.constants = new Set();
    this.properties = properties;

    // Define ALL!
    systemDefaults.scope.forEach((value, key) => {
      this.declareVar(key, value, true); // set isConstant to true...
    });

    systemDefaults.modules.forEach(
      (objectThatContainsFunctions, moduleName) => {
        if (moduleName === "@DEFAULT") {
          Object.entries(objectThatContainsFunctions).forEach((fn) => {
            let name = fn[0];
            let value = fn[1];

            if (!this.parent || !this.parent.lookupVar(name)) {
              this.declareVar(
                name,
                MK.nativeFunc(
                  (value as fnDec).body,

                  name
                )
              );
            }
          });
        } else {
          let ceejey: { [key: string]: RuntimeValue } = {};

          Object.entries(objectThatContainsFunctions).forEach((fn) => {
            let name = fn[0];
            let value = fn[1];

            switch ((value as RuntimeValue).type) {
              case "native-fn":
              case "function":
                ceejey[name] = MK.nativeFunc((value as fnDec).body, name);
                break;

              default:
                ceejey[name] = value as RuntimeValue;
            }
          });

          if (!this.parent || !this.parent.lookupVar(moduleName))
            this.declareVar(moduleName, MK.object(ceejey));
        }
      }
    );
  }

  public declareVar(
    name: string | MemberExprX,
    value: RuntimeValue,
    constant: boolean = false,
    reactive: boolean = true,
    override: boolean = false,
    equivalent?: string
  ): RuntimeValue {
    if ((name as MemberExprX).kind === "MemberExprX") {
      name = name as MemberExprX;

      // assigne...

      let env = this.resolve(name.parent.value);
      let mainObj = env.lookupVar(name.parent.value) as ObjectValue;

      if (mainObj.type === "object") {
        let properties = mainObj.properties;

        name.properties = name.properties.map((prop) => {
          if (prop.kind !== "StringLiteral") {
            console.log(env);
            console.log(this);
            return {
              kind: "StringLiteral",
              value: evaluate(prop, this).value as string,
            } as StringLiteral as Expression;
          } else return prop;
        });

        if (properties) {
          let lastone: RuntimeValue = mainObj as RuntimeValue;

          for (let i = 0; i < name.properties.length - 1; i++) {
            // BUG; it doesn't support evaluating expressions...
            // let prop = name.properties[i].value;

            let prop = evaluate(name.properties[i], env).value as string;

            if (lastone.properties?.has(prop)) {
              lastone = lastone.properties.get(prop) as RuntimeValue;
            } else {
              let obj = MK.object({});

              lastone.properties?.set(prop, obj);
              lastone = obj;
            }
          }

          lastone.properties?.set(
            name.properties[name.properties.length - 1].value,
            value
          );
        }
      } else {
        let array: RuntimeValue[] = mainObj.value;

        if (name.properties.length === 1) {
          array[evaluate(name.properties[0], this).value] = value;
        } else {
          let lastone: RuntimeValue = mainObj as RuntimeValue;

          for (let i = 0; i < name.properties.length - 1; i++) {
            // BUG; it doesn't support evaluating expressions...
            // let prop = name.properties[i].value;

            let prop = evaluate(name.properties[i], env).value as string;

            if (lastone.properties?.has(prop)) {
              lastone = lastone.properties.get(prop) as RuntimeValue;
            } else {
              let obj = MK.object({});

              lastone.properties?.set(prop, obj);
              lastone = obj;
            }
          }

          lastone.properties?.set(
            name.properties[name.properties.length - 1].value,
            value
          );
        }

        mainObj.value = array;
      }
    } else {
      let alreadyDefined = this.variables.has(name as string);

      if (alreadyDefined) {
        let env = this.resolve(name as string);
        let v = env.lookupVar(name as string);

        if (
          !override &&
          this.constants.has(name as string) &&
          name !== "@ANONYMOUS" &&
          this.lookupVar(name as string).type !== "fn"
        ) {
          throw Err(
            "TypeError",
            `Assignment to constant variable '${name as string}'`
          );
        } else {
          if (value.export) {
            // check if at the top level

            if (this.parent) {
              throw Err(
                "RuntimeError",
                "External Variable declarations must be at the top-level"
              );
            }
          }

          if (
            v.reactiveCallbacks &&
            v.reactiveCallbacks.length > 0 &&
            reactive
          ) {
            v.reactiveCallbacks.forEach((reactiveCallback) => {
              // if (reactiveCallback.isMemberExpr) {

              value.reactiveCallbacks = v.reactiveCallbacks;

              env.declareVar(name, value, false, false);

              let val = reactiveCallback.value;
              let result: RuntimeValue;

              if ((val as FNVal).body) {
                result = evaluateFunctionCall(
                  val as FNVal,
                  [
                    ...reactiveCallback.action.args.map((a) =>
                      evaluate(a, env)
                    ),
                  ],
                  env
                );
              } else result = evaluate(val as Statement, env);

              this.declareVar(
                reactiveCallback.variant.value,
                result,
                false,
                false
              );
            });
          } else {
            this.variables.set(name as string, value as RuntimeValue);
          }
        }
      } else if (typeof name === "string") {
        if (constant) {
          if (this.constants.has(name) && name !== "@ANONYMOUS") {
            throw Err("TypeError", `Assignment to constant variable '${name}'`);
          } else {
            this.constants.add(name);
          }
        }

        (value as RuntimeValue).reactiveCallbacks =
          (value as RuntimeValue).reactiveCallbacks || [];
        (value as FNVal).declarationEnv = this;

        this.variables.set(name, value as RuntimeValue);
      }
    }

    return value;
  }

  public assignVar(name: string, value: RuntimeValue): RuntimeValue {
    // env: the environment in which the var with the name {name} is defined.
    const env = this.resolve(name);

    // Cannot assign to constant
    if (env.constants.has(name)) {
      throw Err(
        "NameError",
        `Cannot reasign to variable ${name} as it was declared constant or as it's a part of the system native values`
      );
    }

    value.reactiveCallbacks = [] as ReactRequirements[];

    env.variables.set(name, value);
    return value;
  }

  // public assignNullishVar(
  //   name: string | MemberExpr,
  //   value: RuntimeValue
  // ): RuntimeValue {
  //   // env: the environment in which the var with the name {name} is defined.

  //   if (typeof name === "string") {
  //     const env = this.resolve(name);

  //     let v = env.lookupVar(name);

  //     if (this.constants.has(name) && name !== "@ANONYMOUS") {
  //       throw Err("TypeError", `Assignment to constant variable '${name}'`);
  //     } else {
  //       if ([undefined, null].includes(v.value)) {
  //         this.variables.set(name, {
  //           value,
  //           reactiveCallbacks: [] as ReactRequirements[],
  //           informations: {},
  //         });
  //       }
  //     }
  //     return [undefined, null].includes(v.value) ? value : v.value;
  //   } else return MK.nil();
  // }

  // look for value
  public lookupVar(name: string): RuntimeValue {
    // env: the environment in which the var with the name {name} is defined.

    // Add support for non-variables...
    if (typeof name !== "string") return evaluate(name, this);

    const env = this.resolve(name);

    // get the value from that environment
    return env.variables.get(name) as RuntimeValue;
  }

  public resolve(name: string): Environment {
    // if the variable is not defined (or doesn't exist) in the local scope:

    if (!this.variables.has(name)) {
      // if it has a parent, then maybe: the name is defined in it's parent scope (Ex. could be the global scope)
      if (this.parent) {
        return this.parent.resolve(name);
      }

      // else, it's not defined anywhere, so ERR!
      else {
        throw Err(
          "NameError",
          `${systemDefaults.script ? name : name.underline} is not defined`
        );
      }
    } else {
      return this;
    } // return the environment in which the variable is declared, because it exists on the Local Scope
  }
}
