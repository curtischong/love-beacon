import {
  randomBytes,
  createHash,
  createCipheriv,
  createDecipheriv,
} from "crypto";
import { gates, InputValue, GateName, Gate } from "./gates";
import {
  cartesianProduct,
  secureShuffle,
  getLeastSignificantBit,
} from "../utils";

export type Bit = InputValue;
export type Labels = { [key: string]: string[] };
type LabelledTable = (string | string[])[][];
type EncryptedRow = {
  encrypted: Buffer;
  iv: Buffer;
  tag: Buffer;
  label0lsb: Bit;
  label1lsb?: Bit;
};
export type GarbledTable = EncryptedRow[];
export type Circuit = { gate: GateName; inputs: string[]; output: string }[];
export type NamedLabel = { [key: string]: string };

const INPUT_VALUES: InputValue[] = [0, 1];

// generate 2 random labels with different LSBs
function generateLabelPair(size: number): string[] {
  const l0 = randomBytes(size / 8);
  const l1 = randomBytes(size / 8);

  const lsb0 = getLeastSignificantBit(l0);
  const lsb1 = getLeastSignificantBit(l1);

  if (lsb0 === lsb1) {
    let lastByte = l1[l1.byteLength - 1];
    lastByte = lastByte ^= 1;
    l1[l1.byteLength - 1] = lastByte;
  }

  return [l0.toString("hex"), l1.toString("hex")];
}

function labelWires(
  gateName: GateName,
  inNames: string[],
  outName: string,
  gateIndex: number,
  labelledCircuit: Labels,
  size: number = 256,
): { labels: Labels; labelledTable: LabelledTable } {
  // console.log(
  //   `garble -> gate:${gateIndex} type:${gateName} in:${inNames} out:${outName}`,
  // );

  const inputValues: InputValue[][] | InputValue[] = cartesianProduct(
    ...Array(inNames.length).fill(INPUT_VALUES),
  );

  const gate = gates[gateName] as Gate;

  const truthTable = inputValues.reduce((table: InputValue[], input) => {
    if (gate.length === 2) {
      const binaryInput = input as InputValue[];
      table.push(gate[binaryInput[0]][binaryInput[1]]);
    } else if (gate.length === 1) {
      if (gate[0].length === 2) {
        const unaryInput = input as InputValue;
        table.push(gate[0][unaryInput]);
      } else if (gate[0].length === 1) {
        table.push(gate[0][0]);
      }
    }

    return table;
  }, []);

  const inputLabels = inNames.map((name) => {
    if (labelledCircuit[name]) return labelledCircuit[name];
    return generateLabelPair(size);
  });
  const labels = inNames.reduce((labelsObj: Labels, name, i) => {
    labelsObj[name] = inputLabels[i];
    return labelsObj;
  }, {});

  const outputLabels = generateLabelPair(size);
  labels[outName] = outputLabels;

  // for (const [name, values] of Object.entries(labels)) {
  //   for (const value in values) {
  //     console.log(`label -> name:${name} label:${value}=${values[value]}`);
  //   }
  // }

  const labelledTable = truthTable.map((outValue, i) => {
    const result = [];

    if (gate.length === 2) {
      const binaryInputValues = inputValues as InputValue[][];
      result.push(
        binaryInputValues[i].map((inValue, j) => inputLabels[j][inValue]),
      );
    } else if (gate.length === 1) {
      const unaryInputValues = inputValues as InputValue[];
      result.push([inputLabels[0][unaryInputValues[i]]]);
    }

    result.push(outputLabels[outValue]);

    return result;
  });

  return { labels, labelledTable };
}

export function getCombinedKey(labels: string[]): {
  key: string;
  label0lsb: Bit;
  label1lsb?: Bit;
} {
  const label0lsb = getLeastSignificantBit(Buffer.from(labels[0], "hex"));
  // console.log("label0lsb", label0lsb)
  // console.log("labels[1]", labels[1])
  const label1lsb = labels[1]
    ? getLeastSignificantBit(Buffer.from(labels[1], "hex"))
    : undefined;

  const hash = createHash("sha256");

  labels.sort(); // sort labels so that the order we receive them in does not change the hash
  for (const label of labels) {
    hash.update(label);
  }

  return {
    key: hash.digest("hex"),
    label0lsb,
    label1lsb,
  };
}

