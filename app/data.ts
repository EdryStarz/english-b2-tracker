export type Traffic = 'red' | 'yellow' | 'green';

export type StudyTask = {
  id: string;
  label: string;
  minutes: number;
};

export type StudyBlock = {
  id: string;
  title: string;
  accent: string;
  minutes: number;
  tasks: StudyTask[];
};

export type StudyDay = {
  id: string;
  week: number;
  day: number;
  name: string;
  title: string;
  minutes: number;
  blocks: StudyBlock[];
};

export type StudyWeek = {
  number: number;
  focus: string;
  outcome: string;
  checkpoint?: string;
  days: StudyDay[];
};

const weekFocuses = [
  ['Present Perfect vs Past Simple', 'Tell recent news and finished stories without tense confusion'],
  ['Irregular verbs · V2 / V3', 'Retrieve high-frequency irregular forms automatically'],
  ['should / might / must have + V3', 'Speculate about and evaluate past events'],
  ['Modal meanings in context', 'Choose obligation, deduction and possibility precisely'],
  ['Verb patterns', 'Use gerunds and infinitives after common verbs'],
  ['Prepositions that travel in chunks', 'Recall dependent prepositions as complete phrases'],
  ['for / since + Present Perfect', 'Describe duration and starting points naturally'],
  ['Indirect questions', 'Ask polite, well-ordered questions under pressure'],
  ['Present Simple agreement', 'Keep he / she / it accurate during fluent speech'],
  ['Passive Voice', 'Shift focus between the doer and the result'],
  ['Mixed grammar under pressure', 'Keep accuracy while answers become longer and faster'],
  ['B2 integration', 'Demonstrate progress across listening, speaking, grammar and writing'],
] as const;

const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const accents: Record<string, string> = {
  Grammar: 'violet', Listening: 'blue', Speaking: 'orange', SRS: 'green',
  'Error Log': 'red', Writing: 'pink', Pronunciation: 'cyan', Review: 'gold', Checkpoint: 'gold',
};

function block(week: number, day: number, index: number, title: string, minutes: number, labels: string[]): StudyBlock {
  const base = Math.floor(minutes / labels.length);
  return {
    id: `w${week}d${day}b${index}`,
    title,
    accent: accents[title] ?? 'violet',
    minutes,
    tasks: labels.map((label, taskIndex) => ({
      id: `w${week}d${day}b${index}t${taskIndex}`,
      label,
      minutes: taskIndex === labels.length - 1 ? minutes - base * (labels.length - 1) : base,
    })),
  };
}

