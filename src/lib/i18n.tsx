import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Lang = "en" | "da";

const STORAGE_KEY = "orbit:lang:v1";

type Dict = Record<string, string>;

const en: Dict = {
  // Header / status
  "app.brand": "Orbit Run",
  "profile.athlete": "Athlete",
  "status.ready": "Ready to run",
  "status.running": "In motion",
  "status.paused": "Paused",
  "status.finished": "Run saved",

  // Stats
  "stat.distance": "Distance",
  "stat.duration": "Duration",
  "stat.pace": "Pace",
  "stat.cadence": "Cadence",
  "stat.elev": "Elevation",
  "stat.elevation": "Elevation",
  "stat.avgPace": "Avg pace",
  "stat.calories": "Calories",
  "stat.stride": "Stride",
  "stat.vertOsc": "Vert. osc.",
  "stat.groundContact": "Ground contact",
  "stat.sweatLoss": "Sweat loss",
  "stat.fastestKm": "Fastest km",
  "stat.ghost": "Ghost",
  "stat.hr": "Heart rate",
  "stat.avgHr": "Avg HR",
  "ghost.race": "Race",
  "ghost.active": "Ghost active",
  "ghost.clear": "Clear",
  "focus.ahead": "Ahead",
  "focus.behind": "Behind",
  "focus.holdToStop": "Hold to stop",
  "run.allMetrics": "All metrics",
  "run.notFound": "Run not found.",
  "unit.km": "km",
  "unit.perKm": "/km",
  "unit.spm": "spm",
  "unit.m": "m",
  "unit.kcal": "kcal",
  "unit.cm": "cm",
  "unit.ms": "ms",
  "unit.l": "L",
  "unit.bpm": "bpm",

  // Map
  "map.legend.slow": "slow",
  "map.legend.mid": "mid",
  "map.legend.fast": "fast",
  "map.placeholder": "Press start to begin tracking",

  // Splits
  "splits.title": "Splits",
  "splits.km": "KM",

  // Controls
  "ctrl.start": "Start",
  "ctrl.pause": "Pause",
  "ctrl.resume": "Resume",
  "ctrl.stop": "Finish run",

  // Hints
  "hint.autoSplits": "Auto splits",
  "hint.voice": "Voice cues",
  "hint.elevation": "Elevation",

  // Countdown
  "cd.getReady": "Get ready",
  "cd.startNow": "Start now",
  "cd.cancel": "Cancel",
  "cd.go": "Go!",

  // Music
  "music.demo": "demo",
  "music.spotifySoon": "Spotify integration coming soon",
  "music.connect": "Connect Spotify",
  "music.connecting": "Connecting…",
  "music.notConfigured": "Spotify not configured",
  "music.notConfiguredHint": "Add a Spotify Client ID to enable playback",
  "music.noDevice": "No active Spotify device",
  "music.useThisDevice": "Use available device",
  "music.disconnect": "Disconnect",
  "music.premiumRequired": "Spotify Premium is required for playback control",
  "music.nothingPlaying": "Nothing playing",
  "music.live": "live",

  // Nav
  "nav.run": "Run",
  "nav.coach": "Coach",
  "nav.history": "History",
  "nav.profile": "Profile",
  "coach.eyebrow": "Your Coach",
  "coach.tabTitle": "AI Coach",
  "dailyStatus.eyebrow": "Today's status",
  "dailyStatus.cta": "Open coach",
  "records.carousel.eyebrow": "Personal records",

  // Personal records
  "pr.eyebrow": "Milestones",
  "pr.title": "Personal Records",
  "pr.notDone": "Not completed yet",
  "pr.newPr": "New Personal Record!",
  "pr.tapContinue": "Tap to continue",
  "pr.dateSet": "Set {date}",
  "pr.cat.1k": "1 km",
  "pr.cat.5k": "5 km",
  "pr.cat.10k": "10 km",
  "pr.cat.half": "Half marathon",
  "pr.cat.marathon": "Marathon",
  "pr.cat.longest": "Longest run",
  "pr.cat.fastestKm": "Fastest km",

  // History
  "history.eyebrow": "Archive",
  "history.title": "Past runs",
  "history.runs": "Runs",
  "history.distance": "Distance",
  "history.time": "Time",
  "history.empty": "No runs yet. Hit the start button to log your first one.",
  "history.startCta": "Start a run",
  "history.deleteConfirm": "Delete this run?",
  "history.back": "Back",
  "history.expand": "Show details",
  "history.collapse": "Hide details",
  "history.insights": "Insights",
  "history.basicMetrics": "Basic metrics",
  "history.advancedMetrics": "Advanced metrics",
  "history.viewFull": "Open full run",
  "history.fastestSplit": "Fastest km split",
  "history.slowestSplit": "Slowest km split",
  "history.paceDelta": "Best vs avg pace",
  "history.faster": "faster",
  "history.slower": "slower",
  "history.km": "km",
  "trimp.weeklyTitle": "Weekly training load",
  "trimp.prevWeek": "Previous week",
  "trimp.nextWeek": "Next week",
  "trimp.dayEmpty": "No runs this day.",
  "trimp.day.mon": "Mon",
  "trimp.day.tue": "Tue",
  "trimp.day.wed": "Wed",
  "trimp.day.thu": "Thu",
  "trimp.day.fri": "Fri",
  "trimp.day.sat": "Sat",
  "trimp.day.sun": "Sun",
  "vitals.sync.cta": "Sync from Apple Health",
  "vitals.sync.loading": "Syncing…",
  "vitals.sync.ok": "Synced from Apple Health.",
  "vitals.sync.empty": "No recent resting HR or HRV in Apple Health.",
  "vitals.sync.denied": "Health access denied. Enable it in iOS Settings.",

  // Profile
  "profile.eyebrow": "Athlete",
  "profile.title": "Profile",
  "profile.member": "Member · since today",
  "profile.runs": "Runs",
  "profile.km": "KM",
  "profile.time": "Time",
  "profile.gps": "GPS accuracy",
  "profile.gps.value": "High",
  "profile.audio": "Audio cues",
  "profile.audio.value": "Every 1 km",
  "profile.audio.value.500": "Every 500 m",
  "profile.audio.value.1000": "Every 1 km",
  "profile.countdown": "Pre-run countdown",
  "profile.countdown.info": "Counts down out loud before your run begins, giving you time to put your phone away or get into position. Tap the value to pick how many seconds the countdown should last, or choose Off to start the run instantly.",
  "profile.countdown.off": "Off",
  "profile.music": "Music source",
  "profile.music.value": "Spotify (soon)",
  "profile.haptic": "Haptic feedback",
  "profile.haptic.value": "On",
  "profile.haptic.value.on": "On",
  "profile.haptic.value.off": "Off",
  "profile.prVoice": "PR voice callouts",
  "profile.prVoice.value.on": "On",
  "profile.prVoice.value.off": "Off",
  "profile.language": "Language",
  "profile.runner": "Runner",
  "profile.name": "Your name",
  "profile.namePlaceholder": "Enter your name",
  "profile.goal": "Primary goal",
  "profile.level": "Experience level",
  "profile.level.beginner": "Beginner",
  "profile.level.expert": "Expert",
  "profile.level.beginnerHint": "Essential stats · frequent voice cues",
  "profile.level.expertHint": "Advanced metrics · minimal voice cues",
  "profile.memberCard": "Member Card",

  // Greeting
  "greet.ready": "Ready for your run, {name}?",
  "greet.goal": "Let's hit your goal: {goal}!",
  "greet.welcome": "Welcome, {name}",

  // Onboarding
  "onb.title": "Welcome to Orbit Run",
  "onb.subtitle": "Let's personalize your experience",
  "onb.step.name": "What's your name?",
  "onb.step.goal": "What's your primary goal?",
  "onb.step.level": "What's your experience level?",
  "onb.next": "Next",
  "onb.back": "Back",
  "onb.finish": "Get started",
  "onb.skip": "Skip",

  // Voice with name
  "voice.kmDoneName": "Great work {name}! Kilometer {km} done.",
  "voice.halfway": "Halfway to your goal, {name}!",

  // Summary
  "summary.title": "Run complete",
  "summary.subtitle": "Review your session",
  "summary.save": "Save",
  "summary.discard": "Delete",
  "summary.share": "Share",
  "summary.shareGenerating": "Generating…",
  "summary.shareDownloaded": "Saved to downloads",
  "summary.discardConfirm": "Delete this run? This cannot be undone.",
  "summary.discardConfirmTitle": "Are you sure?",
  "summary.cancel": "Cancel",
  "summary.confirmDelete": "Yes, delete",
  "summary.finalConfirmTitle": "Final warning",
  "summary.finalConfirm": "This will permanently erase the run and all its data. There's no undo.",
  "summary.finalDelete": "Delete permanently",
  "summary.keep": "Keep run",

  // Share sheet
  "share.button": "Share my run",
  "share.title": "Share my run",
  "share.tabMap": "Map",
  "share.tabPhoto": "Photo",
  "share.pickPhoto": "Choose photo",
  "share.share": "Share",
  "share.downloaded": "Saved to downloads",
  "share.generating": "Generating…",

  "edit.pickMetric": "Choose metric",
  "edit.pickHint": "Tap a stat to assign it to this slot.",
  "edit.exit": "Done",
  "edit.hint": "Long-press any tile to customize",

  // Voice cues
  "voice.kmDone": "Kilometer {km} completed.",
  "voice.splitPace": "Split pace {pace}.",
  "voice.totalDist": "Total distance {km} kilometers.",
  "voice.runFinished": "Run finished. Distance {km} kilometers. Average pace {pace}.",
  "voice.paceUnit": "minutes per kilometer",
  "voice.minutes": "minutes",
  "voice.seconds": "seconds",
  "voice.perKm": "per kilometer",

  // Shoes
  "shoes.title": "My shoes",
  "shoes.add": "Add",
  "shoes.empty": "No shoes yet. Add your first pair to track mileage.",
  "shoes.addTitle": "Add a shoe",
  "shoes.addHint": "Track mileage and get notified when it's time for a new pair.",
  "shoes.brand": "Brand",
  "shoes.model": "Model",
  "shoes.startKm": "Starting km",
  "shoes.maxKm": "Max km",
  "shoes.makePrimary": "Set as primary shoe",
  "shoes.save": "Save shoe",
  "shoes.primary": "Primary",
  "shoes.retired": "Retired",
  "shoes.setPrimary": "Set primary",
  "shoes.retire": "Retire",
  "shoes.reactivate": "Reactivate",
  "shoes.warn": "Time to consider new shoes",
  "shoes.deleteTitle": "Delete this shoe?",

  // Run shoe
  "run.shoe.label": "Shoe",
  "run.shoe.none": "No shoe",
  "run.shoe.change": "Change shoe",
  "run.shoe.unassign": "Unassign",
  "run.shoe.pickerTitle": "Select shoe",

  // Weather
  "weather.sunny": "Sunny",
  "weather.partlyCloudy": "Partly cloudy",
  "weather.cloudy": "Cloudy",
  "weather.fog": "Fog",
  "weather.drizzle": "Drizzle",
  "weather.rain": "Rain",
  "weather.snow": "Snow",
  "weather.thunderstorm": "Thunderstorm",
  "weather.windUnit": "m/s",
  "weather.edit.toggle": "Edit weather",
  "weather.edit.add": "Add weather",
  "weather.edit.title": "Edit weather",
  "weather.edit.temp": "Temperature",
  "weather.edit.wind": "Wind",
  "weather.edit.save": "Save",
  "weather.edit.cancel": "Cancel",
  "weather.edit.invalid": "Invalid value",
  "profile.windUnit": "Wind unit",

  // Goal progress
  "goal.progress.title": "Goal progress",
  "goal.caption.faster": "best 1 km",
  "goal.caption.fasterBaseline": "baseline pace",
  "goal.caption.fasterDelta": "vs last month",
  "goal.caption.slowerDelta": "vs last month",
  "goal.caption.perWeek": "per week (4w avg)",
  "goal.hint.distanceDone": "Goal reached — keep stacking long runs.",
  "goal.hint.distanceMore": "Stretch your long run to close the gap.",
  "goal.hint.fasterNoData": "Run at least 1 km to start tracking pace.",
  "goal.hint.fasterBaseline": "First month — baseline locked in.",
  "goal.hint.fasterImproved": "Faster than last month — keep pushing.",
  "goal.hint.fasterRegressed": "A bit slower lately — try a tempo run.",
  "goal.hint.weightOnTrack": "Weekly volume on target.",
  "goal.hint.weightMore": "Add more km/week to boost your burn.",
  "goal.hint.empty": "Log your first run to start tracking progress.",
  "goal.suggest.cta": "Next workout suggestion",
  "goal.suggest.hide": "Hide suggestion",
  "goal.suggest.start": "Start this run",
  "goal.suggest.onTrack": "On track",
  "goal.suggest.behind": "Behind",
  "goal.suggest.type.easy": "Easy run",
  "goal.suggest.type.long": "Long run",
  "goal.suggest.type.tempo": "Tempo run",
  "goal.suggest.type.intervals": "Intervals",
  "goal.suggest.type.recovery": "Recovery run",
  "goal.suggest.type.first": "First run",
  "goal.suggest.reason.first": "Start small. A 2 km jog builds the habit and a baseline pace.",
  "goal.suggest.reason.distanceOnTrack": "You're close to your goal — sharpen with a tempo to lock in race pace.",
  "goal.suggest.reason.distanceBehind": "Stretch your long run a bit further to keep building endurance.",
  "goal.suggest.reason.fasterOnTrack": "Recover with an easy effort so the speed gains stick.",
  "goal.suggest.reason.fasterBehind": "Drop in some 1 km intervals at your best pace to wake up the legs.",
  "goal.suggest.reason.weightOnTrack": "Volume looks good — keep it steady with a relaxed run.",
  "goal.suggest.reason.weightBehind": "Add a slightly longer easy run to push weekly km up.",
  "goal.suggest.reason.default": "A relaxed 3 km keeps consistency rolling.",

  // Orbit Coach
  "coach.cardTitle": "Orbit Coach",
  "coach.title": "Configure your coach",
  "coach.subtitle": "Tell Orbit how you train",
  "coach.cta.unset": "Tap here to let Orbit plan your training",
  "coach.next": "Next session",
  "coach.save": "Save",
  "coach.q.level": "How far do you run on a good day right now?",
  "coach.q.frequency": "How many days a week will you run?",
  "coach.q.goal": "What do you dream of achieving?",
  "coach.q.fasterDistance": "Which distance do you want to get faster at?",
  "coach.profileRow": "Configure coach",
  "coach.profileRow.unset": "Not configured",
  "coach.detail.cta": "Show session",
  "coach.detail.hide": "Hide",
  "coach.setup": "Set up coach",
  "coach.enable": "Orbit Coach",
  "coach.enable.on": "On",
  "coach.enable.off": "Off",
  "coach.session.purpose": "Why this session",
  "coach.session.howto": "How to run it",
  "coach.desc.easy": "An easy run builds your aerobic base without taxing recovery. Start with 5 min walking, then run at a conversational pace where you could speak full sentences. Cool down with 3 min easy walking.",
  "coach.desc.long": "Long runs grow endurance and mental toughness for your goal distance. Keep the pace very comfortable — slower than you think — and focus on smooth form. Walk breaks are fine; finishing strong matters more than speed.",
  "coach.desc.tempo": "Tempo runs lift your lactate threshold so race pace feels easier. Warm up 10 min easy, then hold a 'comfortably hard' effort — fast but controlled. Finish with 5 min easy jog to flush the legs.",
  "coach.desc.intervals": "Intervals sharpen speed and running economy. After a 10 min warm-up, run each rep hard but even, then jog or walk an equal duration to recover. Cool down with 5 min easy.",
  "coach.desc.walkRun": "Walk-run intervals build the habit safely. Alternate 1 min easy jog with 2 min brisk walk for the full duration. Focus on relaxed shoulders and steady breathing.",
  "coach.session.startCta": "Got it",
  "coach.settings": "Orbit Coach settings",
  "coach.settings.cta": "Configure",
  "coach.info.title": "Orbit Coach AI",
  "coach.info.intro": "Your personal AI strategist that optimizes your run based on heart rate, weather, and goals.",
  "coach.info.bullet1.title": "Biometric Guidance",
  "coach.info.bullet1.body": "Adjusts your pace based on your heart rate.",
  "coach.info.bullet2.title": "Environmental Analysis",
  "coach.info.bullet2.body": "Accounts for wind and temperature.",
  "coach.info.bullet3.title": "Smart Feedback",
  "coach.info.bullet3.body": "Voice cues that guide you toward your PR.",
  "coach.info.cta": "Go to setup",
  "coach.info.close": "Close",
  "goal.plan.sessions": "sessions",
  "goal.plan.weekOf": "Week {current} of {total}",
  "goal.plan.complete": "Plan complete — set a new goal!",
  "coach.empty.body": "Set up your coach to start your plan",
  "coach.empty.cta": "Set up coach",
  "coach.q.weeklyVolume": "How many km do you currently run per week?",
  "coach.q.experience": "How would you describe your running experience?",
  "coach.q.lifestyle": "Lifestyle right now",
  "coach.q.lifestyle.sleep": "Sleep quality",
  "coach.q.lifestyle.stress": "Daily stress level",
  "coach.q.injury": "Injury history",
  "coach.q.preferredDays": "Preferred training days",
  "coach.q.lifestyle.low": "Low",
  "coach.q.lifestyle.high": "High",
  "coach.opt.weeklyVolume.0": "0 km",
  "coach.opt.weeklyVolume.0-10": "0–10 km",
  "coach.opt.weeklyVolume.10-25": "10–25 km",
  "coach.opt.weeklyVolume.25+": "25+ km",
  "coach.opt.experience.beginner": "Beginner",
  "coach.opt.experience.recreational": "Recreational",
  "coach.opt.experience.experienced": "Experienced",
  "coach.opt.injury.none": "None",
  "coach.opt.injury.past": "Past injuries",
  "coach.opt.injury.current": "Current injury",
  "coach.opt.day.mon": "Mon",
  "coach.opt.day.tue": "Tue",
  "coach.opt.day.wed": "Wed",
  "coach.opt.day.thu": "Thu",
  "coach.opt.day.fri": "Fri",
  "coach.opt.day.sat": "Sat",
  "coach.opt.day.sun": "Sun",
  "coach.injury.warning": "If you have a current injury, please consult a doctor before starting. Orbit will give you a very gentle plan.",
  "coach.thinking.analyzing": "Analyzing your profile…",
  "coach.thinking.done": "Thanks! I have analyzed your profile, your injury history and your current level.",
  "coach.thinking.goalPreview": "I'm now ready to help you toward your goal: {goal}.",
  "coach.thinking.cta": "GO TO ORBIT COACH",
  "coach.adjust.note.injuryCurrent": "Gentle reload — protecting your injury",
  "coach.adjust.note.injuryPast": "Easing back in after past injury",
  "coach.adjust.note.lowVolume": "Gradual ramp-up to avoid doing too much too soon",
  "coach.adjust.note.lifestyle": "Lower load — sleep & stress recovery",

  // RPE
  "rpe.eyebrow": "Effort score",
  "rpe.title": "How hard did it feel?",
  "rpe.veryEasy": "Very easy",
  "rpe.maxEffort": "Max effort",
  "rpe.skip": "Skip",
  "rpe.short": "RPE",
  "rpe.inlineLabel": "How hard? (1–10)",

  // Daily Readiness Score
  "readiness.title": "Daily Readiness",
  "readiness.score.of": "/ 100",
  "readiness.band.rest": "Rest day",
  "readiness.band.easy": "Take it easy",
  "readiness.band.ready": "Ready to train",
  "readiness.band.prime": "Prime — go for it",
  "readiness.metric.restingHr": "Resting HR",
  "readiness.metric.hrv": "HRV",
  "readiness.metric.trimp7d": "7-day TRIMP",
  "readiness.metric.trend": "Trend",
  "readiness.metric.weather": "Weather",
  "readiness.metric.load": "Load",
  "readiness.unit.bpm": "bpm",
  "readiness.unit.ms": "ms",
  "readiness.unit.degC": "°C",
  "readiness.unit.pct": "%",
  "readiness.unit.secPerKm": "s/km",
  "readiness.coach": "Coach",
  "readiness.cta.personalize": "Personalize your zones",
  "readiness.cta.logVitals": "Log resting HR & HRV",
  "readiness.missing": "Add resting HR & HRV for a sharper score.",
  "readiness.rec.rest": "Score {score}/100. Your body is asking for a rest day — skip intensity, walk or fully off.",
  "readiness.rec.easy": "Score {score}/100. Keep it conversational today — easy aerobic only, no intervals.",
  "readiness.rec.go": "Score {score}/100. You're recovered and ready — execute today's session as planned.",
  "readiness.rec.heatAdjust": "Warm out there ({temp}°C, {humidity}% humidity). Start ~{pace}s/km slower than goal pace and hydrate often.",
  "readiness.rec.coldAdjust": "Cold out there ({temp}°C). Add 5–10 min of warm-up indoors before stepping out.",
  "readiness.rec.firstRun": "Log your first run to seed the readiness model.",
  "readiness.rec.missingData": "Add resting HR & HRV in your profile for a personal readiness score.",

  // Recovery engine
  "recovery.eyebrow": "Recovery",
  "recovery.unit.h": "h",
  "recovery.ready": "Ready to run.",
  "recovery.goRun": "Go run.",
  "recovery.readyAt": "Ready {time}",
  "recovery.scenario.maintenance": "Body knows this load. Ready in 24h.",
  "recovery.scenario.overreaching.distance": "{pct}% longer than your average. Take 48h.",
  "recovery.scenario.overreaching.pace": "Faster than your easy pace. Take 48h.",
  "recovery.scenario.overreaching.both": "Long and hard. Full 48h rest.",
  "recovery.scenario.recovery": "Active recovery dialed in. Legs fresh tomorrow.",
  "recovery.scenario.firstRun": "First run logged. Baseline starting.",
  "recovery.headline.longestInWeeks": "Longest run in {weeks} weeks.",
  "recovery.headline.fastestInWeeks": "Fastest pace in {weeks} weeks.",
  "recovery.headline.normalLoad": "Normal load.",
  "recovery.headline.recoveryRun": "Easy shake-out.",
  "recovery.headline.firstRun": "First run logged.",
  "recovery.scenario.zone5": "Heart spent {pct}% in Zone 5. Min 36h rest — protect your nervous system.",

  // Heart-rate recovery (post-stop drop in BPM)
  "hrr.eyebrow": "Heart-rate recovery",
  "hrr.unit": "bpm in 60s",
  "hrr.strong": "Strong recovery — your body is well-rested.",
  "hrr.normal": "Normal recovery curve.",
  "hrr.weak": "Slow recovery — consider easing up or resting.",

  // Aerobic efficiency
  "aero.title": "Aerobic gain",
  "aero.body": "Same pace, {delta} bpm lower than your recent average. Your cardio is improving.",

  // Stats — heart rate extras
  "stat.hrMax": "Max HR",

  // VO2 Max — Orbit Fitness Score
  "vo2.title": "Orbit Fitness Score (VO2 Max Est.)",
  "vo2.unit": "ml/kg/min",
  "vo2.disclaimer": "Estimate — needs 10+ min steady running for accuracy.",
  "vo2.poor": "Poor",
  "vo2.fair": "Fair",
  "vo2.good": "Good",
  "vo2.excellent": "Excellent",
  "vo2.elite": "Elite",

  // HR zones
  "zones.title": "Time in zones",
  "zones.z1": "Recovery",
  "zones.z2": "Aerobic base",
  "zones.z3": "Tempo",
  "zones.z4": "Threshold",
  "zones.z5": "Max effort",

  // HR analytics graph
  "hr.graph.title": "Heart rate",
  "hr.graph.empty": "No heart rate data captured for this run.",
  "hr.stat.max": "Max",
  "hr.stat.avg": "Avg",
  "hr.stat.vo2": "VO₂ Est.",
  "hr.stat.ef": "EF",
  "hr.zone.1": "Warm-up",
  "hr.zone.2": "Aerobic",
  "hr.zone.3": "Tempo",
  "hr.zone.4": "Threshold",
  "hr.zone.5": "Max",
  "hr.export.pdf": "Export PDF",
  "hr.export.title": "Heart Rate Report",
  "hr.export.subtitle": "Orbit Run",
  "hr.export.date": "Date",
  "hr.export.generated": "Generated",

  // HRR countdown + grade
  "hrr.countdown.title": "Measuring recovery",
  "hrr.countdown.body": "Keep your strap on for 60 seconds.",
  "hrr.countdown.resultTitle": "Recovery score",
  "hrr.countdown.resultBody": "Heart-rate drop in the first 60 seconds.",
  "hrr.grade.poor": "Poor",
  "hrr.grade.fair": "Fair",
  "hrr.grade.good": "Good",
  "hrr.grade.excellent": "Excellent",
  "hrr.grade.elite": "Elite",

  // HR zone settings
  "hrz.title": "Heart rate zones",
  "hrz.eyebrow": "Personal training intensities",
  "hrz.profileRow": "HR zones",
  "hrz.profileRow.unset": "Not set",
  "hrz.input.age": "Age",
  "hrz.input.resting": "Resting HR",
  "hrz.input.max": "Max HR",
  "hrz.auto": "Auto-calculate",
  "hrz.autoHint": "Karvonen formula based on age + resting HR",
  "hrz.reset": "Reset to auto",
  "hrz.save": "Save zones",
  "hrz.cancel": "Cancel",
  "hrz.previewTitle": "Your zones",
  "hrz.lower": "Lower",
  "hrz.upper": "Upper",
  "hrz.error.age": "Age must be 5–120",
  "hrz.error.resting": "Resting HR must be 30–120",
  "hrz.error.max": "Max HR must be greater than resting and ≤ 230",
  "hrz.error.zones": "Zones must be ascending and continuous",
  "hrz.cue.enter": "You're now in zone {zone}",
  "hrz.zone.1.name": "Recovery",
  "hrz.zone.2.name": "Aerobic base",
  "hrz.zone.3.name": "Tempo",
  "hrz.zone.4.name": "Threshold",
  "hrz.zone.5.name": "Max effort",
  "hrz.zone.1.desc": "Active recovery, fat burning, builds capillaries.",
  "hrz.zone.2.desc": "Aerobic endurance — long, conversational runs.",
  "hrz.zone.3.desc": "Improves efficiency at faster paces.",
  "hrz.zone.4.desc": "Lactate threshold — race-pace effort.",
  "hrz.zone.5.desc": "VO₂max & anaerobic — short, intense intervals.",

  // Zone-based pacing
  "pacing.title": "Zone pacing",
  "pacing.subtitle": "Suggest a target pace based on your current heart-rate zone.",
  "pacing.enable": "Enable zone pacing",
  "pacing.basePace": "Base easy pace (Z3)",
  "pacing.basePaceHint": "Your reference pace. We adjust other zones from here.",
  "pacing.useRecent": "Use median of recent runs",
  "pacing.offset": "Offset",
  "pacing.offsetUnit": "s/km vs base",
  "pacing.zoneTarget": "Target",
  "pacing.target": "Target",
  "pacing.tooFast": "Ease off",
  "pacing.tooSlow": "Pick it up",
  "pacing.onTarget": "On target",
  "pacing.cue.easeOff": "Ease off — slow your pace",
  "pacing.cue.pickUp": "Pick it up — push the pace",
  "pacing.reset": "Reset to defaults",

  // Coach override + live HR spike alert
  "coach.zone5Override": "Heart worked harder than usual today. Even though your legs feel fresh, take a rest day to protect your nervous system.",
  "focus.hrSpike": "Heart rate climbing fast — check your breathing",
  "focus.autoPause": "Auto-pause",

  // Auto-pause + Flight Recorder settings
  "profile.autoPause": "Auto-pause",
  "profile.autoPause.on": "On",
  "profile.autoPause.off": "Off",
  "profile.flightRecorder": "Flight Recorder",
  "profile.flightRecorder.on": "On",
  "profile.flightRecorder.off": "Off",
  "profile.flightRecorder.info.on":
    "Your run is auto-saved to this device every second. If the app crashes or loses connection, you can recover the run next time you open Orbit Run.",
  "profile.flightRecorder.info.off":
    "Your active run is not saved while running. If you lose connection or the app closes unexpectedly, the data will be lost.",
  "profile.audio.info":
    "Choose how often the AI coach should give you audio updates (e.g. every kilometer or 500 meters) about your pace and heart rate.",
  "profile.prVoice.info":
    "Turn on to get an audio cue when you set a new personal record or beat your Ghost Runner.",
  "profile.autoPause.info":
    "Automatically pauses the timer if you stop (e.g. at a traffic light), so your average speed stays accurate.",
  "profile.haptic.info":
    "Feel small, discreet vibrations (\"heartbeats\") when you switch heart-rate zones, so you can stay focused without looking at the screen.",
  "profile.windUnit.info":
    "Choose the unit for wind speed (meters per second m/s or kilometers per hour km/h) used in the AI weather analysis.",

  // Recover unsaved run banner
  "recover.title": "Recover unsaved run?",
  "recover.body": "We saved your last run as you went. Save it now or discard.",
  "recover.save": "Save run",
  "recover.discard": "Discard",

  // Legal
  "legal.section": "Legal",
  "legal.privacy.row": "Privacy Policy",
  "legal.terms.row": "Terms & Disclaimer",
  "legal.close": "Close",
  "legal.privacy.title": "Orbit Run Privacy Policy",
  "legal.privacy.intro":
    "Orbit Run is committed to protecting your privacy. We collect location data (GPS) to track your running routes and pace, and biometric data (heart rate) to provide personalized training insights via our AI coach.",
  "legal.privacy.1.title": "Data Collection",
  "legal.privacy.1.body":
    "Your data is stored securely and used exclusively to enhance your training experience within the app.",
  "legal.privacy.2.title": "Third Parties",
  "legal.privacy.2.body":
    "We never sell or share your personal health data with third parties.",
  "legal.privacy.3.title": "Apple Health",
  "legal.privacy.3.body":
    "With your permission, we read and write data to Apple Health to synchronize your workout history.",
  "legal.privacy.4.title": "Your Rights",
  "legal.privacy.4.body":
    "You can delete your profile and all associated data at any time directly within the app.",
  "legal.terms.title": "Terms & Medical Disclaimer",
  "legal.terms.intro": "By using Orbit Run, you agree to the following:",
  "legal.terms.1.title": "Not a Medical Device",
  "legal.terms.1.body":
    "Orbit Run and Orbit Coach AI provide training guidance only. The app is not a medical device and does not replace professional medical advice.",
  "legal.terms.2.title": "Health",
  "legal.terms.2.body":
    "Always consult a physician before starting a new exercise program, especially if you have known heart conditions or other health concerns.",
  "legal.terms.3.title": "Safety",
  "legal.terms.3.body":
    "Always stay aware of your surroundings while running. Orbit Run is not responsible for accidents or injuries sustained while using the app.",
};

