export type Feature = 'chat' | 'code' | 'translate' | 'search' | 'image' | 'video';

export interface Message {
  id: number;
  role: 'user' | 'model';
  text: string;
  imageUrl?: string;
  videoUrl?: string;
  isLoading?: boolean;
  error?: string;
  sources?: { title: string; uri: string }[];
  feature: Feature;
}
