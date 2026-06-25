import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { loadSavedSet } from "@/lib/saved";

export function useSavedSet() {
  const { user } = useAuth();
  const [saved, setSaved] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) { setSaved(new Set()); return; }
    loadSavedSet(user.id).then(setSaved);
  }, [user]);

  return saved;
}
