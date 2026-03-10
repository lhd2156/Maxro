import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ConfettiService {
  private readonly colors = ['#C8F135', '#A5CC00', '#8DB100', '#FFFFFF', '#4fc3f7', '#ff7043'];

  burst(): void {
    if (localStorage.getItem('pref_prCelebrations') === 'false') return;

    const container = document.createElement('div');
    container.className = 'confetti-container';
    document.body.appendChild(container);

    for (let i = 0; i < 60; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.left = Math.random() * 100 + '%';
      piece.style.backgroundColor = this.colors[Math.floor(Math.random() * this.colors.length)];
      piece.style.animationDelay = Math.random() * 0.8 + 's';
      piece.style.animationDuration = (2 + Math.random() * 1.5) + 's';
      piece.style.width = (6 + Math.random() * 8) + 'px';
      piece.style.height = (6 + Math.random() * 8) + 'px';
      container.appendChild(piece);
    }

    setTimeout(() => container.remove(), 4000);
  }
}
