<script lang="ts">
  /**
   * A github-style contribution calendar, in the app's blue tones.
   *
   * New in the svelte app — the react popup had nothing like it. It is fed the
   * `activity` map of a UserProfile ('YYYY-MM-DD' -> transmissions) and shows
   * one year at a time; the years present in the map become the buttons above
   * the grid, newest first.
   *
   * Everything is computed in UTC, because that is how the days are keyed. A
   * local-time reading would shift a whole year's worth of cells by one column
   * for anyone east or west of Greenwich.
   */
  let {
    activity,
    /** shown as the caption under the heading, e.g. "on air activity" */
    label = 'on air activity',
  }: { activity: Record<string, number>; label?: string } = $props();

  const MONTHS = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  const iso = (d: Date) => d.toISOString().slice(0, 10);

  /** the years the map covers, newest first */
  let years = $derived.by(() => {
    const seen = new Set<number>();
    for (const key of Object.keys(activity)) {
      seen.add(Number(key.slice(0, 4)));
    }
    // a profile with no activity at all still has to draw a grid: the current
    // year is the sensible one to show empty.
    if (seen.size === 0) {
      seen.add(new Date().getUTCFullYear());
    }
    return [...seen].sort((a, b) => b - a);
  });

  /** the year on screen. Follows `years` when the profile changes. */
  let selected = $state<number | null>(null);
  let year = $derived(
    selected !== null && years.includes(selected) ? selected : years[0],
  );

  interface Day {
    key: string;
    count: number;
    /** 0 for a day with no activity, then 1-4 against the year's busiest day */
    level: number;
    title: string;
  }

  /** the year as columns of 7 days, sunday first, like github's.
   * The first and last column run outside the year; those slots are null, so
   * the grid keeps its shape without borrowing days from the neighbouring
   * years. */
  let weeks = $derived.by(() => {
    const busiest = Math.max(
      1,
      ...Object.entries(activity)
        .filter(([key]) => key.startsWith(String(year)))
        .map(([, count]) => count),
    );

    const cursor = new Date(Date.UTC(year, 0, 1));
    // back up to the sunday on or before january 1st
    cursor.setUTCDate(cursor.getUTCDate() - cursor.getUTCDay());

    const columns: (Day | null)[][] = [];
    while (
      cursor.getUTCFullYear() < year ||
      (cursor.getUTCFullYear() === year && cursor.getUTCMonth() <= 11)
    ) {
      const column: (Day | null)[] = [];
      for (let i = 0; i < 7; i++) {
        if (cursor.getUTCFullYear() !== year) {
          column.push(null);
        } else {
          const key = iso(cursor);
          const count = activity[key] ?? 0;
          column.push({
            key,
            count,
            level: count === 0 ? 0 : Math.ceil((count / busiest) * 4),
            title: `${count === 0 ? 'No' : count} transmission${
              count === 1 ? '' : 's'
            } on ${MONTHS[cursor.getUTCMonth()]} ${cursor.getUTCDate()}, ${year}`,
          });
        }
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
      columns.push(column);
      if (columns.length > 53) break;
    }
    return columns;
  });

  /** month name over the column holding that month's first day. The first
   * column is skipped when it is a stub of the previous december, exactly as
   * github drops a label it has no room to draw. */
  let monthLabels = $derived(
    weeks
      .map((column, index) => {
        const first = column.find((day) => day && day.key.slice(8) === '01');
        return first ? { index, name: MONTHS[Number(first.key.slice(5, 7)) - 1] } : null;
      })
      .filter((label): label is { index: number; name: string } => label !== null),
  );

  let total = $derived(
    Object.entries(activity)
      .filter(([key]) => key.startsWith(String(year)))
      .reduce((sum, [, count]) => sum + count, 0),
  );
</script>

<section class="activity">
  <h3>{label}</h3>
  <p class="total">
    {total.toLocaleString()} transmission{total === 1 ? '' : 's'} in {year}
  </p>

  <!-- 53 columns never fit a phone, and often not a desktop popup either, so
       the calendar scrolls sideways inside the card rather than widening it. -->
  <div class="scroller">
    <div class="calendar">
      <div class="months" style="--columns: {weeks.length}">
        {#each monthLabels as month (month.index)}
          <span style="grid-column: {month.index + 1}">{month.name}</span>
        {/each}
      </div>
      <div class="body">
        <div class="weekdays" aria-hidden="true">
          <span></span>
          <span>Mon</span>
          <span></span>
          <span>Wed</span>
          <span></span>
          <span>Fri</span>
          <span></span>
        </div>
        <div class="grid" role="img" aria-label="{label}: {total} transmissions in {year}">
          {#each weeks as column, index (index)}
            <div class="week">
              {#each column as day, dayIndex (dayIndex)}
                {#if day}
                  <div class="day level-{day.level}" title={day.title}></div>
                {:else}
                  <div class="day empty"></div>
                {/if}
              {/each}
            </div>
          {/each}
        </div>
      </div>
    </div>
  </div>

  <div class="footer">
    {#if years.length > 1}
      <div class="years">
        {#each years as option (option)}
          <button
            type="button"
            class:selected={option === year}
            aria-pressed={option === year}
            onclick={() => (selected = option)}>{option}</button
          >
        {/each}
      </div>
    {/if}
    <div class="legend" aria-hidden="true">
      <span>Less</span>
      <div class="day level-0"></div>
      <div class="day level-1"></div>
      <div class="day level-2"></div>
      <div class="day level-3"></div>
      <div class="day level-4"></div>
      <span>More</span>
    </div>
  </div>
</section>

<style>
  .activity {
    /* the blue tones of the graph. Level 0 is the same hairline the online
       list uses for its rules, so an empty day reads as page rather than as a
       very quiet one. */
    /* 53 columns of (cell + gap) plus the weekday gutter is 664px, which is
       what the profile popup is sized to hold */
    --cell: 10px;
    --cell-gap: 2px;
    --level-0: rgba(255, 255, 255, 0.07);
    --level-1: #0d3f52;
    --level-2: #10708c;
    --level-3: #0ca2c2;
    --level-4: #0ccaeb;
    margin-top: 1.5rem;
  }

  .activity h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 500;
  }
  .activity .total {
    margin: 0.15rem 0 0.6rem;
    font-size: 0.8125rem;
    color: var(--gray-95);
  }

  .scroller {
    overflow-x: auto;
    /* room for the scrollbar, so it never sits on top of the last row */
    padding-bottom: 4px;
  }
  .calendar {
    /* the grid decides the width; without this the flex/scroll parent would
       squeeze the columns instead of scrolling them */
    width: max-content;
  }

  .months {
    display: grid;
    grid-template-columns: repeat(var(--columns), calc(var(--cell) + var(--cell-gap)));
    /* clears the weekday gutter below */
    margin-left: 28px;
    height: 14px;
    font-size: 0.6875rem;
    color: var(--gray-95);
  }
  .months span {
    grid-row: 1;
    white-space: nowrap;
  }

  .body {
    display: flex;
  }
  .weekdays {
    display: flex;
    flex-direction: column;
    gap: var(--cell-gap);
    width: 28px;
    font-size: 0.6875rem;
    color: var(--gray-95);
  }
  .weekdays span {
    height: var(--cell);
    line-height: var(--cell);
  }

  .grid {
    display: flex;
    gap: var(--cell-gap);
  }
  .week {
    display: flex;
    flex-direction: column;
    gap: var(--cell-gap);
  }

  .day {
    width: var(--cell);
    height: var(--cell);
    border-radius: 2px;
    background-color: var(--level-0);
  }
  /* the stub days of the neighbouring years: they hold the column's shape and
     nothing else */
  .day.empty {
    background-color: transparent;
  }
  .day.level-1 {
    background-color: var(--level-1);
  }
  .day.level-2 {
    background-color: var(--level-2);
  }
  .day.level-3 {
    background-color: var(--level-3);
  }
  .day.level-4 {
    background-color: var(--level-4);
  }

  .footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.6rem;
  }

  .years {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }
  .years button {
    font: inherit;
    font-size: 0.8125rem;
    padding: 2px 10px;
    border-radius: 4px;
    border: 1px solid rgba(255, 255, 255, 0.15);
    background: transparent;
    color: var(--gray-105);
    cursor: pointer;
  }
  .years button:hover {
    background: rgba(255, 255, 255, 0.08);
  }
  .years button.selected {
    background: var(--level-2);
    border-color: var(--level-3);
  }

  .legend {
    display: flex;
    align-items: center;
    gap: var(--cell-gap);
    font-size: 0.6875rem;
    color: var(--gray-95);
  }
  .legend span {
    margin: 0 2px;
  }
</style>