function standardDay(week: number, day: number, topic: string, outcome: string): StudyDay {
  const speakingPrompts = [
    `What has changed in your routine recently? Use ${topic}.`,
    `Tell a story about a mistake and what you learned. Target: ${topic}.`,
    `Give advice to your past self using ${topic}.`,
    `React to an unexpected news story and explain your opinion.`,
    `Compare two ways to learn a difficult skill.`,
    `Defend an unpopular opinion for two minutes.`,
  ];
  const listeningAngles = [
    'a short explainer from BBC Learning English or TED-Ed',
    'an interview with two speakers and natural turn-taking',
    'a news analysis on a familiar topic',
    'a video essay with a clear argument',
    'a podcast clip with natural connected speech',
    'an unknown YouTube video outside your usual topics',
  ];
  const prompt = speakingPrompts[(week + day - 2) % speakingPrompts.length];
  const source = listeningAngles[(week * 2 + day) % listeningAngles.length];
  let blocks: StudyBlock[];

  if (day === 1) {
    blocks = [
      block(week, day, 0, 'Grammar', 30, [`Read the short rule and contrast examples for ${topic}`, `Complete 10 forced-choice retrieval items on ${topic}`, `Write 5 true sentences from your own life using ${topic}`, `Say the 5 sentences aloud without reading`]),
      block(week, day, 1, 'Listening', 25, [`Watch 10–20 minutes of ${source} without subtitles`, 'Record a 60–90 second oral summary of the main idea', 'Check English captions and note exactly what you missed', `Save up to 5 reusable chunks connected to “${outcome}”`]),
      block(week, day, 2, 'Speaking', 20, [prompt, 'Mark every hesitation or grammar repair in Attempt 1', 'Repeat the answer once, using the corrections smoothly']),
      block(week, day, 3, 'SRS', 10, ['Review every due chunk; say a complete example before revealing the back']),
      block(week, day, 4, 'Error Log', 5, ['Add today’s recurring error with one corrected version and rule']),
    ];
  } else if (day === 2) {
    blocks = [
      block(week, day, 0, 'Grammar', 25, [`Recall the rule for ${topic} from memory before checking notes`, `Transform 8 sentences so they require ${topic}`, 'Correct 5 deliberately wrong sentences', 'Explain one tricky contrast aloud in simple English']),
      block(week, day, 1, 'Listening', 30, [`Listen to ${source}; first pass with no subtitles`, 'Write 3 claims you heard and one detail for each', 'Replay only the unclear 30–60 second segment', 'Check captions and shadow that segment twice']),
      block(week, day, 2, 'Pronunciation', 15, ['Shadow 6 lines with the speaker’s stress and linking', 'Record one final take and compare rhythm, not accent']),
      block(week, day, 3, 'SRS', 10, ['Review due cards and add 2 chunks from today’s listening']),
      block(week, day, 4, 'Error Log', 5, ['Classify one error: grammar, vocabulary, word order or pronunciation']),
    ];
  } else if (day === 3) {
    blocks = [
      block(week, day, 0, 'Grammar', 25, [`Do a blank-page recall of ${topic}: form, meaning and 3 examples`, 'Complete 12 mixed retrieval questions without notes', 'Review only wrong answers and explain why the alternative is wrong']),
      block(week, day, 1, 'Speaking', 35, [prompt, 'Ask or answer 5 follow-up questions without preparing', `Use ${topic} naturally at least 6 times`, 'Collect feedback, then redo the weakest 90 seconds']),
      block(week, day, 2, 'Writing', 15, ['Write a 120-word follow-up to the speaking topic', 'Edit once for clarity, then once only for grammar']),
      block(week, day, 3, 'SRS', 10, ['Review due patterns; mark difficult cards honestly']),
      block(week, day, 4, 'Error Log', 5, ['Add the most important correction from speaking feedback']),
    ];
  } else if (day === 4) {
    blocks = [
      block(week, day, 0, 'Listening', 30, [`Choose ${source} and predict 5 words before listening`, 'First pass without subtitles; rate comprehension from 1–5', 'Give a spoken summary plus your own opinion', 'Check captions and save no more than 5 high-value chunks']),
      block(week, day, 1, 'Grammar', 25, [`Find 5 examples of ${topic} in real context or rewrite lines to include it`, 'Create 5 minimal pairs that change meaning', 'Say which form fits and justify every answer aloud']),
      block(week, day, 2, 'Speaking', 20, ['Retell the listening in 90 seconds without notes', 'Add a 60-second opinion using two saved chunks', 'Repeat after correcting grammar and word choice']),
      block(week, day, 3, 'SRS', 10, ['Review due cards and add the best 2 listening chunks']),
      block(week, day, 4, 'Error Log', 5, ['Log one listening misunderstanding and its likely cause']),
    ];
  } else if (day === 5) {
    blocks = [
      block(week, day, 0, 'Grammar', 25, [`Complete a timed 15-item quiz on ${topic}`, 'Turn every wrong answer into a personal example', 'Say a 60-second explanation of the rule without notes']),
      block(week, day, 1, 'Writing', 25, [`Write 150–180 words that naturally require ${topic}`, 'Underline each target form and check its meaning', 'Rewrite 3 weak or unnatural sentences for clarity']),
      block(week, day, 2, 'Speaking', 20, [prompt, 'Speak for 2 minutes without restarting', 'Repeat once with clearer structure and corrected target grammar']),
      block(week, day, 3, 'SRS', 10, ['Complete the due review and suspend any low-value isolated words']),
      block(week, day, 4, 'Error Log', 5, ['Promote one corrected error into an SRS pattern card']),
    ];
  } else if (day === 6) {
    blocks = [
      block(week, day, 0, 'Listening', 35, [`Watch ${source} with no subtitles and no pausing`, 'Give the main idea, 3 details and the speaker’s attitude', 'State your opinion and one counterargument', 'Check captions; replay and shadow the hardest minute']),
      block(week, day, 1, 'Speaking', 25, [`Use this week’s grammar in a 3-minute answer: ${prompt}`, 'Listen back and count target-form successes', 'Record Attempt 2 after corrections; keep the same structure']),
      block(week, day, 2, 'Grammar', 20, [`Mix ${topic} with one older green topic in 12 retrieval items`, 'Move the topic’s traffic-light status only if evidence supports it']),
      block(week, day, 3, 'SRS', 10, ['Review due cards and choose 3 active chunks for next week']),
      block(week, day, 4, 'Error Log', 5, ['Merge duplicates and mark one recurring error for next week']),
    ];
  } else {
    blocks = [
      block(week, day, 0, 'Review', 20, ['Check completed study minutes and unfinished tasks', `Write what became easier with ${topic}`, 'Name the single situation where the target grammar still breaks down']),
      block(week, day, 1, 'Grammar', 15, [`Do a no-notes 10-item review of ${topic}`, 'Update the topic: Still difficult, Improving or Learned']),
      block(week, day, 2, 'Listening', 10, ['Replay one difficult clip from this week and summarize it again']),
      block(week, day, 3, 'Speaking', 10, ['Compare Monday’s answer with today’s 90-second answer']),
      block(week, day, 4, 'SRS', 10, ['Finish due reviews and preview tomorrow’s active chunks']),
    ];
  }

  const minutes = blocks.reduce((sum, item) => sum + item.minutes, 0);
  return { id: `w${week}d${day}`, week, day, name: dayNames[day - 1], title: day === 7 ? `Week ${week} review` : `${topic} · practice ${day}`, minutes, blocks };
}

