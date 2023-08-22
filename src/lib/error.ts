import SystemDetails from "./sys";

export function Err(
  type: string,
  desc: string = "Unknown Error!",
  suffix: string = ""
): string {
  // let prefix = "\nUNCAUGHT ERR!".underline.red.bold.toString() + " 🪲",
  let prefix = "",
    original;

  if (SystemDetails.script) {
    original = `🪲  ${type}: ${desc}.`;
  } else {
    original = `🪲  ${type.red.underline.bold.toString()}: ${desc.gray}.`;
  }

  original = "\n" + original;

  return prefix + original + suffix;
}
