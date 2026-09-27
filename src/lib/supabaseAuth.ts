import { supabase } from "@/lib/supabase";

export type Profile = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  barangay: string | null;
  completedTrades: number;
  reviewsCount: number;
  memberSince: string;
};

function mapProfile(row: any, email: string): Profile {
  return {
    id: row.id,
    email,
    name: row.name,
    avatarUrl: row.avatar_url,
    barangay: row.barangay,
    completedTrades: row.completed_trades,
    reviewsCount: row.reviews_count,
    memberSince: new Date(row.created_at).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    }),
  };
}

export async function fetchProfile(userId: string, email: string): Promise<Profile> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (error) throw new Error("Could not load your profile.");
  return mapProfile(data, email);
}

export async function registerUser(input: {
  name: string;
  identifier: string;
  password: string;
  barangay: string;
}) {
  const { error } = await supabase.auth.signUp({
    email: input.identifier,
    password: input.password,
    options: {
      data: { name: input.name, barangay: input.barangay },
    },
  });

  console.log("SIGNUP RAW ERROR:", JSON.stringify(error, null, 2)); // TEMPORARY

  if (error) {
    if (error.message.toLowerCase().includes("already registered")) {
      throw new Error("An account with that email already exists.");
    }
    throw new Error(error.message);
  }
}

export async function verifySignupOtp(identifier: string, code: string): Promise<Profile> {
  const { data, error } = await supabase.auth.verifyOtp({
    email: identifier,
    token: code,
    type: "signup",
  });
  if (error || !data.user) {
    throw new Error("The code you entered is incorrect or has expired.");
  }
  return fetchProfile(data.user.id, data.user.email ?? identifier);
}

export async function verifyRecoveryOtp(identifier: string, code: string) {
  const { error } = await supabase.auth.verifyOtp({
    email: identifier,
    token: code,
    type: "recovery",
  });
  if (error) {
    throw new Error("The code you entered is incorrect or has expired.");
  }
}

export async function resendSignupOtp(identifier: string) {
  const { error } = await supabase.auth.resend({ type: "signup", email: identifier });
  if (error) throw new Error(error.message);
}

export async function requestPasswordReset(identifier: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(identifier);
  if (error) throw new Error(error.message);
}

export async function resetPassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
}

export async function loginUser(identifier: string, password: string): Promise<Profile> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: identifier,
    password,
  });
  if (error || !data.user) {
    throw new Error("Invalid email or password.");
  }
  return fetchProfile(data.user.id, data.user.email ?? identifier);
}

export async function updateProfile(
  userId: string,
  patch: Partial<{ name: string; barangay: string; avatarUrl: string }>
) {
  const { error } = await supabase
    .from("profiles")
    .update({
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.barangay !== undefined ? { barangay: patch.barangay } : {}),
      ...(patch.avatarUrl !== undefined ? { avatar_url: patch.avatarUrl } : {}),
    })
    .eq("id", userId);
  if (error) throw new Error("Could not update your profile.");
}

export async function logout() {
  await supabase.auth.signOut();
}

export async function restoreSession(): Promise<Profile | null> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return null;
  return fetchProfile(data.session.user.id, data.session.user.email ?? "");
}