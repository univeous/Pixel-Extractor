

export interface ProcessOptions {
  max_colors: number;
  min_sprite_size: number;
  island_size_to_remove: number;
  detect_transparency_color: boolean;
  default_transparency_color_hex: string;
  color_quantization_method: 'histogram' | 'kmeans';
  edge_detection_quantization_method: 'histogram' | 'kmeans';
}

export interface SpriteResult {
  sprite_data: number[][][]; // Height x Width x 4 (RGBA)
  width: number;
  height: number;
  centered_x: boolean;
  centered_y: boolean;
  // Bounding box in original image
  crop_x: number;
  crop_y: number;
  crop_w: number;
  crop_h: number;
  // Bounding box of content within the sprite
  content_x?: number;
  content_y?: number;
  content_w?: number;
  content_h?: number;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  originalImage: string; // Data URL
  originalWidth: number;
  originalHeight: number;
  results: SpriteResult[];
  options: ProcessOptions;
}

export type WorkerStatus = 'init' | 'ready' | 'processing' | 'error';
export type ViewMode = 'split' | 'original' | 'result';