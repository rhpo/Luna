import colors from "colors";
import { ArrayValue, FNVal, NativeFNVal, RuntimeValue } from "../runtime/values";

let entrance = 0;
export function colorize(
  result: RuntimeValue,
  isInner: boolean = false,
  noString: boolean = false
) {
  switch (result.type) {
    case "string":
      return noString ? result.value : colors.green('"' + result.value + '"');

    case "array":
      let array = result as ArrayValue;

      let max = array.value.length > 16;

      if (!max) {
        return "[".cyan + array.value.map(function(e): any {return colorize(e, true)}).join(', ') + "]".cyan;
      }

      else {

        let arrayFrom0to16 = array.value.slice(0, 16);

        return `(${array.value.length} elements) `.cyan + "[".yellow + arrayFrom0to16.map(e => function() {return colorize(e, true)}).join(', ') + ", ...".gray + "]".yellow;
      }

    case "number":
      if (!Number.isFinite(result.value))
        return Number.isNaN(result.value) ? "NaN".cyan :  colors.cyan(result.value.toString().toLowerCase());
      else return colors.yellow(result.value);

    case "undef":
      return "undef".gray;

    case "NaN":
      return "NaN".cyan;

    case "fn": {
      let fn = result as FNVal;

      let { name, parameters } = fn;

      let isAnon = name === "@ANONYMOUS";

      if (isAnon)
        name = `${"lambda".magenta} ${parameters
          .map((param) => param.assigne)
          .join(" ")}`;
      else {
        name = `${fn.export ? "out".green + " " : ""}${
          "fn".magenta
        } ${name.blue.bold.toString()} ${parameters
          .map((param) => (param.assigne as any as string).green)
          .join(" ")}`;
      }

      return (
        name +
        `${parameters.length > 0 ? " " : ""}{${
          fn.body.length > 0 ? " ... " : ""
        }}`.gray
      );
    }
    
    case "native-fn": {
      let fn = result as NativeFNVal;

      const { name } = fn;

      return (

        ! isInner ?
        `${colors.magenta("fn")} ${name.cyan} {\n` +
        "  " +
        `${
          "  ".repeat(entrance) +
          "(NAT-C)...".italic +
          "\n" +
          "  ".repeat(entrance) +
          "}"
        }` : `${colors.magenta("fn")} ${name.cyan}`	
      );
    }

    case "boolean":
      return colors.magenta(result.value);

    case "null":
      return colors.magenta(result.value);

    case "object":
      entrance++;
      try {
        let jsonStr = "{".gray;

        result.properties?.forEach((value, key) => {
          jsonStr += `\n  ${key.blue}: ${colorize(value, true)},`;
        });

        if (result.properties && result.properties?.size > 0) {
          jsonStr = jsonStr.substring(0, jsonStr.length - 1);
          jsonStr += "\n";
        }

        jsonStr += "}".gray;

        entrance--;
        return isInner ? colors.gray("{ ... }") : jsonStr;
      } catch {
        let jsonStr = "{".gray;

        result.properties?.forEach((value, key) => {
          jsonStr += `\n  ${key.blue}: ${value},`;
        });

        if (result.properties && result.properties?.size > 0) {
          jsonStr = jsonStr.substring(0, jsonStr.length - 1);
          jsonStr += "\n";
        }

        jsonStr += "}".gray;
        entrance--;
        return isInner ? colors.gray("{ ⨁ CIRCULAR ... }") : jsonStr;
      }

    default:
      return colors.yellow(result?.value || result);
  }
}
