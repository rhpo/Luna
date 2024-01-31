import {
  Statement,
  Program,
  Expression,
  BinaryExpr,
  Identifier,
  NumericLiteral,
  UndefinedLiteral,
  AssignmentExpr,
  StringLiteral,
  Property,
  ObjectLiteral,
  CallExpr,
  FunctionDeclaration,
  IFStatement,
  InequalityExpr,
  EqualityExpr,
  LogicalExpr,
  NullishAssignmentExpression,
  NumericalAssignmentExpression,
  TypeofExpr,
  IsDefExpression,
  WhileStatement,
  UnaryExpr,
  ActionExpr,
  ActionAssignmentExpr,
  MemberExprX,
  ReturnExpr,
  EmptyStatement,
  TernaryExpr,
  DebugStatement,
  ForStatement,
  UseStatement,
  TapStatement,
  EmbedStatement,
  Import,
  ArrayLiteral,
} from "./ast";
import { Err } from "./error";
import sys from "./sys";

// import fs from "fs";
var fs: any;
if (!sys.script) {
  fs = require("fs");
}

import systemDefaults from "./sys";

import { TokenType, Token, strv, Position, tokenize } from "./tokenizer";

const isAllUpperCase = (i: string): boolean => {
  return i.toLowerCase() !== i;
};

function injectChar(string: string, char: string, pos: number) {
  let leftSide = string.substring(0, pos);
  let rightSide = string.substring(pos);
  return leftSide + char + rightSide;
}

interface TemporaryConfig {
  skipColonAction?: boolean;
}

export default class Parser {
  private tokens: Token[] = [];
  private lines: string[];
  private idx: number;
  private backupTokens: Token[] = [];
  private tkIdx: number = 0;
  private permitEating: boolean;
  private config: TemporaryConfig = {};
  private program: Program;

  constructor(tokens: Token[], code: string) {
    this.tokens = tokens;
    this.backupTokens = Object.assign([], tokens);

    this.lines = code.split("\n");
    this.idx = 0;

    this.permitEating = true;

    this.program = {
      kind: "Program",
      body: [],
    };
  }

  private whereErr(i?: number) {
    let at = this.backupTokens[this.tkIdx];
    let { line, index: idx }: Position = at.position;
    let vLine = 0;
    let err = "";

    while (vLine <= line) {
      if (!systemDefaults.script) {
        let maxSpace = " ".repeat(line.toString().split("").length + 1);
        if (vLine === line) {
          err +=
            ((vLine + 1).toString() + `. | `).green.bold.toString() +
            // injectChar(
            //   this.lines[vLine],
            //   systemDefaults.errors.positionSymbol.red,
            //   idx
            // ) +

            this.lines[vLine] +
            "\n";

          err +=
            " ".repeat(
              idx - (i as number) + 6 < 0 ? 0 : idx - (i as number) + 6
            ) +
            "~".repeat(((i as number) < 0 ? 0 : (i as number)) || 0).red +
            "\n";
        } else {
          err +=
            vLine +
            1 +
            `.${maxSpace.substring(
              0,
              vLine.toString().split("").length + 1
            )}| ` +
            this.lines[vLine].gray +
            "\n";
        }
      } else {
        if (vLine === line) {
          err +=
            (vLine + 1).toString() +
            ". | " +
            injectChar(
              this.lines[vLine],
              systemDefaults.errors.positionSymbol.red,
              idx
            ) +
            "\n";
        } else {
          err += vLine + 1 + ". | " + this.lines[vLine].gray + "\n";
        }
      }

      vLine++;
    }

    return err;
  }

  private where(i?: number) {
    let at = this.backupTokens[this.tkIdx];

    let { line, index: idx }: Position = at.position;

    return (
      `\n\n${this.whereErr(i)}\n\n` +
      "Position:".gray.underline +
      "\n\n  " +
      "• Line: ".grey +
      line.toString().yellow +
      "\n  " +
      "• Index: ".grey +
      idx.toString().yellow +
      "\n  " +
      "• Raw: ".grey +
      `(${line}:${idx})`.cyan +
      "\n"
    );
  }

  public produceAST() {
    while (this.notEOF()) {
      let stmt = this.parseStatement();

      this.program.body.push(stmt);

      // if (stmt.kind === "AssignmentExpr") {
      //   this.expect(TokenType.NewLine, TokenType.Semicolon, TokenType.EOF);
      //   this.eat();
      // }
    }

    return this.program;
  }

  private at() {
    this.skip();

    return this.tokens[0] as Token;
  }

  private reallyAt() {
    return this.tokens[0] as Token;
  }

  private next() {
    return this.tokens[1] as Token;
  }

