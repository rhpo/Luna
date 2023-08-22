import {
  FNVal,
  FunctionCall,
  MK,
  NativeFNVal,
  RuntimeValue,
} from "../runtime/values";
import native, { fnDec } from "../native/func";

let SSC: Map<string, RuntimeValue> = new Map();
let MODULES: Map<string, { [key: string]: fnDec | NativeFNVal }> = new Map();

native.nativelib.forEach((cls) => {
  if (cls.public) {
    cls.collection.forEach((fn) => {
      SSC.set(
        fn.name,
        MK.nativeFunc(
          fn.body as FunctionCall,
          fn.nativeName || fn.name.toUpperCase()
        ) as RuntimeValue
      );
    });

    cls.variables?.forEach((v) => {
      SSC.set(v.name, v.value);
    });
  } else {
    let k: any = {};

    cls.collection.forEach((key) => {
      k[key.name] = key;

      k[key.name].type = "native-fn";
    });

    cls.variables?.forEach((v) => {
      k[v.name] = v.value;
    });

    MODULES.set(cls.exportAs, k);
  }
});

native.variables.forEach((vr) => {
  SSC.set(vr.name, vr.value as RuntimeValue);
});

export default {
  name: "Luna",
  scope: SSC,
  version: "0.0.1",
  modules: MODULES,
  script: !(
    typeof process !== "undefined" &&
    process.release &&
    process.release.name === "node"
  ),
  dev: 1,

  errors: {
    positionSymbol: " 📍",
  },

  logoArt: ``,
};