function encrypt(
  key: string,
  data: string,
  label0lsb: Bit,
  label1lsb?: Bit,
): EncryptedRow {
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(key, "hex"), iv);
  let encrypted = cipher.update(data, "utf8");
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  return {
    encrypted,
    iv,
    tag: cipher.getAuthTag(),
    label0lsb,
    label1lsb,
  };
}

// // Convert hex string to ArrayBuffer
// function hexStringToArrayBuffer(hexString) {
//   const result = new Uint8Array(hexString.length / 2);
//   for (let i = 0, j = 0; i < hexString.length; i += 2, j++) {
//       result[j] = parseInt(hexString.substr(i, 2), 16);
//   }
//   return result.buffer;
// }

// export function decrypt2(
//   key: string,
//   iv: Buffer,
//   tag: Buffer,
//   encrypted: Buffer,
// ):string {
//     // Convert key and iv from hex to ArrayBuffer
//   const keyBuffer = hexStringToArrayBuffer(keyHex);
//   const ivBuffer = hexStringToArrayBuffer(ivHex);
// }

// const function convertHexKeyToCryptoKey(hexKey) {
//   const rawKey = await hexStringToByteArray(hexKey);
//   return window.crypto.subtle.importKey(
//       "raw", // format of the key
//       rawKey, // the key in ArrayBuffer format
//       {   // algorithm details
//           name: "AES-GCM",
//       },
//       false, // whether the key is extractable
//       ["encrypt", "decrypt"] // what operations the key can be used for
//   );
// }


// export function decrypt(
//   key: string,
//   iv: Buffer,
//   tag: Buffer,
//   encrypted: Buffer,
// ): string {
//   // const decipher = createDecipheriv("aes-256-gcm", Buffer.from(key, "hex"), iv);
//   console.log("key", key)
//   const decipher = window.crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, encrypted);
//   console.log(decipher);
//   // decipher.setAuthTag(tag);
//   // let data = decipher.update(encrypted, undefined, "utf8");
//   // data += decipher.final("utf8");
//   // return data;
//   return decipher
// }

export function decrypt(
  key: string,
  iv: Buffer,
  tag: Buffer,
  encrypted: Buffer,
): string {
  // console.log("key", key)
  const keyBuffer = Buffer.from(key, "hex");
  // console.log("keyBuffer", keyBuffer, Buffer.isBuffer(keyBuffer))
  iv = Buffer.from(iv);
  // console.log("iv", iv,Buffer.isBuffer(iv))
  const decipher = createDecipheriv("aes-256-gcm", keyBuffer, iv);
  decipher.setAuthTag(tag);
  encrypted = Buffer.from(encrypted);
  let data = decipher.update(encrypted, undefined, "utf8");
  // data += decipher.final("utf8");
  console.log("data", data)
  return data;
}

function garbleTable(labelledTable: LabelledTable): GarbledTable {
  const garbledTable: GarbledTable = [];

  for (const row of labelledTable) {
    const [inputLabels, outputLabel] = row as [string[], string];
    const { key, label0lsb, label1lsb } = getCombinedKey(inputLabels);
    const result = encrypt(key, outputLabel, label0lsb, label1lsb);
    garbledTable.push(result);
  }

  secureShuffle(garbledTable);

  return garbledTable;
}

export function garbleCircuit(circuit: Circuit) {
  let labelledCircuit: Labels = {};
  const garbledCircuit = [];

  for (const gateIndex in circuit) {
    const gate = circuit[gateIndex];
    // if(gate.inputs[0] === "vectorC_0"){
    //   debugger
    // }
    const { labels, labelledTable } = labelWires(
      gate.gate,
      gate.inputs,
      gate.output,
      Number(gateIndex),
      labelledCircuit,
    );
    for(const entry of Object.values(labels)){
      if(entry.length === 2){
        // debugger
      }
    }

    labelledCircuit = Object.assign(labelledCircuit, labels);
    garbledCircuit.push(garbleTable(labelledTable));
  }

  return { labelledCircuit, garbledCircuit };
}
