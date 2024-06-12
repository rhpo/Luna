import colors from "colors";
import PATH from "node:path";
import fs from "node:fs";
import os from "node:os";
import {
  ActionAssignmentExpr,
  ArrayLiteral,
  AssignmentExpr,
  BinaryExpr,
  CallExpr,
  DebugStatement,
  EqualityExpr,
  Expression,
  ForStatement,
  FunctionDeclaration,
  IFStatement,
  Identifier,
  Import,
  InequalityExpr,
  IsDefExpression,
  LogicalExpr,
  MemberExpr,
  MemberExprX,
  NullishAssignmentExpression,
  NumericLiteral,
  NumericalAssignmentExpression,
  ObjectLiteral,
  Program,
  StringLiteral,
  TapStatement,
  TernaryExpr,
  TypeofExpr,
  UnaryExpr,
  UseStatement,
  WhileStatement,
} from "../../lib/ast";
import Environment from "../../lib/env";
import { Err } from "../../lib/error";
import { Luna, createContext } from "../../luna";
import { evaluate } from "../interpreter";
import {
  ArrayValue,
  FNVal,
  MK,
  NativeFNVal,
  ObjectValue,
  PROTO,
  RuntimeValue,
} from "../values";
import { colorize } from "../../lib/ui";

import systemDefaults from "./../../lib/sys";
import sys from "./../../lib/sys";

let originalPath = "./";

export function evalulateProgram(
  program: Program,
  env: Environment,
  origin?: string
): RuntimeValue {
  if (origin) {
    originalPath = origin;
  }

  let lastEvaluated: RuntimeValue = MK.nil();

  for (const statement of program.body) {
    lastEvaluated = evaluate(statement, env);
  }

  return lastEvaluated;
}

export function evalNumericBE(
  arg0: number,
  arg1: number,
  operator: string
): RuntimeValue {
  let result = 0;

  switch (operator) {
    case "+":
      result = arg0 + arg1;
      break;

    case "-":
      result = arg0 - arg1;
      break;

    case "*":
      result = arg0 * arg1;
      break;

    case "/":
      // if (arg1 === 0) {
      //   throw Err("MathError", "Division by ZERO, which is impossible.");
      // }
      result = arg0 / arg1;
      break;

    case "%":
      result = arg0 % arg1;
      break;

    case "^":
    case "**":
      result = arg0 ** arg1;
      break;
  }

  return MK.number(result);
}

export function evalLogicalBE(
  arg0: number,
  arg1: number,
  operator: string
): RuntimeValue {
  let result = 0;

  switch (operator) {
    case "&":
      result = arg0 & arg1;
      break;

    case "|":
      result = arg0 | arg1;
      break;

    case ">>":
      result = arg0 >> arg1;
      break;

    case "<<":
      result = arg0 << arg1;
      break;
  }

  return MK.number(result);
}

export function evaluateEqualityExpression(
  binOp: EqualityExpr,
  env: Environment
): RuntimeValue {
  const leftHS = evaluate(binOp.left, env);
  const rightHS = evaluate(binOp.right, env);

  return evalEQ(leftHS.value, rightHS.value, binOp.operator);
}
export function evalEQ(
  arg0: number,
  arg1: number,
  operator: string
): RuntimeValue {
  let result = false;

  switch (operator) {
    case "==":
      result = arg0 == arg1;
      break;
    case "!=":
      result = arg0 != arg1;
      break;
  }

  return MK.bool(result);
}

export function evalLogicalExpression(
  binOp: LogicalExpr,
  env: Environment
): RuntimeValue {
  const leftHS = evaluate(binOp.left, env);

  if (leftHS.value) {
    const rightHS = evaluate(binOp.right, env);

    return evalLE(leftHS.value, rightHS.value, binOp.operator);
  } else return leftHS;
}
export function evalLE(
  arg0: number,
  arg1: number,
  operator: string
): RuntimeValue {
  let result: any;

  switch (operator) {
    case "&&":
      result = arg0 && arg1;
      break;

    case "||":
      result = arg0 || arg1;
      break;
  }

  let type = typeof result;

  switch (type) {
    case "number":
      return MK.number(result);

    case "boolean":
      return MK.bool(result);

    case "string":
      return MK.string(result);

    case "object":
      if (result == null) return MK.nil();
      return MK.object(result);
  }

  return result;
}