  private parseStatement(): Statement {
    // return this.parseExpression();

    let token = this.at();

    switch (token.type) {
      case TokenType.FN:
      case TokenType.LAMBDA:
        return this.parseFunctionDeclaration();

      default:
        return this.parseExpression();
    }
  }

  private parseExpression(): Statement {
    let expression = this.parseAssignementExpression();

    if (this.at().type === TokenType.Ternary) {
      let left = expression;

      this.eat();

      let cond = left;

      ////OLD: ! BIG PROBLEM HERE ! IT THROWS THIS ERR!

      //// SyntaxError: Unexpected token BinaryOperator, expecting: Colon
      //// 1. | fn factorialRecursive number {
      //// 2. |   number > 1 ? number * factorialRecursive(number - 1) : 1

      // Fixed: use "or" instead of "colon" (ternary operator)

      // disable treating ternary's expression as action declaration
      this.config.skipColonAction = true;
      let expr = this.parseExpression();

      this.expect(TokenType.Colon, TokenType.ELSE); // Addedd Else support in this statement
      this.eat();

      let alternate = this.parseExpression();

      return {
        kind: "TernaryExpr",

        condition: cond,
        consequent: expr,
        alternate: alternate,
      } as TernaryExpr;
    }

    return expression;
  }

  private parseObjectExpr(): Expression {
    switch (this.at().type) {
      case TokenType.FN:
      case TokenType.LAMBDA:
        return this.parseFunctionDeclaration();

      case TokenType.OpenBracket:
        return this.parseArrayDeclaration();

      case TokenType.BinaryOperator:
        return this.parseUnaryExpression();
    }

    if (this.at().type !== TokenType.OpenBrace) {
      return this.parseLogicalExpr();
    }

    this.eat(); // eat '{'

    if (this.at().type === TokenType.CloseBrace) {
      this.eat();
      return {
        kind: "ObjectLiteral",
        properties: [],
      } as ObjectLiteral;
    }

    const properties: Property[] = [];

    while (this.notEOF() && this.at().type !== TokenType.CloseBrace) {
      // {k, s, ...}
      const key = this.expect(TokenType.Identifier, TokenType.String).value;

      this.eat();

      let idx = 0;

      function add(i: any) {
        properties.push(i);
        idx++;
      }

      if (this.at().type === TokenType.Comma) {
        this.eat(); // eat that comma, Baby!

        add({
          key,
          kind: "Property",
          value: {
            kind: "Identifier",
            value: key,
          } as Identifier,
          id: idx,
        } as Property);

        continue;
      } else if (this.at().type === TokenType.CloseBrace) {
        add({
          key,
          kind: "Property",
          value: {
            kind: "Identifier",
            value: key,
          } as Identifier,
          id: idx,
        } as Property);

        continue;
      }

      // if not continue:
      // this.expect(TokenType.Colon, TokenType.Identifier);
      this.expect(TokenType.Colon);

      let next = this.at(); // eat the colon ':'

      if (next.type === TokenType.Colon) {
        this.eat();
        const value = this.parseExpression();

        add({
          kind: "Property",
          value,
          key,
          id: idx,
          reactiveCBExpr: undefined,
        });
      } else {
        this.expect(TokenType.Identifier);
        const action = this.eat();

        let args = [];
        if (this.at().type === TokenType.SmallerThan) {
          this.eat();

          this.expect(TokenType.Identifier);

          let arg = this.parsePrimaryExpression();

          args.push(arg);

          while (
            this.at().type == TokenType.Comma &&
            this.eat() &&
            this.at().type !== TokenType.GreaterThan
          ) {
            args.push(this.parsePrimaryExpression());
          }

          this.expect(TokenType.GreaterThan);
          this.eat();
        }

        this.expect(TokenType.Colon);
        this.eat();

        const value = this.parseExpression();

        add({
          kind: "Property",
          value,
          key,
          reactiveCBExpr: {
            name: action.value,
            args,
          } as ActionExpr,
          id: idx,
        });
      }

      if (this.at().type !== TokenType.CloseBrace) {
        this.expect(TokenType.Comma);
        this.eat();
      }
    }

    this.expect(TokenType.CloseBrace);
    this.eat();

    return {
      kind: "ObjectLiteral",
      properties,
    } as ObjectLiteral;
  }

  private parseAdditiveExpression(): Expression {
    let left = this.parseMultiplicativeExpression();

    while (this.at().value === "+" || this.at().value === "-") {
      const operator = this.eat().value;

      const right = this.parseMultiplicativeExpression();

      left = {
        kind: "BinaryExpr",
        left,
        right,
        operator,
      } as BinaryExpr;
    }

    return left;
  }

