import Environment from "./lib/env";
import Parser from "./lib/parser";
import { Token, tokenize } from "./lib/tokenizer";
import { evalulateProgram } from "./runtime/evaluation/eval";
import { RuntimeValue } from "./runtime/values";

interface CreateContextArg {
  name: string;
  value: RuntimeValue;
  constant?: boolean;
  override?: boolean;
  equivalent?: string;
}

export class Luna {
  context: Environment;
  constructor(context: Environment = new Environment()) {
    this.context = context;
  }

  tokenize(code: string) {
    return tokenize(code);
  }

  produceAST(code: string) {
    let tokens = this.tokenize(code);
    let parser = new Parser(tokens, code);

    return parser.produceAST();
  }

  evaluate(code: string, optionalContext?: Environment, origin: string = "./") {
    const ast = this.produceAST(code);

    if (optionalContext) {
      let newEnv = Object.assign({}, this.context);
      Object.setPrototypeOf(newEnv, Object.getPrototypeOf(this.context)); // fixed the "declareVar is undefined" issue

      newEnv.variables = new Map([
        ...newEnv.variables,
        ...optionalContext.variables,
      ]);

      newEnv.constants = new Set([
        ...newEnv.constants,
        ...optionalContext.constants,
      ]);

      return evalulateProgram(ast, newEnv, origin);
    }

    return evalulateProgram(ast, this.context, origin);
  }
}

export function createContext(contextContent: CreateContextArg[]) {
  let env = new Environment();

  contextContent = filterduplicate(contextContent);

  contextContent.forEach((object) => {
    env.declareVar(
      object.name,
      object.value,
      !!object.constant,
      false,
      !!object.override,
      object.equivalent
    );
  });

  return env;
}

function filterduplicate(arr: CreateContextArg[]): CreateContextArg[] {
  const uniqueObjects: Record<string, boolean> = {};
  const result: CreateContextArg[] = [];

  for (const obj of arr) {
    if (!uniqueObjects[obj.name]) {
      result.push(obj);
      uniqueObjects[obj.name] = true;
    }
  }

  return result;
}