export function evalulateInequalityExpression(
  binOp: InequalityExpr,
  env: Environment
): RuntimeValue {
  const leftHS = evaluate(binOp.left, env);
  const rightHS = evaluate(binOp.right, env);

  if (leftHS.type == "number" && rightHS.type === "number") {
    return evalINEQ(leftHS.value, rightHS.value, binOp.operator);
  } else {
    throw Err(
      "ValueError",
      `Cannot compare inequalities of hand sides: '${leftHS.type}' ${binOp.operator} '${rightHS.type}'`
    );
  }

  // return MK.NaN();
}
export function evalINEQ(
  arg0: number,
  arg1: number,
  operator: string
): RuntimeValue {
  let result = false;

  switch (operator) {
    case "<":
      result = arg0 < arg1;
      break;

    case ">":
      result = arg0 > arg1;
      break;

    case "<=":
      result = arg0 <= arg1;
      break;

    case ">=":
      // if (arg1 === 0) {
      //   throw Err("MathError", "Division by ZERO, which is impossible.");
      // }
      result = arg0 >= arg1;
      break;
  }

  return MK.bool(result);
}

export function evaluateBinExpression(
  binOp: BinaryExpr,
  env: Environment
): RuntimeValue {
  const leftHS = evaluate(binOp.left, env);
  const rightHS = evaluate(binOp.right, env);

  let operator = binOp.operator;

  if (leftHS.type == "number" && rightHS.type === "number") {
    if (!["<<", ">>", "&", "|"].includes(operator)) {
      return evalNumericBE(leftHS.value, rightHS.value, operator);
    } else return evalLogicalBE(leftHS.value, rightHS.value, operator);
  } else if (leftHS.type === "string" && rightHS.type === "number") {
    switch (operator) {
      case "*":
        if (rightHS.value > 0 && rightHS.value !== Infinity) {
          return MK.string(leftHS.value.repeat(rightHS.value));
        } else throw Err("ArgError", "Invalid string repeat count");

      case "-":
        return MK.string(leftHS.value.slice(0, -rightHS.value));

      case "+":
        return MK.string(leftHS.value.toString() + rightHS.value.toString());

      default:
        throw Err(
          "OperationError",
          `Invalid operation type: ${leftHS.type} ${operator} ${rightHS.type}`
        );
    }
  } else if (
    leftHS.type === "string" ||
    (rightHS.type === "string" && operator === "+")
  ) {
    return MK.string(leftHS.value.toString() + rightHS.value?.toString() || "");
  }

  return MK.undefined();
}

export function evaluateTypeof(type: TypeofExpr, env: Environment) {
  let value = evaluate(type.value, env);

  return MK.string(value.type);
}

export function evaluateIsDef(variable: Expression, env: Environment) {
  let result = MK.bool(true);

  try {
    if (variable.value.kind === "MemberExprX") {
      result = MK.bool(evaluate(variable.value, env).type !== "undef");
    } else if (variable.value.kind === "Identifier") {
      result = MK.bool(env.lookupVar(variable.value).type !== "undef");
    } else
      throw Err("TypeError", `Cannot check if '${variable.value}' is defined`);
  } catch {
    result = MK.bool(false);
  }

  return result;
}

export function evaluateIdentifier(
  arg0: Identifier,
  env: Environment
): RuntimeValue {
  return env.lookupVar(arg0.value);
}

export function evaluateArray(array: ArrayLiteral, env: Environment) {
  let arr = MK.array(array.elements.map((v) => evaluate(v, env)));

  return arr;
}

export function evaluateString(
  arg0: StringLiteral,
  env: Environment
): RuntimeValue {
  function replaceNestedVariables(str: string): string {
    let result = "";
    let isNested = false;
    let isEscaped = false;
    let variable = "";

    for (let i = 0; i < str.length; i++) {
      const char = str[i];

      if (char === "{") {
        if (!isEscaped) {
          isNested = true;
          variable = "";
        }
        isEscaped = false;
      } else if (char === "}") {
        if (isNested && !isEscaped) {
          let lunaSBX = new Luna(env);
          result +=
            evaluate(lunaSBX.produceAST(variable), env).value.toString() || "";
          isNested = false;
          variable = "";
          continue;
        }
        isEscaped = false;
      } else if (char === "\\") {
        isEscaped = !isEscaped;
      } else {
        if (isNested) {
          variable += char;
        } else {
          result += char;
        }
        isEscaped = false;
      }
    }

    return result;
  }

  return MK.string(replaceNestedVariables(arg0.value));
}

