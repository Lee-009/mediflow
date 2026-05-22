const labels = {
  age: {
    infant: "Infant (0-23 months)",
    child: "Child (2-11 years)",
    teen: "Teen (12-17 years)",
    adult: "Adult (18-64 years)",
    olderAdult: "Older adult (65+ years)",
  },
  symptom: {
    cough: "Cough",
    cold: "Cold / stuffy nose",
    fever: "Fever",
    headache: "Headache",
    stomach: "Stomach ache / upset stomach",
  },
};

const notes = [
  {
    title: "Pediatric doses",
    text: "For children, safe dosing depends on age and weight. Use the package measuring tool, not a kitchen spoon.",
  },
  {
    title: "Do not double up",
    text: "Many cold medicines already contain acetaminophen or ibuprofen. Check active ingredients before combining products.",
  },
  {
    title: "Older adult caution",
    text: "Interactions, kidney problems, blood pressure changes, dizziness, and stomach bleeding are more likely in older adults.",
  },
  {
    title: "Best quick check",
    text: "A pharmacist is the safest fast stop for pregnancy, medicine interactions, or label confusion.",
  },
];

const ageProfiles = {
  infant: {
    summary: "Infants need extra caution and fewer OTC choices.",
    canTry: [
      "Use saline nose drops, gentle suction, and frequent fluids or feeds.",
      "Infant acetaminophen may be used only with the correct product and careful dosing guidance.",
    ],
    avoid: [
      "Do not use OTC cough-and-cold combination products.",
      "Do not use honey under age 1.",
      "Do not use ibuprofen under 6 months unless a clinician says to.",
    ],
    care: [
      "Watch wet diapers, feeding, and alertness closely.",
      "Babies can worsen quickly, so same-day clinician advice is appropriate for many symptoms.",
    ],
    urgent: [
      "Fever in a baby under 3 months",
      "Breathing trouble, blue lips, or unusual sleepiness",
      "Poor feeding or fewer wet diapers",
    ],
  },
  child: {
    summary: "Children usually do best with simple symptom relief and weight-based products.",
    canTry: [
      "Use child-labeled acetaminophen or ibuprofen only when the label fits the age and weight.",
      "Honey may help cough or sore throat if the child is older than 1 year.",
    ],
    avoid: [
      "Avoid adult medicines and adult-strength tablets.",
      "Do not use aspirin for children or teens with fever illness.",
    ],
    care: [
      "Fluids, rest, saline spray, and humidified air are often first-line choices.",
      "If you are unsure about a kid's cold medicine, ask a pharmacist before buying it.",
    ],
    urgent: [
      "Trouble breathing, dehydration, or a child who is hard to wake",
      "Severe pain, repeated vomiting, or symptoms getting worse instead of better",
    ],
  },
  teen: {
    summary: "Teens can use some adult-style OTC products, but ingredient overlap is still a major risk.",
    canTry: [
      "Single-ingredient products are usually safer than large multi-symptom combinations.",
      "Acetaminophen or ibuprofen are common options for pain or fever when label directions fit.",
    ],
    avoid: [
      "Avoid taking several medicines that treat the same symptom at the same time.",
      "Avoid aspirin for fever illness.",
    ],
    care: [
      "Sleep, hydration, food, and rest still matter as much as medicine.",
      "A clinician should assess frequent or unusually severe symptoms.",
    ],
    urgent: [
      "Chest pain, shortness of breath, dehydration, or confusion",
      "Severe headache, severe abdominal pain, or repeated vomiting",
    ],
  },
  adult: {
    summary: "Adults have more OTC choices, but simpler and more targeted is usually safer.",
    canTry: [
      "Pick the medicine that matches the main symptom instead of taking a random all-in-one product.",
      "Acetaminophen or ibuprofen may help pain and fever if you can take them safely.",
    ],
    avoid: [
      "Avoid duplicate active ingredients.",
      "Avoid treating persistent or worsening symptoms with OTC products for too long.",
    ],
    care: [
      "Hydration, sleep, rest, and smoke avoidance improve many short illnesses.",
      "Get tested early for flu or COVID-19 when timing could affect treatment.",
    ],
    urgent: [
      "Trouble breathing, chest pain, severe dehydration, or confusion",
      "Severe or rapidly worsening symptoms",
    ],
  },
  olderAdult: {
    summary: "Older adults need extra caution because side effects and interactions happen more easily.",
    canTry: [
      "Start with the simplest product possible and review it with a pharmacist when you can.",
      "Acetaminophen is often simpler than NSAIDs for pain or fever if it is safe for you.",
    ],
    avoid: [
      "Be careful with decongestants, sedating antihistamines, and multi-symptom combinations.",
      "Use extra caution with ibuprofen or naproxen if there is kidney, heart, ulcer, or blood-thinner risk.",
    ],
    care: [
      "Bring your medicine list to the pharmacy if possible.",
      "New weakness, falls, poor intake, or confusion matter even when fever is low.",
    ],
    urgent: [
      "New confusion, fainting, breathing trouble, or inability to drink",
      "Rapid decline in strength, eating, or alertness",
    ],
  },
};

