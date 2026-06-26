// Currently unused: embeddings are stored as null; chapter-filter retrieval is used instead.
// Kept so vector/semantic retrieval can be re-enabled here without a schema change.
import OpenAI from "openai";
import { EMBEDDING_MODEL, EMBEDDING_DIMS } from "./validation-config";

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (_client) return _client;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set.");
  _client = new OpenAI({ apiKey });
  return _client;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await getClient().embeddings.create({
    model: EMBEDDING_MODEL,
    input: text.replace(/\n/g, " ").trim(),
    dimensions: EMBEDDING_DIMS,
  });
  return response.data[0].embedding;
}