  private parseBinaryExpression(): Expression {
    let left = this.parseAdditiveExpression();

    while (["&", "|", "<<", ">>"].includes(this.at().value)) {
      const operator = this.eat().value;

      const right = this.parseAdditiveExpression();

      left = {
        kind: "BinaryExpr",
        left,
        right,
        operator,
      } as BinaryExpr;
    }

    return left;
  }

  private parseInequality() {
    let left = this.parseBinaryExpression();

    while (["<", ">", "<=", ">="].includes(this.at().value)) {
      const operator = this.eat().value;

      const right = this.parseBinaryExpression();

      left = {
        kind: "InequalityExpr",
        left,
        right,
        operator,
      } as InequalityExpr;
    }

    return left;
  }

  private parseEquality() {
    let left = this.parseInequality();

    while (["==", "!="].includes(this.at().value)) {
      const operator = this.eat().value;

      const right = this.parseInequality();

      left = {
        kind: "EqualityExpr",
        left,
        right,
        operator,
      } as EqualityExpr;
    }

    return left;
  }

  private parseLogicalExpr() {
    let left = this.parseEquality();

    // if (this.at().type === TokenType.OR) this.at().value = "||";
    // if (this.at().type === TokenType.AND) this.at().value = "&&";
    while (["&&", "||", "??"].includes(this.at().value)) {
      const operator = this.eat().value;

      const right = this.parseEquality();

      left = {
        kind: "LogicalExpr",
        left,
        right,
        operator,
      } as LogicalExpr;
    }

    return left;
  }

  private parseMemberOrMemberCallExpression(m?: Expression): Expression {
    const member = this.parseMemberExpression(m); // good

    if (this.at() && this.at().type === TokenType.OpenParen) {
      // this.eat();

      return this.parseCallExpression(member);
    }

    return member;
  }

  private parseCallExpression(caller: Expression): Expression {
    let callExpression: Expression = {
      kind: "CallExpr",
      caller, // call | call.foo
      args: this.parseArgs(),
    } as CallExpr;

    if (this.at().type === TokenType.OpenParen) {
      callExpression = this.parseCallExpression(callExpression);
    } else if (
      this.at().type === TokenType.Dot ||
      this.at().type === TokenType.OpenBracket
    ) {
      return this.parseMemberOrMemberCallExpression(callExpression);

      // throw Err(
      //   "LunaError",
      //   "Cannot implement CallExpressions inside MemberExpressions (Unsupported)"
      // );
    }

    this.eatOptional(); // eat the semicolon

    if (this.at().type === TokenType.Dot) {
      this.eat();

      let m = callExpression;

      let k = this.parseMemberOrMemberCallExpression(m);

      return k;
    }

    return callExpression;
  }

  private parseArgs(): Expression[] {
    // got identifier
    this.expect(TokenType.OpenParen);
    this.eat();

    if (this.at().type === TokenType.CloseParen) {
      this.eat();

      return [];
    }

    let args = [this.parseExpression()];

    while (this.at().type === TokenType.Comma && this.eat()) {
      let c = this.parseExpression();

      args.push(c);
    }

    this.expect(TokenType.CloseParen);
    this.eat();

    return args as Expression[];
  }

  private parseMemberExpression(originalParent?: Expression): Expression {
    // it also parses identifiers
    let object = originalParent || this.parsePrimaryExpression();

    let backup = Object.assign({}, object);

    let properties: Expression[] = [object];

    while (
      (this.at() && this.at().type === TokenType.Dot) ||
      (this.at() && this.at().type === TokenType.OpenBracket)
    ) {
      const operator = this.at();

      // obj.expr

      if (operator.type === TokenType.Dot) {
        this.eat();
        let c = this.parsePrimaryExpression();
        properties.push(c);
        // this.eat();

        if (!["MemberExpr", "Identifier"].includes(c.kind)) {
          throw Err(
            "SyntaxError",
            `Unexpected token '${
              c.kind
            }', expecting 'Identifier'${this.where()}`
          );
        }
      } else {
        this.expect(TokenType.OpenBracket);
        this.eat();
        this.expect(TokenType.String, TokenType.Identifier, TokenType.Int);
        properties.push(this.parseExpression());

        this.expect(TokenType.CloseBracket);
        this.eat();
      }
    }

    if (properties.length - 1 > 0)
      return {
        kind: "MemberExprX",
        parent: properties.shift(),
        properties,
      } as MemberExprX;
    else return backup;
  }

