import ref from "ref-napi";
import inquirer from "inquirer";

export function buildQuery(query) {
    const buffer = Buffer.from(JSON.stringify(query) + "\0", "utf-8");
    buffer.type = ref.types.CString;
    return buffer;
}

export async function getInput({ string, extras: { hint } = {} }) {
    let input = "";
    while (!input.length) {
        const type = (
            string.startsWith("tglib.input.AuthorizationCode") ||
      string.startsWith("tglib.input.AuthorizationPassword")
        ) ? "password" : "input";
        const message = `${string}${ hint ? ` (${hint})` : "" }`;
        const result = await inquirer.prompt([
            { type, name: "input", message },
        ]);
        input = result.input;
    }
    return input;
}
