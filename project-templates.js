// project-templates.js — starting points for the "My Projects" workspace.
// A project is a titled collection of editable sections. Templates are cloned
// into a user's own project; the AI actions (talking points / opportunities)
// operate on any section using the Foundation's voice.
const crypto = require("crypto");

// ---- the seeded example: Santa Ynez Valley Cottage Hospital donor tour ----
const SYVCH_SECTIONS = [
  {
    heading: "Theme & Narrative",
    kind: "narrative",
    hint: "The through-line of the whole tour. What do we want guests to feel?",
    body:
`Theme: "Growth, not change." Show what the hospital is today so guests can feel what it will become.

This is not a standard rural hospital rebuild — it is a reflection of a community that chose to protect the ability to be cared for close to home. The valley is at an inflection point, and our guests can help shape its future while safeguarding exactly what made people fall in love with this place.

Tell the hospital through people, not rooms: physicians who are of this valley, nurses who have themselves been patients here, and a health system making an unusual, whole-hearted commitment to keep world-class care local.`
  },
  {
    heading: "Know Your Audience",
    kind: "narrative",
    hint: "Who are the guests, what moves them, and what must we still learn?",
    body:
`Who they are: A philanthropically significant couple with a deep, demonstrated commitment to rural health. Sophisticated about hospitals — read them as partners, not visitors who need convincing.

What moves them: Maximum impact on the community and a genuine sense of belonging to it. Not perks, not naming, not special treatment.

Their tie to the valley: They keep a residence about a mile from the hospital and spend real time here. Treat them as neighbors with a stake in the valley's future.

Relationship goal: Appreciate their interest — do not persuade. Every moment should say "thank you for becoming a neighbor," not "here is why you should give."

Still to learn: Why did they choose this valley? How much time do they spend here? Will both attend? Can they see the hospital from their property?`
  },
  {
    heading: "The Ask (hold lightly, know it cold)",
    kind: "narrative",
    hint: "The frame everyone should understand — even though the tour itself is a lead-in, not a solicitation.",
    body:
`This tour is a lead-in, not a solicitation. But everyone should know the frame so the day points one direction:

• ~$10M funds the Emergency Department expansion — the single biggest project, doubling the ED's size.
• ~$50M funds the full hospital rebuild.

The ED is the honest centerpiece: most people who come here for care walk in through the emergency department, not the lobby. It is, literally, the front door.`
  },
  {
    heading: "The Cast (roles, not a script)",
    kind: "narrative",
    hint: "Who guests meet, and the one authentic thing each person should convey.",
    body:
`Tour guide — Katie: Leads the tour and carries the culture of the valley. Warm, off-the-cuff, quick to let staff speak.

CEO — Scott: A companion more than a presenter. One job: speak authentically to why he and Cottage Health are committing to this valley. Do NOT script him.

ED physician — Dr. Gerhardt: The most compelling voice available — "of the valley," a horse man and Rancheros member, and a regional ED leader. Engineer ~3 minutes one-on-one with the guests.

Hospitalist — Dr. Lemon: Longtime valley resident; carries the hospitalist-program story.

Imaging lead — Nathan: Speaks to imaging today and the future MRI wing.

A community voice: Consider a well-known, genuinely connected local (not a Cottage employee) to say what the hospital means to the community.

Keep it to 2–4 people guests actually meet — more feels like a parade.`
  },
  {
    heading: "Stop 1 · Admin Trailer — The Vision Table",
    kind: "stop",
    hint: "The opening. Highest attention and energy of the whole tour.",
    body:
`Overview: Start here, not the lobby. Park directly in front. Gather around the central table with the floor plan and architect illustrations laid out. It's calm, private, and honest — executives working out of a trailer is itself the argument.

Talking points:
• "Before we walk in, we want you to see what this will be — not just what it is today."
• "The contrast is stark and we won't hide it: the president of this hospital works out of this trailer. Our MRI runs out of another one."
• Hand 60–90 seconds to Scott on why Cottage Health is committing to the valley. Let him be himself.

Engagement:
• Lay plans and renderings on the table; let guests lean in and ask.
• Offer water; set expectations for the ~40-minute walk.
• Pre-frame: "As we go, notice the hallways, the lighting, the space — we'll talk about it on the back end."`
  },
  {
    heading: "Stop 2 · The Empty Field & The Tree",
    kind: "stop",
    hint: "What it will become — the 'today vs. tomorrow' beat.",
    body:
`Overview: Walk out the back to where the new wing will rise. Stand in the open space and let them picture it. Also a quiet proof of community partnership.

Talking points:
• "Saving this tree was part of getting the whole project approved. The City of Solvang is genuinely thrilled — and that doesn't happen by accident. It happens when you build something with a community instead of dropping it on top of them."

Engagement:
• The quiet-pause moment (recommended): "You hear that? Nothing. That's why we're here in the valley — that's what we're protecting."
• Gesture from the trailers to the renderings — let the geography tell the story.`
  },
  {
    heading: "Stop 3 · The MRI Trailer",
    kind: "stop",
    hint: "The reality of need. A punctuation mark, not a paragraph.",
    body:
`Overview: Include it. Advanced imaging runs out of a trailer today — no more honest illustration of need. Keep it brief.

Talking points:
• State it plainly: the imaging that rules out a stroke or finds a tumor happens in a trailer.
• Connect forward: show where the new imaging wing will go; let Nathan speak to what changes for patients.

Engagement:
• Let the space speak first. Say less than you want to.`
  },
  {
    heading: "Stop 4 · Imaging & the Nurses' \"Lounge\"",
    kind: "stop",
    hint: "Entering the building through the closest entrance, not the lobby.",
    body:
`Overview: Enter through the closest entrance. Just inside is the nurses' "lounge" — generously named. It's effectively a converted closet with a small table, a fridge, and a sink. All of it goes away in the rebuild.

Talking points:
• Frame through the staff: this is where nurses take the only break they get all shift.
• Tie caregivers to community: many staff grew up in this valley — and some have been patients in it.

Engagement:
• If a nurse is willing, let them describe the space in their own words for 30 seconds.
• Have Nathan speak to the future MRI wing from this entrance.`
  },
  {
    heading: "Stop 5 · The Emergency Department",
    kind: "stop",
    hint: "The centerpiece — the front door. The emotional core.",
    body:
`Overview: The heart of the campaign. The ED is doubling in size and is the true front door — most people who come for care come through these doors. Station Dr. Gerhardt here. If it's tight inside, gather under the canopy just outside.

Talking points:
• Let Dr. Gerhardt tell the ED through a real, de-identified moment — "three weeks ago, in this very space…" — not a description.
• "This is the front door to the entire hospital. We're doubling its size because the valley has outgrown what we can safely do in the space we have."

Engagement:
• Engineer ~3 minutes of Dr. Gerhardt one-on-one with guests.
• Pre-frame before entering: "Imagine you've just driven here at 2 a.m. This is the first thing you'd see."
• Be ready for the signage question — there's no signage from the main roads. Answer honestly; it's part of the larger vision.`
  },
  {
    heading: "Stop 6 · The Hospitalist Story",
    kind: "stop",
    hint: "Why this community fights for its hospital. A favorite story.",
    body:
`Overview: The clearest proof that this hospital exists because the people in it refused to let it be ordinary. Tell it wherever Dr. Lemon can speak naturally.

Talking points:
• Dr. Lemon and his boss Dr. Besh fought ~5 years for an in-house hospitalist program. The reimbursement math didn't break even — so they modeled it and showed Cottage that ~2 more surgeries per week would cover the cost, at virtually no change in revenue.
• "They didn't fight for reach or money. They fought so a patient from this valley could stay overnight here, close to home. Then Cottage brought everything it had to keep this hospital strong."

Engagement:
• Let Dr. Lemon carry it in the first person — five years of persistence lands differently from the person who lived it.`
  },
  {
    heading: "Stop 7 · Surgical Area",
    kind: "stop",
    hint: "Capacity that keeps care local. A shorter stop.",
    body:
`Overview: A stop Katie typically includes. Connects the hospitalist story to the practical engine of the hospital.

Talking points:
• Connect the dots: two more surgeries a week is what made overnight care possible — clinical care and financial sustainability are the same story here.
• Keep it forward-looking: what expanded surgical capacity means for keeping families from having to travel.

Engagement:
• If timing allows, one sentence from a surgeon or surgical nurse about a recent local save.`
  },
  {
    heading: "Stop 8 · The Wrap-Up",
    kind: "stop",
    hint: "From what they saw to what they can build. ~15 minutes.",
    body:
`Overview: Land the plane. Space is tight — the blue conference room is out (wing under construction). Use the small room off the front lobby or a room in the admin trailer. Choose calm and private over convenient.

Talking points:
• Bring it back to the whole: the trailer, the tree, the closet-sized lounge, the ED, the five-year fight — one community's decision to protect care close to home.
• "We didn't want to do this big, and we didn't want to do it small. We wanted to get it right — for this community. Thank you for spending this hour becoming part of it."

Engagement:
• Do NOT solicit here. The ask comes later, warmly and specifically.
• Confirm a next touch before they leave.
• Leave them with one picturable image (see Opportunities).`
  },
  {
    heading: "Opportunities & Changes",
    kind: "opportunities",
    hint: "Recommended enhancements — pick the few that fit these guests.",
    body:
`• Make one moment unexpected: the quiet-pause in the field; 3 unhurried minutes with Dr. Gerhardt; a nurse describing the "lounge" in her own words.
• Tell the hospital through stories, not rooms — coach each clinician to relive one real, de-identified moment in the actual space.
• Surface caregivers' community ties: the nurse treated here for her own heart attack; a lifelong local on staff.
• Solve the "in the way" feeling: pre-frame each stop; consider the shuttle idea (guests parked off-site, a physician rides in and previews the experience).
• Address the signage question head-on — prepare an honest, forward-looking answer.
• Give them something to take (one de-identified patient story, beautifully printed) and something to leave ("I'm building this for ______").
• End on a picture: ask them to close their eyes and imagine someone they love walking through the new front doors, then open to the rendering. People give to what they can picture.`
  },
  {
    heading: "After the Tour",
    kind: "narrative",
    hint: "The tour is the opening move — map the follow-through now.",
    body:
`• Confirm the next conversation before guests leave the parking lot.
• Send finished renderings + a one-page vision summary once ready.
• Keep this a standing agenda item for the next two weeks; assign owners to each open question.
• Debrief within 24 hours: what landed, what surprised them, what they lingered on — that's the seed of the eventual ask.`
  }
];

