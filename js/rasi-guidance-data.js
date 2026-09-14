// Know Your Rasi — static guidance reference content.
//
// This is traditional/cultural reference text, not medical or financial
// advice, and is never edited per user — the same 12 rashi entries and 27
// nakshatra entries apply to every family member. Shared by astrology.html
// (per-member profile + guidance panel) and rasi-guidance.html (the
// standalone reference page), so this content lives in exactly one place.
var RasiGuidanceData = (function () {
  /* ── Element color theme, used to tint hero/result cards to match a    ── */
  /* ── person's own Rashi once it's known.                                ── */
  var ELEMENT_COLORS = {
    Fire: { accent: '#f97316', bg: 'rgba(249,115,22,0.14)' },
    Earth: { accent: '#16a34a', bg: 'rgba(22,163,74,0.14)' },
    Air: { accent: '#0ea5e9', bg: 'rgba(14,165,233,0.14)' },
    Water: { accent: '#6366f1', bg: 'rgba(99,102,241,0.14)' }
  };

  /* ── Rashi (Moon sign) content library ─────────────────────────────── */
  var RASHIS = [
    { name: 'Mesha', english: 'Aries', symbol: '♈', lord: 'Mars', element: 'Fire',
      traits: 'Bold, energetic and a natural starter. Mesha natives are said to lead with courage and impatience in equal measure.',
      health: {
        dos: ['Get your energy out through daily exercise or sport', 'Warm up properly before any physical activity', 'Get enough sleep even when you feel unstoppable', 'Address small injuries early instead of pushing through them'],
        donts: ['Skip rest days just because you feel fine', 'Ignore headaches or blood pressure warning signs', 'Let anger and impatience spike your stress levels', 'Rush into intense workouts without preparation'] },
      wealth: {
        dos: ['Set a cooling-off period before big purchases', 'Keep an emergency fund for impulsive moments', 'Channel competitive drive into building a side income', 'Review your spending weekly, not just monthly'],
        donts: ['Make investment decisions in the heat of the moment', 'Chase quick wins without a backup plan', 'Lend money impulsively to prove a point', 'Ignore the fine print because you\'re in a hurry'] },
      caution: 'Mesha\'s biggest blind spot is impatience. Decisions made in a rush, whether about health or money, tend to need costly correction later. The instinct to act first and think later works well in emergencies, but rarely in planning.',
      navigate: 'When things feel tough, Mesha natives do best by giving themselves a full day before reacting to setbacks. Physical movement, a run, a workout, a long walk, helps process frustration constructively rather than letting it drive impulsive choices.' },
    { name: 'Vrishabha', english: 'Taurus', symbol: '♉', lord: 'Venus', element: 'Earth',
      traits: 'Steady, patient and comfort-loving. Vrishabha natives value stability and the finer things in life.',
      health: {
        dos: ['Build a consistent daily routine', 'Balance comfort food with regular movement', 'Get regular throat and thyroid check-ups', 'Practice patience with your own body\'s pace of change'],
        donts: ['Overindulge in rich or sugary food as a stress response', 'Stay sedentary for long stretches', 'Resist necessary lifestyle changes out of habit', 'Bottle up stress instead of addressing it'] },
      wealth: {
        dos: ['Automate savings into long-term instruments', 'Invest steadily in gold, property or index funds', 'Set clear long-term financial goals and revisit them yearly', 'Build financial security before comfort spending'],
        donts: ['Let comfort spending quietly outpace saving', 'Hold onto a bad investment purely out of stubbornness', 'Avoid necessary financial conversations with family', 'Delay adapting your plan when circumstances change'] },
      caution: 'Vrishabha\'s strength, steadiness, can tip into stubbornness. The reluctance to change course, even when the evidence says it\'s time, is the most common blind spot for this sign, both in health habits and financial decisions.',
      navigate: 'During tough phases, Vrishabha natives find stability by returning to routine rather than abandoning it. Small, steady, tangible steps, one saved rupee, one healthy meal, rebuild confidence faster than big dramatic changes.' },
    { name: 'Mithuna', english: 'Gemini', symbol: '♊', lord: 'Mercury', element: 'Air',
      traits: 'Curious, communicative and quick-witted. Mithuna natives thrive on variety and conversation.',
      health: {
        dos: ['Keep a consistent sleep schedule despite a busy mind', 'Practice grounding routines like journaling or breathing exercises', 'Stay socially connected, it genuinely helps this sign', 'Take short breaks between tasks to avoid mental fatigue'],
        donts: ['Let a racing mind rob you of proper sleep', 'Multitask through meals or rest periods', 'Ignore nervous tension building up over time', 'Overcommit socially until you\'re running on empty'] },
      wealth: {
        dos: ['Diversify income streams deliberately, not randomly', 'Track multiple accounts with a simple, consistent system', 'Finish one financial goal before starting the next', 'Learn continuously, but apply what you learn'],
        donts: ['Jump between investment ideas without following through', 'Let curiosity turn into impulsive, unresearched bets', 'Overshare financial plans before they\'re finalised', 'Sign up for too many subscriptions or commitments at once'] },
      caution: 'Mithuna\'s scattered energy is both a gift and a risk. New ideas come easily, but follow-through is the real challenge. The biggest blind spot is starting many things and finishing few, in health routines and in money matters alike.',
      navigate: 'When life feels chaotic, Mithuna natives benefit from picking just one priority at a time instead of juggling everything. Writing things down, a journal, a budget sheet, a simple to-do list, turns mental noise into manageable steps.' },
    { name: 'Karka', english: 'Cancer', symbol: '♋', lord: 'Moon', element: 'Water',
      traits: 'Nurturing, emotional and deeply attached to home and family. Karka natives feel everything intensely.',
      health: {
        dos: ['Keep an eye on digestion, it often reflects emotional state', 'Build a calming bedtime routine', 'Talk through emotions instead of holding them in', 'Prioritise time with family and close friends'],
        donts: ['Skip meals or overeat when stressed', 'Let mood swings disrupt your sleep', 'Isolate yourself when feeling low', 'Ignore physical symptoms that follow emotional stress'] },
      wealth: {
        dos: ['Build a strong emergency fund for family security', 'Save with a clear purpose, like home or family goals', 'Discuss money openly with people you trust', 'Balance generosity with your own financial safety net'],
        donts: ['Let emotional decisions drive major financial choices', 'Overspend on family or loved ones beyond your means', 'Avoid checking your finances when you\'re anxious about them', 'Keep financial worries entirely to yourself'] },
      caution: 'Karka feels everything deeply, and money and health decisions made in an emotional low point are rarely the best ones. The tendency to retreat inward during stress, rather than reach out, is this sign\'s biggest blind spot.',
      navigate: 'During hard times, Karka natives recover best by leaning on family and close friends rather than withdrawing. A familiar routine, home-cooked food, a quiet evening with loved ones, restores emotional balance faster than facing things alone.' },
    { name: 'Simha', english: 'Leo', symbol: '♌', lord: 'Sun', element: 'Fire',
      traits: 'Confident, generous and a natural leader. Simha natives like to shine and be recognised.',
      health: {
        dos: ['Get regular heart health check-ups', 'Balance your active, high-energy lifestyle with proper rest', 'Take care of your back and spine as you age', 'Let yourself rest without feeling like you\'re falling behind'],
        donts: ['Push through exhaustion to maintain appearances', 'Ignore early warning signs because you feel invincible', 'Let ego stop you from asking for medical help', 'Overexert yourself trying to prove a point'] },
      wealth: {
        dos: ['Invest in your own skills and visibility', 'Save a fixed portion before status spending', 'Negotiate confidently, it\'s a genuine strength', 'Celebrate wins with a budget in mind'],
        donts: ['Overspend to maintain an image', 'Let pride prevent you from cutting losses', 'Avoid budgeting because it feels unglamorous', 'Take financial advice personally instead of practically'] },
      caution: 'Simha\'s confidence is magnetic, but the need for recognition can quietly drive both health risks, like overexertion, and financial ones, like status spending. The blind spot here is mistaking appearance for actual security.',
      navigate: 'In tough periods, Simha natives do best by stepping back from the spotlight rather than pushing harder to prove themselves. Quiet, private consistency, taking care of health and finances away from an audience, rebuilds strength more reliably than a dramatic comeback.' },
    { name: 'Kanya', english: 'Virgo', symbol: '♍', lord: 'Mercury', element: 'Earth',
      traits: 'Analytical, detail-oriented and practical. Kanya natives are natural planners and perfectionists.',
      health: {
        dos: ['Build a sustainable routine rather than a perfect one', 'Watch for stress-related digestive issues', 'Schedule rest as deliberately as you schedule work', 'Practice self-compassion, not just self-improvement'],
        donts: ['Let perfectionism delay basic health decisions', 'Skip meals or sleep chasing productivity', 'Criticise yourself harshly for small setbacks', 'Ignore stress because it isn\'t "serious" yet'] },
      wealth: {
        dos: ['Keep a detailed, realistic budget', 'Automate the parts of saving you tend to overanalyse', 'Trust a good financial plan once it\'s made', 'Review, but don\'t obsessively re-check, your finances'],
        donts: ['Delay decisions chasing the "perfect" option', 'Nitpick small expenses while missing bigger patterns', 'Take on too much financial responsibility for others', 'Let anxiety about money stop you from enjoying it'] },
      caution: 'Kanya\'s attention to detail is a real strength, but it can tip into paralysis by analysis. The biggest blind spot is delaying action, on health or money, while waiting for a level of certainty that rarely arrives.',
      navigate: 'When things go wrong, Kanya natives recover best by breaking the problem into small, concrete steps rather than trying to solve everything at once. A simple checklist, done imperfectly, beats a perfect plan that never starts.' },
    { name: 'Tula', english: 'Libra', symbol: '♎', lord: 'Venus', element: 'Air',
      traits: 'Diplomatic, fair-minded and relationship-focused. Tula natives seek balance in everything.',
      health: {
        dos: ['Keep a steady, balanced daily routine', 'Pay attention to kidney and lower-back health', 'Make health decisions with a deadline, not endlessly', 'Surround yourself with calm, supportive company'],
        donts: ['Let indecision delay necessary check-ups or treatment', 'Avoid conflict even when it\'s affecting your wellbeing', 'Overcommit socially at the cost of rest', 'Neglect your own needs while balancing everyone else\'s'] },
      wealth: {
        dos: ['Choose financial partners and co-investors carefully', 'Set a firm deadline for financial decisions', 'Split shared expenses clearly and early', 'Invest in things that bring genuine, lasting balance'],
        donts: ['Over-rely on a partner for financial decisions', 'Delay decisions trying to please everyone involved', 'Overspend on aesthetics or social appearances', 'Avoid difficult money conversations to keep the peace'] },
      caution: 'Tula\'s search for balance can become indecision when it matters most. The biggest blind spot is avoiding a hard choice, about health or money, for so long that the decision gets made by default, often not in your favour.',
      navigate: 'During tough times, Tula natives do best by seeking one trusted, honest opinion, rather than endless outside input. A single clear conversation, followed by a firm decision, works better than weighing every possible option forever.' },
    { name: 'Vrishchika', english: 'Scorpio', symbol: '♏', lord: 'Mars', element: 'Water',
      traits: 'Intense, resourceful and deeply private. Vrishchika natives pursue what they want with total focus.',
      health: {
        dos: ['Find a healthy outlet for intensity, sport, art or work', 'Get regular check-ups even when you feel in control', 'Talk about stress instead of internalising it', 'Watch for signs of burnout hidden behind focus'],
        donts: ['Suppress stress until it shows up physically', 'Avoid medical advice out of a need for control', 'Isolate yourself when working through difficulty', 'Push your body past its limits to prove resilience'] },
      wealth: {
        dos: ['Research investments thoroughly before committing', 'Talk openly about money with family', 'Use your instinct for opportunity, but verify it', 'Build a private but honest financial plan'],
        donts: ['Hide financial troubles instead of addressing them', 'Let suspicion damage useful financial relationships', 'Make secretive, high-risk moves without a backup plan', 'Hold onto old financial resentments that cloud judgement'] },
      caution: 'Vrishchika\'s intensity and privacy are strengths, but secrecy about struggles, health or financial, tends to make problems worse before they\'re solved. The biggest blind spot is handling everything alone when support is available.',
      navigate: 'In hard times, Vrishchika natives recover fastest by choosing one trusted person to be fully honest with, rather than carrying the weight alone. Once the intensity has an outlet, a conversation, a workout, focused work, clarity tends to follow.' },
    { name: 'Dhanu', english: 'Sagittarius', symbol: '♐', lord: 'Jupiter', element: 'Fire',
      traits: 'Optimistic, adventurous and philosophical. Dhanu natives are drawn to travel, learning and big ideas.',
      health: {
        dos: ['Stay active through movement you genuinely enjoy', 'Care for hip and joint mobility, especially with age', 'Set a realistic plan alongside your big goals', 'Get enough rest between adventures'],
        donts: ['Ignore your body\'s limits chasing the next big thing', 'Ignore the fine print on health commitments or treatments', 'Let restlessness become chronic overcommitment', 'Skip follow-through on health routines once excitement fades'] },
      wealth: {
        dos: ['Set a travel and learning budget in advance', 'Balance optimism with a concrete financial plan', 'Follow through on financial commitments you\'ve made', 'Save before, not after, the next big adventure'],
        donts: ['Over-promise financially and under-deliver', 'Ignore fine print on big commitments', 'Let big-picture optimism replace practical planning', 'Abandon a financial plan the moment it feels restrictive'] },
      caution: 'Dhanu\'s optimism is genuinely valuable, but it can outpace planning, both for health and money. The biggest blind spot is assuming things will work out without putting a concrete plan behind that belief.',
      navigate: 'When times get tough, Dhanu natives do best by picking one grounded, practical goal and seeing it through, rather than searching for the next big leap. A little structure, even briefly, restores the confidence to explore again later.' },
    { name: 'Makara', english: 'Capricorn', symbol: '♑', lord: 'Saturn', element: 'Earth',
      traits: 'Disciplined, ambitious and patient. Makara natives play the long game and rarely cut corners.',
      health: {
        dos: ['Take joint and bone health seriously, especially over time', 'Schedule deliberate rest, not just deserved rest', 'Balance ambition with regular health check-ups', 'Allow yourself to enjoy progress along the way, not just the end goal'],
        donts: ['Overwork at the cost of basic health needs', 'Delay medical care because you\'re "too busy"', 'Treat rest as something you have to earn', 'Be overly hard on yourself for normal setbacks'] },
      wealth: {
        dos: ['Build long-term retirement and investment plans early', 'Let consistent saving do the heavy lifting over time', 'Reward yourself occasionally for earned progress', 'Review long-term plans periodically, not just once'],
        donts: ['Delay enjoying earned success indefinitely', 'Equate self-worth purely with financial achievement', 'Be overly rigid with loved ones about money', 'Postpone necessary spending, like health care, to save more'] },
      caution: 'Makara\'s discipline is a genuine strength, but it can tip into overwork and self-denial. The biggest blind spot is treating rest and enjoyment as rewards to be earned later, rather than as ongoing needs.',
      navigate: 'During difficult periods, Makara natives do best by trusting the long-term plan they\'ve already built rather than working even harder in response to setbacks. Deliberate, scheduled downtime, not just powering through, is what actually restores capacity.' },
    { name: 'Kumbha', english: 'Aquarius', symbol: '♒', lord: 'Saturn', element: 'Air',
      traits: 'Independent, inventive and community-minded. Kumbha natives think differently and value causes over convention.',
      health: {
        dos: ['Keep a steady sleep-wake cycle despite an unconventional lifestyle', 'Stay connected to a community or support network', 'Care for circulation and nervous system health with regular movement', 'Balance independent thinking with practical routine'],
        donts: ['Isolate yourself when stressed or overwhelmed', 'Let an unconventional schedule undermine basic rest', 'Dismiss practical health advice because it feels ordinary', 'Neglect routine check-ups in favour of bigger-picture thinking'] },
      wealth: {
        dos: ['Build a simple, consistent financial routine', 'Explore unconventional income ideas, but structure them', 'Stay connected to people who can offer practical financial advice', 'Track progress on ideas before scaling them up'],
        donts: ['Chase every new trend without follow-through', 'Neglect practical planning for the sake of ideals', 'Avoid conventional financial tools purely on principle', 'Isolate yourself from financial advice that feels "too mainstream"'] },
      caution: 'Kumbha\'s independent thinking is a real strength, but it can drift into avoiding structure altogether, in health routines and in money matters. The biggest blind spot is dismissing the ordinary and practical in favour of the different and exciting.',
      navigate: 'In tough times, Kumbha natives do best by staying connected to their community rather than withdrawing into independence. A little borrowed structure, a friend\'s routine, a simple budgeting tool, can steady things until your own systems catch up.' },
    { name: 'Meena', english: 'Pisces', symbol: '♓', lord: 'Jupiter', element: 'Water',
      traits: 'Compassionate, imaginative and intuitive. Meena natives feel deeply and often put others first.',
      health: {
        dos: ['Prioritise enough sleep, it affects this sign deeply', 'Practice grounding activities like walking, music or art', 'Set clear boundaries around how much you give to others', 'Pay attention to early signs of stress or escapism'],
        donts: ['Use escapism as a substitute for addressing stress', 'Neglect sleep when feeling overwhelmed', 'Absorb others\' stress as if it were your own', 'Ignore your own needs while caring for everyone else\'s'] },
      wealth: {
        dos: ['Automate savings so it doesn\'t rely on willpower alone', 'Set clear boundaries around lending and giving', 'Get a second opinion before big financial decisions', 'Keep finances simple and easy to track'],
        donts: ['Lend or give beyond what you can afford', 'Avoid difficult financial conversations', 'Make financial decisions based on guilt or sympathy alone', 'Let vague, unclear finances create hidden stress'] },
      caution: 'Meena\'s compassion is a genuine gift, but it often comes at the cost of personal boundaries, financial and emotional. The biggest blind spot is giving so much to others that your own health and financial security quietly suffer.',
      navigate: 'During hard times, Meena natives recover best through gentle structure, a simple routine, a small automated saving habit, rather than relying on willpower alone. Creative or calming outlets, music, art, time near water, help process difficult emotions constructively.' }
  ];

  /* ── Nakshatra (birth star) content library ────────────────────────── */
  var NAKSHATRAS = [
    { name: 'Ashwini', lord: 'Ketu', deity: 'Ashwini Kumaras', trait: 'Quick, pioneering energy: natural healers and fast starters.' },
    { name: 'Bharani', lord: 'Venus', deity: 'Yama', trait: 'Intense determination and a strong sense of responsibility.' },
    { name: 'Krittika', lord: 'Sun', deity: 'Agni', trait: 'Sharp, purifying focus. Natives cut through confusion with clarity.' },
    { name: 'Rohini', lord: 'Moon', deity: 'Brahma', trait: 'Charming and creative, with a deep appreciation for beauty and growth.' },
    { name: 'Mrigashira', lord: 'Mars', deity: 'Soma', trait: 'Searching, curious energy, always seeking the next discovery.' },
    { name: 'Ardra', lord: 'Rahu', deity: 'Rudra', trait: 'Transformative and intense: growth often follows a storm.' },
    { name: 'Punarvasu', lord: 'Jupiter', deity: 'Aditi', trait: 'Renewal and optimism, with a natural ability to bounce back.' },
    { name: 'Pushya', lord: 'Saturn', deity: 'Brihaspati', trait: 'Nurturing and disciplined, considered one of the most steady, supportive placements.' },
    { name: 'Ashlesha', lord: 'Mercury', deity: 'Nagas', trait: 'Perceptive and strategic, with a magnetic, hard-to-read presence.' },
    { name: 'Magha', lord: 'Ketu', deity: 'Pitrs', trait: 'A strong connection to heritage and legacy, with natural leadership instincts.' },
    { name: 'Purva Phalguni', lord: 'Venus', deity: 'Bhaga', trait: 'Warm, pleasure-loving energy with a love for creativity and relaxation.' },
    { name: 'Uttara Phalguni', lord: 'Sun', deity: 'Aryaman', trait: 'Dependable and generous. Natives make loyal partners and friends.' },
    { name: 'Hasta', lord: 'Moon', deity: 'Savitar', trait: 'Skilled hands and a practical mind, natural at crafting and problem-solving.' },
    { name: 'Chitra', lord: 'Mars', deity: 'Tvashtar', trait: 'A love of beauty and design. Natives often stand out visually.' },
    { name: 'Swati', lord: 'Rahu', deity: 'Vayu', trait: 'Independent and adaptable, moving through life like the wind.' },
    { name: 'Vishakha', lord: 'Jupiter', deity: 'Indra-Agni', trait: 'Goal-driven and determined, with a competitive streak.' },
    { name: 'Anuradha', lord: 'Saturn', deity: 'Mitra', trait: 'Loyal and cooperative, building deep, lasting friendships.' },
    { name: 'Jyeshtha', lord: 'Mercury', deity: 'Indra', trait: 'A natural protector, often carrying responsibility for others.' },
    { name: 'Mula', lord: 'Ketu', deity: 'Nirriti', trait: 'Deep, investigative energy, drawn to root causes and hard truths.' },
    { name: 'Purva Ashadha', lord: 'Venus', deity: 'Apas', trait: 'An invincible spirit and persuasive energy, hard to discourage once decided.' },
    { name: 'Uttara Ashadha', lord: 'Sun', deity: 'Vishvadevas', trait: 'Steady, long-term achievers with quiet, lasting influence.' },
    { name: 'Shravana', lord: 'Moon', deity: 'Vishnu', trait: 'A natural listener and learner, connecting well through communication.' },
    { name: 'Dhanishta', lord: 'Mars', deity: 'Vasus', trait: 'Energetic and rhythmic, often drawn to music, wealth and group activities.' },
    { name: 'Shatabhisha', lord: 'Rahu', deity: 'Varuna', trait: 'Independent healer energy, valuing solitude and unconventional solutions.' },
    { name: 'Purva Bhadrapada', lord: 'Jupiter', deity: 'Aja Ekapada', trait: 'Intense idealism, passionate about transformation and depth.' },
    { name: 'Uttara Bhadrapada', lord: 'Saturn', deity: 'Ahir Budhnya', trait: 'Calm depth and quiet wisdom, comfortable with life\'s slower rhythms.' },
    { name: 'Revati', lord: 'Mercury', deity: 'Pushan', trait: 'Gentle, nurturing energy, like a natural guide who helps others reach their destination.' }
  ];

  return {
    ELEMENT_COLORS: ELEMENT_COLORS,
    RASHIS: RASHIS,
    NAKSHATRAS: NAKSHATRAS
  };
})();
