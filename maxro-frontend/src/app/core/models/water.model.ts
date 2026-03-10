export interface WaterIntake {
  id: string;
  userId: string;
  date: string;
  totalOz: number;
  goalOz: number;
  entries: WaterEntry[];
  goalMet: boolean;
}

export interface WaterEntry {
  amountOz: number;
  loggedAt: string;
}

export interface WaterTrendPoint {
  date: string;
  totalOz: number;
  goalOz: number;
  goalMet: boolean;
}
