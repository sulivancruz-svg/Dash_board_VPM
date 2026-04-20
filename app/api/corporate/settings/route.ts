import { NextRequest, NextResponse } from 'next/server';

// In-memory storage for settings during the session
let settingsCache: {
  id: string;
  googleSheetsId: string;
  googleSheetsGid: string;
  updatedAt: string;
} | null = null;

export async function GET() {
  // Return cached settings or defaults from environment
  const cached = settingsCache;

  if (cached) {
    return NextResponse.json(cached);
  }

  // Try to get from environment variables
  const googleSheetsId = process.env.GOOGLE_SHEETS_CORPORATE_ID || '';
  const googleSheetsGid = process.env.GOOGLE_SHEETS_CORPORATE_GID || '';

  return NextResponse.json({
    id: 'default',
    googleSheetsId,
    googleSheetsGid,
    updatedAt: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) {
  try {
    const { googleSheetsId, googleSheetsGid } = await request.json();

    if (!googleSheetsId || !googleSheetsGid) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Store in memory cache
    settingsCache = {
      id: 'default',
      googleSheetsId,
      googleSheetsGid,
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json(settingsCache);
  } catch (error) {
    console.error('Error saving settings:', error);
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}
