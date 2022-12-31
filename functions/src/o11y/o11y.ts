import {trace, context, Span} from "@opentelemetry/api"

function getActiveSpan(): Span | undefined {
  return trace.getSpan(context.active())
}

export function observeAttribute(key: string, value: string): void {
  getActiveSpan()?.setAttribute(key, value)
}

export function observeError(e: Error | unknown) {
  const activeSpan = getActiveSpan()
  if (e instanceof Error) {
    activeSpan?.recordException(e)
  } else {
    activeSpan?.recordException({message: `${e}`})
  }
}

export function observeEvent(value: string): void {
  getActiveSpan()?.addEvent(value)
}


