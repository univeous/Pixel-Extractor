export interface ProcessOptions {
  max_colors: number;
  min_sprite_size: number;
  island_size_to_remove: number;
  detect_transparency_color: boolean;
  remove_background_color: boolean;
  default_transparency_color_hex: string;
  color_quantization_method: 'histogram' | 'kmeans';
  edge_detection_quantization_method: 'histogram' | 'kmeans';
}

export interface SpriteResult {
  sprite_data: Uint8Array; // Flat RGBA data (width * height * 4 bytes)
  width: number;
  height: number;
  centered_x: boolean;
  centered_y: boolean;
  // Bounding box of content within the sprite (for alignment)
  content_x: number;
  content_y: number;
  // Grid size (original pixels per sprite pixel)
  grid_size_x: number;
  grid_size_y: number;
  // The sprite grid's position in original image coordinates
  grid_origin_x: number;
  grid_origin_y: number;
  grid_span_w: number;
  grid_span_h: number;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  originalImage: string; // Data URL
  originalWidth: number;
  originalHeight: number;
  results: SpriteResult[];
  options: ProcessOptions;
  processingTime: number; // in milliseconds
}

export type WorkerStatus = 'init' | 'ready' | 'processing' | 'error';
export type ViewMode = 'split' | 'original' | 'result';