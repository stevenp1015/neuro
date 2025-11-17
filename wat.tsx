// THE SALTZMAN DYNASTY – Mystic Falls (TypeScript Edition)

// Family Relationship Types
 type ParentType = "biological" | "surrogate" | "adoptive" | "magic transfer";

interface Relationship {
  type: "parent" | "child" | "sibling" | "spouse";
  targetId: string;
  note?: string; // "biological", "surrogate", etc.
}

interface Person {
  id: string;
  firstName: string;
  lastName: string;
  age?: number;
  isAlive: boolean;
  relationships: Relationship[];
  problems?: string[]; // Any major plotline/psychodrama
}

interface Entity {
  id: string;
  isAlive: boolean;
  whatsTheDeal: string[];
}


// Saltzman Family Core
const josette: Person = {
  id: "josette-saltzman",
  firstName: "Josette",
  lastName: "Saltzman",
  isAlive: false,
  relationships: [
    { type: "child", targetId: "lizzie-saltzman", note: "biological" },
    { type: "child", targetId: "josie-saltzman", note: "biological" },
    { type: "spouse", targetId: "alaric-saltzman" },
  ],
  problems: [
    "Murdered by her own twin brother Kai in one of the wildest TVD franchise plotlines.",
    "Parented magical twins from the afterlife."
  ]
};

const caroline: Person = {
  id: "caroline-forbes",
  firstName: "Caroline",
  lastName: "Forbes",
  isAlive: true,
  relationships: [
    { type: "child", targetId: "lizzie-saltzman", note: "surrogate/vamp-mom" },
    { type: "child", targetId: "josie-saltzman", note: "surrogate/vamp-mom" },
    { type: "spouse", targetId: "alaric-saltzman", note: "co-parent, not romantic" },
  ],
  problems: [
    "Gave birth to the saltzman twins through magical surrogacy spell after Josette's death.",
    "Became a vampire, managed immense mom guilt, juggled a boarding school, etc.",
  ],
};

const alaric: Person = {
  id: "alaric-saltzman",
  firstName: "Alaric",
  lastName: "Saltzman",
  isAlive: true,
  relationships: [
    { type: "child", targetId: "lizzie-saltzman" },
    { type: "child", targetId: "josie-saltzman" },
    { type: "spouse", targetId: "josette-saltzman" },
    { type: "spouse", targetId: "caroline-forbes", note: "co-parent" },
  ],
  problems: [
    "Widowed multiple times, has probably been resurrected more than anyone else not named Jeremy.",
    "Co-parents magical twins in a town with a body count higher than its population."
  ],
};

const lizzie: Person = {
  id: "lizzie-saltzman",
  firstName: "Lizzie",
  lastName: "Saltzman",
  isAlive: true,
  relationships: [
    { type: "parent", targetId: "alaric-saltzman" },
    { type: "parent", targetId: "josette-saltzman", note: "biological" },
    { type: "parent", targetId: "caroline-forbes", note: "surrogate/vamp-mom" },
    { type: "sibling", targetId: "josie-saltzman" },
  ],
  problems: [
    "Inherited Gemini coven leader madness, deep-seated guilt, pulls a psychomagical twin act every other season.",
    "Constantly anxiety-ridden about living up to parental and magical expectations."
  ],
};

const ted: Entity = {
  id: "ted",
  isAlive: false,
  whatsTheDeal: ["he talks a lot lol"],
}

const kai: Person = {
  id: "kai-parker",
  firstName: "Kai",
  lastName: "Parker",
  isAlive: false,
  relationships: [
    { type: "sibling", targetId: "josette-saltzman" },
    { type: "child", targetId: "none", note: "incapable (thank goodness)" },
  ],
  problems: [
    "Literal sociopath; murdered his twin, executed the Gemini coven merge, banished, decapitated, came back anyway.",
    "Master of siphoner magic, always acting out of spite. 'Unkillable'... until next time.",
    "quite literally the hottest character of all time in all of existence literally ever in every possibly way",
  ],
};

const tedNecro: Person = {
  id: "ted-necromancer",
  firstName: "Ted",
  lastName: "Necromancer",
  isAlive: false,
  relationships: [
    { type: "spouse", targetId: "none", note: "lonely" },
  ],
  problems: [
    "Talks a lot, loves 'psychological torture', always comes back with pointless plans.",
    "Simply wants attention and a hobby in the afterlife.",
  ],
};


// We'll add an "influences" field to represent supernatural/magical influences.
// And then `isDark` will check if "dark magic" is an active influence.

type Influence =
  | "dark magic"
  | "madness"
  | "siphon"
  | "phoenix"
  | "heretic"
  | "human"
  | "wolf"
  | "witch"
  | "vampire"
  | string; // for extensibility

