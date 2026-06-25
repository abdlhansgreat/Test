import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.rpc("is_admin");
    if (!data) throw redirect({ to: "/dashboard", search: { redirect: location.href } as never });
  },
  component: () => <Outlet />,
});