function checkpointDay(week: number, topic: string, label: string): StudyDay {
  const day = 6;
  let labels: string[];
  if (week === 8) {
    labels = ['Choose an unknown 12–20 minute video and watch without subtitles', 'Give a 90-second oral summary with no notes', 'Add a 2-minute opinion and one counterargument', 'Check captions or transcript and list the 5 most important misses', 'Record a second summary using 3 newly noticed chunks'];
  } else if (week === 12) {
    labels = ['Complete a 20-minute unknown listening and oral summary', 'Take the final mixed grammar test without notes', 'Record a 5-minute B2 speaking response with follow-up questions', 'Write a structured 220-word opinion response', 'Review recurring errors and compare results with Week 1'];
  } else {
    labels = [`Take a 25-item mixed grammar checkpoint including ${topic}`, 'Watch an unknown video and summarize it before checking captions', 'Record a 3-minute opinion with a clear claim and example', 'Write 180 words, then edit from your Error Log', 'Compare the result with Week 1 and choose the next priority'];
  }
  const blocks = [block(week, day, 0, 'Checkpoint', week === 12 ? 120 : 95, labels), block(week, day, 1, 'Error Log', 10, ['Log every repeated error; ignore one-off slips', 'Choose the top 3 corrections for spaced review'])];
  return { id: `w${week}d${day}`, week, day, name: 'Saturday', title: label, minutes: blocks.reduce((sum, item) => sum + item.minutes, 0), blocks };
}

export const roadmap: StudyWeek[] = weekFocuses.map(([focus, outcome], index) => {
  const number = index + 1;
  const checkpoint = number === 4 ? 'Checkpoint I' : number === 8 ? 'Checkpoint II' : number === 12 ? 'Final B2 checkpoint' : undefined;
  const days = dayNames.map((_, i) => standardDay(number, i + 1, focus, outcome));
  if (checkpoint) days[5] = checkpointDay(number, focus, checkpoint);
  return { number, focus, outcome, checkpoint, days };
});

