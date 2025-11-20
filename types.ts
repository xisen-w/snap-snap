
export interface PhotoData {
  id: string;
  url: string;
  timestamp: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  isDeveloping: boolean;
  borderColor?: string;
}

export interface DragOffset {
  x: number;
  y: number;
}
