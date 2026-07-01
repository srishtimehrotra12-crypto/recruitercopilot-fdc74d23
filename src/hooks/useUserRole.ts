import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type AppRole = "recruiter" | "admin";

/**
 * Loads the current user's roles from public.user_roles.
 * `canUpload` gates JD/resume upload buttons — recruiters and admins can upload.
 */
export function useUserRole() {
  const { user, loading: authLoading } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setRoles([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (cancelled) return;
      if (error) {
        console.error("Failed to load roles", error);
        setRoles([]);
      } else {
        setRoles((data ?? []).map((r) => r.role as AppRole));
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  const isAdmin = roles.includes("admin");
  const isRecruiter = roles.includes("recruiter");
  // Uploads are a recruiter/admin capability. Anyone without a role sees no upload UI.
  const canUpload = isAdmin || isRecruiter;

  return { roles, isAdmin, isRecruiter, canUpload, loading };
}
