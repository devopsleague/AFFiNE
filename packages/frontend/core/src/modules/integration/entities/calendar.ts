import { Entity, LiveData, ObjectPool } from '@toeverything/infra';
import dayjs, { type Dayjs } from 'dayjs';
import ICAL from 'ical.js';
import { Observable, switchMap } from 'rxjs';

import type {
  CalendarStore,
  CalendarSubscriptionConfig,
} from '../store/calendar';
import { parseCalendarUrl } from '../utils/caleander-url-parser';
import { CalendarSubscription } from './calendar-subscription';

export type CalendarEvent = {
  id: string;
  url: string;
  title: string;
  startAt?: ICAL.Time;
  endAt?: ICAL.Time;
  allDay?: boolean;
  date?: Dayjs;
};

type EventsByDateMap = Map<string, CalendarEvent[]>;

const isAllDay = (current: Dayjs, start: Dayjs, end: Dayjs): boolean => {
  if (current.isSame(start, 'day')) {
    return (
      start.hour() === 0 && start.minute() === 0 && !current.isSame(end, 'day')
    );
  } else if (current.isSame(end, 'day')) {
    return false;
  } else {
    return true;
  }
};

export class CalendarIntegration extends Entity {
  constructor(private readonly store: CalendarStore) {
    super();
  }

  private readonly subscriptionPool = new ObjectPool<
    string,
    CalendarSubscription
  >();

  colors = this.store.colors;
  subscriptions$ = LiveData.from(
    this.store.watchSubscriptionMap().pipe(
      switchMap(subs => {
        const refs = Object.entries(subs ?? {}).map(([url]) => {
          const exists = this.subscriptionPool.get(url);
          if (exists) {
            return exists;
          }
          const subscription = this.framework.createEntity(
            CalendarSubscription,
            { url }
          );
          const ref = this.subscriptionPool.put(url, subscription);
          return ref;
        });

        return new Observable<CalendarSubscription[]>(subscribe => {
          subscribe.next(refs.map(ref => ref.obj));
          return () => {
            refs.forEach(ref => ref.release());
          };
        });
      })
    ),
    []
  );
  subscription$(url: string) {
    return this.subscriptions$.map(subscriptions =>
      subscriptions.find(sub => sub.url === url)
    );
  }
  contents$ = LiveData.computed(get => {
    const subscriptions = get(this.subscriptions$);
    return subscriptions.map(sub => ({
      url: sub.url,
      content: get(sub.content$),
    }));
  });
  eventsByDateMap$ = LiveData.computed(get => {
    const contents = get(this.contents$);
    const eventsByDate: EventsByDateMap = new Map();

    for (const { content, url } of contents) {
      if (!content) continue;
      const jCal = ICAL.parse(content);
      const vCalendar = new ICAL.Component(jCal);
      const vEvents = vCalendar.getAllSubcomponents('vevent');

      for (const vEvent of vEvents) {
        const event = new ICAL.Event(vEvent);
        const calendarEvent: CalendarEvent = {
          id: event.uid,
          url,
          title: event.summary,
          startAt: event.startDate,
          endAt: event.endDate,
        };

        // create index for each day of the event
        if (event.startDate && event.endDate) {
          const start = dayjs(event.startDate.toJSDate());
          const end = dayjs(event.endDate.toJSDate());

          let current = start;
          while (current.isBefore(end) || current.isSame(end, 'day')) {
            if (
              current.isSame(end, 'day') &&
              end.hour() === 0 &&
              end.minute() === 0
            ) {
              break;
            }
            const todayEvent: CalendarEvent = { ...calendarEvent };
            const dateKey = current.format('YYYY-MM-DD');
            if (!eventsByDate.has(dateKey)) {
              eventsByDate.set(dateKey, []);
            }
            todayEvent.allDay = isAllDay(current, start, end);
            todayEvent.date = current;
            todayEvent.id = `${event.uid}-${dateKey}`;
            eventsByDate.get(dateKey)?.push(todayEvent);
            current = current.add(1, 'day');
          }
        } else {
          console.warn("event's start or end date is missing", event);
        }
      }
    }
    return eventsByDate;
  });
  eventsByDate$(date: Dayjs) {
    return this.eventsByDateMap$.map(eventsByDateMap => {
      const dateKey = date.format('YYYY-MM-DD');
      const events = eventsByDateMap.get(dateKey) || [];

      // sort events by start time
      return events.sort((a, b) => {
        return (
          (a.startAt?.toJSDate().getTime() ?? 0) -
          (b.startAt?.toJSDate().getTime() ?? 0)
        );
      });
    });
  }

  async verifyUrl(_url: string) {
    const url = parseCalendarUrl(_url);
    try {
      const response = await fetch(url);
      const content = await response.text();
      ICAL.parse(content);
      return content;
    } catch (err) {
      console.error(err);
      throw new Error('Failed to verify URL');
    }
  }

  async createSubscription(url: string) {
    try {
      const content = await this.verifyUrl(url);
      this.store.addSubscription(url);
      this.store.setSubscriptionCache(url, content).catch(console.error);
    } catch (err) {
      console.error(err);
      throw new Error('Failed to verify URL');
    }
  }

  deleteSubscription(url: string) {
    this.store.removeSubscription(url);
  }

  updateSubscription(
    url: string,
    updates: Partial<Omit<CalendarSubscriptionConfig, 'url'>>
  ) {
    this.store.updateSubscription(url, updates);
  }
}
