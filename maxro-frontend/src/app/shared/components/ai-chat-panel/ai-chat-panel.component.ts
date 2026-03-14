import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, ElementRef, Input, OnChanges, SimpleChanges, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { AiChatAttachmentPayload, AiChatHistoryMessage } from '../../../core/models/ai-chat.model';
import { AiChatService } from '../../../core/services/ai-chat.service';

interface PendingImage {
  id: string;
  fileName: string;
  mimeType: string;
  base64Data: string;
  previewUrl: string;
}

interface ChatMessage {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  attachments: PendingImage[];
  seed?: boolean;
  error?: boolean;
}

interface QuickPromptGroup {
  label: string;
  prompts: string[];
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionWindow extends Window {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
}

@Component({
  selector: 'app-ai-chat-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule],
  template: `
    <div class="chat-shell">
      <p class="chat-scope">Fitness, recovery, PR progress, nutrition, and MAXRO help only.</p>

      <div class="chat-history" #scrollViewport>
        @for (message of messages; track message.id) {
          <div class="chat-row" [class.user]="message.role === 'user'">
            <div class="chat-avatar" [class.user]="message.role === 'user'">
              <mat-icon [svgIcon]="message.role === 'assistant' ? 'mx-ai' : 'mx-user'"></mat-icon>
            </div>
            <div class="chat-bubble" [class.user]="message.role === 'user'" [class.error]="message.error">
              <div class="chat-meta">{{ message.role === 'assistant' ? 'Maxro AI' : 'You' }}</div>
              <p class="chat-text" [innerHTML]="formatMessageText(message.text)"></p>
              @if (message.attachments.length > 0) {
                <div class="chat-image-grid">
                  @for (attachment of message.attachments; track attachment.id) {
                    <img [src]="attachment.previewUrl" [alt]="attachment.fileName" class="chat-image" />
                  }
                </div>
              }
            </div>
          </div>
        }

        @if (showQuickPromptPanel) {
          <div class="suggestion-panel" [class.closing]="quickPromptClosing">
            <div class="suggestion-header">
              <span class="suggestion-title">Quick Help</span>
              <span class="suggestion-subtitle">Pick a topic to see common questions.</span>
            </div>
            <div class="suggestion-categories" aria-label="Quick help topics">
              @for (group of quickPromptGroups; track group.label) {
                <button
                  type="button"
                  class="suggestion-category-btn"
                  [class.active]="activeQuickPromptGroup?.label === group.label"
                  (click)="selectQuickCategory(group.label)"
                  [disabled]="sending || quickPromptClosing">
                  {{ group.label }}
                </button>
              }
            </div>
            <div class="suggestion-list">
              @for (prompt of activeQuickPrompts; track prompt) {
                <button
                  type="button"
                  class="suggestion-item"
                  (click)="sendQuickSuggestion(prompt)"
                  [disabled]="sending || quickPromptClosing">
                  {{ prompt }}
                </button>
              }
            </div>
          </div>
        }

        @if (sending) {
          <div class="chat-row">
            <div class="chat-avatar">
              <mat-icon svgIcon="mx-ai"></mat-icon>
            </div>
            <div class="chat-bubble typing">
              <div class="chat-meta">Maxro AI</div>
              <p class="chat-text">Thinking...</p>
            </div>
          </div>
        }
      </div>

      <div class="chat-composer-shell">
        @if (composerError) {
          <p class="composer-error">{{ composerError }}</p>
        }

        <div class="pending-images" [class.visible]="pendingAttachments.length > 0">
          @for (attachment of pendingAttachments; track attachment.id) {
            <div class="pending-image-card">
              <img [src]="attachment.previewUrl" [alt]="attachment.fileName" class="pending-image" />
              <button type="button" class="pending-remove-btn" (click)="removePendingAttachment(attachment.id)" aria-label="Remove image">
                <mat-icon svgIcon="mx-x"></mat-icon>
              </button>
            </div>
          }
        </div>

        <label class="chat-input-wrap">
          <span class="chat-input-label">Ask about workouts, PRs, food, recovery, or where things are in Maxro.</span>
          <textarea
            [(ngModel)]="draft"
            class="chat-input"
            rows="3"
            maxlength="2400"
            [disabled]="sending"
            placeholder="Type your question here"
            (keydown)="onComposerKeydown($event)"></textarea>
        </label>

        <div class="chat-actions">
          <div class="chat-actions-left">
            <button type="button" class="chat-btn chat-btn-secondary" (click)="openFilePicker()" [disabled]="sending || pendingAttachments.length >= maxAttachmentCount">
              <mat-icon svgIcon="mx-plus"></mat-icon>
              Add image
            </button>
            @if (speechSupported) {
              <button
                type="button"
                class="chat-btn chat-btn-secondary"
                [class.chat-btn-active]="listening"
                (click)="toggleVoiceInput()"
                [disabled]="sending || quickPromptClosing">
                <mat-icon [svgIcon]="listening ? 'mx-stop' : 'mx-mic'"></mat-icon>
                {{ listening ? 'Listening...' : 'Mic' }}
              </button>
            }

            @if (pendingAttachments.length > 0) {
              <span class="attachment-count">{{ pendingAttachments.length }} image{{ pendingAttachments.length === 1 ? '' : 's' }}</span>
            }
          </div>
          <button type="button" class="chat-btn chat-btn-primary" (click)="sendMessage()" [disabled]="sending || !canSend">
            {{ sending ? 'Sending...' : 'Send' }}
          </button>
        </div>

        <input #fileInput type="file" accept="image/*" multiple hidden (change)="onFilesSelected($event)" />
      </div>
    </div>
  `,
  styles: [`
    :host { display: flex; min-width: 0; min-height: 0; max-width: 100%; flex: 1; overflow: hidden; }
    .chat-shell { display: flex; position: relative; flex: 1; min-width: 0; min-height: 0; flex-direction: column; gap: 12px; width: 100%; box-sizing: border-box; overflow: hidden; }
    .chat-scope { margin: 0; font-size: 11px; color: rgba(255,255,255,0.56); }
    .suggestion-panel {
      align-self: flex-end;
      width: calc(100% - 38px);
      max-width: calc(100% - 38px);
      min-width: 0;
      min-height: 0;
      margin-left: 38px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 12px;
      border-radius: 16px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.06);
      box-sizing: border-box;
      overflow: hidden;
      max-height: 360px;
      opacity: 1;
      transform: translateY(0) scale(1);
      transform-origin: top right;
      transition: opacity 180ms ease, transform 180ms ease, max-height 220ms ease, margin 220ms ease, padding 220ms ease, border-color 180ms ease;
    }
    .suggestion-panel.closing {
      opacity: 0;
      transform: translateY(-8px) scale(0.98);
      max-height: 0;
      margin-top: 0;
      padding-top: 0;
      padding-bottom: 0;
      border-color: transparent;
      pointer-events: none;
    }
    .suggestion-header { display: flex; flex-direction: column; gap: 4px; }
    .suggestion-title { font-size: 10px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: rgba(255,255,255,0.48); }
    .suggestion-subtitle { font-size: 12px; color: rgba(255,255,255,0.6); line-height: 1.4; }
    .suggestion-categories {
      display: flex;
      flex: 0 0 auto;
      flex-wrap: wrap;
      gap: 8px;
      align-items: flex-start;
      align-content: flex-start;
      overflow-x: hidden;
      overflow-y: auto;
      padding: 0 0 12px;
      margin-bottom: 2px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      min-height: 42px;
      max-height: 78px;
      position: relative;
      z-index: 2;
      scrollbar-width: none;
      -ms-overflow-style: none;
    }
    .suggestion-categories::-webkit-scrollbar { display: none; }
    .suggestion-category-btn {
      min-height: 30px;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(255,255,255,0.04);
      color: var(--text-primary);
      padding: 0 12px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      flex: 0 0 auto;
      white-space: nowrap;
      transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
    }
    .suggestion-category-btn:hover:not(:disabled),
    .suggestion-category-btn.active {
      background: rgba(200,241,53,0.12);
      border-color: rgba(200,241,53,0.3);
      color: var(--accent);
    }
    .suggestion-category-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .suggestion-list {
      display: flex;
      flex: 1 1 auto;
      flex-direction: column;
      gap: 8px;
      min-height: 0;
      overflow-y: auto;
      padding-top: 4px;
      position: relative;
      z-index: 1;
      scrollbar-width: none;
      -ms-overflow-style: none;
    }
    .suggestion-list::-webkit-scrollbar { display: none; }
    .suggestion-item {
      width: 100%;
      min-height: 40px;
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.07);
      background: rgba(255,255,255,0.035);
      color: var(--text-primary);
      padding: 10px 12px;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      text-align: left;
      font-size: 12px;
      font-weight: 600;
      line-height: 1.4;
      cursor: pointer;
      transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease; 
      box-sizing: border-box;
    }
    .suggestion-item:hover:not(:disabled) {
      background: rgba(200,241,53,0.08);
      border-color: rgba(200,241,53,0.24);
      color: #f6ffdc;
      transform: translateY(-1px);
    }
    .suggestion-item:disabled { opacity: 0.5; cursor: not-allowed; }
    .chat-history { flex: 1; min-width: 0; min-height: 0; overflow-y: auto; overflow-x: hidden; display: flex; flex-direction: column; gap: 12px; padding-right: 4px; padding-bottom: 2px; }
    .chat-row { display: flex; width: 100%; min-width: 0; align-items: flex-start; gap: 12px; animation: chat-row-in 180ms ease both; }
    .chat-row.user { flex-direction: row-reverse; }
    .chat-avatar { width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.05); color: var(--accent); flex-shrink: 0; margin-top: 6px; }
    .chat-avatar.user { background: rgba(200,241,53,0.12); color: #d8f87d; }
    .chat-avatar mat-icon { width: 14px; height: 14px; font-size: 14px; }
    .chat-bubble { max-width: calc(100% - 44px); min-width: 0; display: flex; flex-direction: column; gap: 8px; padding: 14px 14px 12px; border-radius: 16px; background: rgba(255,255,255,0.045); border: 1px solid rgba(255,255,255,0.07); box-sizing: border-box; overflow: hidden; }
    .chat-bubble.user { background: rgba(200,241,53,0.1); border-color: rgba(200,241,53,0.24); }
    .chat-bubble.error { border-color: rgba(255,112,67,0.34); background: rgba(255,112,67,0.08); }
    .chat-bubble.typing { background: rgba(29,185,84,0.08); border-color: rgba(29,185,84,0.2); }
    .chat-meta { display: block; font-size: 10px; font-weight: 700; letter-spacing: 0.04em; line-height: 1.2; text-transform: uppercase; color: rgba(255,255,255,0.52); margin: 0; }
    .chat-text { margin: 0; color: var(--text-primary); font-size: 13px; line-height: 1.52; white-space: pre-wrap; word-break: break-word; overflow-wrap: anywhere; }
    .chat-text strong { font-weight: 700; color: #ffffff; }
    .chat-image-grid { display: flex; gap: 8px; flex-wrap: wrap; }
    .chat-image { width: 72px; height: 72px; object-fit: cover; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); }
    .chat-composer-shell { display: flex; min-width: 0; flex-direction: column; gap: 10px; padding-top: 4px; border-top: 1px solid rgba(255,255,255,0.06); overflow: hidden; }
    .composer-error { margin: 0; font-size: 11px; color: #ff9b7d; }
    .pending-images { min-height: 0; display: none; gap: 8px; flex-wrap: wrap; }
    .pending-images.visible { display: flex; }
    .pending-image-card { position: relative; width: 60px; height: 60px; border-radius: 14px; overflow: hidden; border: 1px solid rgba(255,255,255,0.08); }
    .pending-image { width: 100%; height: 100%; object-fit: cover; display: block; }
    .pending-remove-btn { position: absolute; top: 4px; right: 4px; width: 20px; height: 20px; border: none; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; background: rgba(11,11,15,0.78); color: #ffffff; cursor: pointer; padding: 0; }
    .pending-remove-btn mat-icon { width: 11px; height: 11px; font-size: 11px; }
    .chat-input-wrap { display: flex; min-width: 0; flex-direction: column; gap: 6px; }
    .chat-input-label { font-size: 11px; color: rgba(255,255,255,0.56); }
    .chat-input { width: 100%; max-width: 100%; min-height: 88px; resize: none; border-radius: 14px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.025); color: var(--text-primary); padding: 12px 13px; font: inherit; line-height: 1.5; outline: none; box-sizing: border-box; }
    .chat-input:focus { border-color: rgba(200,241,53,0.42); box-shadow: 0 0 0 1px rgba(200,241,53,0.16); }
    .chat-input::placeholder { color: rgba(255,255,255,0.38); }
    .chat-actions { display: flex; min-width: 0; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
    .chat-actions-left { display: flex; min-width: 0; align-items: center; gap: 10px; flex-wrap: wrap; }
    .chat-btn { min-height: 34px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.08); padding: 0 14px; display: inline-flex; align-items: center; justify-content: center; gap: 6px; font-size: 12px; font-weight: 700; cursor: pointer; transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease, opacity 0.15s ease; }
    .chat-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .chat-btn mat-icon { width: 14px; height: 14px; font-size: 14px; }
    .chat-btn-secondary { background: rgba(255,255,255,0.04); color: var(--text-primary); }
    .chat-btn-secondary:hover:not(:disabled) { border-color: rgba(200,241,53,0.28); color: var(--accent); }
    .chat-btn-active { background: rgba(200,241,53,0.12); border-color: rgba(200,241,53,0.34); color: var(--accent); }
    .chat-btn-primary { background: var(--accent); color: #0d0d0d; border-color: transparent; }
    .chat-btn-primary:hover:not(:disabled) { filter: brightness(1.04); }
    .attachment-count { font-size: 11px; color: rgba(255,255,255,0.56); }
    @keyframes chat-row-in {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @media (max-width: 640px) {
      .chat-bubble { max-width: 100%; }
      .chat-actions { align-items: stretch; }
      .chat-actions-left,
      .chat-btn { width: 100%; }
      .chat-actions-left { flex-direction: column; align-items: stretch; }
      .suggestion-panel { width: 100%; margin-left: 0; }
      .suggestion-categories { overflow: hidden; }
    }
  `],
})
export class AiChatPanelComponent implements OnChanges {
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly aiChatService = inject(AiChatService);
  private messageSequence = 0;
  private speechRecognition: SpeechRecognitionLike | null = null;
  private speechBaseDraft = '';

