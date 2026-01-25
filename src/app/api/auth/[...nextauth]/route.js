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
          
          let user;
          try {
            user = await getUserByEmail(credentials.email);
          } catch (dbError) {
            console.error('[NextAuth] Database error fetching user:', dbError);
            console.error('[NextAuth] Error details:', {
              message: dbError.message,
              code: dbError.code,
              name: dbError.name,
            });
            return null;
          }
          
          if (!user) {
            console.log('[NextAuth] User not found:', credentials.email);
            return null;
          }

          if (!user.password) {
            console.error('[NextAuth] User has no password field:', credentials.email);
            console.error('[NextAuth] User object:', { id: user.id, email: user.email, hasPassword: !!user.password });
            return null;
          }

          console.log('[NextAuth] Verifying password for:', credentials.email);
          let isValid;
          try {
            isValid = await verifyPassword(credentials.password, user.password);
          } catch (verifyError) {
            console.error('[NextAuth] Password verification error:', verifyError);
            return null;
          }

          if (!isValid) {
            console.log('[NextAuth] Invalid password for:', credentials.email);
            return null;
          }

          console.log('[NextAuth] Login successful for:', credentials.email);
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            plan: null, // Plans are now domain-based, not user-based
            isAdmin: user.isAdmin || false,
          };
        } catch (error) {
          console.error('[NextAuth] Authorize error:', error);
          console.error('[NextAuth] Error stack:', error.stack);
          console.error('[NextAuth] Error name:', error.name);
          console.error('[NextAuth] Error code:', error.code);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: parseInt(process.env.NEXTAUTH_SESSION_MAX_AGE) || 30 * 24 * 60 * 60, // Default: 30 days (configurable via env)
    updateAge: 24 * 60 * 60, // Update session every 24 hours (prevents frequent refreshes)
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
              try {
                if (user) {
                  token.id = user.id;
                  token.plan = user.plan;
                  token.isAdmin = user.isAdmin || false;
                }
                // Refresh admin status from database if session is being updated
                // Note: Plans are now domain-based, so user.plan is always null
                if (trigger === "update" && token.id) {
                  try {
                    const updatedUser = await getUserById(token.id);
                    if (updatedUser) {
                      token.plan = null; // Plans are domain-based, not user-based
                      token.isAdmin = updatedUser.isAdmin || false;
                    }
                  } catch (updateError) {
                    console.error("[NextAuth] Error updating user data:", updateError);
                    // Don't fail the session if update fails, just log the error
                  }
                }
                return token;
              } catch (error) {
                console.error("[NextAuth] JWT callback error:", error);
                // Return token even if there's an error to prevent session invalidation
                return token;
              }
            },
            async session({ session, token }) {
              try {
                if (session.user && token) {
                  session.user.id = token.id;
                  session.user.plan = token.plan || null; // null means no plan selected
                  session.user.isAdmin = token.isAdmin || false;
                }
                return session;
              } catch (error) {
                console.error("[NextAuth] Session callback error:", error);
                // Return session even if there's an error
                return session;
              }
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
