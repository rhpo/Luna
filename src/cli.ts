#!/usr/bin/env node

import { terminal } from "terminal-kit";
import { colorize } from "./lib/ui";
import { Luna, createContext } from "./luna";
import { MK } from "./runtime/values";
import { KEYWORDS } from "./lib/tokenizer";
import { exec } from "pkg";

import beautify from "js-beautify/js";

process.argv = process.argv.filter((c) => {
  return !c.includes("snapshot");
});

//♦
import fs from "node:fs";
import PATH from "node:path";
import systemDefaults from "./lib/sys";
import LunaTranspiler from "../transpiler/transpiler";
import { Err } from "./lib/error";
import { evaluateFunctionCall } from "./runtime/evaluation/eval";

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

process.stdin.setRawMode(true);
let onKeypressQueue: any[] = [];

let env = createContext([
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
    name: "onkeypress",
    value: MK.nativeFunc((args, scope) => {
      onKeypressQueue.push(args[0]);
      return MK.void();
    }, "OnKeyPress"),
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

function exit() {
  console.log("\nExiting...".gray + "\n");
  process.exit(0);
}

terminal.on("key", (name: any) => {
  onKeypressQueue.forEach((cb) => {
    evaluateFunctionCall(cb, [MK.string(name)], env);
  });

  if (["CTRL_C", "ESCAPE"].includes(name)) exit();
});

async function cli() {
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

      // ADD: Support for "void" values, which are not meant to be displayed.
      // if result = void then return of colorize(result) should be null
      // if null, console.log() should not be called
      let output = colorize(result);
      output && console.log(output);

      await cli();
    } catch (e: any) {
      console.log(e.stack || e);

      await cli();
    }
  } else {
    await cli();
  }
}

let welcome = `Welcome to the ${systemDefaults.name} REPL!`.green;

async function main(argums: string[]) {
  const args = argums.slice(argums[0].includes("node") ? 2 : 1);

  let switches = args.filter((x) => x.startsWith("-"));

  const has = (flag: string) => {
    return (
      switches.includes(flag) || switches.includes(`-${flag.substring(1)}`)
    );
  };

  if (args.length === 0) {
    console.log(welcome);
    await cli();
  } else {
    let first = args[0];

    let file = args[1];
    switch (first) {
      case "repl":
        console.log(welcome);
        await cli();
        break;

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
              fileName.replaceAll(".ln", "").replaceAll(".lib", ".js") + ".js";
            let newFilePath = PATH.join(pathDetails.dir, filenew);

            try {
              motherCode = beautify.js(motherCode, { indent_size: 3 });
            } catch {}

            fs.writeFileSync(newFilePath, motherCode, "utf8");

            console.log(
              "New MotherLang (.JS) file created at: ".green + newFilePath
            );
          } catch (e: any) {
            console.log(e.stack || e);
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
              fileName.replaceAll(".ln", "").replaceAll(".lnx", ".lib") + ".js";
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

main(process.argv);
