import { embed } from "@/lib/ai";

/**
 * Generates an embedding vector for a given text string using the configured embedding model.
 * 
 * @param text The string to embed (e.g. Job Description or Resume Summary)
 * @returns An array of numbers representing the vector embedding
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    if (!text || text.trim().length === 0) {
        throw new Error("Cannot generate embedding for empty string.");
    }

    try {
        const [vector] = await embed([text.replace(/\n/g, " ")]); // Best practice to remove newlines for embeddings
        return vector;
    } catch (error) {
        console.error("Failed to generate embedding", error);
        throw error;
    }
}
