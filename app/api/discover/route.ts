import { NextResponse } from 'next/server';
import { fetchDiscoverItems } from '@/lib/discover';

export const revalidate = 3600; // cache for 1 hour

export async function GET() {
  try {
    const items = await fetchDiscoverItems();
    return NextResponse.json(items);
  } catch (e) {
    return NextResponse.json([], { status: 200 });
  }
}
