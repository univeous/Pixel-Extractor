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

export interface SpriteAnalysis {
  profile_x: number[];
  profile_y: number[];
  edges_x: number[];
  edges_y: number[];
  peaks_x: number[];
  peaks_y: number[];
  prominences_x: number[];
  prominences_y: number[];
  spacings_x: number[];
  spacings_y: number[];
  errors_x: number[];
  errors_y: number[];
  peak_counts_x: number[];
  peak_counts_y: number[];
  best_index_x: number;
  best_index_y: number;
  error_x: number;
  error_y: number;
  // Quantized image for grid visualization
  indexed_image_data?: number[];
  indexed_image_w?: number;
  indexed_image_h?: number;
  // Edge detection images (as number arrays from Python)
  edges_image_x?: number[];
  edges_image_y?: number[];
  // Symmetry info
  symmetry_x_r: number;
  symmetry_y_r: number;
  center_x: number;
  center_y: number;
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
  // Analysis data for debug report
  analysis?: SpriteAnalysis;
}

// Version of analysis data structure - increment when Python output format changes
export const ANALYSIS_DATA_VERSION = 2;

export interface HistoryItem {
  id: string;
  timestamp: number;
  originalImage: string; // Data URL
  originalWidth: number;
  originalHeight: number;
  results: SpriteResult[];
  options: ProcessOptions;
  processingTime: number; // in milliseconds
  imageHash?: string; // Hash of image data for deduplication
  dataVersion?: number; // Version of analysis data structure
}

export type WorkerStatus = 'init' | 'ready' | 'processing' | 'error';
export type ViewMode = 'split' | 'original' | 'result';