const https = require("https");

const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-3-flash-preview";
const GEMINI_API_HOST = "generativelanguage.googleapis.com";

function generateDebateScript({ topic, title, teamPair, teamName, duration }) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return Promise.reject(new Error("GEMINI_API_KEY is not configured on the server."));
  }

  const payload = {
    system_instruction: {
      parts: [
        {
          text: [
            "You are an expert debate moderator.",
            "Generate an AI vs AI debate script for a debate platform.",
            "Return only valid JSON with no markdown fences or extra commentary.",
            "Make the debate balanced, clear, and realistic.",
            "Keep each turn concise enough for voice playback in a web dashboard."
          ].join(" ")
        }
      ]
    },
    contents: [
      {
        parts: [
          {
            text: [
              `Debate title: ${title || topic}`,
              `Debate topic: ${topic}`,
              `Team pairing: ${teamPair || "Unknown pairing"}`,
              `Logged-in team: ${teamName || "Unknown team"}`,
              `Scheduled duration: ${duration || "Unknown"} minutes`,
              "Create exactly 4 turns in this order: Proposition, Opposition, Proposition, Opposition.",
              "Each turn should be 2-4 sentences.",
              "The response JSON must match this shape exactly:",
              "{",
              '  "title": "string",',
              '  "topic": "string",',
              '  "prompt": "string",',
              '  "status": "string",',
              '  "models": { "pro": "string", "opp": "string" },',
              '  "turns": [',
              '    { "side": "Proposition or Opposition", "speaker": "string", "text": "string" }',
              "  ]",
              "}"
            ].join("\n")
          }
        ]
      }
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseJsonSchema: {
        type: "object",
        properties: {
          title: { type: "string" },
          topic: { type: "string" },
          prompt: { type: "string" },
          status: { type: "string" },
          models: {
            type: "object",
            properties: {
              pro: { type: "string" },
              opp: { type: "string" }
            },
            required: ["pro", "opp"]
          },
          turns: {
            type: "array",
            minItems: 4,
            maxItems: 4,
            items: {
              type: "object",
              properties: {
                side: { type: "string" },
                speaker: { type: "string" },
                text: { type: "string" }
              },
              required: ["side", "speaker", "text"]
            }
          }
        },
        required: ["title", "topic", "prompt", "status", "models", "turns"]
      }
    }
  };

  return new Promise((resolve, reject) =>{
    const request = https.request(
      {
        hostname: GEMINI_API_HOST,
        path: `/v1beta/models/${encodeURIComponent(DEFAULT_MODEL)}:generateContent`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        }
      },
      (response) => {
        let rawBody = "";

        response.on("data", (chunk) => {
          rawBody += chunk;
        });

        response.on("end", () => {
          try {
            const parsed = JSON.parse(rawBody || "{}");

            if (response.statusCode && response.statusCode >= 400) {
              const apiMessage =
                parsed?.error?.message ||
                `Gemini API request failed with status ${response.statusCode}.`;
              reject(new Error(apiMessage));
              return;
            }

            const candidateText = extractCandidateText(parsed);
            if (!candidateText) {
              reject(new Error("Gemini returned an empty debate script."));
              return;
            }

            const debate = JSON.parse(candidateText);
            resolve(normalizeDebatePayload(debate, { topic, title }));
          } catch (error) {
            reject(new Error(`Failed to parse Gemini response: ${error.message}`));
          }
        });
      }
    );

    request.on("error", (error) => {
      reject(error);
    });

    request.write(JSON.stringify(payload));
    request.end();
  });
}

function extractCandidateText(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) {
    return "";
  }

  return parts
    .map((part) => (typeof part?.text === "string" ? part.text : ""))
    .join("")
    .trim();
}

function normalizeDebatePayload(debate, fallback) {
  return {
    title: String(debate?.title || fallback.title || fallback.topic || "AI Debate").trim(),
    topic: String(debate?.topic || fallback.topic || fallback.title || "Assigned Topic").trim(),
    prompt: String(debate?.prompt || "AI-generated debate opening").trim(),
    status: String(debate?.status || "Generated by Gemini").trim(),
    models: {
      pro: String(debate?.models?.pro || "Gemini Proposition").trim(),
      opp: String(debate?.models?.opp || "Gemini Opposition").trim()
    },
    turns: Array.isArray(debate?.turns)
      ? debate.turns
          .map((turn) => ({
            side: String(turn?.side || "").trim(),
            speaker: String(turn?.speaker || "").trim(),
            text: String(turn?.text || "").trim()
          }))
          .filter((turn) => turn.side && turn.speaker && turn.text)
      : []
  };
}

module.exports = {
  generateDebateScript
};
