export const TRIAL_HOUR = 3_600_000;
export const TRIAL_VERSION = 'opportunity-v1';
export const MAX_OPPORTUNITY_TRIALS = 100;
const short = (v) => typeof v === 'string' && v.trim().length > 0 && v.length <= 160;
const validOpportunityCost = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 3;
export function validScenarioInstrument(value) {
    if (!value || typeof value !== 'object')
        return false;
    const i = value;
    if (![i.id, i.symbol, i.name, i.quoteCurrency].every(short) || !/^[A-Z0-9]{2,20}$/.test(i.quoteCurrency))
        return false;
    if (!positive(i.lastPrice) || ![i.change24hPercent, i.volume24h].every(Number.isFinite) || i.volume24h < 0)
        return false;
    if (i.marketId === 'upbit') {
        const [asset, quote, extra] = i.symbol.split('/');
        return !extra && /^[A-Z0-9]{1,30}$/.test(asset) && ['KRW', 'BTC', 'USDT'].includes(quote) && quote === i.quoteCurrency
            && i.id === (quote === 'KRW' ? `upbit-${asset.toLowerCase()}` : `upbit-${quote.toLowerCase()}-${asset.toLowerCase()}`)
            && (i.providerSymbol === undefined || i.providerSymbol === `${quote}-${asset}`)
            && (i.marketType === undefined || i.marketType === `upbit-${quote.toLowerCase()}`);
    }
    return i.marketId === 'binance-spot' && /^[A-Z0-9]{3,40}$/.test(i.symbol) && i.symbol.endsWith(i.quoteCurrency)
        && i.id === `binance-spot-${i.symbol.toLowerCase()}` && (i.providerSymbol === undefined || i.providerSymbol === i.symbol)
        && (i.marketType === undefined || i.marketType === 'binance-spot');
}
const positive = (v) => typeof v === 'number' && Number.isFinite(v) && v > 0;
export function validTrialCandle(c) {
    return !!c && positive(c.timestamp) && c.timestamp % TRIAL_HOUR === 0 && [c.open, c.high, c.low, c.close].every(positive)
        && Number.isFinite(c.volume) && c.volume >= 0 && c.high >= Math.max(c.open, c.close, c.low) && c.low <= Math.min(c.open, c.close, c.high);
}
export function validOpportunityTrial(value) {
    if (!value || typeof value !== 'object')
        return false;
    const r = value;
    return r.version === TRIAL_VERSION && [r.id, r.batchId].every(s => typeof s === 'string' && s.length > 0 && s.length <= 160)
        && validScenarioInstrument(r.instrument) && ['pullback', 'breakout', 'rebound'].includes(r.kind)
        && [r.recordedAt, r.signalAt, r.signalCandleAt, r.signalPrice, r.startAt, r.stop, r.target].every(positive)
        && r.signalCandleAt % TRIAL_HOUR === 0 && r.signalCandleAt <= r.signalAt && r.signalAt <= r.recordedAt && r.recordedAt - r.signalAt <= 90_000
        && r.startAt === (Math.floor(r.recordedAt / TRIAL_HOUR) + 1) * TRIAL_HOUR && r.horizonHours === 24
        && Array.isArray(r.entry) && r.entry.length === 2 && r.entry.every(positive) && r.stop < r.entry[0] && r.entry[0] <= r.signalPrice && r.signalPrice <= r.entry[1] && r.entry[1] < r.target
        && validOpportunityCost(r.costPercent) && (r.checkedAt === null || positive(r.checkedAt) && r.checkedAt >= r.recordedAt)
        && [null, 'history', 'connection', 'revised'].includes(r.issue)
        && Array.isArray(r.basis) && r.basis.length >= 2 && r.basis.length <= 3 && r.basis.every(b => !!b && typeof b === 'object') && r.basis.some(b => b.frame === '1H' && b.asOf === r.signalCandleAt)
        && new Set(r.basis.map(b => b.frame)).size === r.basis.length && r.basis.every(b => ['1H', '4H', '1D'].includes(b.frame) && positive(b.asOf) && b.asOf <= r.signalAt && [b.close, b.atr].every(positive) && Number.isFinite(b.rsi) && b.rsi >= 0 && b.rsi <= 100 && (b.volumeRatio === null || Number.isFinite(b.volumeRatio) && b.volumeRatio >= 0) && ['buy', 'sell', 'neutral'].includes(b.direction))
        && Array.isArray(r.evidence) && r.evidence.length <= 24 && r.evidence.every((c, i) => validTrialCandle(c) && c.timestamp === r.startAt + i * TRIAL_HOUR && r.checkedAt !== null && c.timestamp + TRIAL_HOUR <= r.checkedAt);
}
/** Next full hour OPEN entry, only within the frozen zone; do not infer an intrabar entry. */
export function evaluateOpportunityTrial(trial, now) {
    const result = (state, entry = null, exit = null, at = null, bars = 0, range) => {
        const net = entry !== null && exit !== null ? (exit / entry - 1) * 100 - trial.costPercent : null;
        return { state, entry, exit, at, bars, netLow: range?.[0] ?? net, netHigh: range?.[1] ?? net };
    };
    if (!validOpportunityTrial(trial) || !Number.isFinite(now) || now < trial.recordedAt)
        return result('unresolved');
    if (trial.issue === 'revised')
        return result('unresolved');
    const bars = trial.evidence.filter(c => c.timestamp + TRIAL_HOUR <= now);
    if (!bars.length)
        return result(now < trial.startAt + TRIAL_HOUR ? 'pending' : 'unresolved');
    const entry = bars[0].open;
    if (entry < trial.entry[0] || entry > trial.entry[1])
        return result('skipped', null, null, trial.startAt + TRIAL_HOUR);
    for (const [i, bar] of bars.entries()) {
        const at = bar.timestamp + TRIAL_HOUR;
        // Opens precede the unknown intrabar path. Adverse stop gaps fill at the open.
        if (bar.open <= trial.stop)
            return result('stop', entry, bar.open, at, i + 1);
        if (bar.open >= trial.target)
            return result('target', entry, trial.target, at, i + 1);
        if (bar.low <= trial.stop && bar.high >= trial.target)
            return result('ambiguous', entry, null, at, i + 1, [(trial.stop / entry - 1) * 100 - trial.costPercent, (trial.target / entry - 1) * 100 - trial.costPercent]);
        if (bar.low <= trial.stop)
            return result('stop', entry, trial.stop, at, i + 1);
        if (bar.high >= trial.target)
            return result('target', entry, trial.target, at, i + 1);
        if (i === trial.horizonHours - 1)
            return result('timeout', entry, bar.close, at, i + 1);
    }
    const expected = Math.min(24, Math.max(0, Math.floor((now - trial.startAt) / TRIAL_HOUR)));
    return result(bars.length < expected ? 'unresolved' : 'open', entry, null, null, bars.length);
}
export const isTrialComplete = (state) => ['target', 'stop', 'timeout', 'ambiguous', 'skipped'].includes(state);
/** Retain observed evidence; a missing hour blocks all later inference until it is recovered. */
export function mergeTrialEvidence(trial, incoming, now) {
    if (!validOpportunityTrial(trial) || !Number.isFinite(now) || now < (trial.checkedAt ?? trial.recordedAt))
        throw new Error('invalid-trial-update');
    if (trial.issue === 'revised')
        return trial;
    if (isTrialComplete(evaluateOpportunityTrial(trial, now).state))
        return trial;
    const rows = new Map();
    for (const c of incoming) {
        if (!c || c.timestamp < trial.startAt || c.timestamp >= trial.startAt + 24 * TRIAL_HOUR || c.timestamp + TRIAL_HOUR > now)
            continue;
        if (!validTrialCandle(c) || rows.has(c.timestamp) && !sameCandle(rows.get(c.timestamp), c))
            return { ...trial, checkedAt: now, issue: 'revised' };
        rows.set(c.timestamp, c);
    }
    for (const c of trial.evidence) {
        if (rows.has(c.timestamp) && !sameCandle(c, rows.get(c.timestamp)))
            return { ...trial, checkedAt: now, issue: 'revised' };
        rows.set(c.timestamp, c);
    }
    const evidence = [];
    const expected = Math.min(24, Math.max(0, Math.floor((now - trial.startAt) / TRIAL_HOUR)));
    for (let i = 0; i < expected; i++) {
        const c = rows.get(trial.startAt + i * TRIAL_HOUR);
        if (!c)
            break;
        evidence.push({ ...c });
    }
    const next = { ...trial, checkedAt: now, evidence, issue: evidence.length < expected ? 'history' : null };
    return isTrialComplete(evaluateOpportunityTrial(next, now).state) ? { ...next, issue: null } : next;
}
function sameCandle(a, b) { return ['timestamp', 'open', 'high', 'low', 'close', 'volume'].every(key => a[key] === b[key]); }
export function summarizeOpportunityTrials(trials, now, kind) {
    const selected = trials.filter(r => !kind || r.kind === kind), outcomes = selected.map(r => evaluateOpportunityTrial(r, now));
    const complete = outcomes.filter(r => r.netLow !== null && r.netHigh !== null), n = complete.length;
    const mean = (key) => n ? complete.reduce((sum, r) => sum + r[key], 0) / n : null;
    return { total: selected.length, completed: n, meanLow: mean('netLow'), meanHigh: mean('netHigh'),
        winsLow: n ? complete.filter(r => r.netLow > 0).length / n * 100 : null, winsHigh: n ? complete.filter(r => r.netHigh > 0).length / n * 100 : null,
        pending: outcomes.filter(r => ['pending', 'open'].includes(r.state)).length, unresolved: outcomes.filter(r => r.state === 'unresolved').length,
        skipped: outcomes.filter(r => r.state === 'skipped').length, ambiguous: outcomes.filter(r => r.state === 'ambiguous').length };
}
