export interface RepoChunk {
    id: string;
    repoId: string;
    filePath: string;
    chunkType: "function" | "class" | "file";
    symbolName?: string;
    startLine: number;
    endLine: number;
    content: string;
    embedding?: number[];
    metadata: {
        language: string;
    }
}

export interface RAGAnswer {
    answer: string;
    sources: Array<{ filePath: string; start: number; end: number }>;
    confidence: number;
}