export function resolveExports(
  program: Program,
  env: Environment,
  origin: string
): Map<string, RuntimeValue> {
  let collector = new Environment(env);
  evalulateProgram(program, collector, origin);

  return new Map(
    [...collector.variables.entries()].filter(([_key, value]) => {
      if (
        value.type === "fn" ||
        value.type === "native-fn" ||
        value.type === "function"
      ) {
        (value as FNVal).declarationEnv = collector;
      }
      return value.export;
    })
  );
}

export function evaluateUseStatement(
  statement: UseStatement,
  env: Environment
): RuntimeValue {
  let imports = statement.imports;
  let path = statement.path.value;

  let code = "";
  let tempPath = originalPath;

  if (!path.startsWith(sys.name.toLowerCase() + ":")) {
    if (!path.endsWith(".ln") && !path.endsWith(".lnx")) {
      path += fs.existsSync(path + ".ln")
        ? ".ln"
        : fs.existsSync(path + ".lnx")
        ? ".lnx"
        : ".ln";
    }

    let pathDetails = PATH.parse(path);

    let fileName = pathDetails.base;
    let fileDir = pathDetails.dir;
    if (!fileDir) fileDir = "./";

    tempPath = originalPath;
    originalPath = PATH.join(originalPath, fileDir);
    let finalPath = PATH.join(originalPath, fileName);

    function isFile(path: string): boolean {
      try {
        const stats = fs.statSync(path);
        return stats.isFile();
      } catch (error) {
        // Handle errors, such as if the path does not exist
        return false;
      }
    }

    if (!fs.existsSync(finalPath) || !isFile(finalPath)) {
      throw Err(
        "FSError",
        `Cannot find file ${fileName.underline} inside '${finalPath}'`
      );
    }

    code = fs.readFileSync(finalPath, "utf-8").toString();
  } else {
    let module = path.replace(sys.name.toLowerCase() + ":", "") + ".lnx";

    if (!sys.script) {
      let homedir = os.homedir();

      let finalPath = PATH.join(
        homedir,
        "Documents",
        `${sys.name.toLowerCase()}-core`,
        `v${sys.version}`,
        "modules",
        module
      );

      if (process.platform === "linux" || process.platform === "darwin") {
        finalPath = PATH.join(
          homedir,
          `${sys.name.toLowerCase()}-core`,
          `v${sys.version}`,
          "modules",
          module
        );
      }

      if (fs.existsSync(finalPath)) {
        code = fs.readFileSync(finalPath, "utf-8").toString();
      } else {
        throw Err(
          "FSError",
          `Cannot find module '${module}', please install the latest modules for version='${
            sys.version
          }', or use the '${sys.name.toLowerCase()} install <module>' command to install the latest modules.`
        );
      }
    } else {
      throw Err("UnsupportedError", `Cannot use modules in script mode`);
    }
  }

  let childEnv = new Environment(env);

  try {
    let ast = new Luna().produceAST(code);

    let variables = resolveExports(ast, env, originalPath);

    if (Array.isArray(imports)) {
      imports.forEach((i) => {
        let { name, alternative } = i;

        let variable = variables.get(name.value);

        if (!variable) {
          throw Err(
            "ModuleError",
            `'${
              name.value
            }' is not exported by the module '${statement.path.value.replace(
              sys.name.toLowerCase() + ":",
              ""
            )}'`
          );
        }

        if (variable.type === "fn" || variable.type === "native-fn") {
          (variable as FNVal).declarationEnv = childEnv;
          env.parent = childEnv;
        }

        env.declareVar(alternative.value, variable, false, false, true);
        childEnv.declareVar(alternative.value, variable, false, false, true);
      });
    } else {
      let module = MK.object(Object.fromEntries(variables));

      env.declareVar(imports.value, module, false, true);
    }

    originalPath = tempPath;

    return MK.void();
  } catch (e) {
    throw e + "\n  at → ".blue + originalPath;
  }
}

