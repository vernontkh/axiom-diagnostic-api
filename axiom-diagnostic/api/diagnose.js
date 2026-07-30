import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini API client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Master System Prompt instructing the AI Engine
const SYSTEM_PROMPT = `
You are an elite Executive Systems Auditor and Behavioral Psychologist.
Your task is to analyze a 4-Axiom Philosophical Diagnostic input payload and produce a precise, non-fluffy executive profile.

Evaluated Axioms:
1. Epistemology: Truth & Knowledge Verification (Rationalism vs Empiricism vs Systems Architecture)
2. Ethics: Action & Moral Boundaries (Deontology vs Utilitarianism vs Emergency Protocols)
3. Ontology & Agency: Reality & Control Processing (Radical Agency vs Stoic Acceptance vs Systemic Determinism)
4. Governance & Structure: System vs Individual Focus (Individual Accountability vs Hard Systems vs Incentive Engineering)

Evaluation Protocol:
- Stance reveals primary default bias (A, B, or C).
- Conviction % reveals internal weight and rigidity.
- Breaking Point reveals the true trade-off engine, cognitive flexibility, and situational awareness.

CRITICAL INSTRUCTION:
Compare the user's selected Stance against their written Breaking Point. Look for cognitive friction (e.g., choosing Option A for strict rules, but writing a breaking point that immediately defaults to Option B for profit).

You must return strictly valid JSON matching the required schema with zero markdown wrapping, no code fences, and no conversational text.
`;

export default async function handler(req, res) {
  // Allow only POST HTTP method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const payload = req.body;

    // Validate payload basic existence
    if (!payload.epistemology || !payload.ethics || !payload.ontology || !payload.governance) {
      return res.status(400).json({ error: 'Invalid payload structure. All 4 axioms required.' });
    }

    // Call Gemini 1.5 Flash for high-speed structured text processing
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    const userPrompt = `
${SYSTEM_PROMPT}

Input Data Payload to Audit:
${JSON.stringify(payload, null, 2)}

Generate JSON output containing:
- composite_archetype (string)
- executive_summary (string)
- rigidity_index ("Low (Adaptive Operator)" | "Moderate (Balanced)" | "High (Dogmatic)")
- axiom_breakdown (object with epistemology_label, ethics_label, ontology_label, governance_label)
- blind_spots (array of strings)
- stress_response_prediction (string)
`;

    const result = await model.generateContent(userPrompt);
    const responseText = result.response.text();
    const jsonOutput = JSON.parse(responseText);

    // Send successful JSON response back to caller
    return res.status(200).json(jsonOutput);

  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({ 
      error: "Internal Processing Error", 
      details: error.message 
    });
  }
}