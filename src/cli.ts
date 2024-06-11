#!/usr/bin/env node

import { terminal } from "terminal-kit";
import { colorize } from "./lib/ui";
import { Luna, createContext } from "./luna";
import { FNVal, MK, RuntimeValue } from "./runtime/values";
import { KEYWORDS } from "./lib/tokenizer";
import { exec } from "pkg";
import beautify from "js-beautify/js";
import keypress from "keypress";
import openFile from "open-file-explorer";
import os from "os";

process.argv = process.argv.filter((c) => {
  return !c.includes("snapshot");
});

//♦
import fs from "node:fs";
import PATH from "node:path";
import systemDefaults from "./lib/sys";
import LunaTranspiler from "../transpiler/transpiler";
import { Err } from "./lib/error";
import {
  evaluateFunctionCall,
  resolveExports,
} from "./runtime/evaluation/eval";
import Environment from "./lib/env";
import childProcess from "child_process";

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

  let inStr: boolean | string = false;

  for (const key of expression) {
    if (key === '"' && inStr === '"') inStr = false;
    else if (key === "'" && inStr === "'") inStr = false;
    else if (key === "'" && !inStr) inStr = "'";
    else if (key === '"' && !inStr) inStr = '"';

    if (!inStr)
      if (Object.keys(bracketLookup).includes(key)) {
        stack.push(key);
      } else if (Object.values(bracketLookup).includes(key)) {
        const lastBracket = stack.pop();
        if (bracketLookup[lastBracket as keyof typeof bracketLookup] !== key) {
          return NaN;
        }
      }
  }

  return stack.length;
};

let onKeypressQueue: any[] = [];

// let path = path/to/user/Docuemts/luna-core/
let basedir = PATH.join(
  os.homedir(),
  `Documents/${systemDefaults.name.toLowerCase()}-core`,
  `/v${systemDefaults.version}`
);

let env = createContext([]);

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

let beforeExit: RuntimeValue;
function exit() {
  if (beforeExit && beforeExit.type == "fn")
    evaluateFunctionCall(beforeExit as FNVal, [], env);

  try {
    fs.writeFileSync(
      PATH.join(basedir, "/history.json"),
      JSON.stringify(history)
    );
  } catch {}

  console.log("\nExiting...".gray);
  process.exit(0);
}

let doneSetupAlready = false;
function setupKey() {
  if (!doneSetupAlready) {
    doneSetupAlready = true;
    keypress(process.stdin);
    process.stdin.resume();
    process.stdin.setRawMode(true);

    process.stdin.on("keypress", function (ch, key) {
      if (key && key.ctrl && ["c", "d"].includes(key.name)) exit();

      key &&
        onKeypressQueue.forEach((cb: FNVal) => {
          evaluateFunctionCall(
            cb,
            [
              MK.object({
                name: MK.string(key.name),
                ctrl: MK.bool(key.ctrl),
                shift: MK.bool(key.shift),
                meta: MK.bool(key.meta),
                sequence: MK.string(key.sequence),
                code: MK.string(key.code),
                raw: MK.string(key.raw),
                full: MK.string(key.full),
              }),
            ],
            cb.declarationEnv
          );
        });
    });
  }
}

