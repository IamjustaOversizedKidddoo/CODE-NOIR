import { InterrogationIntent } from './types';

export function isOffTopicQuery(query: string): boolean {
  if (!query || typeof query !== 'string') return false;
  const q = query.trim().toLowerCase();

  const offTopicKeywords = [
    'weather', 'capital of', 'recipe', 'cook ', 'bake ', 'chocolate cake',
    'president', 'prime minister', 'football', 'basketball', 'cricket',
    'movie', 'actor', 'actress', 'song', 'singer', 'tell me a joke', 'tell a joke',
    'horoscope', 'zodiac', 'who won the', 'world cup', 'super bowl', 'best restaurant',
    'flight ticket', 'crypto price', 'bitcoin price', 'stock price', 'meaning of life',
    'write a poem', 'write an essay', 'favorite color',
  ];

  for (const kw of offTopicKeywords) {
    if (q.includes(kw)) return true;
  }

  return false;
}

export function classifyInterrogationIntent(query: string): InterrogationIntent {
  const q = query.trim().toLowerCase().replace(/’/g, "'");

  if (isOffTopicQuery(query)) {
    return 'OFF_TOPIC';
  }

  // 1. Casual / Greetings
  if (
    q === 'hey' ||
    q === 'hello' ||
    q === 'hi' ||
    q === 'yo' ||
    q.includes('wtf is going on') ||
    q.includes('wtf')
  ) {
    return 'CASUAL';
  }

  // 2. Help Intent
  if (
    q.includes('how can you help me') ||
    q.includes('how can you help') ||
    q.includes('what can you do') ||
    q === 'help' ||
    q === 'help me'
  ) {
    return 'HELP';
  }

  // 3. Learning Path Recommendation ("what should I learn first?")
  if (
    q.includes('what should i learn first') ||
    q.includes('what should i learn') ||
    q.includes('where should i start') ||
    q.includes('where do i start') ||
    q.includes('where do i even start') ||
    q.includes('what to start with') ||
    q.includes('what to learn first')
  ) {
    return 'LEARNING';
  }

  // 3. Teaching & Concept Detours ("don't understand", "teach me")
  if (
    q.includes("don't understand") ||
    q.includes('dont understand') ||
    q.includes('teach me') ||
    q.includes('explain the concept')
  ) {
    return 'TEACH';
  }

  // 4. Confusion Detection
  if (
    q.includes("i'm confused") ||
    q.includes('im confused') ||
    q.includes('i am confused') ||
    q.includes('im in trouble') ||
    q.includes("i'm in trouble")
  ) {
    return 'CONFUSION';
  }

  // 5. "I'm Lost"
  if (
    q.includes("i'm lost") ||
    q.includes('im lost') ||
    q.includes('i am lost')
  ) {
    return 'IM_LOST';
  }

  // 6. Teach Me
  if (
    q === 'teach me' ||
    q.includes('teach me') ||
    q.includes('start teaching')
  ) {
    return 'TEACH';
  }

  // 7. Explain Everything
  if (
    q.includes('explain everything') ||
    q.includes('explain the whole project') ||
    q.includes('explain whole project')
  ) {
    return 'EXPLAIN_EVERYTHING';
  }

  // 8. Explain Like 12 / ELI5
  if (
    q.includes("explain this like i'm 12") ||
    q.includes("explain like i'm 12") ||
    q.includes('explain like im 12') ||
    q.includes("explain like i'm 5") ||
    q.includes('explain like im 5') ||
    q.includes("explain like i'm five") ||
    q.includes('explain like im five') ||
    q.includes('eli5')
  ) {
    return 'EXPLAIN_LIKE_12';
  }

  // 9. Explain Like Software Engineer
  if (
    q.includes('explain it like a software engineer') ||
    q.includes('explain like a software engineer') ||
    q.includes('like a software engineer') ||
    q.includes('software engineer explanation')
  ) {
    return 'EXPLAIN_LIKE_ENGINEER';
  }

  // 10. Roast Intent
  if (
    q.includes('roast this function') ||
    q.includes('roast this code') ||
    q.includes('roast this file') ||
    q.includes('roast it')
  ) {
    return 'ROAST';
  }

  // 11. Serious Explanation
  if (
    q.includes('explain it seriously') ||
    q.includes('now explain it seriously') ||
    q.includes('explain seriously') ||
    q.includes('serious explanation')
  ) {
    return 'EXPLAIN_SERIOUSLY';
  }

  // 12. Project Overview
  if (
    q.includes('what is this project') ||
    q.includes('what is this codebase') ||
    q.includes('what does this project do') ||
    q.includes('overview of this project') ||
    q === 'what is this?' ||
    q === 'what is this'
  ) {
    return 'PROJECT_OVERVIEW';
  }

  // 13. Source / Code View Intent
  if (
    q.includes('show me the code') ||
    q.includes('show the code') ||
    q.includes('open source') ||
    q.includes('view source') ||
    q.includes('show code') ||
    q.includes('show implementation') ||
    q.includes('view implementation') ||
    q.includes('show me that file') ||
    q.includes('show that file')
  ) {
    return 'SOURCE';
  }

  // 14. Evidence View Intent
  if (
    q.includes('show me the evidence') ||
    q.includes('show evidence') ||
    q.includes('what is the evidence') ||
    q.includes('what is the proof')
  ) {
    return 'EVIDENCE';
  }

  // 15. Callers ("Who calls it")
  if (
    q.includes('who calls') ||
    q.includes('what calls') ||
    q.includes('find callers') ||
    q.includes('where is this called') ||
    q.includes('where is it called') ||
    q.includes('who invokes') ||
    /\bwho calls\b/i.test(q)
  ) {
    return 'WHO_CALLS';
  }

  // 16. Callees ("What does that call", "What does authenticateUser call")
  if (
    q.includes('what does that call') ||
    q.includes('what does this call') ||
    q.includes('what does it call') ||
    q.includes('who does it invoke') ||
    q.includes('find callees') ||
    q.includes('what functions are called') ||
    /\bwhat does .* call\b/i.test(q) ||
    /\bwho does .* call\b/i.test(q) ||
    /\bwhat does .* invoke\b/i.test(q)
  ) {
    return 'WHAT_CALLS';
  }

  // 17. Follow-Up Questions ("what happens next?", "what happens after that?", "what next?")
  if (
    q.includes('what happens next') ||
    q.includes('what happens after that') ||
    q.includes('what happens after') ||
    q.includes('what next') ||
    q === 'and then?' ||
    q === 'next' ||
    q === 'okay continue' ||
    q === 'continue'
  ) {
    return 'FOLLOW_UP';
  }

  // 18. Blast Radius & Deletion Impact
  if (
    q.includes('what happens if i delete') ||
    q.includes('what would happen if i deleted') ||
    q.includes('what if i remove') ||
    q.includes('what breaks') ||
    q.includes('blast radius') ||
    q.includes('ripple effect') ||
    q.includes('what if this is removed') ||
    /\bwhat happens if (i|we) (delete|remove|modify)\b/i.test(q)
  ) {
    return 'DELETE';
  }

  // 19. Checkpoint / Testing
  if (
    q.includes('test me') ||
    q.includes('quiz me') ||
    q.includes('checkpoint') ||
    q.includes('give me a question') ||
    q.includes('ask me a question')
  ) {
    return 'CHECKPOINT';
  }

  // 20. Simplification (ELI5)
  if (
    q.includes('make that simpler') ||
    q.includes('simpler explanation') ||
    q.includes('teach me again but simpler')
  ) {
    return 'SIMPLIFY';
  }

  // 21. Go Deeper / Forensic
  if (
    q.includes('go deeper') ||
    q.includes('explain in detail') ||
    q.includes('more details') ||
    q.includes('forensic breakdown') ||
    q.includes('technical breakdown')
  ) {
    return 'DEEPEN';
  }

  // 22. Compare
  if (
    q.startsWith('compare ') ||
    q.includes("what's the difference between") ||
    q.includes('difference between')
  ) {
    return 'COMPARE';
  }

  // 23. Security Audit
  if (
    q.includes('is this secure') ||
    q.includes('security') ||
    q.includes('vulnerability') ||
    q.includes('suspicious') ||
    q.includes('trust boundary')
  ) {
    return 'SECURITY';
  }

  // 24. Why Intent
  if (
    q === 'why?' ||
    q === 'why' ||
    q.startsWith('why ') ||
    q.includes('why does this exist')
  ) {
    return 'WHY';
  }

  // 25. How Intent
  if (
    q === 'how?' ||
    q === 'how' ||
    q.startsWith('how ')
  ) {
    return 'HOW';
  }

  return 'EXPLAIN';
}
