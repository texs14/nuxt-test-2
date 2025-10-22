// Base constant: 10 pixels per second at zoom 1.0
const PIXELS_PER_SECOND = 10;

// TypeScript interfaces
interface VisibleTimeRange {
  startTime: number;
  endTime: number;
}

interface TimelineCalculations {
  timeToPixels: (time: number, zoom: number) => number;
  pixelsToTime: (pixels: number, zoom: number) => number;
  getVisibleTimeRange: (scrollX: number, viewportWidth: number, zoom: number) => VisibleTimeRange;
  getPixelsPerSecond: (zoom: number) => number;
}

/**
 * Composable for timeline time-to-pixel conversions
 * Formula: pixels = time * pixelsPerSecond * zoom
 */
export const useTimelineCalculations = (): TimelineCalculations => {
  /**
   * Convert time in seconds to pixel position
   * @param time - Time in seconds
   * @param zoom - Current zoom level (1.0 = base scale)
   * @returns Pixel position on timeline
   */
  const timeToPixels = (time: number, zoom: number): number => {
    return time * PIXELS_PER_SECOND * zoom;
  };

  /**
   * Convert pixel position to time in seconds
   * @param pixels - Pixel position on timeline
   * @param zoom - Current zoom level (1.0 = base scale)
   * @returns Time in seconds
   */
  const pixelsToTime = (pixels: number, zoom: number): number => {
    return pixels / (PIXELS_PER_SECOND * zoom);
  };

  /**
   * Calculate the visible time range based on scroll position and viewport
   * @param scrollX - Horizontal scroll position in pixels
   * @param viewportWidth - Width of the visible viewport in pixels
   * @param zoom - Current zoom level (1.0 = base scale)
   * @returns Object with startTime and endTime in seconds
   */
  const getVisibleTimeRange = (
    scrollX: number,
    viewportWidth: number,
    zoom: number
  ): VisibleTimeRange => {
    const startTime = pixelsToTime(scrollX, zoom);
    const endTime = pixelsToTime(scrollX + viewportWidth, zoom);

    return {
      startTime,
      endTime,
    };
  };

  /**
   * Get the current pixels per second based on zoom level
   * @param zoom - Current zoom level (1.0 = base scale)
   * @returns Pixels per second at current zoom
   */
  const getPixelsPerSecond = (zoom: number): number => {
    return PIXELS_PER_SECOND * zoom;
  };

  return {
    timeToPixels,
    pixelsToTime,
    getVisibleTimeRange,
    getPixelsPerSecond,
  };
};