const da: Dict = {
  "app.brand": "Orbit Run",
  "profile.athlete": "Atlet",
  "status.ready": "Klar til løb",
  "status.running": "I bevægelse",
  "status.paused": "Pause",
  "status.finished": "Løb gemt",

  "stat.distance": "Distance",
  "stat.duration": "Varighed",
  "stat.pace": "Tempo",
  "stat.cadence": "Kadence",
  "stat.elev": "Stigning",
  "stat.elevation": "Stigning",
  "stat.avgPace": "Snit-tempo",
  "stat.calories": "Kalorier",
  "stat.stride": "Skridtlængde",
  "stat.vertOsc": "Vert. svingning",
  "stat.groundContact": "Kontakttid",
  "stat.sweatLoss": "Væsketab",
  "stat.fastestKm": "Hurtigste km",
  "stat.ghost": "Ghost",
  "stat.hr": "Puls",
  "stat.avgHr": "Snit-puls",
  "ghost.race": "Udfordr",
  "ghost.active": "Ghost aktiv",
  "ghost.clear": "Ryd",
  "focus.ahead": "Foran",
  "focus.behind": "Bagud",
  "focus.holdToStop": "Hold for at stoppe",
  "run.allMetrics": "Alle målinger",
  "run.notFound": "Løbet blev ikke fundet.",
  "unit.km": "km",
  "unit.perKm": "/km",
  "unit.spm": "spm",
  "unit.m": "m",
  "unit.kcal": "kcal",
  "unit.cm": "cm",
  "unit.ms": "ms",
  "unit.l": "L",
  "unit.bpm": "bpm",

  "map.legend.slow": "lav",
  "map.legend.mid": "mid",
  "map.legend.fast": "høj",
  "map.placeholder": "Tryk start for at begynde sporing",

  "splits.title": "Splits",
  "splits.km": "KM",

  "ctrl.start": "Start",
  "ctrl.pause": "Pause",
  "ctrl.resume": "Fortsæt",
  "ctrl.stop": "Afslut løb",

  "hint.autoSplits": "Auto splits",
  "hint.voice": "Stemmesignaler",
  "hint.elevation": "Stigning",

  "cd.getReady": "Gør dig klar",
  "cd.startNow": "Start nu",
  "cd.cancel": "Annullér",
  "cd.go": "Løb!",

  "music.demo": "demo",
  "music.spotifySoon": "Spotify-integration kommer snart",
  "music.connect": "Forbind Spotify",
  "music.connecting": "Forbinder…",
  "music.notConfigured": "Spotify er ikke konfigureret",
  "music.notConfiguredHint": "Tilføj et Spotify Client ID for at aktivere afspilning",
  "music.noDevice": "Ingen aktiv Spotify-enhed",
  "music.useThisDevice": "Brug tilgængelig enhed",
  "music.disconnect": "Afbryd",
  "music.premiumRequired": "Spotify Premium kræves for afspilningskontrol",
  "music.nothingPlaying": "Intet afspilles",
  "music.live": "live",

  "nav.run": "Løb",
  "nav.coach": "Coach",
  "nav.history": "Historik",
  "nav.profile": "Profil",
  "coach.eyebrow": "Din coach",
  "coach.tabTitle": "AI-coach",
  "dailyStatus.eyebrow": "Dagens status",
  "dailyStatus.cta": "Åbn coach",
  "records.carousel.eyebrow": "Personlige rekorder",

  "history.eyebrow": "Arkiv",
  "history.title": "Tidligere løb",
  "history.runs": "Løb",
  "history.distance": "Distance",
  "history.time": "Tid",
  "history.empty": "Ingen løb endnu. Tryk på start for at logge dit første.",
  "history.startCta": "Start et løb",
  "history.deleteConfirm": "Slet dette løb?",
  "history.back": "Tilbage",
  "history.expand": "Vis detaljer",
  "history.collapse": "Skjul detaljer",
  "history.insights": "Indsigter",
  "history.basicMetrics": "Basis-målinger",
  "history.advancedMetrics": "Avancerede målinger",
  "history.viewFull": "Åbn helt løb",
  "history.fastestSplit": "Hurtigste km-split",
  "history.slowestSplit": "Langsomste km-split",
  "history.paceDelta": "Bedste vs snit-tempo",
  "history.faster": "hurtigere",
  "history.slower": "langsommere",
  "history.km": "km",
  "trimp.weeklyTitle": "Ugentlig træningsbelastning",
  "trimp.prevWeek": "Forrige uge",
  "trimp.nextWeek": "Næste uge",
  "trimp.dayEmpty": "Ingen løb denne dag.",
  "trimp.day.mon": "Man",
  "trimp.day.tue": "Tir",
  "trimp.day.wed": "Ons",
  "trimp.day.thu": "Tor",
  "trimp.day.fri": "Fre",
  "trimp.day.sat": "Lør",
  "trimp.day.sun": "Søn",
  "vitals.sync.cta": "Synk fra Apple Health",
  "vitals.sync.loading": "Synkroniserer…",
  "vitals.sync.ok": "Synkroniseret fra Apple Health.",
  "vitals.sync.empty": "Ingen nylig hvilepuls eller HRV i Apple Health.",
  "vitals.sync.denied": "Adgang til Health afvist. Aktivér i iOS-indstillinger.",

  "profile.eyebrow": "Atlet",
  "profile.title": "Profil",
  "profile.member": "Medlem · siden i dag",
  "profile.runs": "Løb",
  "profile.km": "KM",
  "profile.time": "Tid",
  "profile.gps": "GPS-nøjagtighed",
  "profile.gps.value": "Høj",
  "profile.audio": "Stemmesignaler",
  "profile.audio.value": "Hver 1 km",
  "profile.audio.value.500": "Hver 500 m",
  "profile.audio.value.1000": "Hver 1 km",
  "profile.countdown": "Nedtælling før start",
  "profile.countdown.info": "Tæller ned højt, før løbet begynder, så du har tid til at lægge telefonen væk eller komme i position. Tryk på værdien for at vælge hvor mange sekunder nedtællingen skal vare, eller vælg Fra for at starte løbet med det samme.",
  "profile.countdown.off": "Fra",
  "profile.music": "Musikkilde",
  "profile.music.value": "Spotify (snart)",
  "profile.haptic": "Haptisk feedback",
  "profile.haptic.value": "Til",
  "profile.haptic.value.on": "Til",
  "profile.haptic.value.off": "Fra",
  "profile.prVoice": "Stemmesignaler ved rekord",
  "profile.prVoice.value.on": "Til",
  "profile.prVoice.value.off": "Fra",
  "profile.language": "Sprog",
  "profile.runner": "Løber",
  "profile.name": "Dit navn",
  "profile.namePlaceholder": "Indtast dit navn",
  "profile.goal": "Primært mål",
  "profile.level": "Erfaringsniveau",
  "profile.level.beginner": "Motionist",
  "profile.level.expert": "Pro",
  "profile.level.beginnerHint": "Grundlæggende stats · hyppige stemmesignaler",
  "profile.level.expertHint": "Avancerede mål · minimale stemmesignaler",
  "profile.memberCard": "Medlemskort",

  "greet.ready": "Klar til din tur, {name}?",
  "greet.goal": "Lad os ramme dit mål om {goal}!",
  "greet.welcome": "Velkommen, {name}",

  "onb.title": "Velkommen til Orbit Run",
  "onb.subtitle": "Lad os personalisere din oplevelse",
  "onb.step.name": "Hvad hedder du?",
  "onb.step.goal": "Hvad er dit primære mål?",
  "onb.step.level": "Hvad er dit erfaringsniveau?",
  "onb.next": "Næste",
  "onb.back": "Tilbage",
  "onb.finish": "Kom i gang",
  "onb.skip": "Spring over",

  "voice.kmDoneName": "Godt kæmpet {name}! Kilometer {km} fuldført.",
  "voice.halfway": "Du er halvvejs mod dit mål, {name}!",

  "summary.title": "Løb fuldført",
  "summary.subtitle": "Gennemse din session",
  "summary.save": "Gem",
  "summary.discard": "Slet",
  "summary.share": "Del",
  "summary.shareGenerating": "Genererer…",
  "summary.shareDownloaded": "Gemt i downloads",
  "summary.discardConfirm": "Slet dette løb? Dette kan ikke fortrydes.",
  "summary.discardConfirmTitle": "Er du sikker?",
  "summary.cancel": "Annullér",
  "summary.confirmDelete": "Ja, slet",
  "summary.finalConfirmTitle": "Sidste advarsel",
  "summary.finalConfirm": "Dette sletter løbeturen og al dens data permanent. Det kan ikke fortrydes.",
  "summary.finalDelete": "Slet permanent",
  "summary.keep": "Behold løbetur",

  // Share sheet
  "share.button": "Del mit løb",
  "share.title": "Del mit løb",
  "share.tabMap": "Kort",
  "share.tabPhoto": "Foto",
  "share.pickPhoto": "Vælg foto",
  "share.share": "Del",
  "share.downloaded": "Gemt i downloads",
  "share.generating": "Genererer…",

  "edit.pickMetric": "Vælg måling",
  "edit.pickHint": "Tryk på en måling for at tildele den til feltet.",
  "edit.exit": "Færdig",
  "edit.hint": "Hold på et felt for at tilpasse",

  "voice.kmDone": "Kilometer {km} fuldført.",
  "voice.splitPace": "Split-tempo {pace}.",
  "voice.totalDist": "Samlet distance {km} kilometer.",
  "voice.runFinished": "Løb afsluttet. Distance {km} kilometer. Gennemsnitstempo {pace}.",
  "voice.paceUnit": "minutter per kilometer",
  "voice.minutes": "minutter",
  "voice.seconds": "sekunder",
  "voice.perKm": "per kilometer",

  // Shoes
  "shoes.title": "Mine sko",
  "shoes.add": "Tilføj",
  "shoes.empty": "Ingen sko endnu. Tilføj dit første par for at spore kilometer.",
  "shoes.addTitle": "Tilføj et par sko",
  "shoes.addHint": "Spor kilometer og få besked, når det er tid til nye sko.",
  "shoes.brand": "Mærke",
  "shoes.model": "Model",
  "shoes.startKm": "Start-km",
  "shoes.maxKm": "Maks-km",
  "shoes.makePrimary": "Sæt som primære sko",
  "shoes.save": "Gem sko",
  "shoes.primary": "Primær",
  "shoes.retired": "Pensioneret",
  "shoes.setPrimary": "Sæt primær",
  "shoes.retire": "Pensionér",
  "shoes.reactivate": "Genaktivér",
  "shoes.warn": "Tid til at overveje nye sko",
  "shoes.deleteTitle": "Slet disse sko?",

  // Sko på løb
  "run.shoe.label": "Sko",
  "run.shoe.none": "Ingen sko",
  "run.shoe.change": "Skift sko",
  "run.shoe.unassign": "Fjern tilknytning",
  "run.shoe.pickerTitle": "Vælg sko",

  // Vejr
  "weather.sunny": "Sol",
  "weather.partlyCloudy": "Delvist skyet",
  "weather.cloudy": "Skyet",
  "weather.fog": "Tåge",
  "weather.drizzle": "Støvregn",
  "weather.rain": "Regn",
  "weather.snow": "Sne",
  "weather.thunderstorm": "Tordenvejr",
  "weather.windUnit": "m/s",
  "weather.edit.toggle": "Rediger vejr",
  "weather.edit.add": "Tilføj vejr",
  "weather.edit.title": "Rediger vejr",
  "weather.edit.temp": "Temperatur",
  "weather.edit.wind": "Vind",
  "weather.edit.save": "Gem",
  "weather.edit.cancel": "Annullér",
  "weather.edit.invalid": "Ugyldig værdi",
  "profile.windUnit": "Vindenhed",

  "pr.eyebrow": "Milepæle",
  "pr.title": "Personlige rekorder",
  "pr.notDone": "Endnu ikke gennemført",
  "pr.newPr": "Ny personlig rekord!",
  "pr.tapContinue": "Tryk for at fortsætte",
  "pr.dateSet": "Sat {date}",
  "pr.cat.1k": "1 km",
  "pr.cat.5k": "5 km",
  "pr.cat.10k": "10 km",
  "pr.cat.half": "Halvmarathon",
  "pr.cat.marathon": "Marathon",
  "pr.cat.longest": "Længste løbetur",
  "pr.cat.fastestKm": "Hurtigste km",

  // Goal progress
  "goal.progress.title": "Målfremgang",
  "goal.caption.faster": "bedste 1 km",
  "goal.caption.fasterBaseline": "udgangstempo",
  "goal.caption.fasterDelta": "ift. sidste måned",
  "goal.caption.slowerDelta": "ift. sidste måned",
  "goal.caption.perWeek": "pr. uge (4u snit)",
  "goal.hint.distanceDone": "Mål nået — fortsæt med lange løb.",
  "goal.hint.distanceMore": "Forlæng dit lange løb for at lukke afstanden.",
  "goal.hint.fasterNoData": "Løb mindst 1 km for at spore tempo.",
  "goal.hint.fasterBaseline": "Første måned — udgangspunkt sat.",
  "goal.hint.fasterImproved": "Hurtigere end sidste måned — bliv ved.",
  "goal.hint.fasterRegressed": "Lidt langsommere — prøv et tempoløb.",
  "goal.hint.weightOnTrack": "Ugentlig volumen på sporet.",
  "goal.hint.weightMore": "Læg flere km/uge til for mere forbrænding.",
  "goal.hint.empty": "Gem dit første løb for at spore fremgang.",
  "goal.suggest.cta": "Næste træning",
  "goal.suggest.hide": "Skjul forslag",
  "goal.suggest.start": "Start dette løb",
  "goal.suggest.onTrack": "På sporet",
  "goal.suggest.behind": "Bagud",
  "goal.suggest.type.easy": "Roligt løb",
  "goal.suggest.type.long": "Langt løb",
  "goal.suggest.type.tempo": "Tempoløb",
  "goal.suggest.type.intervals": "Intervaller",
  "goal.suggest.type.recovery": "Restitutionsløb",
  "goal.suggest.type.first": "Første løb",
  "goal.suggest.reason.first": "Start småt. En 2 km tur bygger vanen og et udgangstempo.",
  "goal.suggest.reason.distanceOnTrack": "Du er tæt på målet — skærp formen med et tempoløb i konkurrencefart.",
  "goal.suggest.reason.distanceBehind": "Stræk dit lange løb lidt længere for at opbygge udholdenhed.",
  "goal.suggest.reason.fasterOnTrack": "Restituer med en let tur så tempogevinsten sætter sig.",
  "goal.suggest.reason.fasterBehind": "Læg nogle 1 km intervaller ind i bedste tempo for at vække benene.",
  "goal.suggest.reason.weightOnTrack": "Volumen ser god ud — hold den med et afslappet løb.",
  "goal.suggest.reason.weightBehind": "Læg et lidt længere roligt løb til for at hæve ugekilometerne.",
  "goal.suggest.reason.default": "3 rolige km holder kontinuiteten i gang.",

  // Orbit Coach
  "coach.cardTitle": "Orbit Coach",
  "coach.title": "Konfigurer din coach",
  "coach.subtitle": "Fortæl Orbit hvordan du træner",
  "coach.cta.unset": "Klik her for at lade Orbit planlægge din træning",
  "coach.next": "Næste opgave",
  "coach.save": "Gem",
  "coach.q.level": "Hvor langt løber du på en god dag lige nu?",
  "coach.q.frequency": "Hvor mange dage om ugen vil du løbe?",
  "coach.q.goal": "Hvad drømmer du om at opnå?",
  "coach.q.fasterDistance": "Hvilken distance vil du blive hurtigere på?",
  "coach.profileRow": "Konfigurer Coach",
  "coach.profileRow.unset": "Ikke konfigureret",
  "coach.detail.cta": "Vis dagens pas",
  "coach.detail.hide": "Skjul",
  "coach.setup": "Konfigurer coach",
  "coach.enable": "Orbit Coach",
  "coach.enable.on": "Til",
  "coach.enable.off": "Fra",
  "coach.session.purpose": "Hvorfor dette pas",
  "coach.session.howto": "Sådan løber du det",
  "coach.desc.easy": "Et roligt løb bygger din aerobe base uden at belaste restitutionen. Start med 5 min gang, og løb derefter i et tempo hvor du kan tale i hele sætninger. Slut af med 3 min rolig gang.",
  "coach.desc.long": "Langture opbygger udholdenhed og mental styrke til din måldistance. Hold et meget komfortabelt tempo — langsommere end du tror — og fokusér på blød form. Gåpauser er fine; at gennemføre stærkt betyder mere end fart.",
  "coach.desc.tempo": "Tempoløb hæver din mælkesyretærskel, så konkurrencefart føles lettere. Varm op i 10 min roligt, og hold derefter en 'behageligt hård' indsats — hurtig men kontrolleret. Slut med 5 min løs jog.",
  "coach.desc.intervals": "Intervaller skærper fart og løbeøkonomi. Efter 10 min opvarmning løber du hver gentagelse hårdt men jævnt, og jogger eller går lige så længe for at restituere. Cool down med 5 min roligt.",
  "coach.desc.walkRun": "Gå/løb-intervaller bygger vanen sikkert. Skift mellem 1 min rolig jog og 2 min rask gang i hele varigheden. Fokusér på afslappede skuldre og rolig vejrtrækning.",
  "coach.session.startCta": "Forstået",
  "coach.settings": "Orbit Coach indstillinger",
  "coach.settings.cta": "Konfigurer",
  "coach.info.title": "Orbit Coach AI",
  "coach.info.intro": "Din personlige AI-strateg, der optimerer dit løb baseret på puls, vejr og mål.",
  "coach.info.bullet1.title": "Biometrisk Guidance",
  "coach.info.bullet1.body": "Justerer dit tempo efter din hjerterytme.",
  "coach.info.bullet2.title": "Miljø-analyse",
  "coach.info.bullet2.body": "Tager højde for vind og temperatur.",
  "coach.info.bullet3.title": "Smart Feedback",
  "coach.info.bullet3.body": "Stemmesignaler der guider dig mod din PR.",
  "coach.info.cta": "Gå til opsætning",
  "coach.info.close": "Luk",
  "goal.plan.sessions": "pas",
  "goal.plan.weekOf": "Uge {current} af {total}",
  "goal.plan.complete": "Plan færdig — sæt et nyt mål!",
  "coach.empty.body": "Konfigurer din coach for at starte din plan",
  "coach.empty.cta": "Konfigurer Coach",
  "coach.q.weeklyVolume": "Hvor mange km løber du om ugen lige nu?",
  "coach.q.experience": "Hvordan vil du beskrive din løbeerfaring?",
  "coach.q.lifestyle": "Livsstil lige nu",
  "coach.q.lifestyle.sleep": "Søvnkvalitet",
  "coach.q.lifestyle.stress": "Dagligt stressniveau",
  "coach.q.injury": "Skades-historik",
  "coach.q.preferredDays": "Foretrukne træningsdage",
  "coach.q.lifestyle.low": "Lav",
  "coach.q.lifestyle.high": "Høj",
  "coach.opt.weeklyVolume.0": "0 km",
  "coach.opt.weeklyVolume.0-10": "0–10 km",
  "coach.opt.weeklyVolume.10-25": "10–25 km",
  "coach.opt.weeklyVolume.25+": "25+ km",
  "coach.opt.experience.beginner": "Nybegynder",
  "coach.opt.experience.recreational": "Motionist",
  "coach.opt.experience.experienced": "Erfaren",
  "coach.opt.injury.none": "Ingen",
  "coach.opt.injury.past": "Tidligere skader",
  "coach.opt.injury.current": "Aktuelle skader",
  "coach.opt.day.mon": "Man",
  "coach.opt.day.tue": "Tir",
  "coach.opt.day.wed": "Ons",
  "coach.opt.day.thu": "Tor",
  "coach.opt.day.fri": "Fre",
  "coach.opt.day.sat": "Lør",
  "coach.opt.day.sun": "Søn",
  "coach.injury.warning": "Har du en aktuel skade, bør du konsultere en læge før du starter. Orbit giver dig en meget skånsom plan.",
  "coach.thinking.analyzing": "Analyserer din profil…",
  "coach.thinking.done": "Tak! Jeg har nu analyseret din profil, din skadeshistorik og dit nuværende niveau.",
  "coach.thinking.goalPreview": "Jeg er nu klar til at hjælpe dig mod dit mål om {goal}.",
  "coach.thinking.cta": "GÅ TIL ORBIT COACH",
  "coach.adjust.note.injuryCurrent": "Skånsom genoptræning — passer på din skade",
  "coach.adjust.note.injuryPast": "Letter dig ind efter tidligere skade",
  "coach.adjust.note.lowVolume": "Gradvis opbygning — for ikke at starte for hårdt ud",
  "coach.adjust.note.lifestyle": "Lavere belastning — søvn og stress-restitution",

  // RPE
  "rpe.eyebrow": "Anstrengelses-score",
  "rpe.title": "Hvor hårdt føltes turen?",
  "rpe.veryEasy": "Meget let",
  "rpe.maxEffort": "Maksimal indsats",
  "rpe.skip": "Spring over",
  "rpe.short": "RPE",
  "rpe.inlineLabel": "Hvor hårdt? (1–10)",

  // Daily Readiness Score
  "readiness.title": "Dagens form",
  "readiness.score.of": "/ 100",
  "readiness.band.rest": "Hviledag",
  "readiness.band.easy": "Tag det roligt",
  "readiness.band.ready": "Klar til træning",
  "readiness.band.prime": "Topform — kør på",
  "readiness.metric.restingHr": "Hvilepuls",
  "readiness.metric.hrv": "HRV",
  "readiness.metric.trimp7d": "7-dages TRIMP",
  "readiness.metric.trend": "Tendens",
  "readiness.metric.weather": "Vejr",
  "readiness.metric.load": "Belastning",
  "readiness.unit.bpm": "bpm",
  "readiness.unit.ms": "ms",
  "readiness.unit.degC": "°C",
  "readiness.unit.pct": "%",
  "readiness.unit.secPerKm": "s/km",
  "readiness.coach": "Coach",
  "readiness.cta.personalize": "Personliggør dine zoner",
  "readiness.cta.logVitals": "Log hvilepuls & HRV",
  "readiness.missing": "Tilføj hvilepuls & HRV for en skarpere score.",
  "readiness.rec.rest": "Score {score}/100. Din krop beder om en hviledag — drop intensitet, gå en tur eller hold helt fri.",
  "readiness.rec.easy": "Score {score}/100. Hold det roligt i dag — kun let aerobt, ingen intervaller.",
  "readiness.rec.go": "Score {score}/100. Du er restitueret og klar — kør dagens pas som planlagt.",
  "readiness.rec.heatAdjust": "Varmt derude ({temp}°C, {humidity}% luftfugtighed). Start ~{pace}s/km langsommere end måltempo og drik ofte.",
  "readiness.rec.coldAdjust": "Koldt derude ({temp}°C). Tag 5–10 min ekstra opvarmning inden du går ud.",
  "readiness.rec.firstRun": "Log din første tur, så coachen har data at arbejde med.",
  "readiness.rec.missingData": "Tilføj hvilepuls & HRV i din profil for en personlig score.",

  // Recovery engine
  "recovery.eyebrow": "Restitution",
  "recovery.unit.h": "t",
  "recovery.ready": "Klar til løb.",
  "recovery.goRun": "Snør skoene.",
  "recovery.readyAt": "Klar {time}",
  "recovery.scenario.maintenance": "Din krop kender denne belastning. Klar igen om 24 timer.",
  "recovery.scenario.overreaching.distance": "{pct}% længere end dit snit. Hvil 48 timer.",
  "recovery.scenario.overreaching.pace": "Hurtigere end dit roligt tempo. Hvil 48 timer.",
  "recovery.scenario.overreaching.both": "Lang og hård tur. Fuld 48 timers hvile.",
  "recovery.scenario.recovery": "Perfekt aktiv restitution. Friske ben i morgen.",
  "recovery.scenario.firstRun": "Første tur logget. Baseline begynder.",
  "recovery.headline.longestInWeeks": "Din længste tur i {weeks} uger.",
  "recovery.headline.fastestInWeeks": "Hurtigste tempo i {weeks} uger.",
  "recovery.headline.normalLoad": "Normal belastning.",
  "recovery.headline.recoveryRun": "Rolig udløsning.",
  "recovery.headline.firstRun": "Første tur logget.",
  "recovery.scenario.zone5": "Pulsen var {pct}% i Zone 5. Min. 36 timers hvile — beskyt dit nervesystem.",

  // Heart-rate recovery (post-stop drop in BPM)
  "hrr.eyebrow": "Puls-restitution",
  "hrr.unit": "slag på 60 sek.",
  "hrr.strong": "Stærk restitution — din krop er veludhvilet.",
  "hrr.normal": "Normal restitutions-kurve.",
  "hrr.weak": "Langsom restitution — overvej en pause eller hviledag.",

  // Aerobic efficiency
  "aero.title": "Kardio-fremgang",
  "aero.body": "Samme tempo, {delta} slag lavere end dit nylige snit. Din form er i fremgang.",

  // Stats — heart rate extras
  "stat.hrMax": "Max-puls",

  // VO2 Max — Orbit Fitness Score
  "vo2.title": "Orbit Fitness Score (VO2 Max est.)",
  "vo2.unit": "ml/kg/min",
  "vo2.disclaimer": "Estimat — kræver 10+ min stabilt løb for præcision.",
  "vo2.poor": "Lav",
  "vo2.fair": "Okay",
  "vo2.good": "God",
  "vo2.excellent": "Fremragende",
  "vo2.elite": "Elite",

  // HR zones
  "zones.title": "Tid i zoner",
  "zones.z1": "Restitution",
  "zones.z2": "Aerob base",
  "zones.z3": "Tempo",
  "zones.z4": "Tærskel",
  "zones.z5": "Max indsats",

  // HR analytics graph
  "hr.graph.title": "Puls",
  "hr.graph.empty": "Ingen pulsdata registreret for denne tur.",
  "hr.stat.max": "Maks",
  "hr.stat.avg": "Gns.",
  "hr.stat.vo2": "VO₂ Est.",
  "hr.stat.ef": "EF",
  "hr.zone.1": "Opvarmning",
  "hr.zone.2": "Aerob",
  "hr.zone.3": "Tempo",
  "hr.zone.4": "Tærskel",
  "hr.zone.5": "Maks",
  "hr.export.pdf": "Eksportér PDF",
  "hr.export.title": "Pulsrapport",
  "hr.export.subtitle": "Orbit Run",
  "hr.export.date": "Dato",
  "hr.export.generated": "Genereret",

  // HRR countdown + grade
  "hrr.countdown.title": "Måler restitution",
  "hrr.countdown.body": "Hold pulsbæltet på i 60 sekunder.",
  "hrr.countdown.resultTitle": "Restitutions-score",
  "hrr.countdown.resultBody": "Puls-fald de første 60 sekunder.",
  "hrr.grade.poor": "Lav",
  "hrr.grade.fair": "Okay",
  "hrr.grade.good": "God",
  "hrr.grade.excellent": "Fremragende",
  "hrr.grade.elite": "Elite",

  // HR zone settings
  "hrz.title": "Pulszoner",
  "hrz.eyebrow": "Personlige træningsintensiteter",
  "hrz.profileRow": "Pulszoner",
  "hrz.profileRow.unset": "Ikke sat",
  "hrz.input.age": "Alder",
  "hrz.input.resting": "Hvilepuls",
  "hrz.input.max": "Maks. puls",
  "hrz.auto": "Beregn automatisk",
  "hrz.autoHint": "Karvonen-formel ud fra alder + hvilepuls",
  "hrz.reset": "Nulstil til auto",
  "hrz.save": "Gem zoner",
  "hrz.cancel": "Annullér",
  "hrz.previewTitle": "Dine zoner",
  "hrz.lower": "Nedre",
  "hrz.upper": "Øvre",
  "hrz.error.age": "Alder skal være 5–120",
  "hrz.error.resting": "Hvilepuls skal være 30–120",
  "hrz.error.max": "Maks. puls skal være større end hvilepuls og ≤ 230",
  "hrz.error.zones": "Zoner skal være stigende og sammenhængende",
  "hrz.cue.enter": "Du er nu i zone {zone}",
  "hrz.zone.1.name": "Restitution",
  "hrz.zone.2.name": "Aerob base",
  "hrz.zone.3.name": "Tempo",
  "hrz.zone.4.name": "Tærskel",
  "hrz.zone.5.name": "Maks indsats",
  "hrz.zone.1.desc": "Aktiv restitution, fedtforbrænding, kapillærer.",
  "hrz.zone.2.desc": "Aerob udholdenhed — lange, snakkevenlige løb.",
  "hrz.zone.3.desc": "Forbedrer effektivitet ved højere tempo.",
  "hrz.zone.4.desc": "Mælkesyretærskel — konkurrencetempo.",
  "hrz.zone.5.desc": "VO₂max & anaerob — korte, hårde intervaller.",

  // Zone-based pacing
  "pacing.title": "Zone-tempo",
  "pacing.subtitle": "Foreslå et måltempo baseret på din aktuelle pulszone.",
  "pacing.enable": "Aktivér zone-tempo",
  "pacing.basePace": "Basis roligt tempo (Z3)",
  "pacing.basePaceHint": "Dit referencetempo. Andre zoner justeres herfra.",
  "pacing.useRecent": "Brug median af seneste løb",
  "pacing.offset": "Offset",
  "pacing.offsetUnit": "s/km vs basis",
  "pacing.zoneTarget": "Mål",
  "pacing.target": "Mål",
  "pacing.tooFast": "Slap af",
  "pacing.tooSlow": "Skru op",
  "pacing.onTarget": "På mål",
  "pacing.cue.easeOff": "Slap af — sænk tempoet",
  "pacing.cue.pickUp": "Skru op — øg tempoet",
  "pacing.reset": "Nulstil til standard",

  // Coach override + live HR spike alert
  "coach.zone5Override": "Jeg kan se på din puls, at dit hjerte arbejdede hårdere end normalt i dag. Selvom dine ben føles friske, anbefaler jeg en hviledag for at beskytte dit nervesystem.",
  "focus.hrSpike": "Pulsen stiger hurtigt — tjek din vejrtrækning",
  "focus.autoPause": "Auto-pause",

  // Auto-pause + Flight Recorder settings
  "profile.autoPause": "Auto-pause",
  "profile.autoPause.on": "Til",
  "profile.autoPause.off": "Fra",
  "profile.flightRecorder": "Flight Recorder",
  "profile.flightRecorder.on": "Til",
  "profile.flightRecorder.off": "Fra",
  "profile.flightRecorder.info.on":
    "Dit løb gemmes automatisk hvert sekund lokalt på telefonen. Hvis appen crasher eller mister forbindelsen, kan du gendanne løbet næste gang du åbner Orbit Run.",
  "profile.flightRecorder.info.off":
    "Dit aktive løb gemmes ikke undervejs. Mister du forbindelsen eller lukker appen uventet, går dataene tabt.",
  "profile.audio.info":
    "Vælg hvor ofte AI-coachen skal give dig lydopdateringer (f.eks. for hver kilometer eller 500 meter) om dit tempo og din puls.",
  "profile.prVoice.info":
    "Slå til for at få et lydsignal, når du sætter ny personlig rekord eller slår din Ghost Runner.",
  "profile.autoPause.info":
    "Sætter tiden på pause automatisk, hvis du stopper op (f.eks. ved et lyskryds), så din gennemsnitshastighed forbliver præcis.",
  "profile.haptic.info":
    "Mærk små, diskrete vibrationer (\"heartbeats\"), når du skifter pulszone, så du kan holde fokus uden at kigge på skærmen.",
  "profile.windUnit.info":
    "Vælg enheden for vindhastighed (meter pr. sekund m/s eller kilometer i timen km/t) til AI-vejranalysen.",

  // Recover unsaved run banner
  "recover.title": "Gendan ikke-gemt løb?",
  "recover.body": "Vi gemte dit løb løbende. Gem det nu eller kassér.",
  "recover.save": "Gem løb",
  "recover.discard": "Kassér",

  // Legal
  "legal.section": "Juridisk",
  "legal.privacy.row": "Privatlivspolitik",
  "legal.terms.row": "Vilkår & Ansvarsfraskrivelse",
  "legal.close": "Luk",
  "legal.privacy.title": "Privatlivspolitik for Orbit Run",
  "legal.privacy.intro":
    "Orbit Run er forpligtet til at beskytte dit privatliv. Vi indsamler lokationsdata (GPS) for at kunne tracke dine løberuter og hastighed, samt biometriske data (puls) for at give dig personlig træningsindsigt via vores AI-coach.",
  "legal.privacy.1.title": "Dataindsamling",
  "legal.privacy.1.body":
    "Dine data gemmes sikkert og bruges udelukkende til at forbedre din træningsoplevelse i appen.",
  "legal.privacy.2.title": "Tredjeparter",
  "legal.privacy.2.body":
    "Vi sælger eller deler aldrig dine personlige sundhedsdata med tredjeparter.",
  "legal.privacy.3.title": "Apple Health",
  "legal.privacy.3.body":
    "Hvis du giver tilladelse, læser og skriver vi data til Apple Health for at synkronisere din træningshistorik.",
  "legal.privacy.4.title": "Dine rettigheder",
  "legal.privacy.4.body":
    "Du kan til enhver tid slette din profil og alle tilhørende data direkte i appen.",
  "legal.terms.title": "Vilkår og Medicinsk Ansvarsfraskrivelse",
  "legal.terms.intro": "Ved at bruge Orbit Run accepterer du følgende:",
  "legal.terms.1.title": "Ikke medicinsk udstyr",
  "legal.terms.1.body":
    "Orbit Run og Orbit Coach AI leverer kun vejledende træningsdata. Appen er ikke medicinsk udstyr og kan ikke erstatte professionel lægelig rådgivning.",
  "legal.terms.2.title": "Helbred",
  "legal.terms.2.body":
    "Konsultér altid en læge, før du påbegynder et nyt træningsprogram, især hvis du har kendte hjerteproblemer eller andre helbredsmæssige udfordringer.",
  "legal.terms.3.title": "Sikkerhed",
  "legal.terms.3.body":
    "Vær altid opmærksom på dine omgivelser under løb. Orbit Run er ikke ansvarlig for ulykker eller skader opstået under brug af appen.",
};

