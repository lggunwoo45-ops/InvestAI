export const timeframes = { '1m': 60_000, '3m': 180_000, '5m': 300_000, '10m': 600_000, '15m': 900_000, '30m': 1_800_000, '1h': 3_600_000, '4h': 14_400_000, '1d': 86_400_000 };
const definitions = [
    ['rsi', '매도 압력 누적', '매수 압력 누적', 'momentum', '최근 하락 또는 상승이 한쪽으로 쌓인 구간입니다.', 'Wilder RSI(14) ≤ 30 / ≥ 70', '강한 추세에서는 극단 상태가 오래 이어질 수 있습니다.'],
    ['extreme', '깊은 하락 구간', '가파른 상승 구간', 'momentum', 'RSI가 더 극단적인 수준에 들어온 구간입니다.', 'Wilder RSI(14) ≤ 20 / ≥ 80', '반전 시점을 알려주는 조건은 아닙니다.'],
    ['macd', '상승 모멘텀 전환', '하락 모멘텀 전환', 'trend', '단기 움직임과 장기 움직임의 차이가 방향을 바꿉니다.', 'MACD EMA(12−26)가 신호 EMA(9)를 상향 / 하향 교차', '횡보 구간에서는 교차가 자주 반복됩니다.'],
    ['ema', '단기 추세 회복', '단기 추세 약화', 'trend', '빠른 평균선이 느린 평균선을 넘어섭니다.', 'EMA(9)가 EMA(21)를 상향 / 하향 교차', '이미 진행된 가격 변화에 뒤늦게 반응할 수 있습니다.'],
    ['band', '하단 밴드 이탈', '상단 밴드 이탈', 'volatility', '최근 가격 분포에서 멀어진 구간을 찾습니다.', '종가 < SMA(20)−2σ / > SMA(20)+2σ', '밴드를 벗어나도 추세가 계속될 수 있습니다.'],
    ['squeeze', '압축 후 위로 확장', '압축 후 아래로 확장', 'volatility', '폭이 좁았던 가격대에서 움직임이 커집니다.', '직전 밴드 폭이 앞선 20개 폭의 하위 20% 이내, 현재 상단 / 하단 이탈', '압축 해제가 추세 지속을 보장하지 않습니다.'],
    ['volume', '거래량 동반 상승', '거래량 동반 하락', 'volatility', '평소보다 많은 거래와 가격 방향을 함께 봅니다.', '거래량 ≥ 직전 20봉 평균 × 1.5, 양봉 / 음봉', '거래량은 매수 주체나 실제 자금 유입을 뜻하지 않습니다.'],
    ['stoch', '낮은 구간에서 회복', '높은 구간에서 둔화', 'momentum', '최근 가격 범위 안에서 종가 위치가 바뀝니다.', 'Stochastic %K(14)가 20 상향 / 80 하향 교차', '평활 없는 %K이며 짧은 봉에서 민감합니다.'],
    ['breakout', '최근 고점 돌파', '최근 저점 이탈', 'trend', '이전 가격 범위를 종가 기준으로 벗어납니다.', '종가 > 직전 20봉 최고가 / < 직전 20봉 최저가', '순간 돌파 후 되돌림이 발생할 수 있습니다.'],
    ['engulf', '상승 몸통 감싸기', '하락 몸통 감싸기', 'candle', '현재 봉의 몸통이 반대 방향 직전 몸통을 감쌉니다.', '반대색 직전 봉, 현재 몸통이 이전 몸통 전체 포함', '작은 몸통에서도 나타나므로 추세와 함께 봅니다.'],
    ['wick', '아래 꼬리 반응', '위 꼬리 반응', 'candle', '한쪽 가격을 시도했다가 크게 되돌아온 봉입니다.', '해당 꼬리 ≥ 몸통 × 2, 반대 꼬리 ≤ 몸통, 몸통 > 0', '꼬리 모양만으로 다음 방향을 확정할 수 없습니다.'],
    ['williams', '범위 하단 집중', '범위 상단 집중', 'momentum', '최근 고점·저점 대비 종가 위치를 확인합니다.', 'Williams %R(14) ≤ −80 / ≥ −20', '추세가 강하면 한쪽 끝에 오래 머뭅니다.'],
    ['cci', '평균보다 낮은 가격', '평균보다 높은 가격', 'momentum', '대표 가격이 최근 평균에서 얼마나 떨어졌는지 봅니다.', 'CCI(20) ≤ −100 / ≥ 100, 대표 가격=(고가+저가+종가)/3', '지표의 크기를 반등·하락 확률로 읽으면 안 됩니다.'],
    ['three', '3봉 연속 상승', '3봉 연속 하락', 'trend', '종가가 같은 방향으로 세 번 이어졌습니다.', '최근 3개 종가 변화가 모두 양수 / 음수', '연속 움직임 뒤에 되돌림이 나올 수 있습니다.'],
    ['five', '5봉 연속 상승', '5봉 연속 하락', 'trend', '종가의 방향성이 다섯 번 이어졌습니다.', '최근 5개 종가 변화가 모두 양수 / 음수', '추격 진입에 유리하다는 의미는 아닙니다.'],
];
export const explorerSignals = definitions.flatMap(([key, up, down, family, description, rule, limit]) => ['long', 'short'].map(side => ({ id: `${key}-${side}`, name: side === 'long' ? up : down, side, family, description, rule, limit })));
export const ENGINE_VERSION = 'investai-signals-1';
const mean = (values) => values.reduce((a, b) => a + b, 0) / values.length;
const ema = (previous, current, length) => previous + (current - previous) * 2 / (length + 1);
const validCandle = (c) => [c.timestamp, c.open, c.high, c.low, c.close, c.volume].every(Number.isFinite) && Math.min(c.open, c.high, c.low, c.close) > 0 && c.volume >= 0 && c.low <= Math.min(c.open, c.close) && c.high >= Math.max(c.open, c.close);
/** Sequential, closed-bar-only features. Gaps reset indicator seeds and warm-up. */
export function signalFrames(candles, timeframe) {
    let start = 0, e9 = 0, e21 = 0, e12 = 0, e26 = 0, e50 = 0, macdSignal = 0, gain = 0, loss = 0;
    let previousMacd = 0, previousMacdSignal = 0, previousK = 50, previous9 = 0, previous21 = 0;
    const widths = [];
    return candles.map((c, i) => {
        const invalid = !validCandle(c);
        if (invalid || i === 0 || !validCandle(candles[i - 1]) || c.timestamp - candles[i - 1].timestamp !== timeframes[timeframe]) {
            start = i;
            e9 = e21 = e12 = e26 = e50 = c.close;
            macdSignal = gain = loss = previousMacd = previousMacdSignal = 0;
            previousK = 50;
            previous9 = previous21 = c.close;
            widths.length = 0;
        }
        const age = i - start;
        e9 = ema(e9, c.close, 9);
        e21 = ema(e21, c.close, 21);
        e12 = ema(e12, c.close, 12);
        e26 = ema(e26, c.close, 26);
        e50 = ema(e50, c.close, 50);
        const macd = e12 - e26;
        macdSignal = ema(macdSignal, macd, 9);
        const delta = age ? c.close - candles[i - 1].close : 0;
        if (age <= 14) {
            gain += Math.max(0, delta) / 14;
            loss += Math.max(0, -delta) / 14;
        }
        else {
            gain = (gain * 13 + Math.max(0, delta)) / 14;
            loss = (loss * 13 + Math.max(0, -delta)) / 14;
        }
        const rsi = age < 14 ? null : gain + loss === 0 ? 50 : loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
        const recent = candles.slice(Math.max(start, i - 19), i + 1), closes = recent.map(x => x.close), average = mean(closes);
        const deviation = Math.sqrt(mean(closes.map(x => (x - average) ** 2))), upper = average + 2 * deviation, lower = average - 2 * deviation;
        const width = average > 0 ? (upper - lower) / average : 0;
        const typical = recent.map(x => (x.high + x.low + x.close) / 3), typicalMean = mean(typical), mad = mean(typical.map(x => Math.abs(x - typicalMean)));
        const cci = mad ? (typical.at(-1) - typicalMean) / (0.015 * mad) : 0;
        const range = candles.slice(Math.max(start, i - 13), i + 1), high14 = Math.max(...range.map(x => x.high)), low14 = Math.min(...range.map(x => x.low));
        const k = high14 === low14 ? 50 : 100 * (c.close - low14) / (high14 - low14);
        const previous = candles.slice(Math.max(start, i - 20), i), vmean = previous.length ? mean(previous.map(x => x.volume)) : 0;
        const volumeRatio = vmean ? c.volume / vmean : null, p = candles[i - 1], body = Math.abs(c.close - c.open);
        const lowerWick = Math.min(c.open, c.close) - c.low, upperWick = c.high - Math.max(c.open, c.close);
        const signals = [];
        const add = (id, up, down) => { if (up)
            signals.push(`${id}-long`); if (down)
            signals.push(`${id}-short`); };
        const ready = !invalid && age >= 60;
        if (ready) {
            add('rsi', rsi <= 30, rsi >= 70);
            add('extreme', rsi <= 20, rsi >= 80);
            add('macd', previousMacd <= previousMacdSignal && macd > macdSignal, previousMacd >= previousMacdSignal && macd < macdSignal);
            add('ema', previous9 <= previous21 && e9 > e21, previous9 >= previous21 && e9 < e21);
            add('band', c.close < lower, c.close > upper);
            const pastWidths = widths.slice(-21, -1), lastWidth = widths.at(-1) ?? Infinity;
            const compressed = pastWidths.length === 20 && pastWidths.filter(x => x <= lastWidth).length <= 4;
            add('squeeze', compressed && c.close > upper, compressed && c.close < lower);
            add('volume', volumeRatio !== null && volumeRatio >= 1.5 && c.close > c.open, volumeRatio !== null && volumeRatio >= 1.5 && c.close < c.open);
            add('stoch', previousK <= 20 && k > 20, previousK >= 80 && k < 80);
            add('breakout', c.close > Math.max(...previous.map(x => x.high)), c.close < Math.min(...previous.map(x => x.low)));
            add('engulf', p.close < p.open && c.close > c.open && c.open <= p.close && c.close >= p.open, p.close > p.open && c.close < c.open && c.open >= p.close && c.close <= p.open);
            add('wick', body > 0 && lowerWick >= body * 2 && upperWick <= body, body > 0 && upperWick >= body * 2 && lowerWick <= body);
            add('williams', k <= 20, k >= 80);
            add('cci', cci <= -100, cci >= 100);
            for (const [name, n] of [['three', 3], ['five', 5]]) {
                const changes = candles.slice(i - n + 1, i + 1).map((x, j) => x.close - candles[i - n + j].close);
                add(name, changes.every(x => x > 0), changes.every(x => x < 0));
            }
        }
        widths.push(width);
        previous9 = e9;
        previous21 = e21;
        previousMacd = macd;
        previousMacdSignal = macdSignal;
        previousK = k;
        return { at: c.timestamp, signals, rsi, ema50: e50, volumeRatio, ready };
    });
}
export const defaultExplorerConfig = { timeframe: '1h', signals: ['rsi-long'], window: 3, horizon: 24, target: 2, cost: 0.2, side: 'long', regime: 'any', bars: 1000 };
export function validExplorerConfig(c) {
    return !!c && Object.hasOwn(timeframes, c.timeframe) && Array.isArray(c.signals) && c.signals.length > 0 && c.signals.length <= 30 && new Set(c.signals).size === c.signals.length && c.signals.every(id => explorerSignals.some(s => s.id === id)) && [1, 3, 6, 12].includes(c.window) && Number.isInteger(c.horizon) && c.horizon >= 1 && c.horizon <= 168 && Number.isFinite(c.target) && c.target > 0 && c.target < 100 && Number.isFinite(c.cost) && c.cost >= 0 && c.cost <= 10 && ['long', 'short'].includes(c.side) && ['any', 'above', 'below', 'volume'].includes(c.regime) && [1000, 3000, 5000].includes(c.bars);
}
export function matchesFrame(frames, candles, i, config) {
    const f = frames[i];
    if (!f?.ready)
        return false;
    const window = frames.slice(Math.max(0, i - config.window + 1), i + 1);
    if (window.length !== config.window || window.some((x, j) => !x.ready || j > 0 && x.at - window[j - 1].at !== timeframes[config.timeframe]))
        return false;
    if (!config.signals.length || !config.signals.every(id => window.some(x => x.signals.includes(id))))
        return false;
    return config.regime === 'any' || config.regime === 'above' && candles[i].close > f.ema50 || config.regime === 'below' && candles[i].close < f.ema50 || config.regime === 'volume' && (f.volumeRatio ?? 0) >= 1.5;
}
export function exploreHistory(candles, config, frames = signalFrames(candles, config.timeframe)) {
    if (!validExplorerConfig(config))
        return null;
    const records = [];
    let skippedGaps = 0, pending = 0;
    for (let i = 60; i < candles.length - 1; i++) {
        if (!matchesFrame(frames, candles, i, config))
            continue;
        if (i + config.horizon >= candles.length) {
            pending++;
            continue;
        }
        const future = candles.slice(i + 1, i + config.horizon + 1);
        if (future.some((c, j) => !validCandle(c) || c.timestamp - (j ? future[j - 1].timestamp : candles[i].timestamp) !== timeframes[config.timeframe])) {
            skippedGaps++;
            continue;
        }
        const entry = future[0].open, upper = entry * (1 + config.target / 100), lower = entry * (1 - config.target / 100);
        let outcome = 'timeout', exit = future.at(-1).close, exitAt = future.at(-1).timestamp;
        for (const c of future) {
            if (c.open >= upper || c.open <= lower) {
                outcome = c.open >= upper ? 'up' : 'down';
                exit = c.open;
                exitAt = c.timestamp;
                break;
            }
            const up = c.high >= upper, down = c.low <= lower;
            if (up || down) {
                outcome = up && down ? 'ambiguous' : up ? 'up' : 'down';
                exit = outcome === 'ambiguous' ? null : up ? upper : lower;
                exitAt = c.timestamp;
                break;
            }
        }
        records.push({ at: candles[i].timestamp, enteredAt: future[0].timestamp, exitAt, entry, exit, outcome, net: exit === null ? null : (exit / entry - 1) * 100 * (config.side === 'long' ? 1 : -1) - config.cost });
        i += config.horizon - 1;
    }
    const valid = records.filter(r => r.net !== null), n = valid.length, hits = valid.filter(r => r.outcome === (config.side === 'long' ? 'up' : 'down')).length;
    const proportion = n ? hits / n : null, z = 1.96, denominator = 1 + z * z / Math.max(1, n);
    const center = proportion === null ? 0 : (proportion + z * z / (2 * n)) / denominator;
    const half = proportion === null ? 0 : z * Math.sqrt(proportion * (1 - proportion) / n + z * z / (4 * n * n)) / denominator;
    const midpoint = candles[Math.floor(candles.length / 2)]?.timestamp ?? 0;
    return { records, samples: n, hits, proportion, interval: proportion === null ? null : [Math.max(0, center - half), Math.min(1, center + half)], meanNet: n ? mean(valid.map(r => r.net)) : null, skippedGaps, pending,
        up: records.filter(r => r.outcome === 'up').length, down: records.filter(r => r.outcome === 'down').length, timeout: records.filter(r => r.outcome === 'timeout').length, ambiguous: records.filter(r => r.outcome === 'ambiguous').length,
        splits: [valid.filter(r => r.at < midpoint), valid.filter(r => r.at >= midpoint)].map(rows => ({ samples: rows.length, meanNet: rows.length ? mean(rows.map(r => r.net)) : null })) };
}
