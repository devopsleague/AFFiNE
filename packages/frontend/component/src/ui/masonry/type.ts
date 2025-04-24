export interface MasonryItem extends React.HTMLAttributes<HTMLDivElement> {
  id: string;
  height: number;
  Component?: React.ComponentType<{ groupId: string; itemId: string }>;
}

export interface MasonryGroup extends React.HTMLAttributes<HTMLDivElement> {
  id: string;
  height: number;
  items: MasonryItem[];
  Component?: React.ComponentType<{
    groupId: string;
    collapsed?: boolean;
    itemCount: number;
  }>;
}

export interface MasonryItemXYWH {
  type: 'item' | 'group';
  x: number;
  y: number;
  w: number;
  h: number;
}
