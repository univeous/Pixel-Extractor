// worker.js - v2 (analysis image data)
importScripts("https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js");

let pyodide = null;

// 进度回调函数，供 Python 调用
function pythonProgressCallback(step, message) {
    self.postMessage({ type: 'progress', step, message });
}

const PYTHON_CORE_CODE = `
# ------------------------------------------------------------------
# MOCK NUMBA (MUST BE EXECUTED FIRST)
# ------------------------------------------------------------------
import sys
from types import ModuleType
import warnings

# 忽略 sklearn 的 FutureWarning 和 threadpoolctl 的 RuntimeWarning
warnings.filterwarnings("ignore", category=FutureWarning, module="sklearn")
warnings.filterwarnings("ignore", category=RuntimeWarning, module="threadpoolctl")

# 如果 numba 还没被 mock，就 mock 它
if 'numba' not in sys.modules:
    numba_mod = ModuleType("numba")
    def jit(*args, **kwargs):
        def decorator(func):
            return func
        return decorator
    numba_mod.jit = jit
    sys.modules["numba"] = numba_mod

# ------------------------------------------------------------------
# PIXELART EXTRACTOR CODE
# ------------------------------------------------------------------
import numpy as np
import struct
import js # 引入 js 模块以调用 JS 函数

# 由于我们已经在上面 mock 了 numba，这里导入不会报错
from numba import jit 
from scipy.interpolate import RegularGridInterpolator
from scipy.optimize import minimize
from scipy.signal import find_peaks, peak_prominences
from skimage.color import deltaE_cie76, lab2rgb, rgb2gray, rgb2lab
from skimage.measure import label, regionprops
from skimage.morphology import binary_dilation, disk, remove_small_objects
from skimage.restoration import denoise_wavelet
from sklearn.cluster import KMeans
from sklearn.exceptions import ConvergenceWarning
from sklearn.neighbors import KDTree
from types import SimpleNamespace

# 辅助函数：向 JS 发送进度
def report_progress(step, msg):
    try:
        js.pythonProgressCallback(step, msg)
    except:
        pass

def create_color_quantizer_kmeans(image_lab:np.array, transparency_color_lab:np.array,
    same_color_cie76_threshold:float=10.0, max_colors:int=256):
    pixels_lab = np.unique(image_lab.reshape(-1, 3), axis=0)
    delta = deltaE_cie76(pixels_lab, transparency_color_lab)
    is_opaque = delta > same_color_cie76_threshold
    pixels_lab = pixels_lab[is_opaque]
    
    if pixels_lab.shape[0] < 3:
        palette_lab = pixels_lab
    else:
        n_clusters = min(max_colors - 1, pixels_lab.shape[0])
        kmeans_max = KMeans(n_clusters=n_clusters, random_state=42)
        with warnings.catch_warnings():
            warnings.filterwarnings(action='ignore', category=ConvergenceWarning)
            kmeans_max.fit(pixels_lab)
        palette_lab = kmeans_max.cluster_centers_

    # Merge similar colors using vectorized pairwise distance
    while palette_lab.shape[0] > 2:
        # Compute pairwise deltaE using broadcasting
        diff = palette_lab[:, np.newaxis, :] - palette_lab[np.newaxis, :, :]
        deltas = np.sqrt(np.sum(diff ** 2, axis=2))
        # Only exclude self-comparison (diagonal), not duplicate colors
        np.fill_diagonal(deltas, 1e6)
        
        if deltas.min() > same_color_cie76_threshold:
            break
        # Find the pair with minimum distance and merge
        min_idx = np.unravel_index(deltas.argmin(), deltas.shape)
        palette_lab = np.delete(palette_lab, max(min_idx), axis=0)

    palette_lab = np.vstack([palette_lab, [transparency_color_lab]])
    kdtree = KDTree(palette_lab, leaf_size=8)

    def apply_palette_lab(image_lab:np.array):
        pixels_lab = palette_lab[kdtree.query(image_lab.reshape(-1, 3))[1]]
        is_opaque = deltaE_cie76(pixels_lab, transparency_color_lab) > same_color_cie76_threshold
        pixels_lab[~is_opaque] = transparency_color_lab
        return pixels_lab.reshape(image_lab.shape)
    
    return palette_lab, apply_palette_lab

def create_color_quantizer_histogram(image_lab:np.array, transparency_color_lab:np.array,
    same_color_cie76_threshold:float=10.0, max_colors:int=256):
    image_rgb = lab2rgb(image_lab)
    rgb_flat = (np.clip(image_rgb, 0.0, 1.0) * 255.0).reshape(-1, 3).astype(np.float32)
    flat_lab = image_lab.reshape(-1, 3)
    delta_full = deltaE_cie76(flat_lab, transparency_color_lab)
    is_opaque = delta_full > same_color_cie76_threshold
    rgb_opaque = rgb_flat[is_opaque]

    if rgb_opaque.shape[0] == 0:
        palette_lab = np.empty((0, 3), dtype=np.float32)
    else:
        unique_rgb = np.unique(rgb_opaque, axis=0)
        target_colors = max(1, max_colors - 1)
        if unique_rgb.shape[0] <= target_colors:
            palette_rgb = unique_rgb / 255.0
        else:
            n_clusters = target_colors
            kmeans = KMeans(n_clusters=n_clusters, random_state=42)
            with warnings.catch_warnings():
                warnings.filterwarnings(action='ignore', category=ConvergenceWarning)
                kmeans.fit(rgb_opaque)
            palette_rgb = np.clip(kmeans.cluster_centers_ / 255.0, 0.0, 1.0)
        palette_lab = rgb2lab(palette_rgb.astype(np.float32))

    palette_lab = np.vstack([palette_lab, [transparency_color_lab]])
    kdtree = KDTree(palette_lab, leaf_size=8)

    def apply_palette_lab(image_lab:np.array):
        pixels_lab = palette_lab[kdtree.query(image_lab.reshape(-1, 3))[1]]
        local_opaque = deltaE_cie76(pixels_lab, transparency_color_lab) > same_color_cie76_threshold
        pixels_lab[~local_opaque] = transparency_color_lab
        return pixels_lab.reshape(image_lab.shape)
    
    return palette_lab, apply_palette_lab

def find_common_edge_color(image_lab:np.array, same_color_cie76_threshold:float=10, depth=None):
    if depth is None:
        depth = int(image_lab.shape[0] * 0.02) + 1
    edge_colors = np.vstack([
        image_lab[:depth, :, :].reshape(-1, 3),
        image_lab[-depth:, :, :].reshape(-1, 3),
        image_lab[:, :depth, :].reshape(-1, 3),
        image_lab[:, -depth:, :].reshape(-1, 3),
    ])
    edge_count = edge_colors.shape[0]
    mean_color = None
    largest_fraction = 0
    while edge_colors.shape[0] > 0:
        is_similar = deltaE_cie76(edge_colors[0], edge_colors) < same_color_cie76_threshold
        fraction = is_similar.sum() / float(edge_count)
        if fraction > largest_fraction:
            largest_fraction = fraction
            mean_color = edge_colors[is_similar].mean(axis=0)
        edge_colors = edge_colors[~is_similar]
    return mean_color, largest_fraction

def alpha_to_transparency_color(image_rgba:np.array, transparency_color_rgb:np.array, alpha_threshold:float=0.5):
    if image_rgba.shape[-1] == 4:
        is_transparent = image_rgba[:, :, 3] <= alpha_threshold
        image_rgba[is_transparent, :3] = transparency_color_rgb
    return image_rgba[:, :, :3]

def find_symmetrical_x_center(image_rgb:np.array):
    grayscale = rgb2gray(image_rgb)
    correlation = np.zeros(grayscale.shape[1], dtype=np.float32)
    for i in range(grayscale.shape[0]):
        x = grayscale[i, :]
        y = np.flip(x)
        x_d = np.std(x) * x.shape[0]
        y_d = np.std(y)
        x = np.divide(x - np.mean(x), x_d, np.zeros_like(x), where=x_d != 0)
        y = np.divide(y - np.mean(y), y_d, np.zeros_like(y), where=y_d != 0)
        correlation += np.correlate(x, y, mode='same')
    correlation /= grayscale.shape[0]
    i_max = correlation.argmax()
    r_max = correlation[i_max]
    return i_max, r_max

def pad_x_to_center(image:np.array, target_x:float):
    current_center = image.shape[1] / 2.0
    shift_needed = int(target_x - current_center)
    padding_left = max(0, shift_needed)
    padding_right = max(0, -shift_needed)
    if padding_left + padding_right == 0:
        return image
    else:
        return np.pad(image, ((0, 0), (padding_right, padding_left), (0, 0)), mode='constant', constant_values=0)

def crop_color(image_lab:np.array, color_lab:np.array, same_color_cie76_threshold:float=10, padding:int=5):
    delta = deltaE_cie76(image_lab, color_lab)
    keep = delta > same_color_cie76_threshold
    indices = np.argwhere(keep)
    if indices.shape[0] == 0:
        return image_lab, 0, 0
    top_left = indices.min(axis=0)
    bottom_right = indices.max(axis=0)
    top = max(top_left[0] - padding, 0)
    left = max(top_left[1] - padding, 0)
    bottom = min(bottom_right[0] + padding + 1, image_lab.shape[0])
    right = min(bottom_right[1] + padding + 1, image_lab.shape[1])
    return image_lab[top:bottom, left:right], left, top

def create_edge_profile(image_lab:np.array, horizontal:bool):
    if not horizontal:
        image_lab = np.swapaxes(image_lab, 0, 1)
    delta = np.abs(deltaE_cie76(image_lab[:, :-1], image_lab[:, 1:], channel_axis=2)) > 0
    delta = np.hstack([delta, np.zeros((delta.shape[0], 1))])
    edge_profile = delta.mean(0)
    if edge_profile.max() > 0:
        edge_profile /= edge_profile.max()
    return delta, edge_profile

# Vectorized version - much faster without numba JIT
def get_spacing_error(spacing:float, sorted_x:np.ndarray, min_x:float, max_x:float, gap_penalty_weight:float=1.0) -> float:
    if len(sorted_x) < 2:
        return float('inf')
    
    # Vectorized distance calculations
    actual_distances = np.diff(sorted_x)
    expected_points = np.maximum(1, np.round(actual_distances / spacing))
    expected_distances = expected_points * spacing
    squared_errors = (actual_distances - expected_distances) ** 2
    
    squared_error = np.sum(squared_errors)
    gaps = np.sum(np.maximum(0, expected_points - 1))
    total_expected_points = np.sum(expected_points)
    
    # Edge handling
    missing_points = round((max(0, sorted_x.min() - min_x) + max(0, max_x - sorted_x.max())) / spacing)
    gaps += missing_points
    total_expected_points += missing_points
    
    gap_penalty = 0 if total_expected_points == 0 else gaps / total_expected_points * gap_penalty_weight
    n = len(sorted_x) - 1
    rmse = np.sqrt(squared_error / n)
    normalized_error = rmse / spacing
    return normalized_error + gap_penalty

def find_optimal_spacing(peaks:np.ndarray, prominences:np.ndarray, min_peaks:int, min_x:float,
    max_x:float, smallest_spacing:float=1.0, largest_spacing:float=64.0, gap_penalty_weight:float=1.0):
    indices = np.argsort(-prominences)
    peaks = peaks[indices]
    prominences = prominences[indices]
    peak_counts = np.arange(min_peaks, peaks.shape[0])
    errors = np.zeros_like(peak_counts, dtype=np.float32)
    spacings = np.zeros_like(peak_counts, dtype=np.float32)

    for i, peak_count in enumerate(peak_counts):
        sorted_x = np.sort(peaks[:peak_count])
        initial_guess = np.median(np.diff(sorted_x))
        result = minimize(lambda spacing: get_spacing_error(spacing[0], sorted_x, min_x, max_x, gap_penalty_weight),
            [initial_guess], bounds=[(smallest_spacing, largest_spacing)], method='L-BFGS-B')
        spacings[i] = result.x[0]
        errors[i] = get_spacing_error(result.x[0], sorted_x, min_x, max_x, gap_penalty_weight)
    return spacings, errors, peak_counts

# Keep original logic - the nested loop is hard to vectorize correctly
# due to the sequential dependency and complex condition
@jit(nopython=True)
def find_edges(peaks:np.ndarray, prominences:np.ndarray,
    spacing:float, cell_trim_fraction:float=0.7, gap_fraction:float=1.5) -> np.ndarray:
    indices = np.argsort(-prominences)
    peaks = peaks[indices]
    prominences = prominences[indices]
    distance_threshold = spacing * cell_trim_fraction
    filtered_peaks = []
    filtered_prominences = []
    for i in range(len(peaks)):
        x = peaks[i]
        prominence = prominences[i]
        should_add = True
        for j in range(len(filtered_peaks)):
            f_x = filtered_peaks[j]
            f_prominence = filtered_prominences[j]
            if not (x == f_x or abs(x - f_x) > distance_threshold or prominence > f_prominence):
                should_add = False
                break
        if should_add:
            filtered_peaks.append(x)
            filtered_prominences.append(prominence)
    filtered_peaks = np.sort(np.array(filtered_peaks))
    gap_threshold = spacing * gap_fraction
    edges = [filtered_peaks[0] - spacing]
    for i in range(len(filtered_peaks)):
        edges.append(filtered_peaks[i])
        if i < len(filtered_peaks) - 1:
            gap = filtered_peaks[i + 1] - filtered_peaks[i]
            if gap > gap_threshold:
                divisions = int(round(gap / spacing) - 1)
                for n in range(divisions):
                    edges.append(edges[-1] + gap / (divisions + 1))
    edges.append(filtered_peaks[-1] + spacing)
    return np.array(edges, dtype=np.float32) + 0.5

def sample_pixels(image_lab:np.array, transparency_color_lab:np.array,
    pixel_edges_x:np.array, pixel_edges_y:np.array, pixel_padding_fraction:float=0.25, sampling_grid_size:int=8):
    x = np.arange(image_lab.shape[1])
    y = np.arange(image_lab.shape[0])
    interpolator = RegularGridInterpolator((y, x), image_lab,
        method='nearest', bounds_error=False, fill_value=transparency_color_lab)
    sample_x = pixel_edges_x[:-1] + np.diff(pixel_edges_x) * 0.5
    sample_y = pixel_edges_y[:-1] + np.diff(pixel_edges_y) * 0.5
    sample_points = np.array(np.meshgrid(sample_y, sample_x)).T.reshape(-1, 2)
    return interpolator(sample_points).reshape(pixel_edges_y.shape[0] - 1, pixel_edges_x.shape[0] - 1, 3)

def remove_isolated_small_objects(image_rgba:np.array, land_dilution:int=2, island_size:int=3):
    opaque = image_rgba[:, :, 3] > 0.5
    cleaned = remove_small_objects(opaque, min_size=island_size)
    dilated = binary_dilation(cleaned, disk(land_dilution))
    diluted_with_islands = dilated | opaque
    final_cleaned = remove_small_objects(diluted_with_islands, min_size=island_size)
    remove_mask = opaque & ~final_cleaned
    for i in range(4):
        image_rgba[remove_mask, i] = 0
    return image_rgba

def split_image(image_lab:np.array, transparency_color_lab:np.array, same_color_cie76_threshold:float=10, min_distance:int=10):
    delta = deltaE_cie76(image_lab, transparency_color_lab)
    is_opaque = delta > same_color_cie76_threshold
    dilated = binary_dilation(is_opaque, disk(min_distance))
    labeled_image = label(dilated)
    regions = regionprops(labeled_image)
    images_data = []
    for region in regions:
        min_y, min_x, max_y, max_x = region.bbox
        images_data.append((image_lab[min_y:max_y, min_x:max_x, :], min_x, min_y))
    return images_data

def extract_sprites(image_rgba:np.array, detect_transparency_color:bool=True, remove_background_color:bool=True, default_transparency_color_hex:str='ff00ff',
    split_distance:int=None, min_sprite_size:int=8, same_color_cie76_threshold:float=10.0, border_transparency_cie76_threshold:float=20,
    max_colors:int=256, largest_pixel_size:int=64, minimum_peak_fraction:float=0.2, land_dilution_during_cleanup:int=1,
    island_size_to_remove:int=5, symmetry_coefficient_threshold:float=0.5, create_summary:bool=False,
    color_quantization_method:str='histogram', edge_detection_quantization_method:str='kmeans'):

    report_progress(10, 'processingInit')
    
    print(f'Extracting sprite from image of size {image_rgba.shape[1]}x{image_rgba.shape[0]}')
    image_rgba = image_rgba / 255.0
    
    # 解析默认透明色
    color_bytes = struct.unpack('BBB', bytes.fromhex(default_transparency_color_hex))
    default_transparency_color_rgb = np.array(list(map(lambda x: x / 255.0, color_bytes)), dtype=np.float32)
    default_transparency_color_lab = rgb2lab(default_transparency_color_rgb)

    # 如果启用了移除背景色，我们使用默认透明色（或自动检测的颜色）作为“透明色”
    # 如果禁用了移除背景色，我们需要找一个图像中不存在的颜色作为“透明色”，以确保只有Alpha通道透明的区域被视为透明
    
    if remove_background_color:
        transparency_color_rgb = default_transparency_color_rgb
        transparency_color_lab = default_transparency_color_lab
    else:
        # 寻找安全颜色：简单起见，我们使用一个极不可能出现的颜色，或者直接使用默认颜色但后续不进行颜色距离判断
        # 由于后续逻辑强依赖于 transparency_color_lab，我们这里采用一种策略：
        # 将 Alpha 透明区域替换为 default_transparency_color_rgb
        # 但在后续判断 is_opaque 时，只依赖 Alpha（这需要修改后续逻辑，比较复杂）
        # 替代方案：找一个图像中不存在的颜色。
        
        # 简单策略：尝试几个极端颜色，找到一个与图像中所有像素距离都足够远的颜色
        # 这里为了性能，我们简化处理：假设 (0, 0, 0) 或 (1, 1, 1) 或 (1, 0, 1) 中总有一个是安全的
        # 或者更简单：我们仍然使用 default_transparency_color_rgb，但在 alpha_to_transparency_color 之后
        # 我们不再进行 detect_transparency_color，并且希望图像中没有这个颜色。
        # 为了稳健，我们这里暂时使用 default_transparency_color_rgb，但用户如果选了 Disable，
        # 他应该确保 default_transparency_color_hex 不在图像前景中（或者我们应该自动找一个）。
        
        # 让我们尝试找一个安全颜色
        # 采样图像像素（为了速度，只采样一部分）
        pixels = image_rgba[::10, ::10, :3].reshape(-1, 3)
        candidates = [
            np.array([1.0, 0.0, 1.0], dtype=np.float32), # Magenta
            np.array([0.0, 1.0, 0.0], dtype=np.float32), # Green
            np.array([0.0, 0.0, 0.0], dtype=np.float32), # Black
            np.array([1.0, 1.0, 1.0], dtype=np.float32), # White
        ]
        
        safe_color = candidates[0]
        max_min_dist = -1
        
        for cand in candidates:
            # 计算候选颜色与图像像素的最小距离
            dists = np.sqrt(np.sum((pixels - cand) ** 2, axis=1))
            min_dist = dists.min() if dists.shape[0] > 0 else 1.0
            if min_dist > max_min_dist:
                max_min_dist = min_dist
                safe_color = cand
        
        transparency_color_rgb = safe_color
        transparency_color_lab = rgb2lab(transparency_color_rgb)

    # Replace alpha-transparent pixels with transparency color
    image_rgb = alpha_to_transparency_color(image_rgba, transparency_color_rgb)
    image_lab = rgb2lab(image_rgb)

    # Denoise
    report_progress(20, 'processingDenoise')
    with warnings.catch_warnings():
        warnings.filterwarnings('error', r'(Mean of empty slice.)|(Level value of 1 is too high: all coefficients will experience boundary effects.)')
        try:
            image_rgb = denoise_wavelet(image_rgb, convert2ycbcr=True, rescale_sigma=True, channel_axis=2)
        except Warning:
            print('Problem running wavelet denoising. Skipping...')

    REQUIRED_EDGE_FRACTION = 0.75
    
    # 只有在启用移除背景色时，才进行自动检测
    if remove_background_color and detect_transparency_color:
        report_progress(30, 'processingAnalyzeColor')
        color, fraction = find_common_edge_color(image_lab, same_color_cie76_threshold)
        if fraction > REQUIRED_EDGE_FRACTION:
            transparency_color_lab = color
            transparency_color_rgb = lab2rgb(color)
            print(f'Transparency color {transparency_color_rgb} found ({fraction * 100:.1f} % of image edges)')

    if color_quantization_method == 'kmeans':
        quantizer_factory = create_color_quantizer_kmeans
    else:
        quantizer_factory = create_color_quantizer_histogram

    if edge_detection_quantization_method == 'histogram':
        edge_detection_quantizer = create_color_quantizer_histogram
    else:
        edge_detection_quantizer = create_color_quantizer_kmeans

    if split_distance is None:
        images_data = [(image_lab, 0, 0)]
    else:
        report_progress(40, 'processingSplit')
        images_data = split_image(image_lab, transparency_color_lab, min_distance=split_distance)

    print(f'Split image into {len(images_data)} subregions')
    results = []
    
    total_regions = len(images_data)
    step_size = 40.0 / total_regions if total_regions > 0 else 0

    for image_index, (sub_image_lab, offset_x, offset_y) in enumerate(images_data):
        progress_base = 50 + image_index * step_size
        
        report_progress(progress_base, f'processingSubregion:{image_index + 1}/{total_regions}:processingPrepare')
        
        print(f'Processing subregion {image_index + 1} of {len(images_data)}')
        
        cropped_image_lab, crop_dx, crop_dy = crop_color(sub_image_lab, transparency_color_lab)
        
        # Calculate final coordinates relative to original image
        final_x = offset_x + crop_dx
        final_y = offset_y + crop_dy
        final_w = cropped_image_lab.shape[1]
        final_h = cropped_image_lab.shape[0]
        
        print(f'Cropped image to size {final_w}x{final_h} at offset {final_x},{final_y}')
        
        report_progress(progress_base + step_size * 0.2, f'processingSubregion:{image_index + 1}/{total_regions}:processingColorAnalysis')

        _, quantizer_lab_full = edge_detection_quantizer(
            image_lab=cropped_image_lab,
            transparency_color_lab=transparency_color_lab,
            same_color_cie76_threshold=same_color_cie76_threshold,
            max_colors=max_colors
        )
        indexed_image_lab = quantizer_lab_full(cropped_image_lab)
        
        report_progress(progress_base + step_size * 0.4, f'processingSubregion:{image_index + 1}/{total_regions}:processingEdgeDetection')

        image_edges_x, profile_x = create_edge_profile(indexed_image_lab, True)
        image_edges_y, profile_y = create_edge_profile(indexed_image_lab, False)
        peaks_x = find_peaks(profile_x)[0]
        peaks_y = find_peaks(profile_y)[0]
        prominences_x = peak_prominences(profile_x, peaks_x)[0]
        prominences_y = peak_prominences(profile_y, peaks_y)[0]

        if prominences_x.shape[0] < 5 or prominences_y.shape[0] < 5:
            print('Sprite is too small or uniform')
            results.append(None)
            continue

        min_peaks_x = max(3, int(peaks_x.shape[0] * minimum_peak_fraction))
        min_peaks_y = max(3, int(peaks_y.shape[0] * minimum_peak_fraction))
        
        report_progress(progress_base + step_size * 0.6, f'processingSubregion:{image_index + 1}/{total_regions}:processingGridFit')

        spacings_x, errors_x, peak_counts_x = find_optimal_spacing(peaks_x, prominences_x, min_peaks_x,
            0, image_edges_x.shape[0], largest_spacing=largest_pixel_size)
        spacings_y, errors_y, peak_counts_y = find_optimal_spacing(peaks_y, prominences_y, min_peaks_y,
            0, image_edges_y.shape[0], largest_spacing=largest_pixel_size)

        best_index_x = errors_x.argmin()
        best_index_y = errors_y.argmin()
        spacing_x = spacings_x[best_index_x]
        spacing_y = spacings_y[best_index_y]
        error_x = errors_x[best_index_x]
        error_y = errors_y[best_index_y]

        edges_x = find_edges(peaks_x, prominences_x, spacing_x)
        edges_y = find_edges(peaks_y, prominences_y, spacing_y)
        
        # Record the sprite grid bounds in cropped_image coordinates
        # This is the area that the sprite pixels cover (before any symmetry padding)
        sprite_grid_x0 = float(edges_x[0])
        sprite_grid_y0 = float(edges_y[0])
        sprite_grid_x1 = float(edges_x[-1])
        sprite_grid_y1 = float(edges_y[-1])

        if edges_x.shape[0] < min_sprite_size and edges_y.shape[0] < min_sprite_size:
            print('The resulting sprite is too small')
            results.append(None)
            continue

        report_progress(progress_base + step_size * 0.8, f'processingSubregion:{image_index + 1}/{total_regions}:processingGenerateSprite')

        sprite_lab = sample_pixels(cropped_image_lab, transparency_color_lab, edges_x, edges_y)
        palette_lab, quantizer_lab = quantizer_factory(
            image_lab=sprite_lab,
            transparency_color_lab=transparency_color_lab,
            same_color_cie76_threshold=same_color_cie76_threshold,
            max_colors=max_colors
        )
        indexed_sprite_lab = quantizer_lab(sprite_lab)
        print(f'Sprite extracted of size {indexed_sprite_lab.shape[1]}x{indexed_sprite_lab.shape[0]} with {palette_lab.shape[0]} colors')

        center_x, x_r = find_symmetrical_x_center(lab2rgb(indexed_sprite_lab))
        center_y, y_r = find_symmetrical_x_center(lab2rgb(indexed_sprite_lab).swapaxes(0, 1))

        delta = deltaE_cie76(sprite_lab, transparency_color_lab)
        is_transparent = delta < same_color_cie76_threshold
        diluted_transparency = binary_dilation(is_transparent, disk(1))
        diluted_transparency = is_transparent | (diluted_transparency & (delta < border_transparency_cie76_threshold))
        alpha = np.where(diluted_transparency, 0, 1)

        indexed_sprite_rgba = np.dstack((lab2rgb(indexed_sprite_lab), alpha))
        indexed_sprite_rgba[alpha == 0] = 0

        if island_size_to_remove > 0:
            indexed_sprite_rgba = remove_isolated_small_objects(indexed_sprite_rgba, land_dilution=land_dilution_during_cleanup, island_size=island_size_to_remove)

        centered_x = x_r > symmetry_coefficient_threshold
        centered_y = y_r > symmetry_coefficient_threshold
        if centered_x:
            indexed_sprite_rgba = pad_x_to_center(indexed_sprite_rgba, center_x)
            print(f'X symmetry found. Centered sprite horizontally.')
        if centered_y:
            indexed_sprite_rgba = pad_x_to_center(indexed_sprite_rgba.swapaxes(0, 1), center_y).swapaxes(0, 1)
            print(f'Y symmetry found. Centered sprite vertically.')

        indexed_sprite_rgba = np.rint(indexed_sprite_rgba * 255).astype(np.uint8)
        
        # Calculate content bounding box within the sprite (for alignment)
        final_alpha = indexed_sprite_rgba[:, :, 3]
        rows = np.any(final_alpha > 0, axis=1)
        cols = np.any(final_alpha > 0, axis=0)
        
        content_x, content_y = 0, 0
        
        if rows.any() and cols.any():
            rmin, rmax = np.where(rows)[0][[0, -1]]
            cmin, cmax = np.where(cols)[0][[0, -1]]
            content_x = int(cmin)
            content_y = int(rmin)
        
        # Calculate the sprite grid origin in original image coordinates
        grid_origin_x = final_x + sprite_grid_x0
        grid_origin_y = final_y + sprite_grid_y0
        grid_span_w = sprite_grid_x1 - sprite_grid_x0
        grid_span_h = sprite_grid_y1 - sprite_grid_y0
        
        # Use tobytes() instead of tolist() for much faster serialization
        # The JS side will reconstruct the array
        results.append({
            "sprite_data_bytes": indexed_sprite_rgba.tobytes(),
            "width": indexed_sprite_rgba.shape[1],
            "height": indexed_sprite_rgba.shape[0],
            "centered_x": centered_x,
            "centered_y": centered_y,
            "content_x": content_x,
            "content_y": content_y,
            "grid_size_x": float(spacing_x),
            "grid_size_y": float(spacing_y),
            "grid_origin_x": float(grid_origin_x),
            "grid_origin_y": float(grid_origin_y),
            "grid_span_w": float(grid_span_w),
            "grid_span_h": float(grid_span_h),
            # Analysis data for debug report
            "analysis": {
                "profile_x": profile_x.tolist(),
                "profile_y": profile_y.tolist(),
                "edges_x": edges_x.tolist(),
                "edges_y": edges_y.tolist(),
                "peaks_x": peaks_x.tolist(),
                "peaks_y": peaks_y.tolist(),
                "prominences_x": prominences_x.tolist(),
                "prominences_y": prominences_y.tolist(),
                "spacings_x": spacings_x.tolist(),
                "spacings_y": spacings_y.tolist(),
                "errors_x": errors_x.tolist(),
                "errors_y": errors_y.tolist(),
                "peak_counts_x": peak_counts_x.tolist(),
                "peak_counts_y": peak_counts_y.tolist(),
                "best_index_x": int(best_index_x),
                "best_index_y": int(best_index_y),
                "error_x": float(error_x),
                "error_y": float(error_y),
                # Quantized image for grid visualization
                "indexed_image_w": int(indexed_image_lab.shape[1]),
                "indexed_image_h": int(indexed_image_lab.shape[0]),
                "indexed_image_data": (np.clip(lab2rgb(indexed_image_lab), 0, 1) * 255).astype(np.uint8).flatten().tolist(),
                # Edge detection images (bool -> 0/255)
                # image_edges_x shape is (h, w), image_edges_y was swapped so it's (w, h) - need to transpose back
                "edges_image_x": (image_edges_x.astype(np.uint8) * 255).flatten().tolist(),
                "edges_image_y": (image_edges_y.T.astype(np.uint8) * 255).flatten().tolist(),
                # Symmetry info
                "symmetry_x_r": float(x_r),
                "symmetry_y_r": float(y_r),
                "center_x": int(center_x),
                "center_y": int(center_y),
            }
        })
        
    report_progress(100, 'processingComplete')
    return results

def process_image_from_js(image_data, width, height, options=None):
    import numpy as np
    
    # 默认参数处理
    if options is None:
        options = {}
    
    # 解析 options (JsProxy -> dict)
    try:
        if hasattr(options, 'to_py'):
            options = options.to_py()
    except:
        pass
    
    # 解析图像数据 (Uint8Array/JsProxy -> numpy array)
    # 使用 np.asarray 可以直接从 TypedArray 创建视图，比 np.array 更快
    try:
        if hasattr(image_data, 'to_py'):
            # Pyodide JsProxy - convert to bytes then to numpy
            img_bytes = image_data.to_py()
            img = np.frombuffer(img_bytes, dtype=np.uint8).reshape(height, width, 4)
        else:
            img = np.asarray(image_data, dtype=np.uint8).reshape(height, width, 4)
    except:
        # Fallback
        img = np.array(image_data, dtype=np.uint8).reshape(height, width, 4)
    
    print(f"Image loaded in Python ({width}x{height}), processing with options: {options}")
    
    try:
        # 构造参数字典
        kwargs = {}
        if 'max_colors' in options: kwargs['max_colors'] = int(options['max_colors'])
        if 'min_sprite_size' in options: kwargs['min_sprite_size'] = int(options['min_sprite_size'])
        if 'island_size_to_remove' in options: kwargs['island_size_to_remove'] = int(options['island_size_to_remove'])
        if 'detect_transparency_color' in options: kwargs['detect_transparency_color'] = bool(options['detect_transparency_color'])
        if 'remove_background_color' in options: kwargs['remove_background_color'] = bool(options['remove_background_color'])
        if 'default_transparency_color_hex' in options: kwargs['default_transparency_color_hex'] = str(options['default_transparency_color_hex']).replace('#', '')
        if 'symmetry_coefficient_threshold' in options: kwargs['symmetry_coefficient_threshold'] = float(options['symmetry_coefficient_threshold'])
        if 'color_quantization_method' in options: kwargs['color_quantization_method'] = str(options['color_quantization_method'])
        if 'edge_detection_quantization_method' in options: kwargs['edge_detection_quantization_method'] = str(options['edge_detection_quantization_method'])
        
        results = extract_sprites(img, **kwargs)
        final_results = [r for r in results if r is not None]
        return final_results
    except Exception as e:
        print(f"Error in Python: {str(e)}")
        import traceback
        traceback.print_exc()
        return []
`;