const symptomProfiles = {
  cough: {
    title: "Cough relief",
    canTry: [
      "Honey, warm drinks, lozenges, and humidified air can soothe throat irritation when age-appropriate.",
      "Dextromethorphan may help a dry cough and guaifenesin may help loosen mucus if the label fits the age.",
    ],
    avoid: [
      "Avoid mixing several cough-and-cold products without checking ingredients first.",
      "Avoid ignoring a cough that lasts more than about 3 weeks.",
    ],
    care: [
      "Rest, fluids, and avoiding smoke help as much as medicine for many coughs.",
      "A prescribed asthma plan is more important than OTC cough medicine if wheezing is involved.",
    ],
    urgent: [
      "Blue lips, chest pain, coughing blood, or breathing trouble",
      "Symptoms that improve and then return worse",
    ],
  },
  cold: {
    title: "Cold / congestion relief",
    canTry: [
      "Saline spray, humidified air, warm fluids, and rest are good first steps.",
      "A decongestant may help older children, teens, or adults if the label fits and there are no reasons to avoid it.",
    ],
    avoid: [
      "Avoid antibiotics for a routine viral cold.",
      "Avoid combining a cold medicine with a separate pain reliever before checking ingredients.",
    ],
    care: [
      "Most common colds improve on their own with time and fluids.",
      "Choose single-ingredient products when only one symptom is bothering you.",
    ],
    urgent: [
      "Breathing trouble, dehydration, chest pain, or confusion",
      "Symptoms lasting beyond about 10 days without improvement",
    ],
  },
  fever: {
    title: "Fever relief",
    canTry: [
      "Acetaminophen or ibuprofen are the usual OTC fever reducers when label directions and age rules fit.",
      "Use fever medicine for comfort, but keep watching the whole illness, not just the number.",
    ],
    avoid: [
      "Avoid exceeding the label maximum, especially with acetaminophen.",
      "Avoid aspirin for children and teens with fever symptoms.",
    ],
    care: [
      "Fluids, light clothing, and rest are usually enough along with medicine.",
      "Fever lasting more than about 3 days deserves medical review in many cases.",
    ],
    urgent: [
      "Seizure, stiff neck, confusion, dehydration, or breathing trouble",
      "Fever with rash, severe pain, or marked weakness",
    ],
  },
  headache: {
    title: "Headache relief",
    canTry: [
      "Acetaminophen or ibuprofen may help a simple headache if label directions fit.",
      "Water, food, sleep, and a dark quiet room can help as much as medicine.",
    ],
    avoid: [
      "Avoid frequent repeat dosing for recurring headaches.",
      "Avoid ignoring a new severe headache or one after a head injury.",
    ],
    care: [
      "Missed meals, dehydration, illness, stress, poor sleep, and screen strain are common triggers.",
      "A changing headache pattern should be medically assessed.",
    ],
    urgent: [
      "Sudden worst headache, weakness, trouble speaking, fainting, or confusion",
      "Headache with fever, stiff neck, or repeated vomiting",
    ],
  },
  stomach: {
    title: "Upset stomach relief",
    canTry: [
      "If diarrhea or vomiting is present, fluids or oral rehydration are often the most important treatment.",
      "For heartburn or indigestion, a simple antacid may help when the label fits the age.",
      "Bismuth subsalicylate may help some teens and adults with diarrhea or upset stomach if they can take it safely.",
    ],
    avoid: [
      "Avoid random stomach medicines when the cause is unclear.",
      "Avoid loperamide if there is fever, bloody stool, black stool, or significant pain without diarrhea.",
      "Avoid NSAIDs if they may be causing stomach irritation.",
    ],
    care: [
      "Small sips of fluids and bland foods are usually better than forcing a full meal.",
      "Constipation, period cramps, reflux, viruses, ulcers, and appendicitis can all feel like stomach ache.",
    ],
    urgent: [
      "Blood in stool or vomit, black stools, or repeated vomiting",
      "Sudden severe pain, a hard belly, or pain with fainting or chest symptoms",
    ],
  },
};