  private parseAssignementExpression(): Expression {
    const left = this.parseNumericAssignmentExpression(); // identifier

    if (this.at().type == TokenType.Equals) {
      this.eat(); // advance past equals

      const value = this.parseAssignementExpression();

      this.eatOptional();

      return {
        value,
        assigne: left,
        kind: "AssignmentExpr",
      } as AssignmentExpr;
    } else if (this.at().type === TokenType.Colon) {
      // Removed: because parseActionAssignementExpression() already parses the colon
      // this.eat();

      if (left.kind === "MemberExprX" || left.kind === "Identifier") {
        if (this.config.skipColonAction) {
          this.config.skipColonAction = false;
          return left;
        } else return this.parseActionAssignementExpression(left);
      } else return left;
    } else if (
      [TokenType.Increasement, TokenType.Decreasement].includes(
        this.at().type as TokenType
      )
    ) {
      return this.parseIncreasementExpression();
    }

    return left;
  }

  private parseActionAssignementExpression(left: Expression): Expression {
    // this.expect(TokenType.Identifier, TokenType.OUT);

    this.expect(TokenType.Colon);
    this.eat();

    const action = this.eat();

    let args = [];
    if (this.at().type === TokenType.SmallerThan) {
      this.eat();

      this.expect(TokenType.Identifier);

      let arg = this.parsePrimaryExpression();

      args.push(arg);

      while (
        this.at().type == TokenType.Comma &&
        this.eat() &&
        this.at().type !== TokenType.GreaterThan
      ) {
        args.push(this.parsePrimaryExpression());
      }

      this.expect(TokenType.GreaterThan);
      this.eat();
    }

    if (this.at().type == TokenType.Equals) {
      this.eat(); // advance past equals

      const value = this.parseExpression();
      let result = {
        value,
        assigne: left,
        action: {
          name: action.value,
          args,
        } as ActionExpr,
        kind: "ActionAssignmentExpr",
      } as ActionAssignmentExpr;

      return result;
    } else
      throw Err(
        "SyntaxError",
        "A Variable Declaration with an Action must contain a value"
      );
  }

  private parseNumericAssignmentExpression(): Expression {
    const left = this.parseNullishAssignment(); // identifier

    while (
      ["*=", "+=", "/=", "%=", "-=", "&=", "|="].includes(this.at().value) &&
      this.notEOF()
    ) {
      let operator = this.eat().value; // advance past equals
      const value = this.parseNumericAssignmentExpression();

      return {
        value,
        assigne: left,
        operator,
        kind: "NumericalAssignmentExpr",
      } as NumericalAssignmentExpression;
    }

    return left;
  }

  //parseNullishAssignment

  private parseNullishAssignment(): Expression {
    const left = this.parseObjectExpr(); // identifier

    if (this.at().type == TokenType.NullishOpEQ) {
      this.eat(); // advance past equals

      const value = this.parseNullishAssignment();
      return {
        value,
        assigne: left,
        kind: "NullishAssignmentExpr",
      } as NullishAssignmentExpression;
    }

    return left;
  }

  private parseUnaryExpression(): Expression {
    if (
      [
        TokenType.NegrationOp,
        TokenType.Increasement,
        TokenType.Decreasement,
        TokenType.BinaryOperator,
      ].includes(this.at().type as TokenType) &&
      ![TokenType.NewLine, TokenType.Semicolon, TokenType.EOF].includes(
        this.reallyAt().type as TokenType
      )
    ) {
      const op = this.eat().value;

      if (!["+", "-", "!", "++", "--"].includes(op)) {
        throw Err(
          "SyntaxError",
          `Unexpected token: BinaryOperator${this.where()}`
        );
      }

      let value = this.parseUnaryExpression();

      if (this.at().type === TokenType.BinaryOperator) {
        const op2 = this.eat().value;

        const right = this.parseUnaryExpression();

        let binaryExpr = {
          kind: "BinaryExpr",
          left: {
            kind: "UnaryExpr",
            value,
            operator: op,
          },
          right,
          operator: op2,
        } as BinaryExpr;

        return binaryExpr;
      }

      return {
        operator: op,
        kind: "UnaryExpr",
        value,
      } as UnaryExpr;
    } else return this.parseIncreasementExpression();
  }

  private parseIncreasementExpression(): Expression {
    // this also parses identifiers...
    let left = this.parseMemberOrMemberCallExpression();

    if (
      [TokenType.Increasement, TokenType.Decreasement].includes(
        this.at().type as TokenType
      )
    ) {
      const op = this.eat().value;

      return {
        operator: op,
        kind: "UnaryExpr",
        value: left,
      } as UnaryExpr;
    }

    return left;
  }

