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
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await getUserByEmail(credentials.email);
        
        if (!user) {
          return null;
        }

        const isValid = await verifyPassword(credentials.password, user.password);

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          plan: user.subscription?.plan || 'free',
        };
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
              }
              // Refresh plan from database if session is being updated
              if (trigger === "update") {
                const updatedUser = await getUserById(token.id);
                if (updatedUser?.subscription) {
                  token.plan = updatedUser.subscription.plan;
                }
              }
              return token;
            },
            async session({ session, token }) {
              if (session.user) {
                session.user.id = token.id;
                session.user.plan = token.plan;
              }
              return session;
            },
          },
  secret: process.env.NEXTAUTH_SECRET,
};

// Validate that secret is set
if (!process.env.NEXTAUTH_SECRET) {
  console.error('⚠️  NEXTAUTH_SECRET is not set in environment variables!');
  console.error('⚠️  Generate one with: openssl rand -base64 32');
  console.error('⚠️  Add it to your .env file as: NEXTAUTH_SECRET="your-secret-here"');
}

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
