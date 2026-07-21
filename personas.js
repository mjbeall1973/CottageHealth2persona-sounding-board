// personas.js — the Santa Barbara-area audience personas.
// SINGLE SOURCE OF TRUTH. Edit here, redeploy, and it shows up everywhere.
//   avatar  — illustrated portrait: skin/hair/clothes hex, style short|bob|long|bun, glasses bool
//   profile — lifestyle dimensions (car, shops, brands, personality, media)
//   intro   — first-person "Meet me" script, read aloud by the browser on the personas tab
//   voice   — browser speech hints: gender (female|male), rate, pitch
//   lean    — this persona's default facts/feelings frame ("facts" or "feelings")

const PERSONAS = [
  {
    id: "walter", color: "#2b6cb0", name: "Walter", lean: "facts",
    role: "70s, self-made, hard-nosed facts-and-numbers donor",
    blurb: "Built his own business over decades and gives generously, but scrutinizes every dollar. Serious, plainspoken, and skeptical of anything that can't be backed up. He wants proof, not persuasion.",
    motivations: ["Hard proof the money is well spent — outcomes, numbers, accountability", "A disciplined, well-run institution", "Specifics and evidence over sentiment", "Lasting results he can actually measure"],
    objections: ["Emotional appeals with no substance behind them", "No data, no specifics, no clear result", "Hype, superlatives, and glossy spin", "Any hint the money isn't carefully stewarded"],
    tone: "Serious, direct, evidence-first. Earn his trust with facts, figures, and proof, never with flourish or feeling. Respect his time and his intelligence.",
    imgYes: ["Credible, documentary, no-nonsense", "Real facilities and equipment actually in use", "Results and outcomes made tangible", "Clean, sober, uncluttered design"],
    imgNo: ["Staged emotion or manufactured warmth", "Glossy hype and hero shots", "Vague inspirational fluff", "Anything that looks like marketing spin"],
    profile: {
      car: "A well-kept older pickup or a sensible sedan — function over flash",
      shops: "Costco and the hardware store; buys quality once and keeps it",
      brands: "Durable, proven, no-nonsense names; loyalty earned over years",
      personality: "ISTJ — 'The Inspector': analytical, skeptical, evidence-led",
      media: "Wall Street Journal, annual reports, the numbers, people he has trusted for years"
    },
    avatar: { skin: "#e8c9a0", hair: "#b8b8b8", style: "short", clothes: "#2b6cb0", glasses: false },
    photo: "walter.jpg",
    intro: "Walter. I built what I have over a long time, and I did it by paying attention to the numbers. I give, and I give seriously, but I want to know exactly where it goes and what it does. Don't sell me. Show me the facts, show me the result, and show me you run a tight ship. Do that, and I will be one of your steadiest supporters. Waste my time with fluff, and I am gone.",
    spoken: "Walter. I'll be blunt, because that's how I am. I've given to plenty of causes, and the ones that keep me are the ones that show their work. Don't tell me it's transformational. Tell me what it cost, what it did, and how you know. Numbers. Proof. A straight answer. That is what earns my check, and it is the only thing that does.",
    spokenRegions: {
      south: "Walter. I've been on this coast a long time and I've watched a lot of money get wasted. Show me the numbers and the result, plainly, and I'll take you seriously.",
      valley: "Walter. Out in the valley we judge a thing by whether it works and whether it lasts. Skip the pitch. Show me proof it holds up, and you'll have my attention.",
      north: "Walter. Up north, folks work hard for their money and expect the same discipline from an institution. Show me it's well run and the dollars reach real care, with proof, and I'm listening."
    },
    voice: { gender: "male", rate: 0.9, pitch: 0.85 }
  },
  {
    id: "winnie", color: "#7a4ea3", name: "Winnie", lean: "feelings",
    role: "70s, longtime major donor, moved by heart and relationships",
    blurb: "A legacy Santa Barbara family and a giver for decades. She gives from the heart — moved by real people, genuine relationships, and what a gift means, not what it measures. She can spot insincerity in a heartbeat.",
    motivations: ["A genuine emotional connection and real relationships", "Being moved by a true, human story", "Legacy, meaning, and what endures", "Sincerity, warmth, and trust"],
    objections: ["Coldness, or numbers with no heart", "Anything trendy, gimmicky, or 'salesy'", "Urgency, pressure, or transactional asks", "Digital-only with no personal, human touch"],
    tone: "Warm, gracious, personal, story-led. Move her with sincerity, meaning, and heart, never with data alone. Slow down and be genuine.",
    imgYes: ["Timeless, elegant photography with real feeling", "Real people and genuine emotion, dignified", "A warm human moment or relationship", "Quiet, classic color and typography"],
    imgNo: ["Cold, clinical, or purely data-driven", "Stock-photo clichés", "Loud graphics, neon, busy collage", "Anything that looks cheap or insincere"],
    profile: {
      car: "A quietly elegant, impeccably kept older Mercedes — never flashy",
      shops: "Montecito boutiques, Nordstrom — by appointment more than online",
      brands: "Hermès, Loro Piana, Tiffany & Co.",
      personality: "ISFJ — 'The Steward': loyal, warm, tradition-minded",
      media: "The local society pages, NPR, handwritten notes, longtime friends"
    },
    avatar: { skin: "#f1c9a5", hair: "#dcdcdc", style: "short", clothes: "#7a4ea3", glasses: true },
    photo: "eleanor.jpg",
    intro: "Hello. My name is Winnie. I've called this place home for as long as I can remember, and I've given to it with an open heart the whole while. What moves me isn't a number on a page. It's a real person, a true story, a moment that means something. I can tell in an instant whether someone is being sincere. So slow down, speak to me like a person, and let me feel why it matters. Do that, and you'll have not just my gift but my devotion.",
    spoken: "Oh, hello there, dear. I've been here longer than most, and I've given from the heart the whole time. Don't hand me a spreadsheet and expect me to feel something. Tell me about a real person. Let me feel it. I can always tell when someone means it, and that, more than anything, is what opens my heart and my checkbook.",
    spokenRegions: {
      south: "Hello, dear. Montecito's been home a long while, and what still moves me is a real, human story, told sincerely. Speak from the heart and you'll have me.",
      valley: "Hello. We keep a place out past Los Olivos now, and the valley has its own quiet warmth. Don't dress it up; show me the people, let me feel it, and I'll listen.",
      north: "Hello. I've spent time up in Santa Maria, and what moves me there is simple and human: a family cared for, told with real feeling. Be sincere, and it reaches me."
    },
    voice: { gender: "female", rate: 0.92, pitch: 1.0 }
  },
  {
    id: "linda", color: "#2e8b57", name: "Linda", lean: "feelings",
    role: "Annual donor, modest means, local at heart",
    blurb: "Some wealth but not by local standards. Gives every year because she cares about healthcare and her community — she or family have been cared for locally. Wants to know her gift matters.",
    motivations: ["Local impact she can see and feel", "Knowing any-size gift truly counts", "Gratitude — caring for neighbors and family", "Being part of the Cottage 'family'"],
    objections: ["Messaging that feels aimed only at the wealthy", "Feeling her gift is too small to matter", "Jargon, elitism, or coldness", "Big galas/naming talk with no place for her"],
    tone: "Warm, inclusive, grateful, plainspoken. Real stories over statistics. Make her feel essential, not minor.",
    imgYes: ["Real local people, neighbors, families", "Nurses and caregivers in candid moments", "The local/community hospital", "Patients whose lives were touched"],
    imgNo: ["Glossy, exclusive, black-tie-only vibe", "Faceless buildings or abstract concepts", "Corporate or clinical coldness", "Imagery that signals 'big donors only'"],
    profile: {
      car: "A dependable Subaru Outback or Honda CR-V",
      shops: "Costco, Trader Joe's, Target, the Saturday farmers market",
      brands: "Trader Joe's, REI, value-first brands she trusts",
      personality: "ESFJ — 'The Caregiver': warm, community-minded, generous",
      media: "Local paper, KEYT news, Facebook community groups, the church bulletin"
    },
    avatar: { skin: "#f1c9a5", hair: "#9a8a76", style: "bob", clothes: "#2e8b57", glasses: false },
    photo: "linda.jpg",
    intro: "Hi, I'm Linda. I've lived here most of my life, and Cottage took care of my family when we needed it. I give every year — not because I'm wealthy, but because this is my community and these are my neighbors. I want to know my gift matters, even a small one. Talk to me like a friend, show me a real person whose life got better, and I'm all in.",
    spoken: "Hi hon, I'm Linda! Oh gosh, I've been around here a long time. This hospital took such good care of my family when we needed it — so yeah, I give every year. Not a ton, but whatever I can. I just wanna know it matters, y'know? Show me a real person, a real story. Talk to me like a neighbor, not a checkbook. That's really all I need.",
    spokenRegions: {
      south: "Hi hon, I'm Linda! Santa Barbara's home. I'm not wealthy by these parts, but I give because this place took care of us. Talk to me plain and show me a real neighbor.",
      valley: "Hi hon, I'm Linda! Out here in the valley everybody knows everybody. Tell me about the nurse who's been at our hospital twenty years, and I'm all in.",
      north: "¡Hola! I'm Linda, up in Santa Maria. Family's everything here. Tell me my mother will be seen, and that someone will speak Spanish, and you've got me."
    },
    voice: { gender: "female", rate: 0.98, pitch: 1.05 }
  },
  {
    id: "clinician", color: "#c0641a", name: "Dr. Rivera",
    role: "Clinician & internal influencer",
    blurb: "A respected doctor/nurse seen as a community influencer. Deeply believes in the mission and wants the Foundation to fund the work on the front lines — equipment, education, patient care.",
    motivations: ["Resources that directly improve patient care", "Respect for frontline staff and their expertise", "Professional development and program support", "Mission integrity — care over spin"],
    objections: ["Corporate spin disconnected from real care", "Being used as a fundraising prop", "Overpromising or exaggerated claims", "Donor messaging that ignores staff"],
    tone: "Authentic, mission-driven, respectful, specific. Name the clinical impact. Honor caregivers as partners, not backdrops.",
    imgYes: ["Real caregivers and teams at work", "Authentic, unstaged clinical moments", "Equipment and programs being used", "Patients and staff together"],
    imgNo: ["Obviously staged 'hero' shots", "Models who clearly aren't clinicians", "Polished spin that erases the work", "Anything that feels exploitative"],
    profile: {
      car: "A Toyota 4Runner or a Prius — function over flash",
      shops: "REI and Costco; practical, no time for fuss",
      brands: "Patagonia, On running shoes, quality tools that just work",
      personality: "ISTJ — 'The Logistician': analytical, mission-driven, evidence-led",
      media: "Medical journals, NPR, professional networks, trusted colleagues"
    },
    avatar: { skin: "#c68642", hair: "#8c8c8c", style: "short", clothes: "#2f9e9e", glasses: true },
    photo: "clinician.jpg",
    intro: "I'm Dr. Rivera. I've spent my career on the front lines of patient care, right here in our community. What moves me is simple: resources that help us care for people better — the equipment, the training, the programs. Don't dress it up, and please don't use my colleagues as props. Tell me the real impact on patients and staff, and you'll have my respect and my voice.",
    spoken: "Dr. Rivera. Look, I'll keep it real with you — I'm on the floor every day, so I don't have a lot of patience for spin. What gets me? Stuff that actually helps us take care of people. The equipment, the training, the programs that move the needle for patients. Don't dress it up, and please don't use my staff as a photo op. Just tell me what it does for the people in those beds. Do that, and you've got me.",
    spokenRegions: {
      south: "Dr. Rivera. On the coast, what moves me is excellence we can't outsource; there's no backup twenty minutes away. Skip the gloss and tell me the real impact on patients.",
      valley: "Dr. Rivera. Out in the valley we're a long way over the pass. Don't spin me. Tell me it keeps care here, close, and good, and I'm with you.",
      north: "Dr. Rivera. Up north our families work hard and wait too long for care. Tell me it means access, appointments, someone who speaks their language, and you've got my respect."
    },
    voice: { gender: "male", rate: 0.96, pitch: 0.9 }
  },
  {
    id: "maya", color: "#0a7ea4", name: "Maya", lean: "feelings",
    role: "Younger public, no immediate need",
    blurb: "Healthy, younger Santa Barbaran with no pressing healthcare need. Not ready to make a big gift, but wants to feel good about a local brand and start a low-key relationship with the Foundation.",
    motivations: ["Local pride and community identity", "Feeling part of something good", "Easy, low-commitment ways in (events, volunteering, follows)", "Authenticity and social proof"],
    objections: ["Heavy asks or guilt-tripping", "'Why should I care, I'm healthy?' irrelevance", "Corporate, old-feeling, or preachy tone", "Anything inauthentic or out of touch"],
    tone: "Fresh, friendly, authentic, community-forward, light. Invite a relationship, don't demand a donation. Make belonging feel cool and easy.",
    imgYes: ["Vibrant local lifestyle and Santa Barbara identity", "Events, volunteers, young community", "Bright, authentic, candid energy", "Modern, social-media-native design"],
    imgNo: ["Somber or guilt-heavy imagery", "Stuffy formal or clinical shots", "Dated design that feels 'for older people'", "Overly corporate stock photos"],
    profile: {
      car: "A used Honda Civic, an e-bike, or rideshare — low-key and green",
      shops: "Thrift and vintage, Reformation, local Santa Barbara shops, online",
      brands: "Glossier, Reformation, Patagonia, sustainable local makers",
      personality: "ENFP — 'The Campaigner': authentic, social, cause-driven",
      media: "Instagram, TikTok, podcasts, friends' recommendations"
    },
    avatar: { skin: "#d99a6c", hair: "#241f1b", style: "long", clothes: "#0a7ea4", glasses: false },
    photo: "maya.jpg",
    intro: "Hey, I'm Maya. I'm younger, I'm healthy, and honestly I'm not thinking about hospitals much — but I love this place. The beach, the people, our little corner of California. I'm not ready to write a big check, but invite me in — a volunteer day, an event, a way to belong — and keep it real. Make me feel part of something good, and I'll show up, and I'll bring my friends.",
    spoken: "Hey hey, I'm Maya! Okay so — real talk, I'm young, I'm healthy, I'm not really thinking about hospitals, ngl. But I love it here. Like, the beach, the people, our whole little corner of California. So don't hit me with a big guilt-trip ask, that's such a turn-off. Just invite me in — a volunteer thing, an event, whatever — keep it real and kinda fun, and yeah, I'll totally show up. Probably drag my friends along too.",
    spokenRegions: {
      south: "Hey hey, I'm Maya! Santa Barbara girl. I love this place and want to keep it what it is, so don't sell me, just invite me in and keep it real.",
      valley: "Hey hey, I'm Maya! Valley life, horses and tasting rooms on the weekend. Keep it low-key and real and I'll show up with friends.",
      north: "Hey hey, I'm Maya! Santa Maria, big family, always something going on. Make it warm and about us, and I'm there, primos included."
    },
    voice: { gender: "female", rate: 1.06, pitch: 1.08 }
  }
];

module.exports = { PERSONAS };
