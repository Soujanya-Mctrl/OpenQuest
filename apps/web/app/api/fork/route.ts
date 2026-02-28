import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    // This will proxy to the Express API: POST /api/fork
    return NextResponse.json({ message: "BFF fork route" });
}
