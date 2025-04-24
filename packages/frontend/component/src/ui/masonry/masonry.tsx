import clsx from 'clsx';
import throttle from 'lodash-es/throttle';
import {
  Fragment,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { observeResize } from '../../utils';
import { Scrollable } from '../scrollbar';
import * as styles from './styles.css';
import type { MasonryGroup, MasonryItem, MasonryItemXYWH } from './type';
import { calcColumns, calcLayout, calcSleep, calcSticky } from './utils';

export interface MasonryProps extends React.HTMLAttributes<HTMLDivElement> {
  items: MasonryItem[] | MasonryGroup[];

  gapX?: number;
  gapY?: number;
  paddingX?: number;
  paddingY?: number;

  groupsGap?: number;
  groupHeaderGapWithItems?: number;
  stickyGroupHeader?: boolean;
  collapsedGroups?: string[];
  onGroupCollapse?: (groupId: string, collapsed: boolean) => void;
  /**
   * Specify the width of the item.
   * - `number`: The width of the item in pixels.
   * - `'stretch'`: The item will stretch to fill the container.
   * @default 'stretch'
   */
  itemWidth?: number | 'stretch';
  /**
   * The minimum width of the item in pixels.
   * @default 100
   */
  itemWidthMin?: number;
  virtualScroll?: boolean;
  locateMode?: 'transform' | 'leftTop' | 'transform3d';
  /**
   * Specify the number of columns, will override the calculated
   */
  columns?: number;
}

export const Masonry = ({
  items,
  gapX = 12,
  gapY = 12,
  itemWidth = 'stretch',
  itemWidthMin = 100,
  paddingX = 0,
  paddingY = 0,
  className,
  virtualScroll = false,
  locateMode = 'leftTop',
  groupsGap = 0,
  groupHeaderGapWithItems = 0,
  stickyGroupHeader = true,
  collapsedGroups,
  columns,
  onGroupCollapse,
  ...props
}: MasonryProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  const [layoutMap, setLayoutMap] = useState<
    Map<MasonryItem['id'], MasonryItemXYWH>
  >(new Map());
  const [sleepMap, setSleepMap] = useState<Map<MasonryItem['id'], boolean>>(
    new Map()
  );
  const [stickyGroupId, setStickyGroupId] = useState<string | undefined>(
    undefined
  );
  const stickyGroupCollapsed = !!(
    collapsedGroups &&
    stickyGroupId &&
    collapsedGroups.includes(stickyGroupId)
  );

  const groups = useMemo(() => {
    if ('items' in items[0]) return items as MasonryGroup[];
    return [{ id: '', height: 0, items: items as MasonryItem[] }];
  }, [items]);

  const stickyGroup = useMemo(() => {
    if (!stickyGroupId) return undefined;
    return groups.find(group => group.id === stickyGroupId);
  }, [groups, stickyGroupId]);

  const updateSleepMap = useCallback(
    (layoutMap: Map<MasonryItem['id'], MasonryItemXYWH>, _scrollY?: number) => {
      if (!virtualScroll) return;

      const rootEl = rootRef.current;
      if (!rootEl) return;

      requestAnimationFrame(() => {
        const scrollY = _scrollY ?? rootEl.scrollTop;
        const sleepMap = calcSleep({
          viewportHeight: rootEl.clientHeight,
          scrollY,
          layoutMap,
          preloadHeight: 50,
        });
        setSleepMap(sleepMap);
      });
    },
    [virtualScroll]
  );

  const calculateLayout = useCallback(() => {
    const rootEl = rootRef.current;
    if (!rootEl) return;

    const totalWidth = rootEl.clientWidth;
    const { columns: calculatedColumns, width } = calcColumns(
      totalWidth,
      itemWidth,
      itemWidthMin,
      gapX,
      paddingX,
      columns
    );

    const { layout, height } = calcLayout(groups, {
      totalWidth,
      columns: calculatedColumns,
      width,
      gapX,
      gapY,
      paddingX,
      paddingY,
      groupsGap,
      groupHeaderGapWithItems,
      collapsedGroups: collapsedGroups ?? [],
    });
    setLayoutMap(layout);
    setHeight(height);
    updateSleepMap(layout);
    if (stickyGroupHeader && rootRef.current) {
      setStickyGroupId(
        calcSticky({ scrollY: rootRef.current.scrollTop, layoutMap: layout })
      );
    }
  }, [
    collapsedGroups,
    columns,
    gapX,
    gapY,
    groupHeaderGapWithItems,
    groups,
    groupsGap,
    itemWidth,
    itemWidthMin,
    paddingX,
    paddingY,
    stickyGroupHeader,
    updateSleepMap,
  ]);

  // handle resize
  useEffect(() => {
    calculateLayout();
    if (rootRef.current) {
      return observeResize(rootRef.current, calculateLayout);
    }
    return;
  }, [calculateLayout]);

  // handle scroll
  useEffect(() => {
    const rootEl = rootRef.current;
    if (!rootEl) return;

    if (virtualScroll) {
      const handler = throttle((e: Event) => {
        const scrollY = (e.target as HTMLElement).scrollTop;
        updateSleepMap(layoutMap, scrollY);
        if (stickyGroupHeader) {
          setStickyGroupId(calcSticky({ scrollY, layoutMap }));
        }
      }, 50);
      rootEl.addEventListener('scroll', handler);
      return () => {
        rootEl.removeEventListener('scroll', handler);
      };
    }
    return;
  }, [layoutMap, stickyGroupHeader, updateSleepMap, virtualScroll]);

  return (
    <Scrollable.Root>
      <Scrollable.Viewport
        ref={rootRef}
        data-masonry-root
        className={clsx('scrollable', styles.root, className)}
        {...props}
      >
        {groups.map(group => {
          const {
            id: groupId,
            items,
            children,
            className,
            Component,
            ...groupProps
          } = group;
          const collapsed =
            collapsedGroups && collapsedGroups.includes(groupId);

          return (
            <Fragment key={groupId}>
              {/* group header */}
              <MasonryItem
                className={clsx(styles.groupHeader, className)}
                key={`header-${groupId}`}
                id={groupId}
                locateMode={locateMode}
                xywh={layoutMap.get(groupId)}
                sleep={sleepMap.get(groupId)}
                {...groupProps}
                onClick={() => onGroupCollapse?.(groupId, !collapsed)}
              >
                {Component ? (
                  <Component
                    itemCount={items.length}
                    groupId={groupId}
                    collapsed={collapsed}
                  />
                ) : (
                  children
                )}
              </MasonryItem>
              {/* group items */}
              {collapsed
                ? null
                : items.map(({ id: itemId, Component, ...item }) => {
                    const mixId = groupId ? `${groupId}:${itemId}` : itemId;
                    return (
                      <MasonryItem
                        key={mixId}
                        id={mixId}
                        {...item}
                        locateMode={locateMode}
                        xywh={layoutMap.get(mixId)}
                        sleep={sleepMap.get(mixId)}
                      >
                        {Component ? (
                          <Component groupId={groupId} itemId={itemId} />
                        ) : (
                          item.children
                        )}
                      </MasonryItem>
                    );
                  })}
            </Fragment>
          );
        })}
        <div data-masonry-placeholder style={{ height }} />
      </Scrollable.Viewport>
      <Scrollable.Scrollbar />
      {stickyGroup ? (
        <div
          className={styles.stickyGroupHeader}
          style={{
            padding: `0 ${paddingX}px`,
            height: stickyGroup.height,
          }}
          onClick={() =>
            onGroupCollapse?.(stickyGroup.id, !stickyGroupCollapsed)
          }
        >
          {stickyGroup.Component ? (
            <stickyGroup.Component
              groupId={stickyGroup.id}
              itemCount={stickyGroup.items.length}
              collapsed={stickyGroupCollapsed}
            />
          ) : (
            stickyGroup.children
          )}
        </div>
      ) : null}
    </Scrollable.Root>
  );
};

interface MasonryItemProps
  extends MasonryItem,
    Omit<React.HTMLAttributes<HTMLDivElement>, 'id' | 'height'> {
  locateMode?: 'transform' | 'leftTop' | 'transform3d';
  sleep?: boolean;
  xywh?: MasonryItemXYWH;
}

const MasonryItem = memo(function MasonryItem({
  id,
  xywh,
  locateMode = 'leftTop',
  sleep = false,
  children,
  style: styleProp,
  ...props
}: MasonryItemProps) {
  const style = useMemo(() => {
    if (!xywh) return { display: 'none' };

    const { x, y, w, h } = xywh;

    const posStyle =
      locateMode === 'transform'
        ? { transform: `translate(${x}px, ${y}px)` }
        : locateMode === 'leftTop'
          ? { left: `${x}px`, top: `${y}px` }
          : { transform: `translate3d(${x}px, ${y}px, 0)` };

    return {
      left: 0,
      top: 0,
      ...styleProp,
      ...posStyle,
      width: `${w}px`,
      height: `${h}px`,
      position: 'absolute' as const,
    };
  }, [locateMode, styleProp, xywh]);

  if (sleep || !xywh) return null;

  return (
    <div data-masonry-item data-masonry-item-id={id} style={style} {...props}>
      {children}
    </div>
  );
});