// ---- a blank scaffold for any future facility/donor tour ----
const BLANK_TOUR_SECTIONS = [
  { heading: "Theme & Narrative", kind: "narrative", hint: "The one feeling the whole tour should leave behind.", body: "" },
  { heading: "Know Your Audience", kind: "narrative", hint: "Who are the guests, what moves them, what must you still learn?", body: "" },
  { heading: "The Ask", kind: "narrative", hint: "The funding frame — held lightly, but known cold.", body: "" },
  { heading: "The Cast", kind: "narrative", hint: "Who guests meet and the one authentic thing each should say.", body: "" },
  { heading: "Stop 1 · The Opening", kind: "stop", hint: "Where you begin. Highest attention of the tour.", body: "" },
  { heading: "Stop 2 · ...", kind: "stop", hint: "A location, why it matters, talking points, engagement.", body: "" },
  { heading: "Stop 3 · ...", kind: "stop", hint: "A location, why it matters, talking points, engagement.", body: "" },
  { heading: "The Wrap-Up", kind: "stop", hint: "How you land the plane. Do not solicit here.", body: "" },
  { heading: "Opportunities & Changes", kind: "opportunities", hint: "Memorable moments and creative beats.", body: "" },
  { heading: "After the Tour", kind: "narrative", hint: "The follow-through plan.", body: "" }
];