  private parseMultiplicativeExpression(): Expression {
    // this also parses identifiers...
    let left = this.parseUnaryExpression(); // !

    while (
      this.at().value === "*" ||
      this.at().value === "/" ||
      this.at().value === "%" ||
      this.at().value === "^" ||
      this.at().value === "**"
    ) {
      const operator = this.eat().value;

      const right = this.parseUnaryExpression(); // !

      left = {
        kind: "BinaryExpr",
        left,
        right,
        operator,
      } as BinaryExpr;
    }

    // HERE ! (it returns an identifier)
    return left;
  }

  private parseDebugStatement(): DebugStatement {
    let object = {
      kind: "DebugStatement",
    } as DebugStatement;

    this.expect(TokenType.DEBUG);
    this.eat();

    let props: Expression[] = [];

    if (this.at().type === TokenType.OpenBrace) {
      this.eat();

      if (this.at().type !== TokenType.CloseBrace) {
        while (this.notEOF() && this.at().type !== TokenType.CloseBrace) {
          let expr = this.parseExpression();

          if (this.at().type !== TokenType.CloseBrace) {
            this.expect(TokenType.Comma);
            this.eat();
          }

          props.push(expr);
        }

        this.expect(TokenType.CloseBrace);
        this.eat();

        object.props = props;
      } else {
        this.eat();

        object.props = [];
      }
    } else {
      props = [this.parseExpression()];

      object.props = props;

      if (this.reallyAt().type === TokenType.Semicolon) {
        this.reallyEat(); // ! problem here... it's eating the EOF, which makes this.at() undefined...

        object.props = props;

        return object;
      } else if (this.reallyAt().type !== TokenType.EOF) {
        throw Err(
          "SyntaxError",
          `Unexpected token ${strv(
            this.tokens[this.idx].type as TokenType
          )}, expected ${[TokenType.Semicolon, TokenType.EOF]
            .map((k) => strv(k))
            .join(" or ")} at the end of the line`
        );
      }
    }

    return object;
  }

  private parseArrayDeclaration(): ArrayLiteral | Expression {
    this.expect(TokenType.OpenBracket);
    this.eat();

    let result = {
      kind: "ArrayLiteral",
      elements: [],
    } as ArrayLiteral;

    if (this.at().type === TokenType.CloseBracket) {
      this.eat();
    } else
      X: while (this.notEOF() && this.at().type !== TokenType.CloseBracket) {
        let expr = this.parseExpression();

        result.elements.push(expr);

        if (this.at().type === TokenType.Comma) {
          this.eat();
        } else if (this.at().type === TokenType.CloseBracket) {
          this.eat();
          break X;
        } else {
          throw Err(
            "SyntaxError",
            `Unexpected token ${strv(
              this.at().type as TokenType
            )}, expecting ',' or ']'`
          );
        }
      }

    if (this.at().type === TokenType.Dot) {
      result = this.parseMemberOrMemberCallExpression(result) as ArrayLiteral;
    }

    return result;
  }

  private parseFunctionDeclaration(
    isExport: boolean = false
  ): FunctionDeclaration {
    let kw = this.eat(); // eat FN or LAMBDA
    let name: string;

    if (kw.type === TokenType.FN && this.at().type !== TokenType.Colon) {
      this.expect(TokenType.Identifier);

      name = this.at().value;
      this.eat(); // eat the name
    } else {
      if (
        this.at().type === TokenType.Colon &&
        this.next() &&
        this.next().type === TokenType.Colon &&
        kw.type === TokenType.LAMBDA
      )
        throw Err(
          "SyntaxError",
          `Unexpected token ${strv(
            this.at().type as TokenType
          )},${this.where()}`
        );
      else if (this.at().type === TokenType.Colon) this.eat();
      name = "@ANONYMOUS";
    }

    const parameters = this.parseFNA();

    this.expect(TokenType.OpenBrace, TokenType.Colon);
    let separator = this.eat();

    const body: Statement[] = [];

    if (separator.type === TokenType.OpenBrace) {
      while (this.notEOF() && this.at().type !== TokenType.CloseBrace) {
        let state = this.parseStatement();

        body.push(state);
      }

      this.expect(TokenType.CloseBrace);
      this.eat();
    } else if (separator.type === TokenType.Colon) {
      body.push(this.parseExpression());
    }

    const fn = {
      kind: "FunctionDeclaration",
      body,
      export: isExport,
      name,
      parameters,
    } as FunctionDeclaration;

    this.eatOptional();

    this.skip();

    return fn;
  }

