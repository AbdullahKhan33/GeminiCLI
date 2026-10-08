import "dotenv/config";

import { GoogleGenAI } from "@google/genai";
import fs from "fs";


// --------------------------------------------------
// 1. CONFIGURATION
// --------------------------------------------------

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error(
    "GEMINI_API_KEY was not found."
  );
}

const ai = new GoogleGenAI({
  apiKey
});


// --------------------------------------------------
// 2. LOAD KNOWLEDGE BASE
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
// 3. COSINE SIMILARITY
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
// 4. GET USER QUESTION
// --------------------------------------------------

const question =
  process.argv
    .slice(2)
    .join(" ");

if (!question) {

  console.log(
    'Usage: node src/rag.js "your question"'
  );

  process.exit(1);
}


console.log(
  `\nQUESTION:\n${question}`
);


// --------------------------------------------------
// 5. EMBED THE QUESTION
// --------------------------------------------------

const embeddingResponse =
  await ai.models.embedContent({

    model: "gemini-embedding-2",

    contents: question,

    config: {
      outputDimensionality: 768
    }

  });


const queryEmbedding =
  embeddingResponse
    .embeddings?.[0]?.values;


if (!queryEmbedding) {
  throw new Error(
    "Unable to generate question embedding."
  );
}


// --------------------------------------------------
// 6. RETRIEVE MOST RELEVANT CHUNKS
// --------------------------------------------------

const results =
  knowledge

    .map(chunk => ({

      source: chunk.source,

      text: chunk.text,

      score:
        cosineSimilarity(
          queryEmbedding,
          chunk.embedding
        )

    }))

    .sort(
      (a, b) =>
        b.score - a.score
    )

    .slice(0, 3);


// --------------------------------------------------
// 7. SHOW RETRIEVAL RESULTS
// --------------------------------------------------

console.log(
  "\nRETRIEVED CONTEXT:\n"
);

results.forEach(
  (result, index) => {

    console.log(
      `${index + 1}. ${result.source}`
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


// --------------------------------------------------
// 8. BUILD CONTEXT FOR GEMINI
// --------------------------------------------------

const context =
  results
    .map(
      (result, index) => `

SOURCE ${index + 1}: ${result.source}

${result.text}

`
    )
    .join("\n");


// --------------------------------------------------
// 9. CREATE GROUNDED PROMPT
// --------------------------------------------------

const prompt = `

You are an enterprise knowledge assistant.

Answer the user's question using ONLY the
information contained in the retrieved context.

If the answer cannot be determined from the
context, say:

"I don't have enough information in the
available documents."

Do not invent company policies.

When possible, mention which source document
contains the information.


USER QUESTION:

${question}


RETRIEVED CONTEXT:

${context}

`;


// --------------------------------------------------
// 10. ASK GEMINI
// --------------------------------------------------

const response =
  await ai.models.generateContent({

    model: "gemini-3.8-flash",

    contents: prompt

  });


// --------------------------------------------------
// 11. DISPLAY FINAL ANSWER
// --------------------------------------------------

console.log(
  "\n================================"
);

console.log(
  "GEMINI ANSWER"
);

console.log(
  "================================\n"
);

console.log(
  response.text
);

console.log(
  "\n================================"
);