export function evaluateTernaryExpr(
  expression: TernaryExpr,
  env: Environment
): RuntimeValue {
  let condition = evaluate(expression.condition, env).value;

  return condition
    ? evaluate(expression.consequent, env)
    : evaluate(expression.alternate, env);
}

var p = 0;

export function evaluateObjectExpression(
  object: ObjectLiteral,
  env: Environment
): RuntimeValue {
  p++;
  const result = MK.object({}) as ObjectValue;

  for (const { key, value, id, reactiveCBExpr } of object.properties) {
    let runtimeVal = evaluate(value, env);
    const action = reactiveCBExpr;

    if (action) {
      switch (action.name) {
        case "const":
          runtimeVal.informations.constant = true;
          break;

        case "var":
          runtimeVal.informations.constant = false;
          break;

        case "react":
          if ((runtimeVal as FNVal).body) {
            runtimeVal = evaluateFunctionCall(
              runtimeVal as FNVal,
              [...action.args.map((i) => evaluate(i, env)), MK.nil()],
              env
            );
          }

          reactiveCBExpr.args.forEach((arg) => {
            let i = env.lookupVar(arg.value);

            i.reactiveCallbacks?.push({
              variant: object,
              variantID: id,
              objectID: p,
              env,
              action: action,
              value,

              isMemberExpr: true,
            });

            env.declareVar(arg.value, i, false, false);
          });

          break;

        default:
          throw Err("SyntaxError", `Unknown action: ${action.name}`);
      }
    }

    result.properties.set(key, runtimeVal);
  }

  return result;
}

export function stringify(expr: Expression): string {
  switch (expr.kind) {
    case "BinaryExpr":
      let binExpr = expr as BinaryExpr;
      return (
        stringify(binExpr.left) +
        " " +
        binExpr.operator +
        " " +
        stringify(binExpr.right)
      );

    case "IsDefExpression":
      return "isdef " + stringify((expr as IsDefExpression).value);

    case "Identifier":
      return (expr as Identifier).value;

    case "MemberExprX":
      return (
        (expr as MemberExprX).parent.value +
        "." +
        (expr as MemberExprX).properties.map((k) => k.value).join(".")
      );

    case "StringLiteral":
      return '"' + (expr as StringLiteral).value + '"';

    case "NullLiteral":
      return "null";

    case "UndefinedLiteral":
      return "undefined";

    case "NumericLiteral":
      return (expr as NumericLiteral).value.toString();

    case "CallExpr":
      let cExpr = expr as CallExpr;
      return (
        stringify(cExpr.caller) +
        `(${cExpr.args.map((e) => stringify(e)).join(", ")})`
      );

    case "DebugStatement":
      return (
        "debug " +
        (expr as DebugStatement).props.map((e) => stringify(e)).join(", ")
      );

    case "FunctionDeclaration":
      let fn = expr as FunctionDeclaration;
      return (
        (fn.name === "@ANONYMOUS" ? "lambda" : "fn" + fn.name) +
        " " +
        fn.parameters.map((param) => param.assigne).join(" ") +
        " { \n" +
        fn.body.map((prop) => "  " + stringify(prop)).join("\n") +
        "\n}"
      );

    case "AssignmentExpr":
      return (
        stringify((expr as AssignmentExpr).assigne) +
        " = " +
        stringify((expr as AssignmentExpr).value)
      );

    case "ActionAssignmentExpr":
      return (
        stringify((expr as ActionAssignmentExpr).assigne) +
        `: ${(expr as ActionAssignmentExpr).action.name}${
          (expr as ActionAssignmentExpr).action.args
            ? "<" +
              (expr as ActionAssignmentExpr).action.args
                .map((e) => stringify(e))
                .join(", ") +
              ">"
            : ""
        } = ` +
        stringify((expr as ActionAssignmentExpr).value)
      );

    case "ReturnExpr":
      return "return " + stringify((expr as any).value);

    case "ObjectLiteral":
      return (
        "{" +
        (expr as ObjectLiteral).properties
          .map((prop) => stringify(prop))
          .join(", ") +
        "}"
      );

    case "ArrayLiteral":
      return (
        "[" +
        (expr as ArrayLiteral).elements.map((prop) => stringify(prop)) +
        "]"
      );

    case "WhileStatement":
      return (
        "while " +
        stringify((expr as WhileStatement).test) +
        " { \n" +
        (expr as WhileStatement).consequent
          .map((prop) => "  " + stringify(prop))
          .join("\n") +
        "\n}"
      );

    case "ForStatement":
      return (
        "for " +
        stringify((expr as ForStatement).declaration) +
        " " +
        stringify((expr as ForStatement).test) +
        " " +
        stringify((expr as ForStatement).increaser) +
        " { \n" +
        (expr as ForStatement).body.map((prop) => stringify(prop)).join("\n") +
        "\n}"
      );

    case "IfStatement":
      return (
        "if " +
        stringify((expr as IFStatement).test) +
        " { \n" +
        (expr as IFStatement).consequent
          .map((prop) => "  " + stringify(prop))
          .join("\n") +
        "\n}"
      );

    case "UnaryExpr":
      return (
        (expr as UnaryExpr).operator + stringify((expr as UnaryExpr).value)
      );

    case "UseStatement":
      return "use " + stringify((expr as UseStatement).path) + " as ...\n";

    case "InequalityExpr":
      return (
        stringify((expr as InequalityExpr).left) +
        " " +
        (expr as InequalityExpr).operator +
        " " +
        stringify((expr as InequalityExpr).right)
      );

    default:
      return JSON.stringify(expr, null, 3);
  }
}

