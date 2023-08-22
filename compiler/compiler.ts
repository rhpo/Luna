import {
  ActionAssignmentExpr,
  AssignmentExpr,
  BinaryExpr,
  CallExpr,
  DebugStatement,
  EqualityExpr,
  Expression,
  FunctionDeclaration,
  IFStatement,
  Identifier,
  MemberExprX,
  NumericLiteral,
  ObjectLiteral,
  Program,
  ReturnExpr,
  Statement,
  StringLiteral,
  TypegetExpr,
  UnaryExpr,
  WhileStatement,
} from "../lib/ast";

import { Err } from "../lib/error";
import { Luna } from "../luna";

declare var prettier: any;
declare var prettierPlugins: any;
async function format(code: string) {
  try {
    prettier;
    return await prettier.format(code, {
      parser: "babel",
      trailingComma: "es5",
      tabWidth: 2,
      semi: true,
      printWidth: 80, // Set your preferred print width hereparser: "graphql",
      plugins: prettierPlugins,
      // ...other options
    });
  } catch {
    return code;
  }
}

export default class LunaTranspiler {
  code: string;
  storage: string[];
  constructor(code: string) {
    this.code = code || "";
    this.storage = [];
  }

  public async translate(minified: boolean = false) {
    let luna = new Luna();
    let ast = luna.produceAST(this.code);

    let sourceJS = this.reallyTranspile(ast);

    if (!minified) sourceJS = await format(sourceJS);

    return sourceJS;
  }

  public async translateAST(ast: Statement, minified: boolean = false) {
    let sourceJS = this.reallyTranspile(ast);

    if (!minified) sourceJS = await format(sourceJS);

    return sourceJS;
  }

