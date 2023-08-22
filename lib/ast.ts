import { FNVal, RuntimeValue } from "../runtime/values";
import Environment from "./env";

export type NodeType =
  | "Program"
  | "NumericLiteral" // -366.7
  | "StringLiteral" // "Hello, World!"
  | "Identifier"
  | "BinaryExpr" // 1 + 4
  | "TernaryExpr"
  | "MemberExpr" // foo.baz
  | "MemberExprX" // foo.baz
  | "CallExpr"
  | "UnaryExpr" // !true, a++
  | "ImportStatement"
  | "WhileStatement"
  | "IfStatement"
  | "DebugStatement"
  | "ForStatement"
  | "AssignmentExpr"
  | "ActionAssignmentExpr"
  | "NullLiteral"
  | "InequalityExpr"
  | "EqualityExpr"
  | "TypegetExpr"
  | "ReturnExpr"
  | "LogicalExpr"
  | "NullishAssignmentExpr"
  | "NumericalAssignmentExpr"
  | "UndefinedLiteral"
  | "Property"
  | "IfStatement"
  | "WhileStatement"
  | "EmbedStatement"
  | "TapStatement"
  | "UseStatement"
  | "ForeachStatement"
  | "EmptyStatement"
  | "ObjectLiteral"
  | "FunctionDeclaration";

export interface Statement {
  kind: NodeType;
}

export interface Program extends Statement {
  kind: "Program";
  body: Statement[];
}

export interface ActionExpr {
  name: string;
  args: Identifier[];
}

export interface AssignmentExpr extends Expression {
  kind: "AssignmentExpr";
  assigne: Expression;
  value: Expression;
}

export interface ActionAssignmentExpr extends Expression {
  kind: "ActionAssignmentExpr";
  assigne: Expression;
  value: Expression;
  action: ActionExpr;
}

export interface NullishAssignmentExpression extends Expression {
  kind: "NullishAssignmentExpr";
  assigne: Expression;
  value: Expression;
}

export interface UnaryExpr extends Expression {
  kind: "UnaryExpr";
  operator: string;
  value: Expression;
}

export interface NumericalAssignmentExpression extends Expression {
  kind: "NumericalAssignmentExpr";
  assigne: Expression;
  value: Expression;
  operator: string;
}

export interface FunctionDeclaration extends Expression {
  kind: "FunctionDeclaration";
  parameters: AssignmentExpr[];
  name: string;
  body: Statement[];
  async?: boolean;
  lambda?: boolean;
  export: boolean;
}

export interface DebugStatement extends Expression {
  kind: "DebugStatement";
  props: Expression[];
}

export interface Expression extends Statement {
  kind: NodeType; // !
  value?: any;
}

export interface BinaryExpr extends Expression {
  kind: "BinaryExpr";
  left: Expression;
  right: Expression;
  operator: string;
}

export interface TernaryExpr extends Expression {
  kind: "TernaryExpr";
  condition: Expression;
  consequent: Expression;
  alternate: Expression;
}

export interface TypegetExpr extends Expression {
  kind: "TypegetExpr";
  value: Expression;
}

export interface EmptyStatement extends Expression {
  kind: "EmptyStatement";
}

export interface ReturnExpr extends Expression {
  kind: "ReturnExpr";
  value: Expression;
}

export interface InequalityExpr extends Expression {
  kind: "InequalityExpr";
  left: Expression;
  right: Expression;
  operator: string;
}

export interface EqualityExpr extends Expression {
  kind: "EqualityExpr";
  left: Expression;
  right: Expression;
  operator: string;
}

export interface LogicalExpr extends Expression {
  kind: "LogicalExpr";
  left: Expression;
  right: Expression;
  operator: string;
}

export interface CallExpr extends Expression {
  kind: "CallExpr";
  args: Expression[];
  calle: Expression; // not an identifier, cuz it can be (foo.bar)(baz)
  computed: boolean; // foo['bar']() not foo.bar()
}

export interface Identifier extends Expression {
  kind: "Identifier";
  value: string; // like the name, or "value"
}

export interface StringLiteral extends Expression {
  kind: "StringLiteral";
  value: string; // like the name, or "value"
}

export interface NumericLiteral extends Expression {
  kind: "NumericLiteral";
  value: number;
}

export interface UndefinedLiteral extends Expression {
  kind: "UndefinedLiteral";
  value: "undefined";
}

export interface Property extends Expression {
  kind: "Property";
  key: string;
  id: number;
  value: Expression;
  reactiveCBExpr: ActionExpr | undefined;
}

export interface CallExpr extends Expression {
  kind: "CallExpr";
  args: Expression[];
  caller: Expression;
}

export interface MemberExpr extends Expression {
  kind: "MemberExpr";
  object: Expression;
  property: Expression;
  computed: boolean;
}

export interface MemberExprX extends Expression {
  kind: "MemberExprX";
  parent: Expression;
  properties: Expression[];
}

export interface ReactRequirements {
  variant: Expression;
  variantID?: number;
  objectID?: number;
  action: {
    name: string;
    args: Identifier[];
  };
  env: Environment;
  value: Expression | FNVal; // must be evaluated with the value of action.name as Identifier

  isMemberExpr?: boolean;
}

export interface ObjectLiteral extends Expression {
  kind: "ObjectLiteral";
  properties: Property[];
}

export interface IFStatement extends Expression {
  kind: "IfStatement";
  test: Expression;
  consequent: Statement[];

  alternate?: IFStatement | Statement[];
}

export interface Import {
  name: Identifier;
  alternative: Identifier;
}

export interface UseStatement extends Expression {
  kind: "UseStatement";
  imports: Import[] | Identifier;
  path: StringLiteral;
}

export interface TapStatement extends Expression {
  kind: "TapStatement";
  path: StringLiteral;
}

export interface EmbedStatement extends Expression {
  kind: "EmbedStatement";
  path: StringLiteral;
}

export interface ForStatement extends Expression {
  kind: "ForStatement";
  declaration: Expression;
  test: Expression;
  increaser: Statement;
  body: Statement[];

  alternate?: IFStatement | Statement[];
}

export interface WhileStatement extends Expression {
  kind: "WhileStatement";
  test: Expression;
  consequent: Statement[];
}
