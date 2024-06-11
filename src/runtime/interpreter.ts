import { RuntimeValue, MK } from "./values";
import {
  AssignmentExpr,
  BinaryExpr,
  Identifier,
  NumericLiteral,
  Program,
  Statement,
  StringLiteral,
  ObjectLiteral,
  CallExpr,
  FunctionDeclaration,
  EqualityExpr,
  InequalityExpr,
  LogicalExpr,
  NullishAssignmentExpression,
  NumericalAssignmentExpression,
  TypeofExpr,
  IFStatement,
  WhileStatement,
  UnaryExpr,
  ActionAssignmentExpr,
  MemberExprX,
  ReturnExpr,
  TernaryExpr,
  DebugStatement,
  ForStatement,
  TapStatement,
  UseStatement,
  ArrayLiteral,
  IsDefExpression,
} from "../lib/ast";
import Environment from "../lib/env";
import { Err } from "../lib/error";
import systemDefaults from "../lib/sys";
import {
  evalLogicalExpression,
  evaluateActionAssignment,
  evaluateArray,
  evaluateAssignment,
  evaluateBinExpression,
  evaluateCallExpr,
  evaluateDebugStatement,
  evaluateEqualityExpression,
  evaluateForStatement,
  evaluateFunctionDeclaration,
  evaluateIdentifier,
  evaluateIfStatement,
  evaluateIsDef,
  evaluateMemberExprX,
  evaluateNullishAssignment,
  evaluateNumericalAssignmentExpression,
  evaluateObjectExpression,
  evaluateString,
  evaluateTapStatement,
  evaluateTernaryExpr,
  evaluateTypeof,
  evaluateUnaryExpr,
  evaluateUseStatement,
  evaluateWhileStatement,
  evalulateInequalityExpression,
  evalulateProgram,
} from "./evaluation/eval";

function hasNestedVariables(str: string): boolean {
  let isNested = false;
  let isEscaped = false;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];

    if (char === "{") {
      if (!isEscaped) {
        isNested = true;
      }
      isEscaped = false;
    } else if (char === "}") {
      isEscaped = false;
    } else if (char === "\\") {
      isEscaped = !isEscaped;
    } else {
      isEscaped = false;
    }
  }

  return isNested;
}

function isLegal(env: Environment) {
  if (env.properties.in && env.properties.in === "function") {
    return true;
  } else if (env.parent) return isLegal(env.parent);
  else return false;
}

let lastEvaluated: RuntimeValue;

export function evaluate(astNode: Statement, env: Environment): RuntimeValue {
  // try {
  switch (astNode.kind) {
    case "NumericLiteral":
      lastEvaluated = MK.number((astNode as NumericLiteral).value);
      return lastEvaluated;

    case "TernaryExpr":
      lastEvaluated = evaluateTernaryExpr(astNode as TernaryExpr, env);
      return lastEvaluated;

    case "UseStatement":
      lastEvaluated = evaluateUseStatement(astNode as UseStatement, env);
      return lastEvaluated;

    case "TapStatement":
      lastEvaluated = evaluateTapStatement(astNode as TapStatement, env);
      return lastEvaluated;

    case "EmbedStatement":
      return MK.undefined();

    case "ReturnExpr":
      if (isLegal(env)) {
        return {
          type: "return",
          informations: {},
          value: evaluate((astNode as ReturnExpr).value, env),
        };
      } else throw Err("SynaxError", `Illegal return statement`);

    case "StringLiteral":
      let v = (astNode as StringLiteral).value;

      if (!hasNestedVariables(v)) {
        lastEvaluated = MK.string((astNode as StringLiteral).value);
        return lastEvaluated;
      } else lastEvaluated = evaluateString(astNode as StringLiteral, env);
      return lastEvaluated;

    case "ArrayLiteral":
      lastEvaluated = evaluateArray(astNode as ArrayLiteral, env);
      return lastEvaluated;

    case "BinaryExpr":
      lastEvaluated = evaluateBinExpression(astNode as BinaryExpr, env);
      return lastEvaluated;

    case "Identifier":
      lastEvaluated = evaluateIdentifier(astNode as Identifier, env);
      return lastEvaluated;

    case "Program":
      lastEvaluated = evalulateProgram(astNode as Program, env);
      return lastEvaluated;

    case "UndefinedLiteral":
      lastEvaluated = MK.undefined();
      return lastEvaluated;

    case "InequalityExpr":
      lastEvaluated = evalulateInequalityExpression(
        astNode as InequalityExpr,
        env
      );
      return lastEvaluated;

    case "EqualityExpr":
      lastEvaluated = evaluateEqualityExpression(astNode as EqualityExpr, env);
      return lastEvaluated;

    case "LogicalExpr":
      lastEvaluated = evalLogicalExpression(astNode as LogicalExpr, env);
      return lastEvaluated;

    case "ObjectLiteral":
      lastEvaluated = evaluateObjectExpression(astNode as ObjectLiteral, env);
      return lastEvaluated;

    case "CallExpr":
      lastEvaluated = evaluateCallExpr(astNode as CallExpr, env);
      return lastEvaluated;

    case "DebugStatement":
      lastEvaluated = evaluateDebugStatement(astNode as DebugStatement, env);
      return lastEvaluated;

    case "IfStatement":
      lastEvaluated = evaluateIfStatement(astNode as IFStatement, env);
      return lastEvaluated;

    case "ForStatement":
      lastEvaluated = evaluateForStatement(astNode as ForStatement, env);
      return lastEvaluated;

    case "WhileStatement":
      lastEvaluated = evaluateWhileStatement(astNode as WhileStatement, env);
      return lastEvaluated;

    case "TypeofExpr":
      lastEvaluated = evaluateTypeof(astNode as TypeofExpr, env);
      return lastEvaluated;

    case "IsDefExpression":
      lastEvaluated = evaluateIsDef(astNode as Identifier, env);
      return lastEvaluated;

    case "AssignmentExpr":
      lastEvaluated = evaluateAssignment(astNode as AssignmentExpr, env);
      return lastEvaluated;

    case "ActionAssignmentExpr":
      lastEvaluated = evaluateActionAssignment(
        astNode as ActionAssignmentExpr,
        env
      );
      return lastEvaluated;

    case "NullishAssignmentExpr":
      lastEvaluated = evaluateNullishAssignment(
        astNode as NullishAssignmentExpression,
        env
      );
      return lastEvaluated;

    case "MemberExprX":
      lastEvaluated = evaluateMemberExprX(astNode as MemberExprX, env);
      return lastEvaluated;

    case "NumericalAssignmentExpr":
      lastEvaluated = evaluateNumericalAssignmentExpression(
        astNode as NumericalAssignmentExpression,
        env
      );
      return lastEvaluated;

    case "UnaryExpr":
      lastEvaluated = evaluateUnaryExpr(astNode as UnaryExpr, env);
      return lastEvaluated;

    case "EmptyStatement":
      return lastEvaluated || MK.undefined();

    case "FunctionDeclaration":
      lastEvaluated = evaluateFunctionDeclaration(
        astNode as FunctionDeclaration,
        env
      );
      return lastEvaluated;

    default:
      throw Err(
        "NameError",
        `This Node of kind '${astNode.kind}' has a type that is not yet supported by the ${systemDefaults.name} interpreter`
      );
  }
}