const comboProfiles = {
  cough: {
    infant: {
      summary: "Avoid OTC cough medicine in infants. Supportive care is the safest starting point.",
    },
    child: {
      summary: "For children, honey over age 1 and comfort care are usually safer than cough syrup.",
      avoid: ["Do not use OTC cough-and-cold medicines in children younger than 4 unless a clinician says to."],
    },
    olderAdult: {
      summary: "Choose the simplest cough product possible and check interactions first.",
    },
  },
  cold: {
    infant: {
      summary: "Infants usually need saline, suction, fluids, and monitoring, not cold medicine.",
      avoid: ["Do not use decongestants or antihistamine cold syrups in infants."],
    },
    child: {
      summary: "In younger children, comfort care is usually safer than multi-symptom cold medicine.",
      avoid: ["Do not use OTC cold medicines in children younger than 4 unless a clinician says to."],
    },
    olderAdult: {
      summary: "Cold medicines can raise blood pressure or cause dizziness, so simpler is better.",
    },
  },
  fever: {
    infant: {
      summary: "Any fever in a baby under 3 months needs prompt medical assessment.",
    },
    child: {
      summary: "Children usually do well with acetaminophen or ibuprofen plus fluids when dosing is correct.",
    },
    olderAdult: {
      summary: "Even a mild fever can matter more in older adults if there is weakness, confusion, or poor intake.",
    },
  },
  headache: {
    infant: {
      summary: "A possible headache in an infant needs medical assessment rather than home treatment alone.",
      canTry: ["Call a clinician for same-day advice if an infant seems in pain, irritable, or ill."],
    },
    olderAdult: {
      summary: "A new headache pattern in older adults deserves earlier medical review.",
    },
  },
  stomach: {
    infant: {
      summary: "Infant stomach pain is not a self-treat problem. Medical advice is the safest first step.",
      avoid: ["Do not give antidiarrheals or adult stomach medicines to infants."],
    },
    child: {
      summary: "For kids with vomiting or diarrhea, hydration matters much more than stomach medicine.",
      avoid: ["Do not use most antidiarrheal medicines in children unless a clinician recommends them."],
    },
    teen: {
      avoid: ["Avoid bismuth subsalicylate if there is aspirin allergy, blood thinner use, or flu-like viral illness."],
    },
    adult: {
      avoid: ["Avoid bismuth subsalicylate if you take blood thinners, have aspirin allergy, or are pregnant."],
    },
    olderAdult: {
      summary: "Older adults can dehydrate faster and may need earlier assessment for stomach symptoms.",
    },
  },
};

const ageSelect = document.querySelector("#age-group");
const symptomSelect = document.querySelector("#symptom");
const summaryTitle = document.querySelector("#summary-title");
const summaryNote = document.querySelector("#summary-note");
const resultTitle = document.querySelector("#result-title");
const canTryList = document.querySelector("#can-try-list");
const avoidList = document.querySelector("#avoid-list");
const careList = document.querySelector("#care-list");
const urgentList = document.querySelector("#urgent-list");
const notesGrid = document.querySelector("#notes-grid");

function mergeItems(...groups) {
  return [...new Set(groups.flat().filter(Boolean))];
}

function renderList(target, items) {
  target.innerHTML = "";
  items.forEach((item, index) => {
    const li = document.createElement("li");
    li.textContent = item;
    li.className = "stagger-item";
    li.style.animationDelay = `${index * 60}ms`;
    target.append(li);
  });
}

function renderNotes() {
  notesGrid.innerHTML = "";
  notes.forEach((note, index) => {
    const node = document.createElement("article");
    node.className = "note";
    node.style.animationDelay = `${index * 80}ms`;
    node.innerHTML = `<h3>${note.title}</h3><p>${note.text}</p>`;
    notesGrid.append(node);
  });
}

function updateView() {
  const ageKey = ageSelect.value;
  const symptomKey = symptomSelect.value;
  const age = ageProfiles[ageKey];
  const symptom = symptomProfiles[symptomKey];
  const combo = comboProfiles[symptomKey]?.[ageKey] || {};

  summaryTitle.textContent = `${labels.age[ageKey]} with ${labels.symptom[symptomKey].toLowerCase()}`;
  summaryNote.textContent = combo.summary || `${age.summary} ${symptom.title} should be handled conservatively.`;
  resultTitle.textContent = combo.title || `${labels.age[ageKey]} ${symptom.title.toLowerCase()}`;

  renderList(canTryList, mergeItems(age.canTry, symptom.canTry, combo.canTry));
  renderList(avoidList, mergeItems(age.avoid, symptom.avoid, combo.avoid));
  renderList(careList, mergeItems(age.care, symptom.care, combo.care));
  renderList(urgentList, mergeItems(age.urgent, symptom.urgent, combo.urgent));
}

ageSelect.addEventListener("change", updateView);
symptomSelect.addEventListener("change", updateView);

renderNotes();
updateView();
