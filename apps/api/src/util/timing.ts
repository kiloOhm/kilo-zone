const runningTimers: { [key: string]: number } = {};
export const stoppedTimers: { [key: string]: number } = {};

export function startTimer(label: string) {
	if (runningTimers[label]) {
		console.log(`Timing label ${label} already exists, overriding`);
	}
	runningTimers[label] = Date.now();
	return () => stopTimer(label);
}

export function stopTimer(label: string, log = true) {
	if (!runningTimers[label]) {
		console.log(`Timing label ${label} not found`);
		return -1;
	}
	const duration = Date.now() - runningTimers[label];
	delete runningTimers[label];
	if (log) {
		console.log(`${label}: ${duration}ms`);
	}
	stoppedTimers[label] = duration;
	return duration;
}

export function stopAllRunningTimers() {
	for (const label in runningTimers) {
		stopTimer(label);
	}
}
