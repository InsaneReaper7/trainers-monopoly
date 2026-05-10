export interface EventCard {
  id: string;
  name: string;
  description: string;
  type: 'Scout' | 'Journal';
  actionType: 'TP_CHANGE' | 'MOVE_TO' | 'EXP_GAIN' | 'HEAL' | 'JAIL' | 'OTHER';
  value?: number;
  targetSpace?: number;
}

export const SCOUT_REPORTS: EventCard[] = [
  { id: 's1', name: 'Supply Drop', description: 'Collect 100 TP from the bank.', type: 'Scout', actionType: 'TP_CHANGE', value: 100 },
  { id: 's2', name: 'Breakthrough Training', description: 'Your lead creature gains 15 EXP.', type: 'Scout', actionType: 'EXP_GAIN', value: 15 },
  { id: 's3', name: 'Lost the Trail', description: 'Go directly to Lost in an Adventure. Do not collect TP.', type: 'Scout', actionType: 'JAIL' },
  { id: 's4', name: 'Equipment Stolen', description: 'Pay 75 TP to the bank.', type: 'Scout', actionType: 'TP_CHANGE', value: -75 },
  { id: 's5', name: 'Healing Surge', description: 'All your creatures fully restore HP.', type: 'Scout', actionType: 'HEAL' },
];

export const TRAINER_JOURNAL: EventCard[] = [
  { id: 'j1', name: 'Regional Tournament', description: 'Collect 50 TP from the bank.', type: 'Journal', actionType: 'TP_CHANGE', value: 50 },
  { id: 'j2', name: 'Potion Found', description: 'Restore 30 HP to your lead creature.', type: 'Journal', actionType: 'HEAL', value: 30 },
  { id: 'j3', name: 'Trainer Convention', description: 'Move to the Healing Center. Collect 200 TP.', type: 'Journal', actionType: 'MOVE_TO', targetSpace: 0 },
  { id: 'j4', name: 'Tax Audit', description: 'Pay 50 TP to the bank.', type: 'Journal', actionType: 'TP_CHANGE', value: -50 },
  { id: 'j5', name: 'Bonus EXP', description: 'All your creatures gain 10 EXP.', type: 'Journal', actionType: 'EXP_GAIN', value: 10 },
];