export function evaluateDebugStatement(
  expression: DebugStatement,
  env: Environment
): RuntimeValue {
  let lastValue: RuntimeValue = MK.undefined();

  expression.props.forEach((prop) => {
    lastValue = evaluate(prop, env);

    if (!systemDefaults.script) {
      console.log(
        colors.bgYellow(stringify(prop).red) + ": " + colorize(lastValue)
      );
    } else console.warn(stringify(prop) + ":" + lastValue);
  });

  // return lastValue; This is confusing for people, so I'm removing it.
  return MK.void();
}

export function evaluateCallExpr(
  expression: CallExpr,
  env: Environment
): RuntimeValue {
  let args = expression.args.map((arg) => {
    return evaluate(arg, env);
  });

  const fn = evaluate(expression.caller, env);

  if (fn.owner) {
    args = [fn.owner, ...args];
  }

  if (fn.type == "native-fn") {
    let result = (fn as NativeFNVal).call(args, env);
    return result;
  } else if (fn.type === "fn") {
    let f = fn as FNVal;

    const fnScope = new Environment(f.declarationEnv || env, {
      in: "function",
    });

    fnScope.declareVar(f.name, f, false, false);
    for (var i = 0; i < f.parameters.length; i++) {
      const variable = f.parameters[i];

      fnScope.declareVar(
        variable.assigne as any as string,
        args[i] || evaluate(variable.value, env),
        false
      );
    }

    let result: RuntimeValue = MK.undefined();

    for (const state of f.body) {
      result = evaluate(state, fnScope);

      if (result.type === "return") {
        return result.value;
      }
    }

    return result;
  } else {
    if (expression.caller.kind === "MemberExprX") {
      let caller = expression.caller as MemberExprX;

      let s = "";

      if (caller.properties) {
        s = caller.properties.map((x) => x.value).join(".");
      }

      throw Err(
        "RefError",
        `'${caller.parent.value}${s !== "" ? "." + s : ""}' is not a function`
      );
    } else {
      let who =
        typeof expression.caller.value !== "object"
          ? expression.caller.value
          : stringify(expression.caller);
      throw Err("RefError", `'${who || fn.type}' is not a function`);
    }
  }
}

export function evaluateFunctionCall(
  expression: FNVal | NativeFNVal,
  args: RuntimeValue[],
  env: Environment
): RuntimeValue {
  const fn = expression;

  if (fn.type == "native-fn") {
    let result = (fn as NativeFNVal).call(args, env);
    return result;
  }

  let f = fn as FNVal;

  const fnScope =
    typeof f.declarationEnv !== "undefined" ? env : f.declarationEnv;

  if (f.parameters.length > args.length && sys.dev) {
    throw Err(
      "ArgError",
      `Expected ${f.parameters.length} arguments, got ${args.length}`
    );
  }

  for (var i = 0; i < f.parameters.length; i++) {
    const variable = f.parameters[i];

    let value = args[i];

    fnScope.declareVar(variable.assigne as any as string, value, false);
  }

  // fnScope.declareVar(f.name, f, false, false);

  let result: RuntimeValue = MK.nil();

  for (const state of f.body) {
    result = evaluate(state, fnScope);

    if (result.type === "return") {
      return result.value;
    }
  }

  return result;
}