export const grammarSeed = [
  { id: 'g1', title: 'Present Perfect vs Past Simple', status: 'red' as Traffic, rule: 'Use Present Perfect for experience or a result connected to now; Past Simple for a finished time.', mistake: 'I have seen it yesterday.', correction: 'I saw it yesterday.', examples: ['I have already finished.', 'I finished at six.'], reviews: 1 },
  { id: 'g2', title: 'Irregular verbs V2 / V3', status: 'red' as Traffic, rule: 'V2 is the Past Simple form; V3 follows have/has/had and is used in passive forms.', mistake: 'I have saw this movie.', correction: 'I have seen this movie.', examples: ['She went home.', 'She has gone home.'], reviews: 0 },
  { id: 'g3', title: 'should / might / must have + V3', status: 'red' as Traffic, rule: 'Modal + have + V3 evaluates or speculates about a past event.', mistake: 'You should did it.', correction: 'You should have done it.', examples: ['He might have forgotten.', 'They must have left.'], reviews: 0 },
  { id: 'g4', title: 'Modal meanings', status: 'red' as Traffic, rule: 'Choose the modal by meaning: obligation, deduction, possibility, advice or permission.', mistake: 'It can be true (deduction).', correction: 'It might be true.', examples: ['You must be tired.', 'You should rest.'], reviews: 0 },
  { id: 'g5', title: 'Verb patterns', status: 'red' as Traffic, rule: 'Some verbs take -ing, some take to + infinitive, and a few change meaning.', mistake: 'I enjoy to read.', correction: 'I enjoy reading.', examples: ['I decided to leave.', 'I avoid driving.'], reviews: 0 },
  { id: 'g6', title: 'Dependent prepositions', status: 'red' as Traffic, rule: 'Learn the whole chunk: interested in, responsible for, depend on.', mistake: 'It depends from you.', correction: 'It depends on you.', examples: ['I am proud of it.', 'She is good at this.'], reviews: 0 },
  { id: 'g7', title: 'for vs since', status: 'yellow' as Traffic, rule: 'Use for + duration and since + starting point.', mistake: 'I live here since three years.', correction: 'I have lived here for three years.', examples: ['for a week', 'since Monday'], reviews: 3 },
  { id: 'g8', title: 'Indirect questions', status: 'yellow' as Traffic, rule: 'After the opening phrase, use statement word order.', mistake: 'Do you know where is it?', correction: 'Do you know where it is?', examples: ['Could you tell me what time it starts?'], reviews: 2 },
  { id: 'g9', title: 'Present Simple he / she / it', status: 'yellow' as Traffic, rule: 'Add -s/-es to the lexical verb in affirmative third-person singular.', mistake: 'She work from home.', correction: 'She works from home.', examples: ['He watches films.'], reviews: 4 },
  { id: 'g10', title: 'Passive Voice', status: 'yellow' as Traffic, rule: 'Use be in the required tense + V3 when the result or receiver matters.', mistake: 'It was make in Italy.', correction: 'It was made in Italy.', examples: ['The road is being repaired.'], reviews: 2 },
  { id: 'g11', title: 'Second Conditional', status: 'green' as Traffic, rule: 'If + Past Simple, would + base verb for unreal or unlikely present/future situations.', mistake: 'If I would know, I would tell you.', correction: 'If I knew, I would tell you.', examples: ['If I had more time, I would travel.'], reviews: 6 },
];

export const vocabularySeed = [
  { id: 'v1', front: 'Мне следовало сделать это раньше.', back: 'I should have done it earlier.', pattern: 'should have + V3', interval: 1, due: new Date().toISOString() },
  { id: 'v2', front: 'В конечном счёте', back: 'in the long run', pattern: 'chunk', interval: 2, due: new Date().toISOString() },
  { id: 'v3', front: 'Это зависит от…', back: 'It depends on…', pattern: 'dependent preposition', interval: 4, due: new Date().toISOString() },
];

export const errorsSeed = [
  { id: 'e1', date: new Date().toISOString().slice(0, 10), mistake: 'I have saw this movie.', correction: 'I have seen this movie.', type: 'Grammar', rule: 'have/has + V3', status: 'red' as Traffic },
  { id: 'e2', date: new Date(Date.now() - 86400000).toISOString().slice(0, 10), mistake: 'It depends from the weather.', correction: 'It depends on the weather.', type: 'Collocation', rule: 'depend on', status: 'yellow' as Traffic },
];

export const allTasks = roadmap.flatMap((week) => week.days.flatMap((day) => day.blocks.flatMap((item) => item.tasks)));
