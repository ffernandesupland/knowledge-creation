import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { password } = await req.json();
    const validPassword = process.env.APP_PASSWORD;

    if (!validPassword) {
      return NextResponse.json({ success: true, warning: 'No APP_PASSWORD set on server' }, { status: 200 });
    }

    if (password === validPassword) {
      const response = NextResponse.json({ success: true });
      
      // Set the auth cookie
      response.cookies.set({
        name: 'ai_kb_auth',
        value: password,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: '/',
      });
      
      return response;
    } else {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }
  } catch (err) {
      console.error(err);
      return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
