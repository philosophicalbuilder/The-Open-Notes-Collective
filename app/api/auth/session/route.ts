import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getUserById } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('auth-token')?.value;
    if (!token) return NextResponse.json({ user: null }, { status: 200 });

    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ user: null }, { status: 200 });

    const user = await getUserById(decoded.userId);
    return NextResponse.json({ user: user || null }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
