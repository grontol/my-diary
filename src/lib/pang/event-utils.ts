export function self(fn?: ((...args: any[]) => any) | null) {
	return function (...args: any[]) {
		var event = args[0] as Event
		// @ts-ignore
		if (event.target === this) {
			// @ts-ignore
			fn?.apply(this, args)
		}
	};
}

export function prevent(fn?: ((...args: any[]) => any) | null) {
	return function (...args: any[]) {
		var event: Event = args[0]
		event.preventDefault()
		// @ts-ignore
		return fn?.apply(this, args);
	};
}

export function stop(fn?: ((...args: any[]) => any) | null) {
	return function (...args: any[]) {
		var event: Event = args[0]
		event.stopPropagation()
		// @ts-ignore
		return fn?.apply(this, args)
	};
}