  @Input() initialPrompt = '';
  @Input() pageTitle = 'Dashboard';
  @Input() appSnapshot = '';

  @ViewChild('scrollViewport') private readonly scrollViewport?: ElementRef<HTMLDivElement>;
  @ViewChild('fileInput') private readonly fileInput?: ElementRef<HTMLInputElement>;

  readonly maxAttachmentCount = 3;
  readonly maxAttachmentBytes = 5 * 1024 * 1024;

  messages: ChatMessage[] = [];
  pendingAttachments: PendingImage[] = [];
  draft = '';
  sending = false;
  listening = false;
  speechSupported = false;
  composerError = '';
  selectedQuickCategory = '';
  quickPromptClosing = false;
  private quickPromptCloseTimer: number | null = null;

  constructor() {
    this.speechSupported = !!this.resolveSpeechRecognitionCtor();
    this.destroyRef.onDestroy(() => {
      if (this.speechRecognition) {
        this.speechRecognition.abort();
      }
      this.clearQuickPromptCloseTimer();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.messages.length) {
      this.messages = [this.buildSeedMessage()];
      this.selectedQuickCategory = '';
      this.quickPromptClosing = false;
      this.clearQuickPromptCloseTimer();
      this.scrollToBottom();
      return;
    }

    if (changes['initialPrompt'] && this.messages.length === 1 && this.messages[0].seed) {
      this.messages = [this.buildSeedMessage()];
      this.selectedQuickCategory = '';
      this.quickPromptClosing = false;
      this.clearQuickPromptCloseTimer();
      this.scrollToBottom();
    }
  }

  get canSend(): boolean {
    return !!this.draft.trim() || this.pendingAttachments.length > 0;
  }

  get showQuickPromptPanel(): boolean {
    return this.messages.length === 1 && !!this.messages[0]?.seed && this.quickPromptGroups.length > 0;
  }

  get quickPromptGroups(): QuickPromptGroup[] {
    const route = this.router.url.toLowerCase();

    if (route.includes('/nutrition')) {
      return [
        { label: 'Meals', prompts: ['How do I add food?', 'How do I switch meals?', 'How do I remove a food entry?'] },
        { label: 'Macros', prompts: ['What do macros mean?', 'Where can I see my micronutrients?', 'How do I read my calorie goal?'] },
        { label: 'Search', prompts: ['Why is a food result generic?', 'How do pages work in Add Food?', 'How do I add custom food?'] },
      ];
    }

    if (route.includes('/water')) {
      return [
        { label: 'Logging', prompts: ['How do I log water fast?', 'How do I remove a water entry?', 'Where is today\'s log?'] },
        { label: 'Goals', prompts: ['What should my water goal be?', 'How do I change my daily water goal?', 'What counts toward my total?'] },
        { label: 'Quick Add', prompts: ['How do the quick add buttons work?', 'What does custom water do?', 'How do plus and minus work here?'] },
      ];
    }

    if (route.includes('/prs')) {
      return [
        { label: 'PR Basics', prompts: ['How are PRs calculated?', 'How do bodyweight PRs work?', 'Where can I see my PRs?'] },
        { label: 'Changes', prompts: ['Why did my PR change?', 'What happens if I delete a workout?', 'Why is a PR missing now?'] },
        { label: 'History', prompts: ['How do I know which workout set the PR?', 'Can old workouts still affect PRs?', 'How do I improve a PR safely?'] },
      ];
    }

    if (route.includes('/workouts')) {
      return [
        { label: 'Logging', prompts: ['How do I log a workout?', 'How do I add sets and reps?', 'Can I log bodyweight movements?'] },
        { label: 'Editing', prompts: ['How do I delete a workout?', 'What happens after I remove a workout?', 'How do I fix a bad entry?'] },
        { label: 'History', prompts: ['Where can I see my history?', 'How do I spot my latest workout?', 'How do workouts affect analytics?'] },
      ];
    }

    return [
      { label: 'Workouts', prompts: ['How do I log a workout?', 'How do I delete a workout?', 'Where can I see my workout history?'] },
      { label: 'Nutrition', prompts: ['Where do I add food?', 'What do macros mean?', 'How does Add Food search work?'] },
      { label: 'PRs', prompts: ['Where can I see my PRs?', 'How are PRs calculated?', 'Why did a PR disappear?'] },
      { label: 'Water', prompts: ['How do I track water?', 'Where is today\'s water log?', 'How do I remove water?'] },
      { label: 'Spotify', prompts: ['How do I connect Spotify?', 'How do I save a track?', 'Why does playback look paused here?'] },
    ];
  }

  get activeQuickPromptGroup(): QuickPromptGroup | null {
    const groups = this.quickPromptGroups;
    if (!groups.length) {
      return null;
    }

    return groups.find(group => group.label === this.selectedQuickCategory) ?? groups[0];
  }

  get activeQuickPrompts(): string[] {
    return this.activeQuickPromptGroup?.prompts ?? [];
  }
  openFilePicker(): void {
    this.fileInput?.nativeElement.click();
  }

  selectQuickCategory(label: string): void {
    this.selectedQuickCategory = label;
  }

  sendQuickSuggestion(suggestion: string): void {
    if (this.sending || this.quickPromptClosing) {
      return;
    }

    this.draft = suggestion;
    this.sendMessage();
  }

  formatMessageText(value: string): string {
    const escapedValue = this.escapeHtml(value || '');
    return escapedValue
      .replace(/\*\*(.+?)\*\*/gs, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
  }

  toggleVoiceInput(): void {
    if (this.listening) {
      this.stopVoiceInput();
      return;
    }

    this.startVoiceInput();
  }

  async onFilesSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement | null;
    const selectedFiles = Array.from(input?.files ?? []);
    if (!selectedFiles.length) {
      return;
    }

    this.composerError = '';

    if (this.pendingAttachments.length + selectedFiles.length > this.maxAttachmentCount) {
      this.composerError = 'You can attach up to 3 images at once.';
      if (input) {
        input.value = '';
      }
      return;
    }

    for (const file of selectedFiles) {
      if (!file.type.startsWith('image/')) {
        this.composerError = 'Only image files are supported.';
        continue;
      }

      if (file.size > this.maxAttachmentBytes) {
        this.composerError = 'Each image needs to be 5MB or smaller.';
        continue;
      }

      const attachment = await this.readFile(file);
      this.pendingAttachments = [...this.pendingAttachments, attachment];
    }

    if (input) {
      input.value = '';
    }
  }

  removePendingAttachment(id: string): void {
    this.pendingAttachments = this.pendingAttachments.filter(attachment => attachment.id !== id);
  }

  sendMessage(): void {
    const trimmedMessage = this.draft.trim();
    if (!trimmedMessage && !this.pendingAttachments.length) {
      this.composerError = 'Type a question or add an image first.';
      return;
    }

    if (this.quickPromptClosing) {
      return;
    }

    const outgoingAttachments = [...this.pendingAttachments];

    if (this.showQuickPromptPanel) {
      this.collapseQuickPrompts(() => this.performSendMessage(trimmedMessage, outgoingAttachments));
      return;
    }

    this.performSendMessage(trimmedMessage, outgoingAttachments);
  }

  private performSendMessage(trimmedMessage: string, outgoingAttachments: PendingImage[]): void {
    this.quickPromptClosing = false;
    this.clearQuickPromptCloseTimer();

    if (this.listening) {
      this.stopVoiceInput();
    }

    const history: AiChatHistoryMessage[] = this.messages
      .map(message => {
        const text = this.toHistoryText(message);
        return text ? { role: message.role, text } : null;
      })
      .filter((message): message is AiChatHistoryMessage => message !== null);

    const userMessage: ChatMessage = {
      id: this.nextMessageId(),
      role: 'user',
      text: trimmedMessage || 'Shared an image for feedback.',
      attachments: outgoingAttachments,
    };

    this.messages = [...this.messages, userMessage];
    this.draft = '';
    this.pendingAttachments = [];
    this.composerError = '';
    this.sending = true;
    this.scrollToBottom();

    const attachments: AiChatAttachmentPayload[] = outgoingAttachments.map(attachment => ({
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      base64Data: attachment.base64Data,
    }));

    this.aiChatService.sendMessage({
      message: trimmedMessage,
      history,
      attachments,
      context: {
        route: this.router.url,
        pageTitle: this.pageTitle,
        appSnapshot: this.appSnapshot,
      },
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          this.sending = false;
          this.messages = [
            ...this.messages,
            {
              id: this.nextMessageId(),
              role: 'assistant',
              text: response.message?.trim() || 'I did not get a response back. Try again.',
              attachments: [],
            },
          ];
          this.scrollToBottom();
        },
        error: error => {
          this.sending = false;
          this.messages = [
            ...this.messages,
            {
              id: this.nextMessageId(),
              role: 'assistant',
              text: this.resolveErrorMessage(error),
              attachments: [],
              error: true,
            },
          ];
          this.scrollToBottom();
        },
      });
  }

