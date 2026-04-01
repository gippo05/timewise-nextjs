"use client"

import * as React from "react"
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react"
import {
  DayPicker,
  getDefaultClassNames,
  type DayButton,
} from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"]
}) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "group/calendar bg-transparent p-5 [--cell-size:2.5rem] [[data-slot=card-content]_&]:bg-transparent [[data-slot=popover-content]_&]:bg-transparent",
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className
      )}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString("default", { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn(
          "relative flex flex-col gap-4",
          defaultClassNames.months
        ),
        month: cn("flex w-full flex-col gap-4", defaultClassNames.month),
        nav: cn(
          "absolute inset-x-0 top-0 flex w-full items-center justify-between",
          defaultClassNames.nav
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          "!size-9 !rounded-full !border-0 !bg-transparent p-0 text-muted-foreground !shadow-none select-none hover:!bg-accent hover:!text-foreground aria-disabled:opacity-40",
          defaultClassNames.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          "!size-9 !rounded-full !border-0 !bg-transparent p-0 text-muted-foreground !shadow-none select-none hover:!bg-accent hover:!text-foreground aria-disabled:opacity-40",
          defaultClassNames.button_next
        ),
        month_caption: cn(
          "relative flex h-10 w-full items-center justify-center px-12",
          defaultClassNames.month_caption
        ),
        dropdowns: cn(
          "w-full flex items-center text-sm font-medium justify-center h-(--cell-size) gap-1.5",
          defaultClassNames.dropdowns
        ),
        dropdown_root: cn(
          "relative rounded-lg border border-input bg-[var(--surface-panel-strong)] shadow-[var(--shadow-field)] has-focus:border-ring has-focus:ring-[3px] has-focus:ring-ring/15",
          defaultClassNames.dropdown_root
        ),
        dropdown: cn(
          "absolute bg-popover inset-0 opacity-0",
          defaultClassNames.dropdown
        ),
        caption_label: cn(
          "select-none text-[1.05rem] font-semibold text-foreground",
          captionLayout === "label"
            ? ""
            : "rounded-md pl-2 pr-1 flex items-center gap-1 text-sm h-8 [&>svg]:text-muted-foreground [&>svg]:size-3.5",
          defaultClassNames.caption_label
        ),
        table: "w-full border-collapse",
        weekdays: cn("flex w-full", defaultClassNames.weekdays),
        weekday: cn(
          "flex h-10 flex-1 items-center justify-center rounded-md text-sm font-medium text-muted-foreground select-none",
          defaultClassNames.weekday
        ),
        week: cn("mt-1 flex w-full", defaultClassNames.week),
        week_number_header: cn(
          "select-none w-(--cell-size)",
          defaultClassNames.week_number_header
        ),
        week_number: cn(
          "text-[0.8rem] select-none text-muted-foreground",
          defaultClassNames.week_number
        ),
        day: cn(
          "group/day relative flex flex-1 items-center justify-center p-0 text-center select-none",
          defaultClassNames.day
        ),
        range_start: cn(
          "rounded-full rounded-r-none bg-accent",
          defaultClassNames.range_start
        ),
        range_middle: cn("rounded-none bg-accent", defaultClassNames.range_middle),
        range_end: cn("rounded-full rounded-l-none bg-accent", defaultClassNames.range_end),
        today: cn(
          "font-semibold text-foreground",
          defaultClassNames.today
        ),
        outside: cn(
          "text-muted-foreground/60 aria-selected:text-muted-foreground/60",
          defaultClassNames.outside
        ),
        disabled: cn(
          "text-muted-foreground/50 opacity-40",
          defaultClassNames.disabled
        ),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return (
            <div
              data-slot="calendar"
              ref={rootRef}
              className={cn(className)}
              {...props}
            />
          )
        },
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === "left") {
            return (
              <ChevronLeftIcon className={cn("size-4", className)} {...props} />
            )
          }

          if (orientation === "right") {
            return (
              <ChevronRightIcon
                className={cn("size-4", className)}
                {...props}
              />
            )
          }

          return (
            <ChevronDownIcon className={cn("size-4", className)} {...props} />
          )
        },
        DayButton: CalendarDayButton,
        WeekNumber: ({ children, ...props }) => {
          return (
            <td {...props}>
              <div className="flex size-(--cell-size) items-center justify-center text-center">
                {children}
              </div>
            </td>
          )
        },
        ...components,
      }}
      {...props}
    />
  )
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const defaultClassNames = getDefaultClassNames()

  const ref = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString()}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        "flex !h-10 !w-10 items-center justify-center rounded-full !border-0 !bg-transparent p-0 text-sm font-medium leading-none text-foreground !shadow-none transition-all hover:!bg-accent hover:!text-foreground",
        "data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground data-[selected-single=true]:shadow-[var(--shadow-field)] data-[selected-single=true]:hover:bg-primary data-[selected-single=true]:hover:text-primary-foreground",
        "data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground data-[range-start=true]:shadow-[var(--shadow-field)] data-[range-start=true]:hover:bg-primary data-[range-start=true]:hover:text-primary-foreground",
        "data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground data-[range-end=true]:shadow-[var(--shadow-field)] data-[range-end=true]:hover:bg-primary data-[range-end=true]:hover:text-primary-foreground",
        "data-[range-middle=true]:!h-10 data-[range-middle=true]:!w-full data-[range-middle=true]:rounded-none data-[range-middle=true]:!bg-transparent data-[range-middle=true]:text-foreground data-[range-middle=true]:!shadow-none data-[range-middle=true]:hover:!bg-transparent data-[range-middle=true]:hover:text-foreground",
        "group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:ring-0 [&>span]:text-xs [&>span]:opacity-70",
        defaultClassNames.day,
        className
      )}
      {...props}
    />
  )
}

export { Calendar, CalendarDayButton }
