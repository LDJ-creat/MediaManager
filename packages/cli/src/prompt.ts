import readline from "node:readline";

export async function promptLine(message: string): Promise<string> {
  if (!process.stdin.isTTY) return "";
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise<string>((resolve) => {
    rl.question(message, (value) => {
      rl.close();
      resolve(value.trim());
    });
  });
  return answer;
}

export async function promptSecretLine(message: string): Promise<string> {
  if (!process.stdin.isTTY) return "";

  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== "function") {
    return promptLine(message);
  }

  return new Promise((resolve) => {
    const chunks: string[] = [];
    const wasRaw = process.stdin.isRaw ?? false;

    process.stdout.write(message);

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    const cleanup = () => {
      process.stdin.setRawMode(wasRaw);
      process.stdin.pause();
      process.stdin.removeListener("data", onData);
    };

    const onData = (char: string) => {
      if (char === "\u0003") {
        cleanup();
        process.stdout.write("\n");
        process.exit(130);
      }

      if (char === "\r" || char === "\n" || char === "\u0004") {
        cleanup();
        process.stdout.write("\n");
        resolve(chunks.join("").trim());
        return;
      }

      if (char === "\u007f" || char === "\b") {
        if (chunks.length > 0) {
          chunks.pop();
          process.stdout.write("\b \b");
        }
        return;
      }

      chunks.push(char);
      process.stdout.write("*");
    };

    process.stdin.on("data", onData);
  });
}
