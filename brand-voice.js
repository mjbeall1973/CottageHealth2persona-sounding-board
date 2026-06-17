// brand-voice.js — the Cottage Health Foundation brand-voice calibration.
// Shown on the Brand voice tab AND fed to the AI on every evaluation so the
// "fix" suggestions nudge copy toward the intended voice. Edit and redeploy.

const BRAND_VOICE = {
  oneLine: "Brave but never boastful, inspirational over obligatory, warm over clinical, earned not inherited, and open to everyone coast to valley.",
  summary: "A pattern worth naming: the three 6s (Daring, Transformational, Earned) and the 3.5 Confidence are all restrained leans. Read together, they describe a voice that is brave and proven but never boastful — fitting a foundation that earned its standing by weathering real disaster rather than inheriting it.",
  dimensions: [
    { name: "Daring", score: 6, spectrum: "Daring vs. Safe (health-system brand sits at Safe 8)", note: "Stepping well off the health system's caution, but a 6 (not a 9) says calculated boldness, not recklessness.", words: ["optimistic", "ambitious", "decisive", "impactful", "ownership", "pioneering", "galvanizing", "willing", "forward-leaning", "conviction-driven"] },
    { name: "Inspirational", score: 8, spectrum: "Inspirational over Obligation", note: "The strongest score on the board. The emotional engine of the voice: people should give because they're moved, not because they're asked.", words: ["aspirational", "uplifting", "hopeful", "stirring", "motivating", "elevating", "possibility", "heartfelt", "purpose-led", "rallying"] },
    { name: "Transformational", score: 6, spectrum: "Transformational over Conservative", note: "Change-making, but grounded enough to be believed. A 6 says 'real change,' not 'blow it all up.'", words: ["catalytic", "change-making", "renewing", "generative", "breakthrough", "momentum", "redefining", "expansive", "evolving", "lasting"] },
    { name: "Earned", score: 6, spectrum: "Earned vs. Inherited (health-system brand sits near Inherited 2)", note: "The widest gap from the health system, and arguably the most authentic claim after fire and flood. Credibility built, not status handed down.", words: ["proven", "hard-won", "credible", "accountable", "authentic", "tested", "demonstrated", "deserved", "legitimate", "merit-based"] },
    { name: "Forward-thinking", score: 7, spectrum: "Forward-thinking over Traditional", note: "Future-facing and a notch stronger than transformational. Less about disruption, more about anticipating what care and community will need next.", words: ["innovative", "anticipatory", "modern", "agile", "adaptive", "proactive", "next-generation", "inventive", "foresight", "future-ready"] },
    { name: "Inclusive", score: 1, spectrum: "Inclusive vs. Exclusive (1 = essentially fully inclusive)", note: "The clearest 'table-stakes' position: this voice belongs to everyone in the region, coast to valley.", words: ["welcoming", "accessible", "belonging", "shared", "open", "collective", "equitable", "grassroots", "representative", "community-owned"] },
    { name: "Confidence", score: 3.5, spectrum: "Confidence over Humility", note: "The most interesting calibration. Confident, but only modestly — self-assured without arrogance. The vocabulary should sound capable, not chest-thumping.", words: ["assured", "capable", "poised", "sure-footed", "competent", "secure", "steady", "grounded-in-fact", "measured", "quietly-certain"] },
    { name: "Humanity", score: 6.5, spectrum: "Humanity over Excellence", note: "The Foundation chose warmth over clinical polish. Excellence is assumed (the hospital owns that); the Foundation's job is to make it personal.", words: ["compassionate", "caring", "empathetic", "personal", "dignified", "human-centered", "relational", "neighborly", "gracious", "present"] }
  ]
};

BRAND_VOICE.promptSummary =
  "COTTAGE HEALTH FOUNDATION BRAND VOICE (the tone the copy should ideally hit): " +
  BRAND_VOICE.oneLine +
  " Calibration — " +
  BRAND_VOICE.dimensions.map(d => d.name + " " + d.score).join(", ") +
  ". When suggesting a fix, nudge the copy toward this voice without naming the framework.";

module.exports = { BRAND_VOICE };
