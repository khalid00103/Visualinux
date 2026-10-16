import type { CommandHandler, HandlerResult } from "../types.js";

const NO_OPS: HandlerResult["operations"] = [];
const NO_EVENTS: HandlerResult["animationEvents"] = [];

const MANUALS: Record<string, string> = {
  ls: `LS(1)\n\nNAME\n    ls - list directory contents\n\nDESCRIPTION\n    List files and directories.\n\nEXAMPLE\n    ls`,
  pwd: `PWD(1)\n\nNAME\n    pwd - print working directory\n\nDESCRIPTION\n    Print the path of the current directory.\n\nEXAMPLE\n    pwd`,
  mkdir: `MKDIR(1)\n\nNAME\n    mkdir - make directories\n\nDESCRIPTION\n    Create a new directory.\n\nEXAMPLE\n    mkdir projects`,
  touch: `TOUCH(1)\n\nNAME\n    touch - create an empty file\n\nDESCRIPTION\n    Create a new file.\n\nEXAMPLE\n    touch notes.txt`,
  cd: `CD(1)\n\nNAME\n    cd - change directory\n\nDESCRIPTION\n    Change the current working directory.\n\nEXAMPLE\n    cd projects`,
  cat: `CAT(1)\n\nNAME\n    cat - display file contents\n\nDESCRIPTION\n    Print the contents of one or more files.\n\nEXAMPLE\n    cat notes.txt`,
  grep: `GREP(1)\n\nNAME\n    grep - search text\n\nDESCRIPTION\n    Print lines that match a search pattern.\n\nEXAMPLE\n    grep Linux notes.txt`,
  head: `HEAD(1)\n\nNAME\n    head - display the beginning of a file\n\nDESCRIPTION\n    Print the first ten lines by default.\n\nEXAMPLE\n    head notes.txt`,
  tail: `TAIL(1)\n\nNAME\n    tail - display the end of a file\n\nDESCRIPTION\n    Print the last ten lines by default.\n\nEXAMPLE\n    tail notes.txt`,
  sort: `SORT(1)\n\nNAME\n    sort - sort lines of text\n\nDESCRIPTION\n    Sort lines alphabetically by default.\n\nEXAMPLE\n    sort names.txt`,
  wc: `WC(1)\n\nNAME\n    wc - count lines, words, and characters\n\nDESCRIPTION\n    Count lines, words, and characters in a file.\n\nEXAMPLE\n    wc notes.txt`,
  cp: `CP(1)\n\nNAME\n    cp - copy files\n\nDESCRIPTION\n    Copy a file or directory to another location.\n\nEXAMPLE\n    cp notes.txt backup.txt`,
  mv: `MV(1)\n\nNAME\n    mv - move or rename files\n\nDESCRIPTION\n    Move an item or rename it in the same directory.\n\nEXAMPLE\n    mv notes.txt renamed.txt`,
  rm: `RM(1)\n\nNAME\n    rm - remove files\n\nDESCRIPTION\n    Remove files; recursive removal can delete directories and their contents.\n\nEXAMPLE\n    rm notes.txt`,
  chmod: `CHMOD(1)\n\nNAME\n    chmod - change permissions\n\nDESCRIPTION\n    Change file or directory permissions.\n\nEXAMPLE\n    chmod 755 script.sh`,
  chown: `CHOWN(1)\n\nNAME\n    chown - change owner\n\nDESCRIPTION\n    Change the owner of a file or directory.\n\nEXAMPLE\n    chown student notes.txt`,
  echo: `ECHO(1)\n\nNAME\n    echo - print text\n\nDESCRIPTION\n    Print text to the terminal.\n\nEXAMPLE\n    echo Hello Linux`,
  whoami: `WHOAMI(1)\n\nNAME\n    whoami - print the current user\n\nDESCRIPTION\n    Print the active simulated username.\n\nEXAMPLE\n    whoami`,
  clear: `CLEAR(1)\n\nNAME\n    clear - clear the terminal\n\nDESCRIPTION\n    Clear the terminal display.\n\nEXAMPLE\n    clear`,
  man: `MAN(1)\n\nNAME\n    man - read manual pages\n\nDESCRIPTION\n    Display documentation for a supported command.\n\nEXAMPLE\n    man ls`,
};

export const clear: CommandHandler = () => ({
  success: true,
  outputText: "",
  operations: NO_OPS,
  animationEvents: NO_EVENTS,
});

export const whoami: CommandHandler = () => ({
  success: true,
  outputText: "student",
  operations: NO_OPS,
  animationEvents: NO_EVENTS,
});

export const man: CommandHandler = (ctx) => {
  const command = ctx.args[0];
  if (!command) {
    return {
      success: false,
      outputText: "man: missing manual page.",
      errorType: "invalid_arguments",
      operations: NO_OPS,
      animationEvents: NO_EVENTS,
    };
  }

  const manual = MANUALS[command];
  if (!manual) {
    return {
      success: false,
      outputText: `No manual entry for ${command}.`,
      errorType: "not_found",
      operations: NO_OPS,
      animationEvents: NO_EVENTS,
    };
  }

  return { success: true, outputText: manual, operations: NO_OPS, animationEvents: NO_EVENTS };
};
