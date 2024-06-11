#!/usr/bin/env node

//@ts-nocheck
import { terminal } from "terminal-kit";
import { colorize } from "./lib/ui";
import { Luna, createContext } from "./luna";
import { MK } from "./runtime/values";
import { KEYWORDS } from "./lib/tokenizer";

process.argv = process.argv.filter((c) => {
  return !c.includes("snapshot");
});

//♦
import fs from "node:fs";
import PATH from "node:path";
import systemDefaults from "./lib/sys";
import LunaTranspiler from "./compiler/compiler";
import { Err } from "./lib/error";

let code: string;
let history: string[] = [];

const checkBrackets = (expression: string) => {
  const stack = [];
  const bracketLookup = {
    "{": "}",
    "(": ")",
    "[": "]",
    // '"': '"',
    // "'": "'"
  };

  let inStr = false;

  for (const key of expression) {
    if (key === '"' && inStr === '"') inStr = false;
    else if (key === "'" && inStr === "'") inStr = false;
    else if (key === "'" && !inStr) inStr = "'";
    else if (key === '"' && !inStr) inStr = '"';

    if (!inStr)
      if (Object.keys(bracketLookup).includes(key)) {
        // matches open brackets
        stack.push(key);
      } else if (Object.values(bracketLookup).includes(key)) {
        //matches closed brackets
        const lastBracket = stack.pop();
        if (bracketLookup[lastBracket as keyof typeof bracketLookup] !== key) {
          return NaN;
        }
      }
  }

  return stack.length;
};

let env = createContext([
  {
    name: "print",
    value: MK.nativeFunc((args, scope) => {
      console.log(args.map((t) => t.value).join(" "));
      return MK.undefined();
    }, "PrintFunc"),
    override: true,
  },

  {
    name: "repl",
    value: MK.object({
      exit: MK.nativeFunc(() => {
        process.exit.call(0);
        return MK.undefined();
      }, "EXIT"),
    }),
    override: true,
  },
]);

async function ask(prompt: string, complete?: Array<string>): Promise<string> {
  return new Promise((resolve) => {
    terminal(prompt);
    terminal.inputField(
      {
        autoComplete: [
          ...Object.keys(KEYWORDS),
          ...env.variables.keys(),
          ...(complete || []),
        ].map((x) => x + " "),
        autoCompleteMenu: true,
        autoCompleteHint: true,
        cancelable: true,
        history: history,
      },
      (err: any, str: any) => {
        resolve(str);
        terminal("\n");
      }
    );
  });
}

function parse(code: string) {
  try {
    let luna = new Luna();

    return luna.produceAST(code);
  } catch (e: any) {
    console.log(e.stack || e);

    return false;
  }
}

const sleep = (i: number) => {
  var waitTill = new Date(new Date().getTime() + i);
  while (waitTill > new Date()) {}
};

function exit() {
  console.log("\nExiting...".gray + "\n");
  process.exit(0);
}

terminal.on("key", (name: any) => {
  if (["CTRL_C", "ESCAPE"].includes(name)) exit();
});

terminal.setCursorColor(1);