// 初始化逻辑
async function main() {
  try {
    const startTime = Date.now();
    self.postMessage({ type: 'log', message: 'Loading Pyodide + packages (parallel)...' });
    
    // Load Pyodide with packages in parallel for fastest startup
    pyodide = await loadPyodide({
        stdout: (msg) => self.postMessage({ type: 'log', message: msg }),
        stderr: (msg) => self.postMessage({ type: 'log', message: "STDERR: " + msg }),
        // packages option enables parallel download during WASM init
        packages: ["numpy", "scipy", "scikit-image", "scikit-learn"]
    });
    
    self.postMessage({ type: 'log', message: `Pyodide + packages loaded in ${((Date.now() - startTime) / 1000).toFixed(1)}s. Initializing Python...` });
    
    const initStart = Date.now();
    pyodide.runPython(PYTHON_CORE_CODE);
    
    self.postMessage({ type: 'log', message: `Python init: ${((Date.now() - initStart) / 1000).toFixed(1)}s. Total: ${((Date.now() - startTime) / 1000).toFixed(1)}s` });
    self.postMessage({ type: 'status', message: 'ready' });
  } catch (e) {
    self.postMessage({ type: 'status', message: 'error', error: e.toString() });
    console.error(e);
  }
}

self.onmessage = async (event) => {
  const { type, pixelBuffer, width, height, options } = event.data;
  
  if (type === 'init') {
     if (!pyodide) await main();
  } else if (type === 'process') {
     if (!pyodide) {
         self.postMessage({ type: 'status', message: 'error', error: 'Worker not ready' });
         return;
     }
     try {
         const process_image_from_js = pyodide.globals.get('process_image_from_js');
         
         // Convert ArrayBuffer to Uint8Array for Pyodide
         const pixelArray = new Uint8Array(pixelBuffer);
         const pyResults = process_image_from_js(pixelArray, width, height, options);
         
         // Convert PyProxy to JS object
         const rawResults = pyResults.toJs({ dict_converter: Object.fromEntries });
         pyResults.destroy();
         
        // Helper to convert various byte formats to Uint8Array
        const toUint8Array = (data) => {
            if (!data) return null;
            if (data instanceof Uint8Array) return data;
            // Handle Map (Pyodide may return Map for bytes)
            if (data instanceof Map) {
                const arr = new Uint8Array(data.size);
                data.forEach((v, k) => arr[k] = v);
                return arr;
            }
            // Handle array-like or iterable
            if (Array.isArray(data) || data.length !== undefined) {
                return new Uint8Array(data);
            }
            // Try to iterate
            try {
                return new Uint8Array([...data]);
            } catch {
                console.warn('Could not convert to Uint8Array:', typeof data, data);
                return null;
            }
        };
        
        // Convert bytes to Uint8Array
        const results = rawResults.map(r => {
            if (!r || !r.sprite_data_bytes) return r;
            
            const sprite_data = toUint8Array(r.sprite_data_bytes);
            
            const { sprite_data_bytes, analysis, ...rest } = r;
            
            // Convert analysis bytes if present
            let convertedAnalysis = analysis;
            if (analysis) {
                convertedAnalysis = {
                    ...analysis,
                    indexed_image_bytes: toUint8Array(analysis.indexed_image_bytes),
                    image_edges_x: toUint8Array(analysis.image_edges_x),
                    image_edges_y: toUint8Array(analysis.image_edges_y),
                };
            }
            
            return { ...rest, sprite_data, analysis: convertedAnalysis };
        });
         
         self.postMessage({ type: 'result', results });
     } catch(e) {
         self.postMessage({ type: 'status', message: 'error', error: e.toString() });
         console.error(e);
     }
  }
};
