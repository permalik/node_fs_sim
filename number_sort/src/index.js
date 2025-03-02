import { readdir, stat, mkdir, rm, open, appendFile } from "node:fs/promises";
import inputFiles from "./schema.js";
import randomNumberString from "./utils.js";
import assert from "node:assert";
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";

const SOURCEDIRECTORY = "number_sort/data";
const DESTDIRECTORY = "number_sort/dest";

async function run() {
  try {
    const isInitSource = await initDirectory(SOURCEDIRECTORY, inputFiles);
    assert.equal(isInitSource, true, "Source must be initialized");

    const isInitDest = await initDirectory(DESTDIRECTORY, null);
    assert.equal(isInitDest, true);

    const isSourcePopulated = await populateSource();
    assert.equal(isSourcePopulated, true, "Source must be populated");

    const isNumbersSorted = await sortNumbers();
    assert.equal(isNumbersSorted, true, "Numbers must be sorted");

    await destroyDirectory(SOURCEDIRECTORY);
    await destroyDirectory(DESTDIRECTORY);
  } catch (err) {
    console.error(`Error.\n${err.message}\n`);
  }
}

async function initDirectory(dirPath, inputFiles) {
  try {
    const dirStat = await stat(dirPath).catch((err) => {
      if (err.code !== "ENOENT") {
        throw new Error(
          `Failed to stat stale directory before remove.\n${err.message}\n`,
        );
      }
    });

    if (dirStat) {
      await rm(dirPath, { recursive: true, force: true }).catch((err) => {
        throw new Error(`Failed to remove stale directory.\n${err.message}\n`);
      });
    }

    const dir = await mkdir(dirPath).catch((err) => {
      throw new Error(`Failed to create directory.\n${err.message}\n`);
    });

    let assetsCreated = false;
    if (inputFiles) {
      if (!dir) {
        for (let [_, v] of Object.entries(inputFiles)) {
          try {
            const fileHandle = await open(`${dirPath}/${v}`, "w");
            await fileHandle.close();
          } catch (err) {
            throw new Error(
              `Failed to create and close file ${v}.\n${err.message}\n`,
            );
          }
        }
        assetsCreated = true;
      }
    } else {
      const dirStat = await stat(dirPath).catch((err) => {
        if (err.code !== "ENOENT") {
          throw new Error(`Failed to stat DESTDIRECTORY.\n${err.message}\n`);
        }
      });

      if (dirStat) {
        assetsCreated = true;
      }
    }

    const promise = new Promise((res, rej) => {
      if (assetsCreated) {
        res(true);
      } else {
        rej(false);
      }
    });

    return promise;
  } catch (err) {
    console.error(err);
  }
}

async function populateSource() {
  let sourcesPopulated = false;
  for (let [_, v] of Object.entries(inputFiles)) {
    let lineCounter = 0;
    do {
      await appendFile(`${SOURCEDIRECTORY}/${v}`, randomNumberString()).catch(
        (err) => {
          throw new Error(`Failed to write file.\n${err.message}\n`);
        },
      );
      console.log(lineCounter);
      lineCounter++;
    } while (lineCounter < 100);
    sourcesPopulated = true;
  }

  const promise = await new Promise((res, rej) => {
    if (sourcesPopulated) {
      res(true);
    } else {
      rej(false);
    }
  });

  return promise;
}

async function sortNumbers() {
  const fileNames = await readdir(SOURCEDIRECTORY);
  let isSorted = false;
  for (let i = 0; i < fileNames.length; i++) {
    const fileNameStat = await stat(`${SOURCEDIRECTORY}/${fileNames[i]}`).catch(
      (err) => {
        throw new Error(
          `Failed to stat source file ${fileNames[i]}.\n${err.message}\n`,
        );
      },
    );
    assert.notEqual(
      fileNameStat.size,
      0,
      `Source file ${fileNames[i]} cannot be empty.`,
    );

    const fileStream = createReadStream(`${SOURCEDIRECTORY}/${fileNames[i]}`);
    const readline = createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    let unsortedLines = [];
    for await (const line of readline) {
      unsortedLines.push(line);
    }

    for (const line of unsortedLines) {
      console.log(line);
    }

    if (i === fileNames.length - 1) {
      isSorted = true;
    }
    console.log("\n\nFileComplete\n\n");
  }

  const promise = new Promise((res, rej) => {
    if (isSorted) {
      res(true);
    } else {
      rej(false);
    }
  });

  return promise;
}

async function destroyDirectory(dirPath) {
  await rm(dirPath, { recursive: true, force: true }).catch((err) => {
    throw new Error(`Failed to destroy directory.\n${err.message}\n`);
  });
}

await run();
