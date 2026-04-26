import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Lang = "en" | "da";

const STORAGE_KEY = "orbit:lang:v1";

type Dict = Record<string, string>;

const en: Dict = {
  // Header / status
  "app.brand": "Orbit Lab",
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
  "ghost.race": "Race",
  "ghost.active": "Ghost active",
  "ghost.clear": "Clear",
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

  // Nav
  "nav.run": "Run",
  "nav.history": "History",
  "nav.records": "Records",
  "nav.profile": "Profile",

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
  "profile.level.beginnerHint": "Simpler stats · more voice cues",
  "profile.level.expertHint": "Advanced metrics · fewer cues",
  "profile.memberCard": "Member Card",

  // Greeting
  "greet.ready": "Ready for your run, {name}?",
  "greet.goal": "Let's hit your goal: {goal}!",
  "greet.welcome": "Welcome, {name}",

  // Onboarding
  "onb.title": "Welcome to Orbit Lab",
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

  // RPE
  "rpe.eyebrow": "Effort score",
  "rpe.title": "How hard did it feel?",
  "rpe.veryEasy": "Very easy",
  "rpe.maxEffort": "Max effort",
  "rpe.skip": "Skip",
  "rpe.short": "RPE",
};

const da: Dict = {
  "app.brand": "Orbit Lab",
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
  "ghost.race": "Udfordr",
  "ghost.active": "Ghost aktiv",
  "ghost.clear": "Ryd",
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

  "nav.run": "Løb",
  "nav.history": "Historik",
  "nav.profile": "Profil",

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
  "profile.level.beginner": "Begynder",
  "profile.level.expert": "Ekspert",
  "profile.level.beginnerHint": "Simple stats · flere stemmesignaler",
  "profile.level.expertHint": "Avancerede mål · færre signaler",
  "profile.memberCard": "Medlemskort",

  "greet.ready": "Klar til din tur, {name}?",
  "greet.goal": "Lad os ramme dit mål om {goal}!",
  "greet.welcome": "Velkommen, {name}",

  "onb.title": "Velkommen til Orbit Lab",
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

  "nav.records": "Rekorder",
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
  "coach.profileRow": "Konfigurer Coach",
  "coach.profileRow.unset": "Ikke konfigureret",

  // RPE
  "rpe.eyebrow": "Anstrengelses-score",
  "rpe.title": "Hvor hårdt føltes turen?",
  "rpe.veryEasy": "Meget let",
  "rpe.maxEffort": "Maksimal indsats",
  "rpe.skip": "Spring over",
  "rpe.short": "RPE",
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
