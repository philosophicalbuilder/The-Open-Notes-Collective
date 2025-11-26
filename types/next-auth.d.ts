import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: number;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      computingId: string;
      role: 'student' | 'instructor';
      studentType?: 'sdac' | 'non-sdac' | null;
    };
  }

  interface User {
    id: number;
    computingId: string;
    role: 'student' | 'instructor';
    studentType?: 'sdac' | 'non-sdac' | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId: number;
    computingId: string;
    role: 'student' | 'instructor';
    studentType?: 'sdac' | 'non-sdac' | null;
  }
}

