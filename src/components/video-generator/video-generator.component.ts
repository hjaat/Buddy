import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeminiService } from '../../services/gemini.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

interface GeneratedVideo {
  id: number;
  safeUrl: SafeResourceUrl;
  prompt: string;
}

@Component({
  selector: 'app-video-generator',
  imports: [CommonModule, FormsModule],
  templateUrl: './video-generator.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VideoGeneratorComponent {
  private geminiService = inject(GeminiService);
  private sanitizer = inject(DomSanitizer);

  prompt = signal('');
  aspectRatio = signal('16:9');
  numberOfVideos = signal(1);
  isLoading = signal(false);
  progressMessage = signal('');
  error = signal<string | null>(null);
  videos = signal<GeneratedVideo[]>([]);
  
  selectedImageFile = signal<File | null>(null);
  selectedImagePreviewUrl = signal<string | null>(null);

  examplePrompts = signal([
    'A time-lapse of a flower blooming, cinematic 4K',
    'A drone shot flying through a narrow canyon with a river below',
    'An animated character walking through a magical forest',
    'A high-speed train traveling through a futuristic city at night',
    'A cat chasing a laser pointer in slow motion'
  ]);

  aspectRatios = ['16:9', '9:16', '1:1'];
  numberOfVideosOptions = [1, 2];

  setAspectRatio(ratio: string): void {
    this.aspectRatio.set(ratio);
  }

  setNumberOfVideos(num: number): void {
    this.numberOfVideos.set(num);
  }

  useExample(prompt: string): void {
    this.prompt.set(prompt);
  }

  onFileSelected(event: Event): void {
    const element = event.target as HTMLInputElement;
    const file = element.files?.[0];

    if (file && file.type.startsWith('image/')) {
        this.selectedImageFile.set(file);
        const reader = new FileReader();
        reader.onload = (e) => this.selectedImagePreviewUrl.set(e.target?.result as string);
        reader.readAsDataURL(file);
    }
  }

  removeImage(): void {
    this.selectedImageFile.set(null);
    this.selectedImagePreviewUrl.set(null);
  }

  private toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
  });
  
  async generateVideos(): Promise<void> {
    const currentPrompt = this.prompt().trim();
    const imageFile = this.selectedImageFile();

    if ((!currentPrompt && !imageFile) || this.isLoading()) {
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);
    this.progressMessage.set('Initializing video generation...');

    const onProgress = (message: string) => {
      this.progressMessage.set(message);
    };

    try {
      let imagePayload: { imageBytes: string, mimeType: string } | undefined;
      if (imageFile) {
        const base64String = await this.toBase64(imageFile);
        imagePayload = {
            imageBytes: base64String,
            mimeType: imageFile.type
        };
      }

      const videoUrls = await this.geminiService.generateVideos(currentPrompt, this.aspectRatio(), this.numberOfVideos(), onProgress, imagePayload);
      
      const newVideos: GeneratedVideo[] = videoUrls.map((url, index) => ({
        id: Date.now() + index,
        safeUrl: this.sanitizer.bypassSecurityTrustResourceUrl(url),
        prompt: currentPrompt,
      }));

      this.videos.update(currentVideos => [...newVideos, ...currentVideos]);
      this.prompt.set('');
      this.removeImage();
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'An unknown error occurred.');
    } finally {
      this.isLoading.set(false);
      this.progressMessage.set('');
    }
  }
}