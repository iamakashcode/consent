import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { verifyPassword, getUserByEmail, getUserById } from '@/lib/auth';

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            console.log('[NextAuth] Missing credentials');
            return null;
          }

          console.log('[NextAuth] Attempting login for:', credentials.email);
          const user = await getUserByEmail(credentials.email);
          
          if (!user) {
            console.log('[NextAuth] User not found:', credentials.email);
            return null;
          }

          if (!user.password) {
            console.error('[NextAuth] User has no password field:', credentials.email);
            return null;
          }

          console.log('[NextAuth] Verifying password for:', credentials.email);
          const isValid = await verifyPassword(credentials.password, user.password);

          if (!isValid) {
            console.log('[NextAuth] Invalid password for:', credentials.email);
            return null;
          }

          console.log('[NextAuth] Login successful for:', credentials.email);
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            plan: user.subscription?.plan || 'free',
            isAdmin: user.isAdmin || false,
          };
        } catch (error) {
          console.error('[NextAuth] Authorize error:', error);
          console.error('[NextAuth] Error stack:', error.stack);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: parseInt(process.env.NEXTAUTH_SESSION_MAX_AGE) || 30 * 24 * 60 * 60, // Default: 30 days (configurable via env)
  },
  jwt: {
    maxAge: parseInt(process.env.NEXTAUTH_JWT_MAX_AGE) || 30 * 24 * 60 * 60, // Default: 30 days (configurable via env)
  },
  pages: {
    signIn: '/login',
    signUp: '/signup',
  },
          callbacks: {
            async jwt({ token, user, trigger }) {
              if (user) {
                token.id = user.id;
                token.plan = user.plan;
                token.isAdmin = user.isAdmin || false;
              }
              // Refresh plan and admin status from database if session is being updated
              if (trigger === "update") {
                const updatedUser = await getUserById(token.id);
                if (updatedUser) {
                  if (updatedUser.subscription) {
                    token.plan = updatedUser.subscription.plan;
                  }
                  token.isAdmin = updatedUser.isAdmin || false;
                }
              }
              return token;
            },
            async session({ session, token }) {
              if (session.user) {
                session.user.id = token.id;
                session.user.plan = token.plan;
                session.user.isAdmin = token.isAdmin || false;
              }
              return session;
            },
          },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
  cookies: {
    sessionToken: {
      name: `${process.env.NODE_ENV === 'production' ? '__Secure-' : ''}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
};

// Validate that secret is set
if (!process.env.NEXTAUTH_SECRET) {
  console.error('⚠️  NEXTAUTH_SECRET is not set in environment variables!');
  console.error('⚠️  Generate one with: openssl rand -base64 32');
  console.error('⚠️  Add it to your .env file as: NEXTAUTH_SECRET="your-secret-here"');
}

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
