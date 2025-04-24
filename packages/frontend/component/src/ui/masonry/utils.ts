import type { MasonryGroup, MasonryItem, MasonryItemXYWH } from './type';

export const calcColumns = (
  totalWidth: number,
  itemWidth: number | 'stretch',
  itemWidthMin: number,
  gapX: number,
  paddingX: number,
  columns?: number
) => {
  const availableWidth = totalWidth - paddingX * 2;

  if (columns) {
    const width = (availableWidth - (columns - 1) * gapX) / columns;
    return { columns, width };
  }

  if (itemWidth === 'stretch') {
    let columns = 1;
    while (columns * itemWidthMin + (columns - 1) * gapX < availableWidth) {
      columns++;
    }
    const finalColumns = columns - 1;
    const finalWidth =
      (availableWidth - (finalColumns - 1) * gapX) / finalColumns;
    return {
      columns: finalColumns,
      width: finalWidth,
    };
  } else {
    let columns = 1;
    while (columns * itemWidth + (columns - 1) * gapX < availableWidth) {
      columns++;
    }
    return {
      columns: columns - 1,
      width: itemWidth,
    };
  }
};

export const calcLayout = (
  groups: MasonryGroup[],
  options: {
    totalWidth: number;
    columns: number;
    width: number;
    gapX: number;
    gapY: number;
    paddingX: number;
    paddingY: number;
    groupsGap: number;
    groupHeaderGapWithItems: number;
    collapsedGroups: string[];
  }
) => {
  const {
    totalWidth,
    columns,
    width,
    gapX,
    gapY,
    paddingX,
    paddingY,
    groupsGap,
    groupHeaderGapWithItems,
    collapsedGroups,
  } = options;

  const layout = new Map<string, MasonryItemXYWH>();
  let finalHeight = paddingY;

  groups.forEach((group, index) => {
    const heightStack = Array.from({ length: columns }, () => 0);
    if (index !== 0) {
      finalHeight += groupsGap;
    }

    // calculate group header
    const groupHeaderLayout: MasonryItemXYWH = {
      type: 'group',
      x: paddingX,
      y: finalHeight,
      w: totalWidth - paddingX * 2,
      h: group.height,
    };
    layout.set(group.id, groupHeaderLayout);

    if (collapsedGroups.includes(group.id)) {
      finalHeight += groupHeaderLayout.h;
      return;
    }

    finalHeight += groupHeaderLayout.h + groupHeaderGapWithItems;
    // calculate group items
    group.items.forEach(item => {
      const itemId = group.id ? `${group.id}:${item.id}` : item.id;
      const minHeight = Math.min(...heightStack);
      const minHeightIndex = heightStack.indexOf(minHeight);
      const x = minHeightIndex * (width + gapX) + paddingX;
      const y = minHeight + finalHeight;

      heightStack[minHeightIndex] += item.height + gapY;
      layout.set(itemId, {
        type: 'item',
        x,
        y,
        w: width,
        h: item.height,
      });
    });

    const groupHeight = Math.max(...heightStack) + paddingY;
    finalHeight += groupHeight;
  });

  return { layout, height: finalHeight };
};

export const calcSleep = (options: {
  viewportHeight: number;
  scrollY: number;
  layoutMap: Map<MasonryItem['id'], MasonryItemXYWH>;
  preloadHeight: number;
}) => {
  const { viewportHeight, scrollY, layoutMap, preloadHeight } = options;

  const sleepMap = new Map<MasonryItem['id'], boolean>();

  layoutMap.forEach((layout, id) => {
    const { y, h } = layout;

    const isInView =
      y + h + preloadHeight > scrollY &&
      y - preloadHeight < scrollY + viewportHeight;

    sleepMap.set(id, !isInView);
  });

  return sleepMap;
};

export const calcSticky = (options: {
  scrollY: number;
  layoutMap: Map<MasonryItem['id'], MasonryItemXYWH>;
}) => {
  const { scrollY, layoutMap } = options;
  // find sticky group header
  const entries = Array.from(layoutMap.entries());
  const groupEntries = entries.filter(([_, layout]) => layout.type === 'group');

  const res = groupEntries.find(([_, xywh], index) => {
    const next = groupEntries[index + 1];
    return xywh.y < scrollY && (!next || next[1].y > scrollY);
  });

  return res ? res[0] : entries[0][0];
};
