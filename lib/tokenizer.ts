import fs from "node:fs";
import colors from "colors";
import { Err } from "./error";
import systemDefaults from "./sys";

// setup colors
colors.enable();

export enum TokenType {
  Identifier,
  String,
  Boolean,
  Float,
  Int,
  // Null,
  Undefined,

  FN,
  LAMBDA,
  // END,
  IF,
  ELSE,
  RETURN,
  FOR,
  IN,
  TO,
  DEBUG,
  WHILE,
  BREAK,
  CONTINUE,

  NewLine,

  // Grouping * Operators
  BinaryOperator,
  Equals,
  Comma,
  Dot,
  Colon,
  Semicolon,
  OpenParen,
  CloseParen,
  OpenBrace,
  CloseBrace,
  OpenBracket,
  CloseBracket,
  EOF,
  PlusEQ,
  MinEQ,
  BAND,
  BOR,
  AND,
  OR,
  BORA,
  BANDA,
  SmallerThan,
  GreaterThan,
  GreaterOrEqual,
  SmallerOrEqual,
  EqualityOp,
  NegativeEqualityOp,
  typeget,
  Increasement,
  LeftShiftOp,
  RightShiftOp,
  NegrationOp,
  NullishOp,
  Ternary,
  Dividor,
  Decreasement,
  Multiplier,
  OUT,
  USE,
  TAP,
  FROM,
  AS,
  EMBED,
  NullishOpEQ,
}

export const strv = (k: TokenType): string => {
  return TokenType[k];
};

export interface Position {
  line: number;
  index: number;
}

export interface Token {
  type: TokenType | string;
  value: any;
  position: Position;
}

/**
 * Constant lookup for keywords and known identifiers + symbols.
 */
export const KEYWORDS: Record<string, TokenType> = {
  fn: TokenType.FN,
  out: TokenType.OUT,
  lambda: TokenType.LAMBDA,
  if: TokenType.IF,
  use: TokenType.USE,
  as: TokenType.AS,
  from: TokenType.FROM,
  else: TokenType.ELSE,
  while: TokenType.WHILE,
  break: TokenType.BREAK,
  continue: TokenType.CONTINUE,
  debug: TokenType.DEBUG,
  to: TokenType.TO,
  return: TokenType.RETURN,
  for: TokenType.FOR,
  or: TokenType.OR,
  and: TokenType.AND,
  tap: TokenType.TAP,
  embed: TokenType.EMBED,
  in: TokenType.IN,
  undefined: TokenType.Undefined,
  typeget: TokenType.typeget,
};

Object.setPrototypeOf(KEYWORDS, null);

function isChar(char: string): boolean {
  // Using regular expression to match valid variable characters
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*/.test(char);
}

function isSymbol(str: string) {
  return "<&*/+|%-=^@!?>".split("").includes(str);
}

/**
 * Returns true if the character is whitespace like -> [\s, \t, \n]
 */
function isskippable(str: string): boolean {
  return (
    str == " " || str == "\n" || str == "\t" || str == "\r" || str === undefined
  );
}

/**
 Return whether the character is a valid integer -> [0-9]
 */
function isint(str: string): boolean {
  return "0123456789".split("").includes(str);
}

