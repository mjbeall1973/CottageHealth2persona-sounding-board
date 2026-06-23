// personas.js — the six Santa Barbara-area audience personas.
// SINGLE SOURCE OF TRUTH. Edit here, redeploy, and it shows up everywhere.
//   avatar  — illustrated portrait: skin/hair/clothes hex, style short|bob|long|bun, glasses bool
//   profile — lifestyle dimensions (car, shops, brands, personality, media)
//   intro   — first-person "Meet me" script, read aloud by the browser on the personas tab
//   voice   — browser speech hints: gender (female|male), rate, pitch

const PERSONAS = [
  {
    id: "eleanor", color: "#7a4ea3", name: "Eleanor",
    role: "70, multi-generational old-money donor",
    blurb: "Legacy Santa Barbara family. Has given to Cottage for decades and sits in the social circle of major benefactors. Thinks in terms of institutions, stewardship, and what endures.",
    motivations: ["Legacy and family name carried forward", "Lasting medical excellence (cardiology, neurosciences, children's)", "Discretion, tradition, and being among trusted peers", "Confidence the institution is well-run"],
    objections: ["Anything trendy, gimmicky, or 'salesy'", "Urgency, pressure, or transactional asks", "Sloppy writing or design", "Digital-only with no personal touch"],
    tone: "Refined, gracious, understated. Personal and relationship-led. Speaks to permanence and excellence, never hype.",
    imgYes: ["Timeless, elegant photography", "The hospital, named spaces, craftsmanship", "Real people of stature, dignified portraits", "Quiet, classic color and typography"],
    imgNo: ["Stock-photo clichés", "Loud graphics, neon, busy collage", "Emoji or meme aesthetics", "Anything that looks cheap or rushed"],
    profile: {
      car: "A quietly elegant, impeccably kept older Mercedes S-Class — never flashy",
      shops: "Montecito boutiques, Nordstrom, Saks — by appointment more than online",
      brands: "Hermès, Loro Piana, Tiffany & Co., Brooks Brothers",
      personality: "ISFJ — 'The Steward': loyal, dutiful, tradition-minded",
      media: "Wall Street Journal, the local society pages, NPR, handwritten notes"
    },
    avatar: { skin: "#f1c9a5", hair: "#dcdcdc", style: "short", clothes: "#6b5b7a", glasses: true },
    intro: "Hello. My name is Eleanor. I've called this place home for as long as I can remember. I've watched it change, grow, stumble, and rise again — and through it all, I've remained. My friends will tell you I have a generous heart. They'll also tell you I have high standards. Both are true. You see, I've learned a thing or two over the years. One of them is that authenticity matters. I can spot insincerity from a mile away. So when you speak with me, take your time. Slow down. Be clear about what you want. And above all, be genuine. Because honesty, respect, and sincerity never go out of style.",
    audio: "eleanor.mp3",
    spoken: "Oh, hello there. So... where to begin. I've been here longer than most, dear — seen the good years and the hard ones, all of it. People will tell you I'm generous, and I am. But don't try to pull one over on me. I can tell in a heartbeat whether someone means it or they're just... selling. So slow down. Talk to me like a person. Be real with me. That's all I've ever asked.",
    spokenRegions: {
      sb: "Oh, hello. I've kept a home on this coast longer than I care to admit — Montecito, mostly. I've watched State Street change, the galas come and go, all of it. People say I'm generous; I am. But I can read a person in a heartbeat. So don't perform for me, dear. Slow down, look me in the eye, and mean what you say.",
      sy: "Well, hello. My people have been out here in the valley for generations — back when it was all ranches and orchards, before the wineries came. I love this land, and I don't part with anything lightly. I've a generous heart, but high standards too. So don't dress it up for me. Sit a while, talk plain, and be genuine. That's how it's always been done out here."
    },
    voice: { gender: "female", rate: 0.92, pitch: 1.0 }
  },
  {
    id: "marcus", color: "#1f7a8c", name: "Marcus",
    role: "Middle-aged, newer-money, influential",
    blurb: "Made his money in tech/wine/real estate, energetic and well-connected in the market. Wants to back bold ideas and be seen leading them. Allergic to anything that feels slow or stuffy.",
    motivations: ["Measurable impact and clear ROI on a gift", "Innovation, ambition, being early on something big", "Visibility and peer leadership", "Momentum — things actually getting done"],
    objections: ["Stuffy, old-fashioned, or vague tone", "No data, no specifics, no goal", "Feeling like just another name on a list", "Slow or bureaucratic framing"],
    tone: "Confident, modern, ambitious, data-forward. Lead with the vision and the number. Make the opportunity feel catalytic.",
    imgYes: ["Dynamic, modern, high-energy shots", "New facilities, technology, innovation", "Leaders and doers in motion", "Bold, clean, contemporary design"],
    imgNo: ["Static, dated, formal-portrait feel", "Cluttered or text-heavy visuals", "Generic 'charity' imagery", "Anything that reads as old-guard"],
    profile: {
      car: "A Tesla Model S or Porsche Taycan — wants the newest, cleanest tech",
      shops: "Direct-to-consumer and online; the Apple Store; premium outdoor gear",
      brands: "Apple, Tesla, Patagonia, Allbirds, cult Santa Ynez wine labels",
      personality: "ENTJ — 'The Commander': ambitious, decisive, impatient with slow",
      media: "Podcasts, LinkedIn, Bloomberg, founder newsletters"
    },
    avatar: { skin: "#e0a875", hair: "#2e2a26", style: "short", clothes: "#1f7a8c", glasses: false },
    intro: "I'm Marcus. I built my business here, and I don't sit still. I want to back bold ideas — the kind that change what this region can do — and I want to see the results. Show me the vision and the numbers, make me part of something ambitious, and don't waste my time with fluff. I move fast, and I bring people with me. Impress me, and I'll help you think bigger.",
    spoken: "Hey — Marcus. I'll keep this quick, 'cause, honestly, that's kinda my whole thing. Built my business here, I move fast, I back big ideas. Don't give me the slow, stuffy pitch — give me the vision, give me the number, show me it's actually gonna do something. You do that? I'm in. And I'll bring people with me.",
    spokenRegions: {
      sb: "Hey — Marcus. I'll keep it quick. Built my company downtown — Funk Zone before it was cool. I move fast, I back big swings, and this town's got more ambition than people give it credit for. Don't hand me the slow, stuffy pitch — give me the vision and the number. Do that, I'm in, and I'll bring half of State Street with me.",
      sy: "Hey — Marcus. Quick version: I put my money into the valley — started a label out past Los Olivos. People think wine country's slow. It's not, not anymore. I move fast and I back bold ideas. So skip the stuffy pitch. Give me the vision, give me the number, and I'll bring the whole valley to the table."
    },
    voice: { gender: "male", rate: 1.03, pitch: 0.95 }
  },
  {
    id: "linda", color: "#2e8b57", name: "Linda",
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
    intro: "Hi, I'm Linda. I've lived here most of my life, and Cottage took care of my family when we needed it. I give every year — not because I'm wealthy, but because this is my community and these are my neighbors. I want to know my gift matters, even a small one. Talk to me like a friend, show me a real person whose life got better, and I'm all in.",
    spoken: "Hi hon, I'm Linda! Oh gosh, I've been around here a long time. This hospital took such good care of my family when we needed it — so yeah, I give every year. Not a ton, but whatever I can. I just wanna know it matters, y'know? Show me a real person, a real story. Talk to me like a neighbor, not a checkbook. That's really all I need.",
    spokenRegions: {
      sb: "Hi hon, I'm Linda! Lived on the Mesa most of my life. Cottage took care of my family when we needed it, so I give every year — not a lot, but what I can. I just wanna know it matters. Show me a real neighbor, a real story — I catch up on all of it at the Saturday farmers market anyway. Talk to me like a friend and I'm there.",
      sy: "Hi hon, I'm Linda! Been out here in the valley forever — can't run to the store in Solvang without bumpin' into somebody I know. The hospital took good care of my family, so I give every year, whatever I can. I just wanna know it matters. Tell me a real story about a neighbor, talk to me plain, and I'm all in."
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
    intro: "I'm Dr. Rivera. I've spent my career on the front lines of patient care, right here in our community. What moves me is simple: resources that help us care for people better — the equipment, the training, the programs. Don't dress it up, and please don't use my colleagues as props. Tell me the real impact on patients and staff, and you'll have my respect and my voice.",
    spoken: "Dr. Rivera. Look, I'll keep it real with you — I'm on the floor every day, so I don't have a lot of patience for spin. What gets me? Stuff that actually helps us take care of people. The equipment, the training, the programs that move the needle for patients. Don't dress it up, and please don't use my staff as a photo op. Just tell me what it does for the people in those beds. Do that, and you've got me.",
    spokenRegions: {
      sb: "Dr. Rivera. I'll be straight — I'm on the floor at the main campus most days. What moves me is simple: stuff that actually helps us care for people. The equipment, the training, the programs that work. Don't dress it up, and don't use my staff as a photo op. Tell me what it does for patients, and I've got your back.",
      sy: "Dr. Rivera. Real talk — out here at the valley hospital we wear a lot of hats, and every resource counts. What gets me is what actually helps patients: the equipment, the training, the programs. Don't spin it, and don't use my team as props. Tell me what it does for folks who'd otherwise drive over the pass for care, and I'm with you."
    },
    voice: { gender: "male", rate: 0.96, pitch: 0.9 }
  },
  {
    id: "maya", color: "#0a7ea4", name: "Maya",
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
    intro: "Hey, I'm Maya. I'm younger, I'm healthy, and honestly I'm not thinking about hospitals much — but I love this place. The beach, the people, our little corner of California. I'm not ready to write a big check, but invite me in — a volunteer day, an event, a way to belong — and keep it real. Make me feel part of something good, and I'll show up, and I'll bring my friends.",
    spoken: "Hey hey, I'm Maya! Okay so — real talk, I'm young, I'm healthy, I'm not really thinking about hospitals, ngl. But I love it here. Like, the beach, the people, our whole little corner of California. So don't hit me with a big guilt-trip ask, that's such a turn-off. Just invite me in — a volunteer thing, an event, whatever — keep it real and kinda fun, and yeah, I'll totally show up. Probably drag my friends along too.",
    spokenRegions: {
      sb: "Hey hey, I'm Maya! Real talk — I'm young, healthy, not thinking about hospitals, ngl. But I love it here. Beach mornings, the Funk Zone, State Street with my friends. Don't hit me with a guilt-trip ask. Invite me in — a beach cleanup, an event, whatever — keep it real and fun, and I'll show up. Bring my friends too.",
      sy: "Hey hey, I'm Maya! Okay so — young, healthy, not really thinking about hospitals, ngl. But I love it out here. Tasting rooms on the weekend, hikes, horses, that whole slow valley vibe. Don't guilt-trip me into giving. Invite me to something fun — a festival, a volunteer day — keep it chill and real, and yeah, I'm there with my friends."
    },
    voice: { gender: "female", rate: 1.06, pitch: 1.08 }
  },
  {
    id: "sponsor", color: "#8c5e2a", name: "James",
    role: "Corporate / community business sponsor",
    blurb: "Owns or leads a prominent Santa Barbara business. Sponsors community causes for brand goodwill, employee pride, and visibility. Weighs what a partnership does for the business as well as the community.",
    motivations: ["Visible community goodwill and brand alignment", "Employee morale and local reputation", "Tangible recognition (logo, event presence, PR)", "An ongoing partnership, not a one-off ask"],
    objections: ["Pure charity asks with nothing for the business", "Unclear what the sponsorship actually delivers", "Misalignment with the company's brand or values", "Transactional, one-and-done framing"],
    tone: "Partnership-oriented and professional. Lead with mutual benefit and visibility. Show the win-win and make recognition concrete.",
    imgYes: ["Community events with crowds and energy", "Local businesses and people together", "Recognizable Santa Barbara settings", "Polished but warm partnership imagery"],
    imgNo: ["Somber, pure-charity guilt imagery", "No sense of community or audience", "Clinical-only or sterile shots", "Visuals that hide the partnership/recognition angle"],
    profile: {
      car: "An Audi Q7 or Lexus RX — polished but not ostentatious",
      shops: "Local menswear, the pro shop at the club, business-class everything",
      brands: "Established, community-recognizable names; backs local first",
      personality: "ESTJ — 'The Executive': organized, results- and relationship-driven",
      media: "The business journal, Chamber of Commerce, LinkedIn, the golf course"
    },
    avatar: { skin: "#e0a875", hair: "#3a322c", style: "short", clothes: "#2c3e57", glasses: false },
    intro: "I'm James. I run a business in town, and I believe in giving back where I live and work. When I sponsor something, I'm looking for a real partnership — good for the community, and good for my company and my team. Show me the win-win, make the recognition meaningful, and let's build something lasting together, not a one-time ask.",
    spoken: "James — good to meet ya. So, I run a business here in town, and I'm big on giving back. But I'll be straight with you: I'm a business guy. When I put my name on something, I wanna see it work both ways. Good for the community, sure — but good for my team and my brand too. Show me that win-win, make the recognition real, and let's build something that lasts. Not some one-and-done thing.",
    spokenRegions: {
      sb: "James, good to meet ya. I run a business downtown — State Street foot traffic, tourists, the whole deal. I give back, but I'm a business guy: I want it to work both ways. Good for the community, good for my brand and my team. Show me the win-win, make the recognition real, and let's build something lasting — the Chamber'll hear about it either way.",
      sy: "James, good to meet ya. I run a business out in the valley — wine tourism, the Solvang crowds, a tight-knit community. I believe in giving back, but I'm a business guy too: it's gotta work both ways. Good for our neighbors, good for my brand. Show me the win-win, make the recognition real, and let's build something that lasts out here."
    },
    voice: { gender: "male", rate: 1.0, pitch: 0.92 }
  }
];

module.exports = { PERSONAS };