const BLANK_SECTIONS = [
  { heading: "Overview", kind: "narrative", hint: "What is this project and what are you trying to accomplish?", body: "" },
  { heading: "Notes", kind: "narrative", hint: "Working notes, raw material, links.", body: "" }
];

const PROJECT_TEMPLATES = {
  "syvch-tour": {
    id: "syvch-tour",
    name: "Santa Ynez Valley Hospital Tour",
    type: "hospital-tour",
    featured: true,
    example: true,
    blurb: "A fully worked donor vision-tour built from the planning conversation — route, stories, talking points, and creative opportunities. Use it as-is or as a model.",
    sections: SYVCH_SECTIONS
  },
  "hospital-tour": {
    id: "hospital-tour",
    name: "Facility / Donor Tour (blank)",
    type: "hospital-tour",
    blurb: "A blank donor-tour scaffold: theme, audience, the ask, the cast, stops, opportunities, and follow-through. Fill it in with AI help.",
    sections: BLANK_TOUR_SECTIONS
  },
  "blank": {
    id: "blank",
    name: "Blank project",
    type: "general",
    blurb: "Start from scratch with a couple of open sections.",
    sections: BLANK_SECTIONS
  }
};

function newId(prefix) {
  return (prefix || "s") + "_" + crypto.randomBytes(5).toString("hex");
}

// Deep-clone a template into a fresh project payload with unique section ids.
function buildFromTemplate(templateId, title) {
  const tpl = PROJECT_TEMPLATES[templateId] || PROJECT_TEMPLATES["blank"];
  const sections = (tpl.sections || []).map(s => ({
    id: newId("sec"),
    heading: s.heading,
    kind: s.kind || "narrative",
    hint: s.hint || "",
    body: s.body || ""
  }));
  return {
    type: tpl.type || "general",
    title: title || tpl.name || "Untitled project",
    templateId: tpl.id,
    sections
  };
}

// A lightweight catalog for the "new project" picker (no big bodies).
function templateCatalog() {
  return Object.values(PROJECT_TEMPLATES).map(t => ({
    id: t.id, name: t.name, type: t.type, blurb: t.blurb,
    featured: !!t.featured, example: !!t.example, sectionCount: (t.sections || []).length
  }));
}

module.exports = { PROJECT_TEMPLATES, buildFromTemplate, templateCatalog, newId };
