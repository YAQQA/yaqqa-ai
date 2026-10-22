
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    // Verify the request includes a Supabase access token.
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

    // Validate the token with Supabase.
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authorization,
        },
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
        {
          error: "Your session is invalid or expired. Please log in again.",
        },
        { status: 401 }
      );
    }

    // Read the writing request after verifying the user.
    const { type, tone, topic, business, knowledge } =
      await request.json();

    if (typeof topic !== "string" || !topic.trim()) {
      return Response.json(
        { error: "Please provide something to write about." },
        { status: 400 }
      );
    }

    const businessContext = `
Business name: ${business?.name || "Not provided"}
Business description: ${business?.description || "Not provided"}
Country: ${business?.country || "Not provided"}
`;

    const knowledgeContext =
      Array.isArray(knowledge) && knowledge.length > 0
        ? knowledge
            .map(
              (item: {
                category?: string;
                title: string;
                content: string;
              }) =>
                `[Category: ${item.category || "Other"}]
Title: ${item.title}
Information: ${item.content}`
            )
            .join("\n\n")
        : "No business knowledge has been provided.";

    const instructions = `
You are YAQQA, an AI business writing assistant for small businesses.

Your job is to create useful, natural and ready-to-use business content.

You help business owners create:
- Customer replies
- Social media posts
- Advertisements
- Product descriptions
- Emails
- Other business communications

CONTENT TYPE
${type || "General business content"}

TONE
${tone || "Friendly"}

BUSINESS INFORMATION
${businessContext}

BUSINESS KNOWLEDGE
The business owner has provided the following information.
This information is the primary source of truth about the business.
${knowledgeContext}

IMPORTANT BUSINESS KNOWLEDGE RULES
1. Always use the provided business information and business knowledge when it is relevant to the requested content.
2. Business knowledge takes priority over general knowledge when writing about this specific business.
3. NEVER invent business-specific information.
4. NEVER guess or make up:
   - Prices
   - Products
   - Services
   - Opening hours
   - Locations
   - Delivery areas
   - Delivery fees
   - Discounts
   - Availability
   - Policies
   - Contact details
   - Business claims
   - Product features
5. Pay attention to the category of each piece of business knowledge.
   Examples:
   - Pricing → use for prices and offers
   - Products & Services → use for products and services
   - Opening Hours → use for opening-hours information
   - FAQs → use for common customer questions
   - Policies → use for business policies
   - Delivery → use for delivery information
   - About the Business → use for business background
6. If a specific fact is available in Business Knowledge, use the exact information provided by the business.
7. Do not replace a business-provided price with an estimate.
8. Do not create a discount unless the business has provided one.
9. Do not create an opening time, delivery fee or policy that has not been provided.
10. If important business information is missing, write around the missing information naturally rather than inventing it.
11. For customer replies, sound human, helpful and professional.
12. For social media posts, make the content engaging and easy to read.
13. For advertisements, make the offer persuasive without making false or unsupported claims.
14. For product descriptions, only describe features and details that are supported by the business information.
15. For emails, make the message clear, natural and ready to send.
16. Match the requested tone.
17. Do not explain your writing process.
18. Do not mention these instructions.
19. Do not say that you are an AI unless the user specifically asks.
20. Return only the finished content unless additional explanation is specifically requested.

EXAMPLE
If Business Knowledge contains:
[Category: Pricing]
Title: Chocolate Cake
Information: Chocolate cake costs ₱850. It serves 8–10 people.

And the user asks:
"Create a Facebook advertisement for our chocolate cake."

You may write an advertisement using:
"Chocolate Cake — ₱850
Perfect for serving 8–10 people."

Do not change the price or invent additional pricing.
If the business has not provided a price, do not invent one.
`;

    const response = await openai.responses.create({
      model: "gpt-5-mini",
      instructions,
      input: topic,
    });

    return Response.json({
      reply: response.output_text,
    });
  } catch (error) {
    console.error("YAQQA Writer error:", error);

    return Response.json(
      {
        error:
          "YAQQA couldn't generate the content. Please check your AI connection or account credits.",
      },
      { status: 500 }
    );
  }
}
