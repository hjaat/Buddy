import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ChatComponent } from './components/chat/chat.component';
import { ImageGeneratorComponent } from './components/image-generator/image-generator.component';
import { VideoGeneratorComponent } from './components/video-generator/video-generator.component';

export type MainFeature = 'chat' | 'image' | 'video';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ChatComponent, ImageGeneratorComponent, VideoGeneratorComponent],
})
export class AppComponent {
  private sanitizer = inject(DomSanitizer);

  features: { id: MainFeature; name: string; icon: SafeHtml }[] = [
    {
      id: 'chat',
      name: 'AI Chat',
      icon: this.sanitizer.bypassSecurityTrustHtml(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M10 2a.75.75 0 0 1 .75.75v.518a9 9 0 0 1 6.368 6.368h.518A.75.75 0 0 1 18 10a.75.75 0 0 1-.75.75h-.518a9 9 0 0 1-6.368 6.368v.518A.75.75 0 0 1 10 18a.75.75 0 0 1-.75-.75v-.518a9 9 0 0 1-6.368-6.368H2.382a.75.75 0 0 1 0-1.5h.518A9 9 0 0 1 9.25 3.268V2.75A.75.75 0 0 1 10 2ZM10 4.5a7.5 7.5 0 0 0-7.445 6.91L2.5 11.5v-3l.055.09A7.5 7.5 0 0 0 10 4.5Zm0 11a7.5 7.5 0 0 0 7.445-6.91L17.5 8.5v3l-.055-.09A7.5 7.5 0 0 0 10 15.5Z" clip-rule="evenodd" /></svg>`),
    },
    {
      id: 'image',
      name: 'Image Generation',
      icon: this.sanitizer.bypassSecurityTrustHtml(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M1 5.25A2.25 2.25 0 0 1 3.25 3h13.5A2.25 2.25 0 0 1 19 5.25v9.5A2.25 2.25 0 0 1 16.75 17H3.25A2.25 2.25 0 0 1 1 14.75v-9.5Zm1.5 5.81v3.69c0 .414.336.75.75.75h13.5a.75.75 0 0 0 .75-.75v-2.69l-2.22-2.219a.75.75 0 0 0-1.06 0l-1.91 1.909-.48-.48a.75.75 0 0 0-1.06 0l-3.53 3.531-1.59-1.591a.75.75 0 0 0-1.06 0L2.5 11.06ZM15 6.25a1.75 1.75 0 1 0 0 3.5 1.75 1.75 0 0 0 0-3.5Z" clip-rule="evenodd" /></svg>`),
    },
    {
      id: 'video',
      name: 'Video Generation',
      icon: this.sanitizer.bypassSecurityTrustHtml(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path d="M3.5 2.75a.75.75 0 0 0-1.5 0v14.5a.75.75 0 0 0 1.5 0V2.75Zm13 0a.75.75 0 0 0-1.5 0v14.5a.75.75 0 0 0 1.5 0V2.75Zm-4.75 2a.75.75 0 0 0-1.5 0v10.5a.75.75 0 0 0 1.5 0V4.75Zm-4.5 0a.75.75 0 0 0-1.5 0v10.5a.75.75 0 0 0 1.5 0V4.75Z" /></svg>`),
    },
  ];

  selectedFeature = signal<MainFeature>('chat');

  selectFeature(featureId: MainFeature) {
    this.selectedFeature.set(featureId);
  }
}