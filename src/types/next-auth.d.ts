import 'next-auth';
import { type DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role_id: number | null;
      permissions: string[];
      avatar_url: string | null;
    } & DefaultSession['user'];
  }

  interface User {
    role_id?: number | null;
    permissions?: string[];
    avatar_url?: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    user_id?: string;
    username?: string;
    role_id?: number | null;
    permissions?: string[];
    avatar_url?: string | null;
    /** Epoch ms when permissions were last refreshed from DB */
    refreshed_at?: number;
  }
}
