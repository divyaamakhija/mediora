
import { supabase } from "@/lib/supabase";
import { redirect } from "next/navigation";

export async function requireUser() {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    redirect("/login");
  }

  return data.user;
}