  private parseFNA(): AssignmentExpr[] {
    if (
      this.at() &&
      (this.at().type === TokenType.OpenBrace ||
        this.at().type === TokenType.Colon)
    ) {
      return [] as AssignmentExpr[];
    }

    this.expect(TokenType.Identifier, TokenType.OpenBrace);

    let args: AssignmentExpr[] = [];

    while (
      this.notEOF() &&
      ![TokenType.OpenBrace, TokenType.Colon].includes(
        this.at().type as TokenType
      )
    ) {
      this.expect(TokenType.Identifier);
      let token = this.at();

      this.eat();

      let name = token.value;
      let def = false;
      let defVal;

      if (this.at().type === TokenType.Equals) {
        this.eat();

        this.expect(TokenType.OpenParen);
        this.eat(); // ( X

        def = true;

        defVal = this.parseExpression();

        this.expect(TokenType.CloseParen);
        this.eat();
      } else {
        def = false;
        defVal = {
          kind: "UndefinedLiteral",
          value: "undefined",
        } as UndefinedLiteral;
      }

      args.push({
        kind: "AssignmentExpr",
        assigne: name,
        value: defVal,
        hasDefault: def,
      } as AssignmentExpr);
    }

    return args;
  }

  private parseUseStatement(): UseStatement {
    this.expect(TokenType.USE);
    this.eat();

    let type = this.at().type;

    switch (type) {
      case TokenType.OpenParen:
        this.eat();

        let imports: Import[] = [];
        use: while (this.notEOF()) {
          this.expect(TokenType.Identifier);
          let identifier = {
            kind: "Identifier",
            value: this.eat().value,
          } as Identifier;

          let as = identifier;

          if (this.at().type === TokenType.AS) {
            this.eat();

            this.expect(TokenType.Identifier);
            as = {
              kind: "Identifier",
              value: this.eat().value,
            } as Identifier;
          }

          imports.push({
            name: identifier,
            alternative: as,
          } as Import);

          if (this.at().type === TokenType.CloseParen) {
            this.eat();
            break use;
          } else if (this.at().type === TokenType.Comma) {
            this.eat();
          }
        }

        this.expectnot(TokenType.CloseParen);

        this.expect(TokenType.FROM);
        this.eat();

        this.expect(TokenType.String);
        let module = this.eat().value;

        if (module.trim() === "") {
          throw Err("ModuleError", "Cannot use un-named modules");
        }

        module = {
          kind: "StringLiteral",
          value: module,
        } as StringLiteral;

        let statement = {
          kind: "UseStatement",
          imports,
          path: module,
        } as UseStatement;

        return statement;

      case TokenType.String:
        let path = this.eat().value;

        if (path.trim() === "") {
          throw Err("ModuleError", "Cannot use un-named modules");
        }

        path = {
          kind: "StringLiteral",
          value: path,
        } as StringLiteral;

        this.expect(TokenType.AS);
        this.eat();

        this.expect(TokenType.Identifier);

        let identifier = {
          kind: "Identifier",
          value: this.eat().value,
        } as Identifier;

        let useAlt = {
          kind: "UseStatement",
          imports: identifier,
          path,
        } as UseStatement;

        return useAlt;

      default:
        throw Err(
          "SyntaxError",
          `Unexpected token ${strv(type as TokenType)} after USE keyword`
        );
    }
  }

  private parseTapStatement(): TapStatement {
    if (sys.script)
      throw Err("SyntaxError", "Cannot use TAP statement in LunaScript");

    this.expect(TokenType.TAP);
    this.eat();

    this.expect(TokenType.String);
    let value = this.eat().value;

    if (!value.endsWith(".ln") && !value.endsWith(".lnx")) {
      value += fs.existsSync(value + ".ln")
        ? ".ln"
        : fs.existsSync(value + ".lnx")
        ? ".lnx"
        : ".ln";
    }

    if (value.trim() === "") {
      throw Err("ModuleError", "Cannot use un-named modules");
    }

    return {
      kind: "TapStatement",
      path: {
        kind: "StringLiteral",
        value,
      },
    };
  }

  private parseEmbedStatement(): EmbedStatement {
    this.expect(TokenType.EMBED);
    this.eat();

    this.expect(TokenType.String);
    let value = this.eat().value;

    if (value.trim() === "") {
      throw Err("ModuleError", "Cannot use un-named modules");
    }

    let path = value;

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

    if (fs.existsSync(path) && isFile(path)) {
      let embedCode = fs.readFileSync(path, "utf-8").toString();

      let tokens = tokenize(embedCode);
      let externalProgram = new Parser(tokens, embedCode).produceAST();

      this.program.body = this.program.body.concat(externalProgram.body);
    } else
      throw Err(
        "PreprocessingError",
        `'${path}' was not found on the FileSystem`
      );
    return {
      kind: "EmbedStatement",
      path: value,
    };
  }