export function tokenize(code: string): Token[] {
  let tokens: Token[] = [];

  function token(type: TokenType, value: any): Token {
    let tk = {
      type: type,
      value,
      position: {
        line: line,
        index: idx,
      } as Position,
    };

    tokens.push(tk);

    return tk;
  }

  let characters = code.split("");

  let lines = code.split("\n");

  let line = 0;
  let idx = 0;

  function injectChar(string: string, char: string, pos: number) {
    let leftSide = string.substring(0, pos);
    let rightSide = string.substring(pos);
    return leftSide + char + rightSide;
  }

  function whereErr(i?: number) {
    let vLine = 0;

    let err = "";

    // ✱

    while (vLine <= line) {
      if (!systemDefaults.script) {
        if (vLine === line) {
          err +=
            ((vLine + 1).toString() + ". | ").green.bold.toString() +
            // injectChar(
            //   lines[vLine],
            //   systemDefaults.errors.positionSymbol.red,
            //   idx
            // ) +

            lines[line] +
            "\n";

          err +=
            " ".repeat(vLine + 5 + idx) +
            "~".repeat((i as number) || 0).red +
            "\n";
        } else {
          err += vLine + 1 + ". | " + lines[vLine].gray + "\n";
        }
      } else {
        if (vLine === line) {
          err +=
            (vLine + 1).toString() +
            ". | " +
            injectChar(
              lines[vLine],
              systemDefaults.errors.positionSymbol.red,
              idx
            ) +
            "\n";
        } else {
          err += vLine + 1 + ". | " + lines[vLine].gray + "\n";
        }
      }

      vLine++;
    }

    return err;
  }

  function where(z?: number) {
    return (
      `\n\n${whereErr(i)}\n\n` +
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

  let i = 0;

  while (i < characters.length) {
    let char = characters[i];

    switch (char) {
      case "#":
        i++;
        idx++;

        char = characters[i];
        while (i < characters.length && char !== "\n") {
          i++;
          idx++;

          char = characters[i];
        }
        break;

      case "\n":
        line++;
        idx = 0;

        token(TokenType.NewLine, char);

        i++;
        break;

      case "(":
        token(TokenType.OpenParen, char);
        i++;
        idx++;
        break;

      case ")":
        token(TokenType.CloseParen, char);
        i++;
        idx++;
        break;

      case "{":
        token(TokenType.OpenBrace, char);
        i++;
        idx++;
        break;
      case "}":
        token(TokenType.CloseBrace, char);
        i++;
        idx++;
        break;
      case "[":
        token(TokenType.OpenBracket, char);
        i++;
        idx++;
        break;
      case "]":
        token(TokenType.CloseBracket, char);
        i++;
        idx++;
        break;

      case ",":
        token(TokenType.Comma, char);
        i++;
        idx++;
        break;

      case ":":
        token(TokenType.Colon, char);
        i++;
        idx++;
        break;

      case ";":
        token(TokenType.Semicolon, char);
        i++;
        idx++;
        break;

      case ".":
        token(TokenType.Dot, char);
        i++;
        idx++;
        break;

      default:
        if (isskippable(char)) {
          i++;
          idx++;
        } else if (char === '"') {
          i++;
          idx++;

          let string = "";
          let safe = false;
          let skip = false;

          X: while (i < characters.length) {
            char = characters[i];

            if (char === "\\") {
              if (skip) {
                skip = false;
                string += "\\";
                idx++;
                i++;
              } else {
                skip = true;
                i++;
                idx++;
              }
            } else if (char === '"') {
              if (skip) {
                skip = false;
                string += '"';

                i++;
                idx++;
              } else {
                i++;
                idx++;

                safe = true;
                break X;
              }
            } else {
              if (skip) {
                function custom_escape(x: string): string {
                  let escape_map: any = {
                    n: "\n",
                    t: "\t",
                    r: "\r",
                    b: "\b",
                    f: "\f",
                    v: "\x0B",
                    "\\": "\\",
                    '"': '"',
                    "'": "'",
                  };

                  if (escape_map[x]) {
                    return escape_map[x];
                  } else {
                    return x;
                  }
                }

                string += custom_escape(char);
                i++;
                idx++;

                skip = false;
              } else {
                string += char;
                i++;
                idx++;
              }
            }
          }

          if (!safe) {
            throw Err("SyntaxError", "Unterminated STRING", where(1));
          }

          token(TokenType.String, string);
        } else if (char === "'") {
          i++;
          idx++;

          let string = "";
          let safe = false;
          let skip = false;

          X: while (i < characters.length) {
            char = characters[i];

            if (char === "\\") {
              if (skip) {
                skip = false;
                string += "\\";
                idx++;
                i++;
              } else {
                skip = true;
                i++;
                idx++;
              }
            } else if (char === "'") {
              if (skip) {
                skip = false;
                string += "'";

                i++;
                idx++;
              } else {
                i++;
                idx++;

                safe = true;
                break X;
              }
            } else {
              if (skip) {
                function custom_escape(x: string): string {
                  let escape_map: any = {
                    n: "\n",
                    t: "\t",
                    r: "\r",
                    b: "\b",
                    f: "\f",
                    v: "\x0B",
                    "\\": "\\",
                    '"': '"',
                    "'": "'",
                  };

                  if (escape_map[x]) {
                    return escape_map[x];
                  } else {
                    return x;
                  }
                }

                string += custom_escape(char);
                i++;
                idx++;

                skip = false;
              } else {
                string += char;
                i++;
                idx++;
              }
            }
          }

          if (!safe) {
            throw Err("SyntaxError", "Unterminated STRING", where(1));
          }

          token(TokenType.String, string);
        } else if (isSymbol(char)) {
          let sym = "";

          let nostop = true;
          let emegencyStop = false;
          while (i < characters.length && isSymbol(char) && nostop) {
            char = characters[i];

            if (!isSymbol(char)) {
              continue;
            }

            sym += char;

            if (sym === "+=") {
              token(TokenType.PlusEQ, sym);
              sym = "";
              nostop = false;
              i++;
              idx++;
              continue;
            }

            if (sym === "-=") {
              token(TokenType.MinEQ, sym);
              sym = "";
              nostop = false;
              i++;
              idx++;
              continue;
            }

            if (sym === "&&") {
              token(TokenType.AND, sym);
              sym = "";
              nostop = false;
              i++;
              idx++;
              continue;
            }

            if (sym === "&=") {
              token(TokenType.BANDA, sym);
              sym = "";
              nostop = false;
              i++;
              idx++;
              continue;
            }

            if (sym === "|=") {
              token(TokenType.BORA, sym);
              sym = "";
              nostop = false;
              i++;
              idx++;
              continue;
            }

            if (sym === "||") {
              token(TokenType.OR, sym);
              sym = "";
              nostop = false;
              i++;
              idx++;
              continue;
            }

            if (sym === "*=") {
              token(TokenType.Multiplier, sym);
              sym = "";
              nostop = false;
              i++;
              idx++;
              continue;
            }

            if (sym === "<=") {
              token(TokenType.SmallerOrEqual, sym);
              sym = "";
              nostop = false;
              i++;
              idx++;
              continue;
            }

            if (sym === ">=") {
              token(TokenType.GreaterOrEqual, sym);
              sym = "";
              nostop = false;
              i++;
              idx++;
              continue;
            }

            if (sym === "==") {
              token(TokenType.EqualityOp, sym);
              sym = "";
              nostop = false;
              i++;
              idx++;
              continue;
            }

            if (sym === "/=") {
              token(TokenType.Dividor, sym);
              sym = "";
              nostop = false;
              i++;
              idx++;
              continue;
            }

            if (sym === "++") {
              token(TokenType.Increasement, sym);
              sym = "";
              nostop = false;
              i++;
              idx++;
              continue;
            }

            if (sym === "--") {
              token(TokenType.Decreasement, sym);
              sym = "";
              nostop = false;
              i++;
              idx++;
              continue;
            }

            if (sym === "<<") {
              token(TokenType.LeftShiftOp, sym);
              sym = "";
              nostop = false;
              i++;
              idx++;
              continue;
            }

            if (sym === ">>") {
              token(TokenType.RightShiftOp, sym);
              sym = "";
              nostop = false;
              i++;
              idx++;
              continue;
            }

            if (sym === "!=") {
              token(TokenType.NegativeEqualityOp, sym);
              sym = "";
              nostop = false;
              i++;
              idx++;
              continue;
            }

            if (sym === "**") {
              token(TokenType.BinaryOperator, sym);
              sym = "";
              nostop = false;

              i++;
              idx++;
              continue;
            }

            if (sym === "??") {
              let nextChar = characters[i + 1];

              if (nextChar !== undefined) {
                if (isSymbol(nextChar)) {
                  sym += nextChar;

                  if (nextChar === "=") {
                    token(TokenType.NullishOpEQ, sym);

                    nostop = false;
                    emegencyStop = true;
                    i += 2;
                    idx += 2;
                    continue;
                  } else {
                    token(TokenType.NullishOp, sym);

                    i++;
                    idx++;
                    continue;
                  }
                } else {
                  token(TokenType.NullishOp, sym);

                  i++;
                  idx++;
                  continue;
                }
              } else {
                token(TokenType.NullishOp, sym);
              }
            }

            if (isSymbol(char)) {
              // sym += char;

              i++;
              idx++;
            } else nostop = false;
          }

          if (!emegencyStop)
            switch (sym) {
              case "?":
                token(TokenType.Ternary, sym);
                break;
              case "**":
                token(TokenType.BinaryOperator, sym[0]);
                break;

              case "!":
                token(TokenType.NegrationOp, sym[0]);
                break;
            }

          if (!emegencyStop)
            sym.split("").forEach((c) => {
              switch (c) {
                case "/":
                case "*":
                case "+":
                case "-":
                case "%":
                  token(TokenType.BinaryOperator, c);
                  break;
                case "&":
                  token(TokenType.BAND, c);
                  break;
                case "|":
                  token(TokenType.BOR, c);
                  break;
                case "<":
                  token(TokenType.SmallerThan, c);
                  break;
                case ">":
                  token(TokenType.GreaterThan, c);
                  break;

                case "=":
                  token(TokenType.Equals, c);
                  break;
              }
            });
        } else if (isChar(char)) {
          function checker(char: string) {
            return /^[$§a-zA-Z0-9_]+$/.test(char);
          }

          let id = "";

          let nostop = true;
          while (i < characters.length && checker(char) && nostop) {
            char = characters[i];

            if (checker(char)) {
              id += char;

              idx++;
              i++;
            } else nostop = false;
          }

          let isPreserved = KEYWORDS[id];

          if (!isPreserved) {
            token(TokenType.Identifier, id);
          } else token(isPreserved, id);
        } else if (isint(char)) {
          var enteredFloat = false;

          function updateChar() {
            char = characters[i];
          }

          var res = "";

          while (i < characters.length) {
            if (char === "." || isint(char)) {
              if (char === ".") enteredFloat = true;

              res += char;

              i++;
              idx++;
              updateChar();
            } else {
              break;
            }
          }

          if (res.endsWith(".")) {
            throw Err("SyntaxError", "Unterminated FLOAT.", where(1));
          }

          token(
            enteredFloat ? TokenType.Float : TokenType.Int,
            parseFloat(res)
          );
        } else {
          throw Err(
            "SyntaxError",
            `Invalid UNICODE character '${char}'`,
            where(idx)
          );
        }
    }
  }

  token(TokenType.EOF, "EndOfFile");

  return tokens;
}
