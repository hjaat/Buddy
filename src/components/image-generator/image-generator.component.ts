import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeminiService } from '../../services/gemini.service';

interface GeneratedImage {
  id: number;
  url: string;
  prompt: string;
}

@Component({
  selector: 'app-image-generator',
  imports: [CommonModule, FormsModule],
  templateUrl: './image-generator.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageGeneratorComponent {
  private geminiService = inject(GeminiService);

  prompt = signal('');
  aspectRatio = signal('1:1');
  numberOfImages = signal(1);
  isLoading = signal(false);
  error = signal<string | null>(null);
  images = signal<GeneratedImage[]>([]);
  loadingPlaceholders = signal<undefined[]>([]);

  examplePrompts = signal([
    'A majestic lion wearing a crown, cinematic lighting, fantasy',
    'A vibrant coral reef teeming with bioluminescent fish, digital art',
    'A futuristic cityscape with flying cars and neon signs, cyberpunk style',
    'A cozy cabin in a snowy forest under the northern lights, oil painting',
    'A surreal portrait of a woman made of flowers and butterflies, high detail'
  ]);

  aspectRatios = ['1:1', '16:9', '9:16', '4:3', '3:4'];
  numberOfImagesOptions = [1, 2, 3];

  setAspectRatio(ratio: string): void {
    this.aspectRatio.set(ratio);
  }

  setNumberOfImages(num: number): void {
    this.numberOfImages.set(num);
  }

  useExample(prompt: string): void {
    this.prompt.set(prompt);
  }

  async generateImages(): Promise<void> {
    const currentPrompt = this.prompt().trim();
    if (!currentPrompt || this.isLoading()) {
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);
    this.loadingPlaceholders.set(Array(this.numberOfImages()));

    try {
      const imageUrls = await this.geminiService.generateImages(currentPrompt, this.aspectRatio(), this.numberOfImages());
      const newImages: GeneratedImage[] = imageUrls.map((url, index) => ({
        id: Date.now() + index,
        url: url,
        prompt: currentPrompt,
      }));
      this.images.update(currentImages => [...newImages, ...currentImages]);
      this.prompt.set('');
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'An unknown error occurred.');
    } finally {
      this.isLoading.set(false);
      this.loadingPlaceholders.set([]);
    }
  }

  private slugify(text: string): string {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-') // Replace spaces with -
      .replace(/[^\w-]+/g, '') // Remove all non-word chars
      .replace(/--+/g, '-') // Replace multiple - with single -
      .substring(0, 50); // Truncate to 50 chars
  }

  downloadImage(image: GeneratedImage): void {
    const link = document.createElement('a');
    link.href = image.url;
    const filename = `${this.slugify(image.prompt)}.jpeg`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
