import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listener FIRST (sync only, no async calls inside)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
    });

    // Then check existing session; verify it's still valid, else sign in anonymously
    (async () => {
      const { data: { session: existing } } = await supabase.auth.getSession();
      if (existing) {
        // Verify the user still exists on the server (handles stale/deleted users)
        const { data: userData, error: userErr } = await supabase.auth.getUser();
        if (!userErr && userData?.user) {
          setSession(existing);
          setUser(userData.user);
          setLoading(false);
          return;
        }
        // Stale session — clear it before re-signing in
        await supabase.auth.signOut();
      }
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) console.error("Anonymous sign-in failed", error);
      setSession(data?.session ?? null);
      setUser(data?.user ?? null);
      setLoading(false);
    })();

    return () => subscription.unsubscribe();
  }, []);


  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
