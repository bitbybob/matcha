export function runCli(args: string[]): void {
  const [command] = args

  if (command === "help" || command === "--help" || command === "-h") {
    printHelp()
    return
  }

  if (command === "version" || command === "--version" || command === "-V") {
    console.log("bob 0.1.0")
    return
  }

  console.log("bob cli")
}

function printHelp(): void {
  console.log(`bob

Usage:
  bob [command]

Commands:
  help      Show this help text
  version   Show the CLI version`)
}
