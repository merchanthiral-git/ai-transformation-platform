export type CharacterPath = 'ridge' | 'bridge' | 'village' | 'road';
export type Workstream = 'jobArch' | 'workDesign' | 'operatingModel' | 'skills' | 'scenarios' | 'mobilize';

export interface Character {
  id: string;
  name: string;
  role: string;
  silhouette: 'figure-1' | 'figure-2' | 'figure-3' | 'figure-4';
  path: CharacterPath;
  speed: number;
  workstream: Workstream;
  dialogueLines: string[];
}

export const characters: Character[] = [
  {
    id: 'architect',
    name: 'Mira',
    role: 'The Architect',
    silhouette: 'figure-1',
    path: 'ridge',
    speed: 15,
    workstream: 'jobArch',
    dialogueLines: [
      "Every role tells a story. Some we haven't heard yet.",
      "I've been mapping the families. Fourteen so far.",
      "Principal doesn't mean what it used to.",
      "The taxonomy is a living thing — it breathes.",
      "IPE scoring is an art as much as a science.",
    ],
  },
  {
    id: 'cartographer',
    name: 'Hale',
    role: 'The Cartographer',
    silhouette: 'figure-2',
    path: 'bridge',
    speed: 12,
    workstream: 'workDesign',
    dialogueLines: [
      "Work is not jobs. Jobs are just the containers.",
      "The edges between roles matter more than the centers.",
      "I've seen work deconstructed into tasks and reassembled.",
      "Ravin was right. The work comes first.",
      "Every workflow has a rhythm if you listen.",
    ],
  },
  {
    id: 'strategist',
    name: 'Iona',
    role: 'The Strategist',
    silhouette: 'figure-3',
    path: 'ridge',
    speed: 10,
    workstream: 'operatingModel',
    dialogueLines: [
      "Twelve elements. That's what McKinsey said.",
      "Accountabilities before structure, always.",
      "The operating model is the organization's posture.",
      "I've watched reorgs that solved nothing. Don't make another.",
      "Decision rights clarify everything.",
    ],
  },
  {
    id: 'alchemist',
    name: 'Rook',
    role: 'The Alchemist',
    silhouette: 'figure-4',
    path: 'village',
    speed: 8,
    workstream: 'skills',
    dialogueLines: [
      "Skills are the true currency. Not titles.",
      "Adjacency is everything — who can cross to what.",
      "O*NET has 30,000 skills. You only need the ones that matter.",
      "Reskilling is a 14-week journey, most of the time.",
      "The map of skills is the map of the future workforce.",
    ],
  },
  {
    id: 'simulator',
    name: 'Vey',
    role: 'The Simulator',
    silhouette: 'figure-1',
    path: 'road',
    speed: 14,
    workstream: 'scenarios',
    dialogueLines: [
      "Every scenario is a version of tomorrow.",
      "I run them so you don't have to guess.",
      "Stress-test before you commit.",
      "The optimized path saves 12% on cost — but loses something else.",
      "Three futures, side by side. That's how you choose.",
    ],
  },
  {
    id: 'shepherd',
    name: 'Bex',
    role: 'The Shepherd',
    silhouette: 'figure-2',
    path: 'bridge',
    speed: 11,
    workstream: 'mobilize',
    dialogueLines: [
      "Mobilizing is the hard part. Plans are easy.",
      "Who moves first? That's the question.",
      "Change happens at the pace of trust.",
      "Every pathway needs a conversation.",
      "The flight recorder never lies.",
    ],
  },
];

/** Pick next character, biased toward the active workstream */
export function pickCharacter(activeWorkstream?: Workstream): Character {
  if (activeWorkstream && Math.random() < 0.6) {
    const match = characters.filter(c => c.workstream === activeWorkstream);
    if (match.length) return match[Math.floor(Math.random() * match.length)];
  }
  return characters[Math.floor(Math.random() * characters.length)];
}
