import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable, map } from 'rxjs';
import { WaterIntake } from '../models/water.model';

const WATER_FIELDS = `
  id userId date totalOz goalOz goalMet
  entries { amountOz loggedAt }
`;

const GET_WATER_INTAKE = gql`
  query GetWaterIntake($date: String!) {
    getWaterIntake(date: $date) { ${WATER_FIELDS} }
  }
`;

const GET_WATER_LOGS = gql`
  query GetWaterIntakeLogs($startDate: String!, $endDate: String!) {
    getWaterIntakeLogs(startDate: $startDate, endDate: $endDate) { ${WATER_FIELDS} }
  }
`;

const LOG_WATER = gql`
  mutation LogWaterIntake($input: WaterIntakeInput!) {
    logWaterIntake(input: $input) { ${WATER_FIELDS} }
  }
`;

@Injectable({ providedIn: 'root' })
export class WaterService {
  constructor(private readonly apollo: Apollo) {}

  getWaterIntake(date: string): Observable<WaterIntake | null> {
    return this.apollo.query<{ getWaterIntake: WaterIntake | null }>({
      query: GET_WATER_INTAKE,
      variables: { date },
    }).pipe(map(r => r.data.getWaterIntake));
  }

  getWaterIntakeLogs(startDate: string, endDate: string): Observable<WaterIntake[]> {
    return this.apollo.query<{ getWaterIntakeLogs: WaterIntake[] }>({
      query: GET_WATER_LOGS,
      variables: { startDate, endDate },
    }).pipe(map(r => r.data.getWaterIntakeLogs));
  }

  logWater(date: string, amountOz: number): Observable<WaterIntake> {
    return this.apollo.mutate<{ logWaterIntake: WaterIntake }>({
      mutation: LOG_WATER,
      variables: { input: { date, amountOz } },
    }).pipe(map(r => r.data!.logWaterIntake));
  }
}