export function evaluateIfStatement(
  expression: IFStatement,
  env: Environment
): RuntimeValue {
  let c = evaluate(expression.test, env);
  const condition = c.value;

  let ifEnv = new Environment(env, {
    in: "if",
  });

  let result: RuntimeValue = MK.undefined();

  if (condition) {
    for (var s of expression.consequent) {
      result = evaluate(s, ifEnv);

      if (result.type === "return") {
        result.value.returned = true;
        return result;
      }
    }
  } else if (expression.alternate) {
    if (Array.isArray(expression.alternate)) {
      for (var s of expression.alternate) {
        result = evaluate(s, ifEnv);

        if (result.type === "return") {
          return result;
        }
      }
    } else return evaluateIfStatement(expression.alternate, ifEnv);
  }

  return result;
}

export function evaluateForStatement(
  expression: ForStatement,
  env: Environment
): RuntimeValue {
  let forEnv = new Environment(env, {
    in: "for",
  });

  let result: RuntimeValue = MK.undefined();

  evaluate(expression.declaration, env);

  while (evaluate(expression.test, forEnv).value) {
    for (var s of expression.body) {
      result = evaluate(s, forEnv);

      if (result.type === "return") {
        result.value.returned = true;
        return result;
      }
    }
    evaluate(expression.increaser, forEnv);
  }

  return result;
}

export function evaluateWhileStatement(
  expression: WhileStatement,
  env: Environment
): RuntimeValue {
  let condition = evaluate(expression.test, env).value;

  // let whileENV = new Environment(env);

  while (condition) {
    for (var s of expression.consequent) {
      evaluate(s, env);
    }

    condition = evaluate(expression.test, env).value;
  }

  return MK.undefined();
}

export function evaluateAssignment(
  assignment: AssignmentExpr,
  env: Environment
) {
  // console.log(assignment);

  let value = evaluate(assignment.value, env);

  if (
    !["Identifier", "MemberExprX", "ObjectLiteral"].includes(
      assignment.assigne.kind
    )
  ) {
    throw Err("SyntaxError", `Invalid left-hand assignment`);
  }

  // add object literal support for extraction...
  if (assignment.assigne.kind === "ObjectLiteral") {
    if (value.type !== "object") {
      throw Err("TypeError", `Cannot assign to a non-object value`);
    }

    let obj = assignment.assigne as ObjectLiteral;

    let values = obj.properties.map((prop) => {
      if (prop.value.kind !== "Identifier") {
        throw Err("SyntaxError", `Invalid right-hand assignment`);
      } else return prop.value.value;
    });

    values.forEach((v) => {
      env.declareVar(
        v,
        (value.properties?.get(v) as RuntimeValue) || MK.undefined()
      );
    });
  }

  // ! CAUSED PROBLEM, MIGHT ENABLE BACK, MIGHT NOT :D !
  /// Enabled it back, because it's causing problems with the assignments inside if statements
  if (["if"].includes(env.properties.in as string))
    try {
      env.parent &&
        env.parent.declareVar(
          (assignment.assigne?.value as string) ||
            (assignment.assigne as MemberExprX),
          value
        );
    } catch {}

  // declareVar as the memberexprX
  return env.declareVar(
    (assignment.assigne?.value as string) ||
      (assignment.assigne as MemberExprX),
    value
  );
}