async function cli() {
  setupKey();

  let code = "";

  async function getCode(prompt = ">> ") {
    let str = await ask(prompt);

    let check = checkBrackets(code + str);

    if (Number.isNaN(check)) {
      console.log(Err("SyntaxError", "Unmatched bracket in REPL-Only"));

      await cli();
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

    try {
      let luna = new Luna(env);

      let result = luna.evaluate(code);
      let output = colorize(result);
      output && console.log(output);

      code = "";
      await cli();
    } catch (e: any) {
      console.log(e.stack || e);
      code = "";
      await cli();
    }
  } else {
    await cli();
  }
}

let welcome =
  `Welcome to the ${systemDefaults.name} REPL!`.green +
  `\nType ${"exit()".underline.green.dim} ${"to leave...".gray}`.gray;

async function main(argums: string[]) {
  const args = argums.slice(argums[0].includes("node") ? 2 : 1);
  // let switches = args.filter((x) => x.startsWith("-"));

  let first = args[0];

  if (args[0] == "doctor") {
    if (!fs.existsSync(basedir)) {
      let pathBuilder = os.homedir();

      function build(name: string) {
        pathBuilder = PATH.join(pathBuilder, name);
        if (!fs.existsSync(pathBuilder)) {
          fs.mkdirSync(pathBuilder);
          console.log(`Making ${pathBuilder}`);
        }
        console.log(`Already Available: ${pathBuilder}`);
      }

      build("Documents");
      build(`${systemDefaults.name.toLowerCase()}-core`);
      build(`v${systemDefaults.version}`);
      build("modules");
      // TODO: Download all modules from the web...
      console.log(
        "Coming soon: Download all modules to '/modules' directory..."
      );
      return console.log("Everything Fixed ✅");
    } else return console.log("Everything fine ✅");
  } else if (!fs.existsSync(basedir)) {
    console.error(
      `Base Directory ${basedir} doesn't exist. Please run \`luna doctor\``
    );
  } else {
    let defaultConfig = "";
    if (!fs.existsSync(PATH.join(basedir, "config.lnx")))
      fs.writeFileSync(PATH.join(basedir, "config.lnx"), defaultConfig);

    if (!fs.existsSync(PATH.join(basedir, "history.json")))
      fs.writeFileSync(PATH.join(basedir, "history.json"), "[]");

    if (args[0] == "core") {
      console.log(`Opening '${basedir}'...`);
      return openFile(basedir, (error: any) => {
        if (error) {
          return console.log(
            `Error Opening '${basedir}', try running \`${systemDefaults.name.toLowerCase()} doctor\``
          );
        }
      });
    } else if (args[0] == "help") {
      console.log(
        `Usage: ${systemDefaults.name.toLowerCase()} [command] [file] [options]`
      );
      console.log(
        `Commands: \n\tcompile \n\tbuild \n\tcore \n\tdoctor \n\thelp \n\tversion`
      );
      console.log(
        `Options: \n\t--target \n\t--output \n\t--version \n\t--help \n\t--core`
      );
      return;
    } else if (args[0] == "version") {
      return console.log(`Version: ${systemDefaults.version}`);
    } else if (args[0] == "config") {
      console.log("Opening config file...");
      return openFile(PATH.join(basedir, "config.lnx"), (error: any) => {
        if (error) {
          return console.log(
            `Error Opening '${basedir}', try running \`${systemDefaults.name.toLowerCase()} doctor\``
          );
        }
      });
    }

    // Removed the Duplicates for easier use...
    history = [
      ...new Set(
        JSON.parse(
          fs.readFileSync(PATH.join(basedir, "history.json")).toString()
        ) as Array<string>
      ),
    ];

    // add config.lnx to env
    let myEnv = new Environment();
    let exports = resolveExports(
      new Luna(myEnv).produceAST(
        fs.readFileSync(PATH.join(basedir, "/config.lnx")).toString()
      ),
      myEnv,
      basedir
    );

    //  CAN USE THIS TO CONFIGURE KEYS
    //  LIKE COMPILER BEHAVIOUR OR DEFAULT
    //  STRINGS OR VALUES
    let config = exports.get("config");
    exports.delete("config");

    if (config?.properties?.has("before_exit"))
      beforeExit = config?.properties?.get("before_exit") as FNVal;

    env = createContext([
      {
        name: "print",
        value: MK.nativeFunc((args, scope) => {
          console.log(
            args
              .map((t) => {
                if (t.type === "string") {
                  return t.value;
                } else {
                  return colorize(t, false, true);
                }
              })
              .join(" ")
          );
          return MK.void();
        }, "PrintFunc"),
        override: true,
      },

      {
        name: "keypress",
        value: MK.nativeFunc((args, scope) => {
          onKeypressQueue.push(args[0]);
          return MK.void();
        }, "OnKeyPress"),
        override: true,
      },

      ...Array.from(exports, ([name, value]) => ({
        name,
        value,
        override: true,
      })),

      {
        name: "exit",
        value: MK.nativeFunc(() => {
          exit();
          return MK.void();
        }, "ExitFunc"),
        override: true,
      },
    ]);

    env.parent = myEnv;

    if (args.length === 0) {
      console.log(welcome);
      await cli();
    } else {
      let file = args[1];
      switch (first) {
        case "compile":
          // transpile then generate exe
          if (!file) {
            console.log("Please provide a file to compile");
            break;
          }
          if (fs.existsSync(file)) {
            try {
              let code = fs.readFileSync(file, "utf8").toString();
              let luna = new LunaTranspiler(code);
              let motherCode = await luna.translate(false);

              // change extension to .js
              let pathDetails = PATH.parse(file);
              let fileName = pathDetails.base;

              let filenew =
                fileName.replaceAll(".ln", "").replaceAll(".lib", ".js") +
                ".js";
              let newFilePath = PATH.join(pathDetails.dir, filenew);

              try {
                motherCode = beautify.js(motherCode, { indent_size: 3 });
              } catch {}

              fs.writeFileSync(newFilePath, motherCode, "utf8");

              console.log(
                "New MotherLang (.JS) file created at: ".green + newFilePath
              );
            } catch (e: any) {
              return console.log(e.stack || e);
            }
          }
          break;

        case "build":
          // we pack the code as string, and we pack the entire luna code with it so it can be evaluated

          if (!file) {
            console.log("Please provide a file to build");
            break;
          }
          if (fs.existsSync(file)) {
            try {
              let code = fs.readFileSync(file, "utf8").toString();
              let luna = new LunaTranspiler(code, true);
              let motherCode = await luna.translate(true);

              try {
                motherCode = beautify.js(motherCode, { indent_size: 3 });
              } catch {}

              let pathDetails = PATH.parse(file);
              let fileName = pathDetails.base;

              let filenew =
                fileName.replaceAll(".ln", "").replaceAll(".lnx", ".lib") +
                ".js";
              let newFilePath = PATH.join(pathDetails.dir, filenew);

              console.log(motherCode);

              fs.writeFileSync(newFilePath, motherCode, "utf8");

              let finalPath = PATH.join(pathDetails.dir, filenew);
              await exec([
                finalPath,
                "--target",
                "host",
                "--output",
                PATH.join(pathDetails.dir, filenew.replaceAll(".js", ".exe")),
              ]);

              fs.unlinkSync(newFilePath);

              console.log(
                "App built at: ".green + finalPath.replaceAll(".js", ".exe")
              );
            } catch (e: any) {
              console.log(e.stack || e);
            }
          }

        default:
          let runner = first;
          runner = PATH.resolve(runner); // to make it absolute
          if (fs.existsSync(runner)) {
            try {
              let code = fs.readFileSync(runner, "utf8").toString();
              let luna = new Luna(env);
              luna.evaluate(code, env);
            } catch (e: any) {
              console.log(e.stack || e);
            }
          } else {
            console.log("File not found!".red);
          }
          break;
      }
    }
  }
}

main(process.argv);
