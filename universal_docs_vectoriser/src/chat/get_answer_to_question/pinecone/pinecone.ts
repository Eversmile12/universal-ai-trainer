import { PineconeClient } from '@pinecone-database/pinecone';
import {
    ScoredVector,
    UpsertResponse,
    VectorOperationsApi,
} from '@pinecone-database/pinecone/dist/pinecone-generated-ts-fetch';
import { Chunk } from '../data/page';

export class PineconeHandler {
    pinecone: PineconeClient;
    index: VectorOperationsApi | undefined;

    constructor() {
        const api_key = process.env.PINECONE;
        if (api_key === undefined) {
            throw new Error('Pinecone API key not found in environment variables');
        }
        this.pinecone = new PineconeClient();

        // api_key, { environment: '' }
    }

    async init({ environment, apiKey }: { environment: string; apiKey: string }): Promise<void> {
        await this.pinecone.init({ environment, apiKey });
    }

    async getIndex(indexName: string): Promise<VectorOperationsApi | null> {
        if (indexName) {
            try {
                const pineconeIndexes = await this.pinecone.listIndexes();
                if (!pineconeIndexes.includes(indexName)) {
                    await this.pinecone.createIndex({
                        createRequest: {
                            name: indexName,
                            dimension: 1536,
                            metric: 'cosine',
                            metadataConfig: {
                                indexed: ['url', 'text'],
                            },
                        },
                    });
                    this.index = this.pinecone.Index(indexName);
                    return this.index;
                }

                this.index = this.pinecone.Index(indexName);
                return this.index;
            } catch (err) {
                console.log(err);
                return null;
            }
        } else {
            throw new Error('Index name not provided');
        }
    }

    // *chunks<T>(iterable: Iterable<T>, batch_size: number = 100): Generator<T[], void, unknown> {
    //     const it = iterable[Symbol.iterator]();
    //     let chunk = Array.from({ length: batch_size }, () => it.next().value);
    //     while (chunk.length > 0) {
    //         yield chunk;
    //         chunk = Array.from({ length: batch_size }, () => it.next().value);
    //     }
    // }

    // async upsertInChunks(chunks: Chunk[], index: VectorOperationsApi): Promise<UpsertResponse[]> {
    //     const responses: UpsertResponse[] = [];
    //     for (const slicedChunk of this.chunks(chunks)) {
    //         const upsertRequest = {
    //             vectors: slicedChunk,
    //         };

    //         const upsert_response = await index.upsert({ upsertRequest });
    //         if (upsert_response) {
    //             responses.push(upsert_response);
    //         }
    //     }
    //     return responses;
    // }

    async upsertInChunks(chunks: Chunk[], index: VectorOperationsApi): Promise<UpsertResponse[]> {
        const responses: UpsertResponse[] = [];
        const batch_size = 100;

        for (let i = 0; i < chunks.length; i += batch_size) {
            const slicedChunk = chunks.slice(i, i + batch_size);
            const upsert_response = await this.upsertStandard(slicedChunk, index);
            if (upsert_response) {
                responses.push(upsert_response);
            }
        }

        return responses;
    }

    async upsertStandard(chunks: Chunk[], index: VectorOperationsApi): Promise<UpsertResponse | undefined> {
        const chunksToVector = chunks.map((chunk) => {
            return {
                id: chunk.id,
                values: chunk.embeddings,
                metadata: {
                    text: chunk.metadata.text,
                    url: chunk.metadata.url,
                },
            };
        });
        const upsertRequest = {
            vectors: chunksToVector,
        };
        return await index.upsert({ upsertRequest });
    }

    async upsert(chunks: Chunk[], index: VectorOperationsApi): Promise<UpsertResponse | UpsertResponse[] | undefined> {
        console.log(chunks);
        try {
            if (chunks.length >= 100) {
                console.log('data too big, dividing in chunks');
                return await this.upsertInChunks(chunks, index);
            } else {
                console.log('upserting data without chunking');
                return await this.upsertStandard(chunks, index);
            }
        } catch (error) {
            throw new Error(`Error upserting data ${error}`);
        }
    }

    async query(vector: number[]): Promise<ScoredVector[] | undefined> {
        if (this.index) {
            const queryRequest = {
                vector: vector,
                topK: 3,
                includeMetadata: true,
                includeValues: true,
            };
            const topK = await this.index.query({ queryRequest });
            if (!topK || !topK.matches?.length) {
                throw new Error('No neighbors found');
            }
            return topK.matches;
        } else {
            throw new Error('Index not initialized');
        }
    }
}
