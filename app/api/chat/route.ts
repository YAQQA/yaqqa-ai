


export async function POST(request: Request) {
  try {
    const { message, business } = await request.json();

    if (process.env.NODE_ENV === "development") {
      if (!message?.trim()) {
        return Response.json(
          { error: "Message is required." },
          { status: 400 }
        );
      }

      const businessName = business?.name || "your business";
      const reply = [
        "[DEVELOPMENT MODE — SIMULATED RESPONSE]",
        `Thanks for your question about "${message}".`,
        `YAQQA is running without live AI for ${businessName}.`,
        "This is a test response, not AI-generated advice. The real AI connection will be tested before launch.",
      ].join("\n\n");

      return Response.json({ reply, simulated: true });
    }


    if (!message?.trim()) {
      return Response.json(
        { error: "Message is required." },
        { status: 400 }
      );
    }




    

    
return Response.json(
  {
    error:
      "Live AI is disabled during free development. YAQQA Chat should use development mode while running locally.",
  },
  { status: 503 }
);

  } catch (error) {
    console.error("YAQQA Chat error:", error);

    return Response.json(
      {
        error:
          "YAQQA could not generate a response. Please check your AI connection or account credits.",
      },
      { status: 500 }
    );
  }
}