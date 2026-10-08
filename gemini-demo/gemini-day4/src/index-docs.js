import "dotenv/config";

import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";


// --------------------------------------------------
// 1. LOAD API KEY
// --------------------------------------------------

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error(
    "GEMINI_API_KEY was not found. Check your .env file."
  );
}

console.log("✓ Gemini API key loaded");


// --------------------------------------------------
// 2. CREATE GEMINI CLIENT
// --------------------------------------------------

const ai = new GoogleGenAI({
  apiKey: apiKey
});


// --------------------------------------------------
// 3. DOCUMENT LOCATION
// --------------------------------------------------

const docsFolder = "./docs";

if (!fs.existsSync(docsFolder)) {
  throw new Error(
    "docs folder not found. Create ./docs and add .txt files."
  );
}


// --------------------------------------------------
// 4. READ DOCUMENT FILES
// --------------------------------------------------

const files = fs
  .readdirSync(docsFolder)
  .filter(file => file.endsWith(".txt"));

if (files.length === 0) {
  throw new Error(
    "No .txt files found inside the docs folder."
  );
}

console.log(
  `✓ Found ${files.length} document(s)`
);


// --------------------------------------------------
// 5. CREATE CHUNKS + EMBEDDINGS
// --------------------------------------------------

const chunks = [];

for (const file of files) {

  console.log(`\nProcessing: ${file}`);

  const filePath =
    path.join(docsFolder, file);

  const text =
    fs.readFileSync(
      filePath,
      "utf8"
    );


  // Simple chunking:
  // split document wherever there is a blank line

  const paragraphs =
    text
      .split(/\n\s*\n/)
      .map(paragraph => paragraph.trim())
      .filter(Boolean);


  console.log(
    `  Found ${paragraphs.length} chunk(s)`
  );


  for (const paragraph of paragraphs) {

    console.log(
      `  Creating embedding...`
    );


    const response =
      await ai.models.embedContent({

        model: "gemini-embedding-2", // Small Language Model

        contents: paragraph,

        config: {
          outputDimensionality: 768
        }

      });


    const embedding =
      response.embeddings?.[0]?.values;


    if (!embedding) {

      console.warn(
        `  Could not create embedding for a chunk in ${file}`
      );

      continue;
    }


    chunks.push({

      source: file,

      text: paragraph,

      embedding: embedding

    });

  }

}


// --------------------------------------------------
// 6. SAVE VECTOR DATA
// --------------------------------------------------

fs.writeFileSync(
  "knowledge.json",
  JSON.stringify(
    chunks,
    null,
    2
  )
);


// --------------------------------------------------
// 7. SUMMARY
// --------------------------------------------------

console.log(
  "\n--------------------------------"
);

console.log(
  "INDEXING COMPLETE"
);

console.log(
  "--------------------------------"
);

console.log(
  `Documents processed : ${files.length}`
);

console.log(
  `Chunks indexed      : ${chunks.length}`
);

console.log(
  "Output file         : knowledge.json"
);

console.log(
  "Embedding model     : gemini-embedding-2"
);

console.log(
  "Vector dimensions   : 768"
);

console.log(
  "--------------------------------"
);