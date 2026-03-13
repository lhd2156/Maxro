import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AiChatRequest, AiChatResponse } from '../models/ai-chat.model';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class AiChatService {
  constructor(
    private readonly http: HttpClient,
    private readonly authService: AuthService,
  ) {}

  sendMessage(request: AiChatRequest): Observable<AiChatResponse> {
    const token = this.authService.getAccessToken();
    if (!token) {
      return throwError(() => new Error('Please sign in again to use chat.'));
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
    const apiBaseUrl = environment.apiBaseUrl || '';

    return this.http.post<AiChatResponse>(`${apiBaseUrl}/api/ai/chat`, request, { headers });
  }
}
