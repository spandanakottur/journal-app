// ─── Prompt Library ────────────────────────────────────────
// This is the static seed library. It will grow over time.
// Structure:
//   id         — unique, never change these once set
//   category   — maps to the 9 categories
//   register   — 'psychological' | 'abstract' | 'hobby' | 'media'
//   tone       — describes the feel of the prompt
//   text       — what the user sees
//   followUp   — surfaces in conversation mode after ~100 words
//   minWeek    — earliest week of use (1 = from day one, 3 = after 2 weeks)

export const CATEGORIES = {
  IDENTITY:      'identity',
  EMOTIONS:      'emotions',
  RELATIONSHIPS: 'relationships',
  MEMORY:        'memory',
  FUTURE:        'future',
  VALUES:        'values',
  EVERYDAY:      'everyday',
  FEARS:         'fears',
  MEDIA:         'media',
}

export const REGISTERS = {
  PSYCHOLOGICAL: 'psychological',
  ABSTRACT:      'abstract',
  HOBBY:         'hobby',
  MEDIA:         'media',
}

export const prompts = [

  // ── Identity ─────────────────────────────────────────────
  {
    id: 'id-001',
    category: CATEGORIES.IDENTITY,
    register: REGISTERS.PSYCHOLOGICAL,
    tone: 'contrarian',
    text: 'Which version of you do most people never get to meet?',
    followUp: 'What would it cost you to introduce them?',
    minWeek: 1,
  },
  {
    id: 'id-002',
    category: CATEGORIES.IDENTITY,
    register: REGISTERS.PSYCHOLOGICAL,
    tone: 'direct',
    text: 'What unspoken rule did you grow up with that you have never questioned?',
    followUp: 'Where did that rule come from originally?',
    minWeek: 1,
  },
  {
    id: 'id-003',
    category: CATEGORIES.IDENTITY,
    register: REGISTERS.PSYCHOLOGICAL,
    tone: 'reflective',
    text: 'What would 12-year-old you be surprised about your life right now?',
    followUp: 'Is that surprise a good thing, or complicated?',
    minWeek: 1,
  },

  // ── Emotions ─────────────────────────────────────────────
  {
    id: 'em-001',
    category: CATEGORIES.EMOTIONS,
    register: REGISTERS.PSYCHOLOGICAL,
    tone: 'sensory',
    text: 'Describe where in your body you feel today. Not what — where.',
    followUp: 'Has that feeling been there longer than today?',
    minWeek: 1,
  },
  {
    id: 'em-002',
    category: CATEGORIES.EMOTIONS,
    register: REGISTERS.PSYCHOLOGICAL,
    tone: 'direct',
    text: 'What emotion have you been carrying around this week without naming it?',
    followUp: 'What would naming it change?',
    minWeek: 1,
  },
  {
    id: 'em-003',
    category: CATEGORIES.EMOTIONS,
    register: REGISTERS.PSYCHOLOGICAL,
    tone: 'poetic',
    text: 'If this week had a texture, what would it feel like under your hands?',
    followUp: 'Is that texture familiar or new?',
    minWeek: 1,
  },

  // ── Relationships ─────────────────────────────────────────
  {
    id: 're-001',
    category: CATEGORIES.RELATIONSHIPS,
    register: REGISTERS.PSYCHOLOGICAL,
    tone: 'direct',
    text: 'Who in your life do you perform for? What is the performance?',
    followUp: 'What would happen if you stopped?',
    minWeek: 1,
  },
  {
    id: 're-002',
    category: CATEGORIES.RELATIONSHIPS,
    register: REGISTERS.PSYCHOLOGICAL,
    tone: 'narrative',
    text: 'Think of someone you have drifted from. What were you both avoiding?',
    followUp: 'What would you say if the outcome did not matter?',
    minWeek: 1,
  },

  // ── Memory & Past ─────────────────────────────────────────
  {
    id: 'me-001',
    category: CATEGORIES.MEMORY,
    register: REGISTERS.PSYCHOLOGICAL,
    tone: 'sensory',
    text: 'Describe a smell or sound that takes you somewhere. Do not explain it — just go there.',
    followUp: 'What feeling came with it?',
    minWeek: 1,
  },
  {
    id: 'me-002',
    category: CATEGORIES.MEMORY,
    register: REGISTERS.PSYCHOLOGICAL,
    tone: 'reflective',
    text: 'What did you love doing as a child that you have quietly abandoned?',
    followUp: 'What made you put it down?',
    minWeek: 1,
  },

  // ── Future Self ───────────────────────────────────────────
  {
    id: 'fu-001',
    category: CATEGORIES.FUTURE,
    register: REGISTERS.PSYCHOLOGICAL,
    tone: 'narrative',
    text: 'Imagine the version of you that got everything right. What does their Tuesday look like?',
    followUp: 'What is one thing that Tuesday has that this one does not?',
    minWeek: 1,
  },
  {
    id: 'fu-002',
    category: CATEGORIES.FUTURE,
    register: REGISTERS.PSYCHOLOGICAL,
    tone: 'direct',
    text: 'What are you slowly becoming that you have not fully admitted yet?',
    followUp: 'Is that who you want to become?',
    minWeek: 1,
  },

  // ── Values & Beliefs ──────────────────────────────────────
  {
    id: 'va-001',
    category: CATEGORIES.VALUES,
    register: REGISTERS.PSYCHOLOGICAL,
    tone: 'contrarian',
    text: 'What is a belief you hold that most people around you do not? What made you different?',
    followUp: 'Have you ever doubted it?',
    minWeek: 1,
  },
  {
    id: 'va-002',
    category: CATEGORIES.VALUES,
    register: REGISTERS.PSYCHOLOGICAL,
    tone: 'direct',
    text: 'What are you defending right now that you are not sure you actually believe?',
    followUp: 'Where did that belief come from originally?',
    minWeek: 1,
  },

  // ── The Everyday ──────────────────────────────────────────
  {
    id: 'ev-001',
    category: CATEGORIES.EVERYDAY,
    register: REGISTERS.PSYCHOLOGICAL,
    tone: 'observational',
    text: 'What small thing today shifted your mood without you noticing at the time?',
    followUp: 'What does that moment say about what you need right now?',
    minWeek: 1,
  },
  {
    id: 'ev-002',
    category: CATEGORIES.EVERYDAY,
    register: REGISTERS.PSYCHOLOGICAL,
    tone: 'sensory',
    text: 'Describe a moment from today using only what your senses experienced.',
    followUp: 'What were you thinking underneath that moment?',
    minWeek: 1,
  },

  // ── Fears & Shadows ───────────────────────────────────────
  // minWeek: 3 means these only appear after 2 weeks of use
  {
    id: 'fe-001',
    category: CATEGORIES.FEARS,
    register: REGISTERS.PSYCHOLOGICAL,
    tone: 'direct',
    text: 'What are you afraid people would think if they saw the full picture of your life?',
    followUp: 'Is that fear about them, or about you?',
    minWeek: 3,
  },
  {
    id: 'fe-002',
    category: CATEGORIES.FEARS,
    register: REGISTERS.PSYCHOLOGICAL,
    tone: 'observational',
    text: 'What are you avoiding by staying busy?',
    followUp: 'What is one small way you could face it today?',
    minWeek: 3,
  },

  // ── Abstract / Rorschach ──────────────────────────────────
  {
    id: 'ab-001',
    category: CATEGORIES.EVERYDAY,
    register: REGISTERS.ABSTRACT,
    tone: 'abstract',
    text: 'Threshold.',
    followUp: null,
    minWeek: 1,
  },
  {
    id: 'ab-002',
    category: CATEGORIES.EVERYDAY,
    register: REGISTERS.ABSTRACT,
    tone: 'abstract',
    text: 'The door was open, but —',
    followUp: null,
    minWeek: 1,
  },
  {
    id: 'ab-003',
    category: CATEGORIES.EVERYDAY,
    register: REGISTERS.ABSTRACT,
    tone: 'abstract',
    text: 'A room with two chairs and no table. Who has been here?',
    followUp: null,
    minWeek: 1,
  },
  {
    id: 'ab-004',
    category: CATEGORIES.EVERYDAY,
    register: REGISTERS.ABSTRACT,
    tone: 'abstract',
    text: 'Something that is both true and not true about you right now.',
    followUp: null,
    minWeek: 1,
  },

  // ── Media & Consumption ───────────────────────────────────
  {
    id: 'md-001',
    category: CATEGORIES.MEDIA,
    register: REGISTERS.MEDIA,
    tone: 'observational',
    text: 'What have you been consuming most this week — reading, listening, watching, scrolling? Was it a choice or just what happened?',
    followUp: 'What would intentional consumption have looked like instead?',
    minWeek: 1,
  },
  {
    id: 'md-002',
    category: CATEGORIES.MEDIA,
    register: REGISTERS.MEDIA,
    tone: 'reflective',
    text: 'What is the last thing you consumed that made you actually think — not just enjoy?',
    followUp: 'What did it make you think about?',
    minWeek: 1,
  },
  {
    id: 'md-003',
    category: CATEGORIES.MEDIA,
    register: REGISTERS.MEDIA,
    tone: 'direct',
    text: 'Did you go looking for what you consumed today, or did it find you?',
    followUp: 'How does that pattern feel when you name it?',
    minWeek: 1,
  },

// ─── Hobby Prompts ────────────────────────────────────────
// Three tiers. Selector always tries tier 1 first,
// falls back to tier 2, then tier 3 as last resort only.

export const hobbyPrompts = {

  // ── Tier 1: Hobby-specific packs ────────────────────────
  // Keyed by hobby slug. Each has prompts that use the actual
  // vocabulary and tensions of that specific hobby.
  specific: {

    'urban-sketching': [
      {
        id: 'hs-urb-001',
        tone: 'subtle',
        text: 'Walk us through a sketch that did not turn out how you imagined. What did you do with the parts that were not working?',
        followUp: 'Does that approach feel familiar outside of sketching?',
      },
      {
        id: 'hs-urb-002',
        tone: 'subtle',
        text: 'Describe a place you have walked past a hundred times and finally stopped to sketch. What made that the day you stopped?',
        followUp: 'What else have you been walking past?',
      },
      {
        id: 'hs-urb-003',
        tone: 'subtle',
        text: 'Someone stops to watch you sketch. Describe what happens — inside and outside.',
        followUp: null,
      },
      {
        id: 'hs-urb-004',
        tone: 'subtle',
        text: 'Open your sketchbook to something that no longer exists. Just describe what you see on the page.',
        followUp: null,
      },
      {
        id: 'hs-urb-005',
        tone: 'subtle',
        text: 'Is there a place you keep returning to sketch? Tell me about the last time you were there.',
        followUp: 'What keeps drawing you back?',
      },
    ],

    'reading': [
      {
        id: 'hs-read-001',
        tone: 'subtle',
        text: 'Think of a character in something you have read recently who finally let someone see the real them. What did it cost them?',
        followUp: 'Does any of that feel familiar?',
      },
      {
        id: 'hs-read-002',
        tone: 'subtle',
        text: 'The last story you loved — what did the main character want that they were not supposed to? Did you root for them to get it?',
        followUp: 'Why do you think that resonated?',
      },
      {
        id: 'hs-read-003',
        tone: 'subtle',
        text: 'In the stories you are drawn to, what usually gets in the way? Is it other people, circumstances, the characters themselves — or something else?',
        followUp: 'Do you see that pattern anywhere outside of books?',
      },
      {
        id: 'hs-read-004',
        tone: 'subtle',
        text: 'Describe a book you never finished. What made you put it down?',
        followUp: null,
      },
    ],

    'cooking': [
      {
        id: 'hs-cook-001',
        tone: 'subtle',
        text: 'What is a dish you make when you need to feel like yourself again? Just describe making it.',
        followUp: 'What is it actually doing for you?',
      },
      {
        id: 'hs-cook-002',
        tone: 'subtle',
        text: 'Describe the last time something went wrong in the kitchen. What did you do next?',
        followUp: null,
      },
      {
        id: 'hs-cook-003',
        tone: 'subtle',
        text: 'Is there a dish you have been meaning to learn but keep putting off? Tell me about it.',
        followUp: 'What is actually stopping you?',
      },
    ],

    'running': [
      {
        id: 'hs-run-001',
        tone: 'subtle',
        text: 'At what point in a run do you stop thinking and just exist? Describe what that feels like.',
        followUp: 'What is waiting for you on the other side of that?',
      },
      {
        id: 'hs-run-002',
        tone: 'subtle',
        text: 'Describe a run you almost did not go on. What made you go anyway?',
        followUp: null,
      },
    ],

    'music': [
      {
        id: 'hs-mus-001',
        tone: 'subtle',
        text: 'Describe a song that has meant completely different things to you at different points in your life.',
        followUp: 'What does that shift say about who you were then versus now?',
      },
      {
        id: 'hs-mus-002',
        tone: 'subtle',
        text: 'Is there a piece of music you cannot listen to anymore? Just describe it — you do not have to explain why.',
        followUp: null,
      },
    ],

    'gaming': [
      {
        id: 'hs-game-001',
        tone: 'subtle',
        text: 'Describe a moment in a game that stayed with you after you stopped playing. What was it about that moment?',
        followUp: null,
      },
      {
        id: 'hs-game-002',
        tone: 'subtle',
        text: 'Is there a type of game you always come back to? What does it give you that other things do not?',
        followUp: 'Where else in your life are you looking for that?',
      },
    ],

  },

  // ── Tier 2: Category packs ───────────────────────────────
  // Keyed by category slug. Works for any hobby that maps
  // to that category. Less specific than tier 1 but more
  // textured than universal templates.
  category: {

    'art-visual': [
      {
        id: 'hc-art-001',
        tone: 'reflective',
        text: 'When you make something visual, who are you making it for? Yourself, an imagined audience, or someone specific?',
        followUp: 'Has that always been true?',
      },
      {
        id: 'hc-art-002',
        tone: 'reflective',
        text: 'Do you have unfinished work? Describe it — not why it is unfinished, just what it is.',
        followUp: 'What stopped you?',
      },
    ],

    'physical': [
      {
        id: 'hc-phy-001',
        tone: 'sensory',
        text: 'Describe what your body feels like an hour after you have done something physical. Be specific.',
        followUp: 'Is that feeling something you seek out or something that just happens?',
      },
    ],

    'performance': [
      {
        id: 'hc-per-001',
        tone: 'reflective',
        text: 'Describe a moment when you were performing — playing, speaking, competing — and completely forgot anyone was watching.',
        followUp: 'What does that state feel like to reach?',
      },
    ],

    'collecting': [
      {
        id: 'hc-col-001',
        tone: 'reflective',
        text: 'What is the most recent thing you added to your collection? What made you choose it?',
        followUp: 'What are you really collecting?',
      },
    ],

  },

  // ── Tier 3: Universal templates ──────────────────────────
  // Last resort only. [hobby] filled at runtime.
  // Only served after tier 1 and tier 2 have both been
  // exhausted or flagged as not fitting.
  universal: [
    {
      id: 'hu-001',
      tone: 'observational',
      text: 'When you are [hobby], what are you not thinking about? Is that relief — or avoidance?',
      followUp: 'What would you find if you stopped avoiding it?',
      isTemplate: true,
    },
    {
      id: 'hu-002',
      tone: 'reflective',
      text: 'What is the hardest part of [hobby] that you have never fully admitted to yourself?',
      followUp: 'When did you first notice it?',
      isTemplate: true,
    },
    {
      id: 'hu-003',
      tone: 'sensory',
      text: 'Describe the moment in [hobby] when everything clicks. What does that feeling remind you of outside of it?',
      followUp: 'Where else in your life are you chasing that feeling?',
      isTemplate: true,
    },
  ],

}

// ─── Hobby category mapping ───────────────────────────────
// Maps any hobby string to a tier 2 category.
// Used when no tier 1 specific pack exists.
export const hobbyCategoryMap = {
  'urban-sketching': 'art-visual',
  'drawing':         'art-visual',
  'painting':        'art-visual',
  'photography':     'art-visual',
  'running':         'physical',
  'cycling':         'physical',
  'swimming':        'physical',
  'yoga':            'physical',
  'climbing':        'physical',
  'theatre':         'performance',
  'singing':         'performance',
  'dancing':         'performance',
  'instruments':     'performance',
  'stamps':          'collecting',
  'vinyl':           'collecting',
  'books':           'collecting',
}

// ─── Hobby prompt selector ────────────────────────────────
// Always tries tier 1 first, then tier 2, then tier 3.
// Returns a prompt and the tier it came from.
export function getHobbyPrompt(hobbySlug, usedPromptIds = []) {

  // Tier 1 — specific pack
  const specificPack = hobbyPrompts.specific[hobbySlug] || []
  const unusedSpecific = specificPack.filter(p => !usedPromptIds.includes(p.id))
  if (unusedSpecific.length > 0) {
    return { prompt: unusedSpecific[0], tier: 1 }
  }

  // Tier 2 — category pack
  const categorySlug = hobbyCategoryMap[hobbySlug]
  const categoryPack = categorySlug ? (hobbyPrompts.category[categorySlug] || []) : []
  const unusedCategory = categoryPack.filter(p => !usedPromptIds.includes(p.id))
  if (unusedCategory.length > 0) {
    return { prompt: unusedCategory[0], tier: 2 }
  }

  // Tier 3 — universal template (last resort)
  const unusedUniversal = hobbyPrompts.universal.filter(p => !usedPromptIds.includes(p.id))
  if (unusedUniversal.length > 0) {
    const hobby = hobbySlug.replace('-', ' ')
    const filled = {
      ...unusedUniversal[0],
      text: unusedUniversal[0].text.replace('[hobby]', hobby),
      followUp: unusedUniversal[0].followUp?.replace('[hobby]', hobby) ?? null,
    }
    return { prompt: filled, tier: 3 }
  }

  return null
}
// ─── Prompt selector helpers ──────────────────────────────
// Returns prompts available to a user given their current week
export function getAvailablePrompts(weekNumber = 1) {
  return prompts.filter(p => p.minWeek <= weekNumber)
}

// Fills [hobby] template slot with the user's actual hobby
export function fillHobbyTemplate(prompt, hobby) {
  if (!prompt.isTemplate) return prompt
  return {
    ...prompt,
    text: prompt.text.replace('[hobby]', hobby),
    followUp: prompt.followUp
      ? prompt.followUp.replace('[hobby]', hobby)
      : null,
  }
}