export function evaluateActionAssignment(
  assignment: ActionAssignmentExpr,
  env: Environment
) {
  const action = assignment.action;
  const value = evaluate(assignment.value, env);

  switch (action.name) {
    case "const":
      return env.declareVar(
        (assignment.assigne?.value as string) ||
          (assignment.assigne as MemberExprX),
        value,
        true
      );

    case "var":
      return env.declareVar(
        (assignment.assigne?.value as string) ||
          (assignment.assigne as MemberExprX),
        value,
        false
      );

    case "out":
      value.export = true;
      return env.declareVar(
        (assignment.assigne?.value as string) ||
          (assignment.assigne as MemberExprX),
        value,
        false
      );

    case "react":
      let v: any;

      if ((value as FNVal).body) {
        v = evaluateFunctionCall(
          value as FNVal,
          [...action.args.map((i) => evaluate(i, env)), MK.nil()],
          env
        );
      }

      assignment.action.args.forEach((arg) => {
        let i = env.lookupVar(arg.value);

        i.reactiveCallbacks?.push({
          variant: assignment.assigne,
          env,
          action: assignment.action,
          value: assignment.value,

          isMemberExpr: assignment.assigne.kind === "MemberExprX",
        });

        env.declareVar(arg.value, i, false, false);
      });

      if (assignment.assigne.kind !== "MemberExprX")
        return env.declareVar(assignment.assigne.value, v || value, false);
      else
        return env.declareVar(
          assignment.assigne as MemberExprX,
          v || value,
          false
        );

    default:
      throw Err("SyntaxError", `Unknown action: ${action.name}`);
  }
}

export function evaluateNullishAssignment(
  assignment: NullishAssignmentExpression,
  env: Environment
) {
  const value = evaluate(assignment.value, env);

  if (
    !["Identifier", "MemberExpr", "ObjectLiteral"].includes(
      assignment.assigne.kind
    )
  ) {
    throw Err("SyntaxError", `Invalid left-hand assignment`);
  }

  if (assignment.assigne.kind === "ObjectLiteral") {
    const object = evaluateObjectExpression(
      assignment.assigne as ObjectLiteral,
      env
    );
    return object;
  }

  let original = env.lookupVar(assignment.assigne.value);
  if (original.type === "null") {
    return env.assignVar(assignment.assigne.value, value);
  } else return original;
}

export function evaluateMemberExprX(
  expression: MemberExprX,
  env: Environment
): RuntimeValue {
  let mainObj = env.lookupVar(
    // can return a RuntimeValue even if it's not a variable...
    expression.parent.kind !== "Identifier"
      ? expression.parent
      : expression.parent.value
  ) as ObjectValue | ArrayValue;

  if (mainObj.type !== "object" && mainObj.type !== "array") {
    let proty = mainObj as RuntimeValue;
    let properties = [...expression.properties];

    if (proty.prototypes) {
      if (proty.prototypes[properties[0].value]) {
        proty.prototypes[properties[0].value].owner = mainObj;
      }

      let lastProp: ObjectValue | RuntimeValue | undefined =
        proty.prototypes[properties[0].value];

      if (!lastProp) {
        throw Err(
          "NameError",
          `"undef" value cannot have properties, READING: ${
            [expression.parent]
              .concat(properties)
              .map((i) => i.value)
              .join(" → ".green).white
          }`
        );
      }

      Object.setPrototypeOf(lastProp.value, null);

      properties.shift();

      for (var i = 0; i < properties.length; i++) {
        let prop = properties[i];

        if (!lastProp || lastProp.type === "undef") {
          throw Err(
            "NameError",
            `Cannot read properties of an undefined value, READING: ${
              [expression.parent]
                .concat(properties)
                .slice(0, i + 2)
                .map((i) => i.value)
                .join(" → ".green).white
            }`
          );
        }

        if (lastProp.properties && lastProp.properties.has(prop.value)) {
          lastProp = lastProp.properties.get(prop.value) as ObjectValue;
        } else if (lastProp.prototypes && lastProp.prototypes[prop.value]) {
          lastProp = lastProp.prototypes[prop.value];
        } else lastProp = MK.undefined();
      }

      return lastProp || MK.undefined();
    }

    return MK.undefined();
  } else {
    let lastProp: ArrayValue | ObjectValue | RuntimeValue | undefined = mainObj;

    Object.setPrototypeOf(lastProp.value, null);

    for (var i = 0; i < expression.properties.length; i++) {
      let prop = evaluate(expression.properties[i], env);

      if (!lastProp || lastProp.type === "undef") {
        throw Err(
          "NameError",
          `Cannot read properties of an undefined value, READING: ${
            [expression.parent]
              .concat(expression.properties)
              .slice(0, i + 2)
              .map((i) => i.value)
              .join(" → ".green).white
          }`
        );
      }

      if (!lastProp.prototypes) lastProp.prototypes = {};

      (lastProp.prototypes[expression.properties[i].value] || {}).owner =
        mainObj;

      // add support for arrays and objects at the same time
      switch (lastProp.type) {
        case "array":
          if (lastProp.prototypes && lastProp.prototypes[prop.value]) {
            lastProp = lastProp.prototypes[prop.value];
          } else if (lastProp.value?.length > 0 && lastProp.value[prop.value]) {
            lastProp = lastProp.value[prop.value] as ArrayValue;
          } else lastProp = MK.undefined();
          break;

        default:
          if (lastProp.properties && lastProp.properties.has(prop.value)) {
            lastProp = lastProp.properties.get(prop.value) as ObjectValue;
          } else if (lastProp.prototypes && lastProp.prototypes[prop.value]) {
            lastProp = lastProp.prototypes[prop.value];
          } else lastProp = MK.undefined();

          break;
      }
    }

    return lastProp || MK.undefined();
  }
}

