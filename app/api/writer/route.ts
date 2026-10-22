
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("Authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return Response.json(
        { error: "Please log in to use YAQQA Writer." },
        { status: 401 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Supabase environment variables are missing.");

      return Response.json(
        { error: "Authentication is temporarily unavailable." },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authorization },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json(
        { error: "Your session is invalid or expired. Please log in again." },
        { status: 401 }
      );
    }

    const { topic } = await request.json();

    if (typeof topic !== "string" || !topic.trim()) {
      return Response.json(
        { error: "Please provide something to write about." },
        { status: 400 }
      );
    }

    return Response.json(
      {
        error:
          "Live AI generation is disabled during free development. YAQQA Writer will be enabled for final testing later.",
      },
      { status: 503 }
    );
  } catch (error) {
    console.error("YAQQA Writer error:", error);

    return Response.json(
      { error: "YAQQA Writer encountered an unexpected error." },
      { status: 500 }
    );
  }
}
