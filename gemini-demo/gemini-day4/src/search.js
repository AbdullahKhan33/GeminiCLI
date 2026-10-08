import "dotenv/config";

import { GoogleGenAI } from "@google/genai";
import fs from "fs";


// --------------------------------------------------
// 1. LOAD API KEY
// --------------------------------------------------

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error(
    "GEMINI_API_KEY was not found."
  );
}


// --------------------------------------------------
// 2. CREATE GEMINI CLIENT
// --------------------------------------------------

const ai = new GoogleGenAI({
  apiKey
});


// --------------------------------------------------
// 3. LOAD STORED KNOWLEDGE
// --------------------------------------------------

if (!fs.existsSync("knowledge.json")) {
  throw new Error(
    "knowledge.json not found. Run index-docs.js first."
  );
}

const knowledge =
  JSON.parse(
    fs.readFileSync(
      "knowledge.json",
      "utf8"
    )
  );


// --------------------------------------------------
// 4. COSINE SIMILARITY
// --------------------------------------------------

function cosineSimilarity(a, b) {

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < a.length; i++) {

    dotProduct += a[i] * b[i];

    magnitudeA += a[i] * a[i];

    magnitudeB += b[i] * b[i];

  }

  return (
    dotProduct /
    (
      Math.sqrt(magnitudeA) *
      Math.sqrt(magnitudeB)
    )
  );
}


// --------------------------------------------------
// 5. READ QUESTION
// --------------------------------------------------

const question =
  process.argv
    .slice(2)
    .join(" ");

if (!question) {

  console.log(
    'Usage: node src/search.js "your question"'
  );

  process.exit(1);
}


console.log(
  `\nQuestion: ${question}`
);


// --------------------------------------------------
// 6. CREATE EMBEDDING FOR QUESTION
// --------------------------------------------------

const response =
  await ai.models.embedContent({

    model: "gemini-embedding-2",

    contents: question,

    config: {
      outputDimensionality: 768
    }

  });


const queryEmbedding =
  response.embeddings?.[0]?.values;


if (!queryEmbedding) {
  throw new Error(
    "Could not generate query embedding."
  );
}


// --------------------------------------------------
// 7. COMPARE QUESTION WITH DOCUMENT CHUNKS
// --------------------------------------------------

const results =
  knowledge
    .map(chunk => {

      const score =
        cosineSimilarity(
          queryEmbedding,
          chunk.embedding
        );

      return {
        source: chunk.source,
        text: chunk.text,
        score
      };

    })

    .sort(
      (a, b) =>
        b.score - a.score
    )

    .slice(0, 3);


// --------------------------------------------------
// 8. DISPLAY TOP RESULTS
// --------------------------------------------------

console.log(
  "\nTop matching chunks:\n"
);


results.forEach(
  (result, index) => {

    console.log(
      `RESULT ${index + 1}`
    );

    console.log(
      `Source: ${result.source}`
    );

    console.log(
      `Similarity: ${result.score.toFixed(4)}`
    );

    console.log(
      result.text
    );

    console.log(
      "--------------------------------"
    );

  }
);