  private parseIfStatement() {
    this.expect(TokenType.IF);
    this.eat();

    let object = { kind: "IfStatement" } as IFStatement;

    let condition = this.parseExpression();
    object.test = condition;

    if (
      !this.at() ||
      (this.at().type !== TokenType.OpenBrace &&
        this.at().type !== TokenType.Colon)
    ) {
      throw Err(
        "SyntaxError",
        `Expected '{ or :' after 'if' condition${this.where()}`
      );
    }

    let splitter = this.eat();

    let body: Statement[] = [];

    switch (splitter.type) {
      case TokenType.OpenBrace:
        while (this.notEOF() && this.at().type !== TokenType.CloseBrace) {
          body.push(this.parseStatement());
        }

        this.expect(TokenType.CloseBrace);
        this.eat();
        break;

      case TokenType.Colon:
        if (!this.notEOF()) {
          throw Err(
            "SyntaxError",
            `Unexpected end of input, expecting '}'${this.where()} `
          );
        }
        body.push(this.parseExpression());
        break;
    }

    object.consequent = body;

    if (this.at().type === TokenType.ELSE) {
      this.eat();

      if (this.at().type === TokenType.IF) {
        object.alternate = this.parseIfStatement();
      } else {
        if (this.at().type === TokenType.OpenBrace) {
          this.eat();

          const body2: Statement[] = [];

          while (this.notEOF() && this.at().type !== TokenType.CloseBrace) {
            body2.push(this.parseStatement());
          }

          this.expect(TokenType.CloseBrace);
          this.eat();

          object.alternate = body2;
        } else object.alternate = [this.parseExpression()];
      }
    }

    return object;
  }

  private parseForStatement() {
    this.expect(TokenType.FOR);
    this.eat();

    let object = { kind: "ForStatement" } as ForStatement;

    this.permitEating = false;

    let declaration = this.parseExpression();

    object.declaration = declaration;

    this.expect(TokenType.Semicolon);
    this.eat();

    let condition = this.parseExpression();

    object.test = condition;

    this.expect(TokenType.Semicolon);
    this.eat();

    let increaseExpr = this.parseExpression();

    object.increaser = increaseExpr;

    if (!this.at() || this.at().type !== TokenType.OpenBrace) {
      throw Err(
        "SyntaxError",
        `Expected '{ or :' after 'for' statement${this.where()}`
      );
    }

    const body: Statement[] = [];

    switch (this.eat().type) {
      case TokenType.OpenBrace:
        while (this.notEOF() && this.at().type !== TokenType.CloseBrace) {
          body.push(this.parseStatement());
        }

        this.expect(TokenType.CloseBrace);
        this.eat();
        break;

      case TokenType.Colon:
        body.push(this.parseExpression());
        break;
    }

    object.body = body;

    this.permitEating = true;

    return object;
  }

  private skip() {
    while (
      this.notEOF() &&
      [TokenType.NewLine].includes(this.reallyAt().type as TokenType)
    ) {
      this.reallyEat();
    }
  }

  private eatOptional(t: TokenType = TokenType.Semicolon) {
    if (this.at().type === t && this.permitEating) {
      this.eat();
    }
  }

  private parseWhileStatement() {
    this.expect(TokenType.WHILE);
    this.eat();

    let object = { kind: "WhileStatement" } as WhileStatement;

    let condition = this.parseExpression();

    object.test = condition;

    if (
      !this.at() ||
      (this.at().type !== TokenType.OpenBrace &&
        this.at().type !== TokenType.Colon)
    ) {
      throw Err(
        "SyntaxError",
        `Expected '{ or :' after 'while' condition${this.where()}`
      );
    }

    const body: Statement[] = [];

    switch (this.eat().type) {
      case TokenType.OpenBrace:
        while (this.notEOF() && this.at().type !== TokenType.CloseBrace) {
          body.push(this.parseStatement());
        }

        this.expect(TokenType.CloseBrace);
        this.eat();
        break;

      case TokenType.Colon:
        body.push(this.parseExpression());
        break;
    }

    object.consequent = body;

    return object;
  }

  private eat(): Token {
    this.skip();
    let past = this.tokens.shift() as Token;

    this.tkIdx++;
    return past;
  }

  private reallyEat(): Token {
    // this.skip();
    let past = this.tokens.shift() as Token;

    this.tkIdx++;
    return past;
  }