  private collapseQuickPrompts(onComplete: () => void): void {
    this.quickPromptClosing = true;
    this.clearQuickPromptCloseTimer();
    this.quickPromptCloseTimer = window.setTimeout(() => {
      this.quickPromptCloseTimer = null;
      onComplete();
    }, 180);
  }

  private clearQuickPromptCloseTimer(): void {
    if (this.quickPromptCloseTimer !== null) {
      window.clearTimeout(this.quickPromptCloseTimer);
      this.quickPromptCloseTimer = null;
    }
  }

  onComposerKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (this.canSend && !this.sending) {
        this.sendMessage();
      }
    }
  }

  private startVoiceInput(): void {
    if (this.sending || this.quickPromptClosing) {
      return;
    }

    const recognition = this.ensureSpeechRecognition();
    if (!recognition) {
      this.composerError = 'Voice input is not supported in this browser.';
      return;
    }

    this.composerError = '';
    this.speechBaseDraft = this.draft.trim();

    try {
      recognition.start();
    } catch {
      this.composerError = 'Voice input could not start right now. Try again.';
      this.listening = false;
    }
  }

  private stopVoiceInput(): void {
    this.speechRecognition?.stop();
    this.listening = false;
  }

  private ensureSpeechRecognition(): SpeechRecognitionLike | null {
    if (this.speechRecognition) {
      return this.speechRecognition;
    }

    const ctor = this.resolveSpeechRecognitionCtor();
    if (!ctor) {
      return null;
    }

    // Web Speech API is still vendor-prefixed in Chromium-based browsers.
    const recognition = new ctor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onstart = () => {
      this.listening = true;
      this.composerError = '';
    };
    recognition.onresult = event => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let index = 0; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = this.normalizeTranscript(result?.[0]?.transcript || '');
        if (!transcript) {
          continue;
        }

        if (result.isFinal) {
          finalTranscript += `${transcript} `;
        } else {
          interimTranscript += `${transcript} `;
        }
      }

      this.draft = this.mergeSpeechDraft(finalTranscript.trim(), interimTranscript.trim());
    };
    recognition.onerror = event => {
      this.listening = false;
      const errorCode = String(event?.error || '');
      if (errorCode === 'not-allowed' || errorCode === 'service-not-allowed') {
        this.composerError = 'Microphone access was blocked in this browser.';
        return;
      }
      if (errorCode === 'no-speech') {
        this.composerError = 'I did not hear anything. Try again.';
        return;
      }
      this.composerError = 'Voice input could not start right now. Try again.';
    };
    recognition.onend = () => {
      this.listening = false;
      this.speechBaseDraft = this.draft.trim();
    };

    this.speechRecognition = recognition;
    return recognition;
  }

  private resolveSpeechRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
    if (typeof window === 'undefined') {
      return null;
    }

    const speechWindow = window as SpeechRecognitionWindow;
    return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
  }

  private mergeSpeechDraft(finalTranscript: string, interimTranscript: string): string {
    const parts = [this.speechBaseDraft, finalTranscript, interimTranscript]
      .map(part => part.trim())
      .filter(Boolean);
    return parts.join(' ');
  }

  private normalizeTranscript(value: string): string {
    return value.replace(/\s+/g, ' ').trim();
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private buildSeedMessage(): ChatMessage {
    return {
      id: this.nextMessageId(),
      role: 'assistant',
      text: this.initialPrompt?.trim() || 'Ask me about workouts, PRs, nutrition, recovery, or where something lives in Maxro.',
      attachments: [],
      seed: true,
    };
  }

  private toHistoryText(message: ChatMessage): string | null {
    const text = message.text.trim();
    if (text) {
      return text;
    }

    if (message.attachments.length > 0) {
      return message.role === 'assistant' ? 'Assistant referenced an image.' : 'User shared an image.';
    }

    return null;
  }

  private async readFile(file: File): Promise<PendingImage> {
    const previewUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Could not read image.'));
      reader.readAsDataURL(file);
    });

    const parts = previewUrl.split(',', 2);
    return {
      id: this.nextMessageId(),
      fileName: file.name,
      mimeType: file.type,
      base64Data: parts[1] || '',
      previewUrl,
    };
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const backendMessage = typeof error.error === 'object'
        ? error.error?.message || error.error?.error
        : null;
      if (typeof backendMessage === 'string' && backendMessage.trim()) {
        return backendMessage.trim();
      }
    }

    if (error instanceof Error && error.message.trim()) {
      return error.message.trim();
    }

    return 'I could not answer that right now. Try again in a moment.';
  }

  private nextMessageId(): string {
    this.messageSequence += 1;
    return `chat-msg-${this.messageSequence}`;
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const viewport = this.scrollViewport?.nativeElement;
      if (!viewport) {
        return;
      }
      viewport.scrollTop = viewport.scrollHeight;
    });
  }
}