export function evaluateNumericalAssignmentExpression(
  assignment: NumericalAssignmentExpression,
  env: Environment
) {
  let { operator, assigne } = assignment;
  let assigneValue = evaluate(assigne, env).value;

  let right = evaluate(assignment.value, env).value;

  let v = assigne.kind === "MemberExprX" ? assigne : assigne.value;

  if (!["&=", "|="].includes(operator)) {
    return env.declareVar(
      v,
      evalNumericBE(assigneValue, right, operator.substring(0, 1))
    );
  } else
    return env.declareVar(
      v,
      evalLogicalBE(assigneValue, right, operator.substring(0, 1))
    );
}

export function evaluateUnaryExpr(
  expr: UnaryExpr,
  env: Environment
): RuntimeValue {
  let result = evalUE(evaluate(expr.value, env), expr.operator);

  let type = typeof result;

  switch (type) {
    case "number":
      return MK.number(result as number);

    default:
    case "boolean":
      return MK.bool(result as boolean);

    case "string":
      return MK.string(result as any as string);
  }
}

function evalUE(arg: RuntimeValue, op: string) {
  switch (op) {
    case "!":
      return !arg.value;

    case "++":
      return ++arg.value;

    case "--":
      return --arg.value;

    case "+":
      return +arg.value;

    case "-":
      return -arg.value;
  }
}

export function evaluateTapStatement(
  expression: TapStatement,
  env: Environment
): RuntimeValue {
  let path = expression.path.value;

  if (!path.endsWith(".ln") && !path.endsWith(".lnx")) {
    path += fs.existsSync(path + ".ln")
      ? ".ln"
      : fs.existsSync(path + ".lnx")
      ? ".lnx"
      : ".ln";
  }

  function isFile(path: string): boolean {
    try {
      const stats = fs.statSync(path);
      return stats.isFile();
    } catch (error) {
      // Handle errors, such as if the path does not exist
      return false;
    }
  }

  let pathDetails = PATH.parse(path);

  let fileName = pathDetails.base;
  let fileDir = pathDetails.dir;

  path = PATH.join(originalPath, fileDir, fileName);

  if (fs.existsSync(path) && isFile(path)) {
    let tapCode = fs.readFileSync(path, "utf-8").toString();
    let env = createContext([]);

    try {
      return new Luna(env).evaluate(tapCode);
    } catch (e) {
      throw e + `\n\n   at → `.blue + path.underline.gray;
    }
  } else throw Err("FSError", `'${path}' was not found on the FileSystem`);
}

export function evaluateFunctionDeclaration(
  declaration: FunctionDeclaration,
  env: Environment
) {
  const fn = {
    type: "function",
    name: declaration.name,
    export: declaration.export,
    parameters: declaration.parameters,
    declarationEnv: env,
    body: declaration.body,
  };

  let func = MK.func(fn.name, fn.parameters, fn.body, fn.export, env);

  // func.declarationEnv !== undefined...

  let c = env.declareVar(fn.name, func, true);

  let t = env.lookupVar(fn.name);

  // t.declarationEnv == undefined...

  return c;
}