  private expect(...TT: TokenType[]): Token {
    function formatList(items: any) {
      items = items.map((i: any) => strv(i));
      if (!Array.isArray(items) || items.length === 0) {
        return "";
      }

      if (items.length === 1) {
        return String(items[0]);
      }

      return (
        items.slice(0, -1).join(", ") + " or " + String(items[items.length - 1])
      );
    }

    this.skip();

    const prev = this.tokens[this.idx];

    if (!prev || !TT.includes(prev.type as TokenType)) {
      throw Err(
        "SyntaxError",
        `Unexpected token ${strv(
          prev?.type as TokenType
        )}, expecting: ${formatList(TT)}${this.where(
          this.idx - (this.backupTokens[this.tkIdx].value as string).length - 1
        )}`
      );
    }

    return prev;
  }

  private reallyExpect(...TT: TokenType[]): Token {
    function formatList(items: any) {
      items = items.map((i: any) => strv(i));
      if (!Array.isArray(items) || items.length === 0) {
        return "";
      }

      if (items.length === 1) {
        return String(items[0]);
      }

      return (
        items.slice(0, -1).join(", ") + " or " + String(items[items.length - 1])
      );
    }

    // this.skip();

    const prev = this.tokens[this.idx];

    if (!prev || !TT.includes(prev.type as TokenType)) {
      throw Err(
        "SyntaxError",
        `Unexpected token ${strv(
          prev?.type as TokenType
        )}, expecting: ${formatList(TT)}${this.where(
          this.idx - (this.backupTokens[this.tkIdx].value as string).length - 1
        )}`
      );
    }

    return prev;
  }

  private expectnot(...TT: TokenType[]): Token {
    const prev = this.tokens[this.idx];

    if (!prev || TT.includes(prev.type as TokenType)) {
      throw Err(
        "SyntaxError",
        `Unexpected token ${strv(prev?.type as TokenType)}, expecting: ${TT.map(
          strv
        ).join(" or ")}${this.where(
          this.idx - (this.backupTokens[this.tkIdx].value as string).length - 1
        )}`
      );
    }

    return prev;
  }

  private parsePrimaryExpression(): Statement {
    const token = this.at();

    switch (token.type) {
      case TokenType.Identifier:
        let c = {
          kind: "Identifier",
          value: this.eat().value as string,
        } as Identifier;

        this.eatOptional();

        return c;

      case TokenType.DEBUG:
        return this.parseDebugStatement();

      case TokenType.IF:
        return this.parseIfStatement();

      case TokenType.USE:
        return this.parseUseStatement();

      case TokenType.TAP:
        return this.parseTapStatement();

      case TokenType.EMBED:
        return this.parseEmbedStatement();

      case TokenType.FOR:
        return this.parseForStatement();

      case TokenType.OUT:
        this.eat();
        this.expect(TokenType.FN);
        return this.parseFunctionDeclaration(true);

      case TokenType.FN:
      case TokenType.LAMBDA:
        return this.parseFunctionDeclaration();

      case TokenType.NewLine:
        // case TokenType.Semicolon:
        this.eat();
        return { kind: "EmptyStatement" } as EmptyStatement;

      case TokenType.TYPEOF:
        this.eat();
        return {
          kind: "TypeofExpr",
          value: this.parseMemberExpression(),
        } as TypeofExpr;

      case TokenType.ISDEF:
        this.eat();
        return {
          kind: "IsDefExpression",
          value: this.parsePrimaryExpression(),
        } as IsDefExpression;

      case TokenType.RETURN:
        this.eat();
        let returnExpr = {
          kind: "ReturnExpr",
          value: this.parseExpression(),
        } as ReturnExpr;

        this.eatOptional();

        return returnExpr;

      case TokenType.Float:
      case TokenType.Int:
        return {
          kind: "NumericLiteral",
          value: parseFloat(this.eat().value),
        } as NumericLiteral;

      case TokenType.Undefined:
        this.eat(); // advance past null keyword
        return {
          kind: "UndefinedLiteral",
          value: "undefined",
        } as UndefinedLiteral;

      case TokenType.String:
        let k = {
          kind: "StringLiteral",
          value: this.eat().value,
        } as StringLiteral;

        return k;

      case TokenType.OpenParen:
        this.eat(); // eat the paren

        const value = this.parseExpression();

        this.expect(TokenType.CloseParen);
        this.eat();

        this.eatOptional();

        return value;

      case TokenType.WHILE:
        return this.parseWhileStatement();

      case TokenType.EOF:
        throw Err(
          "SyntaxError",
          "Unexpected token end-of-line" + this.where(1)
        );

      default:
        throw Err(
          "SyntaxError",
          `Unexpected token: ${strv(token.type as TokenType)}${this.where(
            (this.backupTokens[this.tkIdx].value as string).length
          )}`
        );
    }
  }

  private notEOF(): boolean {
    return this.tokens.length > 0 && this.tokens[0].type !== TokenType.EOF;
  }
}
