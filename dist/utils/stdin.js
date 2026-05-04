export async function readStdin(stream = process.stdin) {
    stream.setEncoding("utf8");
    let value = "";
    for await (const chunk of stream) {
        value += chunk;
    }
    return value;
}