async function doEval() {
  code = "";

  async function getCode(prompt = ">> ") {
    let str = await ask(prompt);

    let check = checkBrackets(code + str);

    if (Number.isNaN(check)) {
      console.log(Err("SyntaxError", "Unmatched bracket in REPL-Only"));

      process.exit(0);
    } else if (check === 0) {
      code += code !== "" ? " " + str : str;
    } else {
      code += code !== "" ? " " + str : str;

      await getCode("  ".repeat(check) + "... ".gray);
    }
  }

  await getCode();

  if (code.trim() !== "") {
    history.push(code);

    let ast = parse(code);

    if (!ast) return doEval();

    try {
      let luna = new Luna(env);

      let result = luna.evaluate(code);

      console.log(colorize(result));
    } catch (e: any) {
      console.log(e.stack || e);

      // if (e.toString().includes("MotherError:")) {
      //   console.log("REPL exited due to Native Motherlang Error".red);
      //   process.exit(0);
      // }
    }
  }
  doEval();
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

function doRun(where?: string, print: boolean = true) {
  where = (where || "./index.ln") as string;

  if (!where.endsWith(".ln") && !where.endsWith(".lnx")) {
    where += fs.existsSync(where + ".ln")
      ? ".ln"
      : fs.existsSync(where + ".lnx")
      ? ".lnx"
      : ".ln";
  }

  let pathDetails = PATH.parse(where);

  let fileName = pathDetails.base;
  let fileDir = pathDetails.dir;

  if (!fileDir) fileDir = "./";

  let ast: any;

  cls(() => {
    if (fileName) {
      print &&
        terminal.green(
          `\n🧠 Evaluating '${fileName}' from: '${PATH.join(
            fileDir,
            fileName
          )}'\n`
        );
    } else print && terminal.green(`\n🧠 Evaluating '${fileDir}'\n`);
    print && sleep(500);

    if (fs.existsSync(where as string) && isFile(where as string)) {
      code = fs.readFileSync(where as string, "utf-8").toString();

      ast = parse(code);

      if (!ast) return exit();

      try {
        let luna = new Luna();
        let result = luna.evaluate(code, undefined, fileDir);

        console.log(colorize(result));
      } catch (e: any) {
        console.log(e.stack || e);
      }

      exit();
    } else {
      cls(() => {
        function askAgain() {
          terminal.slowTyping(
            `\nMissing '${fileName}' file in '${
              fileDir === "." ? "/" : fileDir
            }'\n`,
            {
              flashStyle: terminal.brightWhite,
              delay: 20,
              style: terminal.red,
            },
            async () => {
              sleep(1500);

              cls(() => {});
              let str = await ask(
                `\n🌙 Luna file path ["exit": exit] ⟹  `.green
              );

              if (str.trim() === "exit") exit();
              else {
                let path = str;

                if (!path.endsWith(".ln") && !path.endsWith(".lnx")) {
                  path += fs.existsSync(path + ".ln")
                    ? ".ln"
                    : fs.existsSync(where + ".lnx")
                    ? ".lnx"
                    : ".ln";
                }

                pathDetails = PATH.parse(path);

                fileName = pathDetails.base;
                fileDir = pathDetails.dir || "./";

                !path && exit();

                if (fs.existsSync(path) && isFile(path)) {
                  function getFile(filePath: string): string | null {
                    const parsedPath = PATH.parse(filePath);
                    if (parsedPath.base) {
                      return parsedPath.base;
                    }
                    return null;
                  }

                  let file = getFile(path);
                  if (file) {
                    terminal.green(
                      `\n🧠 Evaluating '${fileName}' from: '${PATH.join(
                        fileDir,
                        fileName
                      )}'\n`
                    );
                  } else terminal.green(`\n\n🧠 Evaluating '${path}'\n`);
                  sleep(500);

                  code = fs.readFileSync(path, "utf-8").toString();

                  ast = parse(code);

                  if (!ast) return exit();

                  try {
                    let luna = new Luna();
                    let result = luna.evaluate(code, undefined, fileDir);

                    console.log(colorize(result));
                  } catch (e: any) {
                    console.log(e.stack || e);
                  }

                  exit();
                } else askAgain();
              }
            }
          );
        }

        askAgain();
      });
    }
  });
}

async function doCompile(where?: string) {
  where = where || "./index.ln";

  if (!where.endsWith(".ln") && !where.endsWith(".lnx")) {
    where += fs.existsSync(where + ".ln")
      ? ".ln"
      : fs.existsSync(where + ".lnx")
      ? ".lnx"
      : ".ln";
  }

  let pathDetails = PATH.parse(where);

  let fileName = pathDetails.base;
  let fileDir = pathDetails.dir;

  let dest = fileName.replaceAll(".ln", "") + ".js";

  cls(() => {
    terminal.green(
      fileName
        ? `⚒️ Compiling (${fileName} → ${dest}) from: '${where}'\n`
        : `⚒️ Compiling from: '${where}'\n`
    );
    sleep(500);
  });

  if (fs.existsSync(where)) {
    code = fs.readFileSync(where, "utf-8").toString();
  } else {
    cls(() => {
      function askAgain() {
        terminal.slowTyping(
          `\nFile doesn't exist in the dir '${fileDir}'.\n`,
          {
            flashStyle: terminal.brightWhite,
            delay: 20,
            style: terminal.red,
          },
          async () => {
            sleep(1500);

            terminal.clear();
            let str = await ask(`\n🌙 Luna file path ["exit": exit] ⟹  `.green);

            if (str.trim() === "exit") exit();
            else {
              let path = str;

              if (fs.existsSync(path) && isFile(path)) {
                let pathDetails = PATH.parse(path);

                let fileName = pathDetails.base;
                let fileDir = pathDetails.dir;

                let dest = fileName.replaceAll(".ln", "") + ".js";

                terminal.green(
                  fileName
                    ? `⚒️ Compiling (${fileName} → ${dest}) from: '${where}'\n`
                    : `⚒️ Compiling '${where}'\n`
                );

                sleep(1000);

                code = fs.readFileSync(path, "utf-8").toString();

                try {
                  let lTrans = new LunaTranspiler(code);
                  let js = await lTrans.translate(false);

                  fs.writeFileSync(
                    fileName ? PATH.join(fileDir, dest) : fileDir + ".js",
                    js
                  );

                  console.log("file saved at: " + PATH.join(fileDir, dest));
                } catch (e: any) {
                  console.log(e.stack || e);
                }

                exit();
              } else askAgain();
            }
          }
        );
      }

      askAgain();
    });
  }
}

function cls(cb: any, m: boolean) {
  m && terminal.clear();

  m && terminal.yellow(`${systemDefaults.name} REPL → Type "exit" to leave.\n`);

  try {
    cb();
  } catch (e: any) {
    console.log(e.stack || e);
  }
}

// terminal.clear();
function input() {
  if (process.argv.includes("-v") || process.argv.includes("--version")) {
    console.log(
      `\n🌙 Luna 2023 → Version ${systemDefaults.version.green}`.yellow
    );
  } else if (process.argv.includes("-h") || process.argv.includes("--help")) {
    var text =
      "\n" +
      `${"<file.ln>".yellow} : Execute Luna file.\n\n` +
      `   [${"-c".cyan} 🌙 ${"--compile".cyan}] ${"<file.ln>".yellow} : ${
        "Compile Luna File into Motherlang.".italic
      }\n` +
      `   [${"-y".cyan} 🌙 ${"--yes".cyan}]               : ${
        "Enter REPL Mode.".italic
      }\n` +
      `   [${"-n".cyan} ${"🌙".cyan} ${"--no".cyan}]                : ${
        "Execute default Luna index file 'index.ln'.".italic
      }\n` +
      `   [${"-h".cyan} ${"🌙".cyan} ${"--help".cyan}]              : ${
        "Show Luna help menu (this).".italic
      }\n` +
      `   [${"-v".cyan} ${"🌙".cyan} ${"--version".cyan}]           : ${
        "Show the current version of Luna.".italic
      }\n` +
      `\n`;

    console.clear();
    console.log(`Luna 2023 → Help Menu`.yellow.underline + " 🌙\n" + text);
  } else if (!(process.argv.includes("-y") || process.argv.includes("--yes"))) {
    if (process.argv.includes("-n") || process.argv.includes("--no")) {
      cls(doRun);
    } else {
      // @ts-ignore
      if (process.pkg ? process.argv.length <= 1 : process.argv.length <= 2) {
        terminal.green("Enter REPL Mode? [Y/n]: ");
        terminal.yesOrNo(
          { yes: ["y", "ENTER"], no: ["n"] },
          function (_, result) {
            if (result) {
              cls(() => {
                terminal.green("Entering REPL Mode...\n");
                sleep(1000);
                cls(doEval);
              });
            } else {
              cls(doRun);
            }
          }
        );
      } else {
        // @ts-ignore
        let file = process.argv[(process.pkg ? 0 : 1) + 1];

        if (process.argv.includes("-c") || process.argv.includes("--compile")) {
          cls(() => doCompile(file));
        } else cls(() => doRun(file, false), false);
      }
    }
  } else {
    cls(doEval);
  }
}

let fast = true;

if (!fast)
  terminal.slowTyping(
    `${systemDefaults.name} REPL → Type "exit" to leave.\n`,
    { flashStyle: terminal.brightWhite, delay: 5, style: terminal.yellow },
    input
  );
else input();
