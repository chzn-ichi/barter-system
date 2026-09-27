import { supabase } from "@/lib/supabase";

export type WantedItem = {
  id: string;
  name: string;
  visibility: "public" | "private";
};

export async function fetchWantedItems(ownerId: string): Promise<WantedItem[]> {
  const { data, error } = await supabase
    .from("wanted_items")
    .select("id, name, visibility")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });

  if (error) throw new Error("Could not load wanted items.");
  return data ?? [];
}

export async function addWantedItem(ownerId: string, name: string): Promise<WantedItem> {
  const { data, error } = await supabase
    .from("wanted_items")
    .insert({ owner_id: ownerId, name: name.trim(), visibility: "public" })
    .select("id, name, visibility")
    .single();

  if (error || !data) throw new Error("Could not add wanted item.");
  return data;
}

export async function deleteWantedItem(id: string) {
  const { error } = await supabase.from("wanted_items").delete().eq("id", id);
  if (error) throw new Error("Could not remove wanted item.");
}