const dicts: Record<Lang, Dict> = { en, da };

type I18nCtx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const Ctx = createContext<I18nCtx | null>(null);

function detectOSLang(): Lang {
  if (typeof navigator === "undefined") return "en";
  const candidates: string[] = [];
  if (Array.isArray(navigator.languages)) candidates.push(...navigator.languages);
  if (navigator.language) candidates.push(navigator.language);
  for (const c of candidates) {
    if (typeof c === "string" && c.toLowerCase().startsWith("da")) return "da";
  }
  return "en";
}

function getSavedLang(): Lang | null {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY) as Lang | null;
    if (saved === "en" || saved === "da") return saved;
  } catch {
    /* noop */
  }
  return null;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const saved = getSavedLang();
    setLangState(saved ?? detectOSLang());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onLangChange = () => {
      // Only auto-update when user has not made a manual choice
      if (getSavedLang() === null) {
        setLangState(detectOSLang());
      }
    };
    window.addEventListener("languagechange", onLangChange);
    return () => window.removeEventListener("languagechange", onLangChange);
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
      document.documentElement.lang = l;
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") document.documentElement.lang = lang;
  }, [lang]);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const dict = dicts[lang];
      let s = dict[key] ?? en[key] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          s = s.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
        }
      }
      return s;
    },
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    const fallbackLang: Lang = typeof window === "undefined" ? "en" : (getSavedLang() ?? detectOSLang());
    return {
      lang: fallbackLang,
      setLang: () => {},
      t: (k: string, vars?: Record<string, string | number>) => {
        const dict = dicts[fallbackLang];
        let s = dict[k] ?? en[k] ?? k;
        if (vars) for (const [kk, v] of Object.entries(vars)) s = s.replace(new RegExp(`\\{${kk}\\}`, "g"), String(v));
        return s;
      },
    };
  }
  return ctx;
}

export function getStoredLang(): Lang {
  if (typeof window === "undefined") return "en";
  return getSavedLang() ?? detectOSLang();
}

export function paceToWords(secPerKm: number, lang: Lang): string {
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  if (lang === "da") {
    return `${m} minutter og ${s} sekunder per kilometer`;
  }
  return `${m} minute${m === 1 ? "" : "s"} ${s} second${s === 1 ? "" : "s"} per kilometer`;
}
