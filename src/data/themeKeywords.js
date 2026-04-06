// ─── Theme Keyword Seeds ──────────────────────────────────
// Base vocabulary per category used by themeAnalyser.js to
// score entry text against each theme.
//
// These are seed words — themeExpander.js will fetch related
// words from the Datamuse API weekly and merge them in.
// The analyser always has at least these seeds as a fallback.
//
// Word count targets: 20–30 per category, skewed toward
// words that appear naturally in conversational writing
// (not clinical or academic vocabulary).

export const themeKeywords = {
  identity: [
    'self', 'identity', 'who', 'person', 'character', 'personality',
    'belong', 'role', 'version', 'authentic', 'real', 'genuine', 'mask',
    'image', 'define', 'label', 'name', 'myself', 'ego', 'reflect',
    'mirror', 'become', 'changed', 'evolve', 'recognise', 'recognize',
  ],

  emotions: [
    'feel', 'feeling', 'felt', 'emotion', 'mood', 'anxious', 'anxiety',
    'happy', 'joy', 'sad', 'sadness', 'angry', 'anger', 'frustrated',
    'frustrated', 'excited', 'nervous', 'calm', 'peace', 'overwhelmed',
    'numb', 'lonely', 'content', 'restless', 'grief', 'relief', 'guilt',
    'shame', 'pride', 'hurt', 'tender', 'drained', 'energised', 'flat',
  ],

  relationships: [
    'friend', 'friendship', 'family', 'partner', 'relationship', 'love',
    'trust', 'conflict', 'connection', 'bond', 'close', 'distant', 'miss',
    'support', 'care', 'listen', 'conversation', 'argument', 'together',
    'alone', 'lonely', 'colleague', 'people', 'others', 'someone', 'them',
    'mother', 'father', 'sibling', 'parent', 'child',
  ],

  memory: [
    'remember', 'memory', 'past', 'childhood', 'nostalgic', 'nostalgia',
    'forget', 'used', 'once', 'back', 'then', 'ago', 'grew', 'grown',
    'before', 'young', 'older', 'history', 'story', 'lived', 'experience',
    'flashback', 'remind', 'recall', 'moment', 'time', 'era', 'phase',
  ],

  future: [
    'goal', 'dream', 'ambition', 'plan', 'hope', 'want', 'wish', 'someday',
    'next', 'future', 'later', 'eventually', 'aspire', 'aim', 'direction',
    'progress', 'build', 'become', 'change', 'imagine', 'envision', 'see',
    'career', 'path', 'move', 'forward', 'potential', 'possibility',
  ],

  values: [
    'believe', 'belief', 'value', 'principle', 'integrity', 'honest',
    'honesty', 'right', 'wrong', 'matter', 'important', 'moral', 'ethics',
    'fair', 'justice', 'meaning', 'purpose', 'worth', 'deserve', 'stand',
    'conviction', 'priority', 'core', 'compromise', 'principle', 'truth',
  ],

  everyday: [
    'today', 'morning', 'evening', 'routine', 'habit', 'daily', 'ordinary',
    'work', 'office', 'commute', 'lunch', 'weekend', 'week', 'busy', 'tired',
    'productive', 'distracted', 'meeting', 'task', 'chore', 'errand', 'walk',
    'cook', 'eat', 'sleep', 'wake', 'phone', 'scroll', 'break', 'pause',
  ],

  fears: [
    'afraid', 'fear', 'scared', 'worry', 'dread', 'avoid', 'risk', 'safe',
    'unsafe', 'threat', 'danger', 'anxious', 'panic', 'freeze', 'hesitate',
    'doubt', 'worst', 'fail', 'failure', 'lose', 'loss', 'vulnerable',
    'expose', 'judge', 'rejection', 'abandon', 'alone', 'uncertain',
  ],

  media: [
    'watch', 'watched', 'read', 'reading', 'listen', 'listening', 'book',
    'film', 'movie', 'series', 'show', 'music', 'album', 'song', 'podcast',
    'article', 'game', 'played', 'scroll', 'scrolling', 'consume', 'content',
    'episode', 'chapter', 'screen', 'stream', 'theatre', 'cinema', 'concert',
  ],
}
