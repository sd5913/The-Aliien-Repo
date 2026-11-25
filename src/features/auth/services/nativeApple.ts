import { registerPlugin } from "@capacitor/core";
import { setSessionPersistence, supabase } from "../../../lib/supabase/client";

type AppleAuthorization =
  | { status: "cancelled" }
  | { status: "authorized"; identityToken: string; nonce: string };

const AppleSignIn = registerPlugin<{
  authorize(): Promise<AppleAuthorization>;
}>("AppleSignIn");

export async function signInWithNativeApple() {
  const result = await AppleSignIn.authorize();
  if (result.status === "cancelled") return;

  const { identityToken, nonce } = result;
  if (!identityToken || !/^[a-f0-9]{64}$/.test(nonce)) {
    throw new Error("Missing Apple authorization credentials");
  }

  setSessionPersistence(true);
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: "apple",
    token: identityToken,
    nonce,
  });
  if (error || !data.session) throw new Error("Apple session exchange failed");
}