  private reallyTranspile(ast: Statement): string {
    switch (ast.kind) {
      case "Program":
        let pragma = ast as Program;
        return `${
          pragma.body.length > 0
            ? pragma.body.map((s) => this.reallyTranspile(s)).join("\n")
            : ""
        }`;

      case "FunctionDeclaration":
        let func = ast as FunctionDeclaration;

        // Lambda support...
        function returnize(arr: Expression[]): Expression[] {
          if (arr.length > 0) {
            if (arr[arr.length - 1].kind !== "ReturnExpr")
              arr[arr.length - 1] = {
                kind: "ReturnExpr",
                value: arr[arr.length - 1],
              } as ReturnExpr;
          }
          return arr;
        }

        if (func.name === "@ANONYMOUS") {
          return `${func.async ? "async " : ""}(${
            func.parameters.length > 0
              ? func.parameters.map((k) => this.reallyTranspile(k)).join(",")
              : ""
          }) => {${
            func.body.length > 0
              ? func.body.map((k) => this.reallyTranspile(k)).join("\n")
              : ""
          }};`;
        } else
          return `${func.async ? "async " : ""}function ${func.name}(${
            func.parameters.length > 0
              ? func.parameters.map((k) => this.reallyTranspile(k)).join(",")
              : ""
          }) {${
            func.body.length > 0
              ? returnize(func.body)
                  .map((k) => this.reallyTranspile(k))
                  .join("\n")
              : ""
          }};`;

      case "TypegetExpr":
        let t = ast as TypegetExpr;
        return `typeof ${this.reallyTranspile(t.value)}`;

      case "AssignmentExpr":
        let assignment = ast as AssignmentExpr;

        if (
          assignment.assigne.kind === "Identifier" &&
          !this.storage.includes(assignment.assigne.value)
        ) {
          this.storage.push(assignment.assigne.value);

          return `let ${
            typeof assignment.assigne === "string"
              ? assignment.assigne
              : this.reallyTranspile(assignment.assigne)
          }=${this.reallyTranspile(assignment.value)}`;
        } else
          return `${
            typeof assignment.assigne === "string"
              ? assignment.assigne
              : this.reallyTranspile(assignment.assigne)
          }=${this.reallyTranspile(assignment.value)}`;

      case "NullLiteral":
        return "null";
      case "UndefinedLiteral":
        return "undefined";

      case "NumericLiteral":
        return (ast as NumericLiteral).value.toString();

      case "CallExpr":
        let callExpr = ast as CallExpr;
        return `${this.reallyTranspile(callExpr.caller)}(${
          callExpr.args.length > 0
            ? callExpr.args.map((k) => this.reallyTranspile(k)).join(",")
            : ""
        })`;

      case "BinaryExpr":
        let binaryExpr = ast as BinaryExpr;
        return `${this.reallyTranspile(binaryExpr.left)}${
          binaryExpr.operator
        }${this.reallyTranspile(binaryExpr.right)}`;

      case "ActionAssignmentExpr":
        let aae = ast as ActionAssignmentExpr;

        if (aae.action.name === "react") {
          throw Err(
            "TranspilerError",
            `Reactivity not supported on compiled side of Luna`
          );
        } else if (aae.action.args.length > 0) {
          throw Err(
            "TranspilerError",
            `Unsupported ActionArguments in ActionAssignmentExpression: ${ast.kind}`
          );
        } else {
          if (
            aae.assigne.kind === "Identifier" &&
            !this.storage.includes(aae.assigne.value)
          ) {
            this.storage.push(aae.assigne.value);
            return `${aae.action.name} ${this.reallyTranspile(
              aae.assigne
            )}=${this.reallyTranspile(aae.value)}`;
          } else
            return `${aae.action.name} ${this.reallyTranspile(
              aae.assigne
            )}=${this.reallyTranspile(aae.value)}`;
        }

      case "ObjectLiteral":
        let objectLiteral = ast as ObjectLiteral;
        return `{${objectLiteral.properties
          .map((p) => p.key + ":" + this.reallyTranspile(p.value))
          .join(",")}}`;

      case "IfStatement":
        let ifStat = <IFStatement>ast;
        return `if(${this.reallyTranspile(ifStat.test)})${
          (ifStat.consequent.length <= 1
            ? this.reallyTranspile(ifStat.consequent[0]) + ";"
            : "{" +
              ifStat.consequent.map((s) => this.reallyTranspile(s)).join("\n") +
              "}") +
          (<IFStatement>ifStat.alternate
            ? `else ${this.reallyTranspile(<IFStatement>ifStat.alternate)}`
            : "")
        }`;

      case "WhileStatement":
        let whileStat = <WhileStatement>ast;
        return `while(${this.reallyTranspile(whileStat.test)})${
          whileStat.consequent.length <= 1
            ? this.reallyTranspile(whileStat.consequent[0]) + ";"
            : "{" +
              whileStat.consequent
                .map((s) => this.reallyTranspile(s))
                .join("\n") +
              "}"
        }`;

      case "DebugStatement":
        const debugStyle = "color: red;background-color:yellow;";
        const valueStyle = "text-decoration: underline;";

        let debugStatement = ast as DebugStatement;
        return `\n// LUNA ~ DEBUG:\n//   ${
          debugStatement.props
            .map((p) => this.reallyTranspile(p))
            .join(";\n//   ") + "\n"
        }`;

      case "MemberExprX":
        let memExpr = <MemberExprX>ast;
        return (
          memExpr.parent.value +
          memExpr.properties
            .map((t) => {
              return t.kind === "Identifier"
                ? `.${t.value}`
                : `[${this.reallyTranspile(t)}]`;
            })
            .join("")
        );

      case "Identifier":
        return (<Identifier>ast).value;

      case "ReturnExpr":
        return "return " + this.reallyTranspile((<ReturnExpr>ast).value) + ";";

      case "UnaryExpr":
        let uExpr = ast as UnaryExpr;
        switch (uExpr.operator) {
          case "+":
          case "-":
          case "!":
            return `${uExpr.operator}${this.reallyTranspile(uExpr.value)}`;

          default:
            return `${this.reallyTranspile(uExpr.value)}${uExpr.operator}`;
        }

      case "StringLiteral":
        let string = ast as StringLiteral;
        function containsBrace(str: string): boolean {
          return /(?<!\\){/.test(str);
        }
        function replaceBrace(str: string): string {
          return str.replace(/(?<!\\){/g, "${");
        }
        return containsBrace(string.value) || string.value.includes("\n")
          ? "`" + replaceBrace(string.value.replaceAll("`", "\\`")) + "`"
          : "'" + string.value.replaceAll("'", "\\'") + "'";

      case "EqualityExpr":
      case "InequalityExpr":
      case "LogicalExpr":
        return `${this.reallyTranspile((ast as EqualityExpr).left)}${
          (<EqualityExpr>ast).operator
        }${this.reallyTranspile((<EqualityExpr>ast).right)}`;

      default:
        throw Err("TranspilerError", `Unsupported AST Node Type: ${ast.kind}`);
    }
  }
}