// First, allow `influences` on Person:
type PersonWithInfluences = Person & { influences?: Influence[] };

// For backwards compatibility, treat everyone as PersonWithInfluences:
function hasInfluence(person: Person, influence: Influence): boolean {
  // "influences" is optional; default to []
  return !!(person as PersonWithInfluences).influences?.includes(influence);
}

// isDark means actively under the influence of dark magic
function isDark(person: Person): boolean {
  return hasInfluence(person, "dark magic");
}

// Example: Add active influence to Josie
josie.influences = ["dark magic", "siphon"];

// Usage example: Check if Josie is currently "dark"
console.log("Is Josie currently dark?", isDark(josie)); // Should be true

// To "turn off" dark magic:
// josie.influences = josie.influences?.filter(i => i !== "dark magic");



const josie: Person = {
  id: "josie-saltzman",
  firstName: "Josie",
  lastName: "Saltzman",
  isAlive: true,
  relationships: [
    { type: "parent", targetId: "alaric-saltzman" },
    { type: "parent", targetId: "josette-saltzman", note: "biological" },
    { type: "parent", targetId: "caroline-forbes", note: "surrogate/vamp-mom" },
    { type: "sibling", targetId: "lizzie-saltzman" },
  ],
  problems: [
    "Struggles with dark magic, identity, absorption of black magic/siphon issues, doomed to Gemini coven drama.",
    "Perpetually in crisis: sexuality, morality, and fate."
  ],
};

const saltzmans: Person[] = [josette, caroline, alaric, lizzie, josie];

// Utility: Get parents of a person
function getParents(person: Person, all: Person[]): Person[] {
  return person.relationships
    .filter(r => r.type === "parent")
    .map(r => all.find(p => p.id === r.targetId)!)
    .filter(Boolean);
}

// Utility: Get siblings
function getSiblings(person: Person, all: Person[]): Person[] {
  return person.relationships
    .filter(r => r.type === "sibling")
    .map(r => all.find(p => p.id === r.targetId)!)
    .filter(Boolean);
}

// Example: Print Lizzie's parents
console.log("Lizzie's parents:", getParents(lizzie, saltzmans).map(p => `${p.firstName} (${p.lastName})`).join(", "));

// Example: Print Josie's problems
console.log("Josie's main issues:", josie.problems);

// ---
// You can expand this structure to add more Mystic Falls psychosocial drama as needed!

const magic
const siphoner: function get siphoners = josie and lizzzzie = ismagicavailable? = boolean;
const heretic: (combination of witch and vamp),
  {is lizzie?? : boolean}
const merge (is it still happening in the future at the current point in time ??)


const hope 
vampire = isSideActivated? 
werewolf = isSideActivated? currentlyinwerewolfform? 

// Mystic Falls: Magic and Hybrid Status Utilities

// Who is magical (witch, siphoner, heretic)?
function isMagicAvailable(person: Person): boolean {
  return (
    (person.tags && person.tags.includes("witch")) ||
    (person.tags && person.tags.includes("siphoner")) ||
    (person.tags && person.tags.includes("heretic"))
  );
}

// Who is a siphoner?
function isSiphoner(person: Person): boolean {
  return person.tags && person.tags.includes("siphoner");
}

// Filter all siphoners
const siphoners = saltzmans.filter(isSiphoner);

// Who is a heretic? (vampire + siphoner)
function isHeretic(person: Person): boolean {
  return (
    isSiphoner(person) &&
    person.tags &&
    person.tags.includes("vampire")
  );
}
const heretics = saltzmans.filter(isHeretic);

// Is Lizzie a heretic?
const isLizzieHeretic = isHeretic(lizzie);

// The Gemini Merge: is it still on the horizon?
function isGeminiMergeImminent(year: number, twinsAge: number): boolean {
  // In canon: Merge happens at 22 years old
  // Let's say show-timeline year is 2024, twins born 2014
  return twinsAge < 22;
}
const currentYear = 2024;
const twinsBirthYear = 2014; // per canon-ish
const twinsAge = currentYear - twinsBirthYear;
const mergeStillComing = isGeminiMergeImminent(currentYear, twinsAge);

// Hope Mikaelson logic
type HopeStatus = {
  vampire: boolean;
  werewolf: boolean;
  tribrid: boolean;
  inWolfForm: boolean;
};
const hope: HopeStatus = {
  vampire: true, // after "tribrid trigger"
  werewolf: true, 
  tribrid: true,
  inWolfForm: false, // update as needed
};

// Example logging
console.log("Siphoners in saltzmans:", siphoners.map(p => p.firstName));
console.log("Heretic status: Lizzie ->", isLizzieHeretic);
console.log("Is Gemini Merge still coming?", mergeStillComing);
console.log("Hope Mikaelson status:", hope);


