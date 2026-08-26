(function () {
  const WIDGET_VERSION = '1.3.17'
  const parseMetadata = metadata => {
    const dimensionsMap = (metadata && metadata.dimensions) || {}
    const measuresMap = (metadata && (metadata.mainStructureMembers || metadata.measures || metadata.accounts)) || {}
    const dimensions = []
    for (const key in dimensionsMap) {
      dimensions.push({ key, ...dimensionsMap[key] })
    }
    const measures = []
    for (const key in measuresMap) {
      measures.push({ key, ...measuresMap[key] })
    }
    return { dimensions, measures }
  }

  const feedToken = item => {
    if (item == null || item === '') {
      return null
    }
    if (typeof item === 'string' || typeof item === 'number') {
      return String(item)
    }
    if (typeof item !== 'object') {
      return null
    }
    return item.id || item.key || item.dimensionId || item.name || item.description || item.label || null
  }

  const collectFeedValues = (feeds, names) => {
    const values = []
    const push = item => {
      const token = feedToken(item)
      if (token != null && values.indexOf(token) === -1) {
        values.push(token)
      }
    }
    ;(names || []).forEach(name => {
      const feed = feeds && feeds[name]
      if (feed == null) {
        return
      }
      if (Array.isArray(feed)) {
        feed.forEach(push)
        return
      }
      if (typeof feed !== 'object') {
        push(feed)
        return
      }
      ;['values', 'members', 'ids', 'dimensions', 'value'].forEach(field => {
        const list = feed[field]
        if (Array.isArray(list)) {
          list.forEach(push)
        } else if (list != null && field === 'value') {
          push(list)
        }
      })
    })
    return values
  }

  const resolveFeeds = (dataBinding, metadata) => {
    return Object.assign(
      {},
      (dataBinding && dataBinding.feeds) || {},
      (metadata && metadata.feeds) || {}
    )
  }

  const identList = dimension => {
    return [dimension.key, dimension.id, dimension.description, dimension.label]
      .filter(value => value != null && value !== '')
      .map(value => String(value))
  }

  const rowCell = (row, dimension) => {
    if (!row || !dimension) {
      return {}
    }
    const keys = identList(dimension)
    for (let i = 0; i < keys.length; i++) {
      const cell = row[keys[i]]
      if (cell && typeof cell === 'object') {
        return cell
      }
    }
    return {}
  }

  const matchDimension = (dimensions, token) => {
    const value = String(feedToken(token) || '')
    if (!value) {
      return null
    }
    const n = value.trim().toLowerCase()
    return dimensions.find(dimension => {
      return identList(dimension).some(id => {
        const nid = id.trim().toLowerCase()
        return nid === n ||
          nid.endsWith('.' + n) ||
          nid.endsWith(':' + n) ||
          nid.indexOf('[' + n + ']') !== -1 ||
          nid.indexOf('&[' + n + ']') !== -1
      })
    }) || null
  }

  const dimName = dimension => String(dimension.description || dimension.label || dimension.id || dimension.key || '')
  const dimSearch = dimension => identList(dimension).join(' ').toLowerCase()

  const isVersionDim = dimension => /version/.test(dimSearch(dimension))
  const isDateDim = dimension => /date|time|month|period|year|calmonth|fiscal/.test(dimSearch(dimension))
  const isGlDim = dimension => /g[\s\/._-]*l[\s\/._-]*accounts?|glaccounts/.test(dimSearch(dimension))
  const isSelectorDim = dimension => isVersionDim(dimension) || isDateDim(dimension) || isGlDim(dimension) || /depth|structure/.test(dimSearch(dimension))

  const selectorRank = dimension => {
    if (isDateDim(dimension)) return 0
    if (isGlDim(dimension)) return 1
    if (isVersionDim(dimension)) return 2
    return 3
  }

  const sortSelectors = list => list.slice().sort((a, b) => selectorRank(a) - selectorRank(b))

  const uniqueDims = list => {
    const seen = new Set()
    const out = []
    ;(list || []).forEach(item => {
      if (item && !seen.has(item.key)) {
        seen.add(item.key)
        out.push(item)
      }
    })
    return out
  }

  const COLUMN_FEED_NAMES = ['dimensions2', 'columns', 'series', 'column', 'columnDimensions', 'color', 'categoryAxis2']
  const ROW_FEED_NAMES = ['dimensions', 'rows']

  const pickColumnDimensions = (dimensions, metadata, columnDimension, dataBinding) => {
    if (!dimensions || !dimensions.length) {
      return []
    }
    const feeds = resolveFeeds(dataBinding, metadata)
    const rowMatched = uniqueDims(collectFeedValues(feeds, ROW_FEED_NAMES).map(token => matchDimension(dimensions, token)))
    const rowKeys = new Set(rowMatched.map(dimension => dimension.key))
    let tokens = collectFeedValues(feeds, COLUMN_FEED_NAMES)
    Object.keys(feeds).forEach(name => {
      const lower = String(name || '').toLowerCase()
      if (ROW_FEED_NAMES.indexOf(lower) !== -1 || lower === 'measures' || lower === 'mainstructuremember') {
        return
      }
      collectFeedValues(feeds, [name]).forEach(item => {
        if (tokens.indexOf(item) === -1) {
          tokens.push(item)
        }
      })
    })
    let fromFeed = uniqueDims(tokens.map(token => matchDimension(dimensions, token)))
    const columnsFeedPopulated = fromFeed.length > 0
    if (!columnsFeedPopulated && rowMatched.length) {
      dimensions.forEach(dimension => {
        if (!rowKeys.has(dimension.key)) {
          fromFeed.push(dimension)
        }
      })
    }
    const requested = String(columnDimension == null ? 'Auto' : columnDimension).trim()
    if (requested === 'None') {
      return sortSelectors(fromFeed)
    }
    let list = fromFeed.slice()
    if (requested === 'Auto' || requested === '') {
      dimensions.filter(isSelectorDim).forEach(dimension => {
        if (columnsFeedPopulated && rowKeys.has(dimension.key)) {
          return
        }
        if (list.every(item => item.key !== dimension.key)) {
          list.push(dimension)
        }
      })
    } else if (requested !== 'Checked') {
      requested.split(',').forEach(part => {
        const item = matchDimension(dimensions, part.trim())
        if (item && list.every(existing => existing.key !== item.key)) {
          list.push(item)
        }
      })
    }
    return sortSelectors(list)
  }

  const pickRowDimensions = (dimensions, metadata, colDims, dataBinding) => {
    const feeds = resolveFeeds(dataBinding, metadata)
    const tokens = collectFeedValues(feeds, ROW_FEED_NAMES)
    const mapped = uniqueDims(tokens.map(token => matchDimension(dimensions, token)))
    const colKeys = new Set((colDims || []).map(dimension => dimension.key))
    if (mapped.length) {
      return mapped.filter(dimension => !colKeys.has(dimension.key))
    }
    return dimensions.filter(dimension => !colKeys.has(dimension.key))
  }

  const FISCAL_START_MONTH = 10

  const fiscalYearOf = date => {
    const month = date.getMonth() + 1
    const year = date.getFullYear()
    return month >= FISCAL_START_MONTH ? year + 1 : year
  }

  const fiscalPeriodOf = date => {
    const month = date.getMonth() + 1
    return ((month - FISCAL_START_MONTH + 12) % 12) + 1
  }

  const fiscalPeriodStart = (fiscalYear, period) => {
    const fy = Number(fiscalYear)
    const p = Math.max(1, Math.min(12, Number(period) || 1))
    const startYear = FISCAL_START_MONTH === 1 ? fy : fy - 1
    return new Date(startYear, FISCAL_START_MONTH - 1 + (p - 1), 1)
  }

  const parseLooseDate = value => {
    const text = String(value || '').trim()
    if (!text) {
      return null
    }
    const iso = text.match(/(\d{4})-(\d{2})-(\d{2})/)
    if (iso) {
      return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))
    }
    const fyThenP = text.match(/fiscalyear[^\d]*(20\d{2}|19\d{2})[\s\S]{0,160}?fiscalperiod[^\d]*0*(0?[1-9]|1[0-2])/i)
    if (fyThenP) {
      return fiscalPeriodStart(fyThenP[1], fyThenP[2])
    }
    const pThenFy = text.match(/fiscalperiod[^\d]*0*(0?[1-9]|1[0-2])[\s\S]{0,160}?fiscalyear[^\d]*(20\d{2}|19\d{2})/i)
    if (pThenFy) {
      return fiscalPeriodStart(pThenFy[2], pThenFy[1])
    }
    const ymd = text.match(/\b(\d{4})(\d{2})(\d{2})\b/)
    if (ymd) {
      return new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]))
    }
    const periodFirst = text.match(/P\s*(0?[1-9]|1[0-2])\D+(20\d{2}|19\d{2})/i)
    if (periodFirst) {
      return fiscalPeriodStart(periodFirst[2], periodFirst[1])
    }
    const yearFirst = text.match(/(20\d{2}|19\d{2})\D*P\s*(0?[1-9]|1[0-2])/i)
    if (yearFirst) {
      return fiscalPeriodStart(yearFirst[1], yearFirst[2])
    }
    const yq = text.match(/(\d{4})\D*Q(\d)/i)
    if (yq) {
      return new Date(Number(yq[1]), (Number(yq[2]) - 1) * 3, 1)
    }
    const ym = text.match(/(\d{4})[.\/-](\d{1,2})\b/)
    if (ym) {
      return new Date(Number(ym[1]), Number(ym[2]) - 1, 1)
    }
    const calYm = text.match(/(?:^|[^\d])(20\d{2}|19\d{2})(0[1-9]|1[0-2])(?:[^\d]|$)/)
    if (calYm && !/P\s*\d/i.test(text) && !/fiscalperiod/i.test(text)) {
      return new Date(Number(calYm[1]), Number(calYm[2]) - 1, 1)
    }
    const yearOnly = text.match(/^(20\d{2}|19\d{2})$/)
    if (yearOnly) {
      return fiscalPeriodStart(yearOnly[1], 1)
    }
    const year = text.match(/\b(20\d{2}|19\d{2})\b/)
    if (year) {
      return fiscalPeriodStart(year[1], 1)
    }
    const parsed = new Date(text)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  const memberDate = member => parseLooseDate((member && member.id) || '') || parseLooseDate((member && member.label) || '')

  const isAggregateDateMember = member => {
    const id = String((member && member.id) || '').trim()
    const label = String((member && member.label) || '').trim()
    if (!id && !label) {
      return true
    }
    if (/^(\(all\)|all)$/i.test(id) || /^(\(all\)|all)$/i.test(label) || /\[all\]|\.all\b/i.test(id)) {
      return true
    }
    const text = (id + ' ' + label).toLowerCase()
    if (/\bp\s*(0?[1-9]|1[0-2])\b/.test(text) ||
      /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/.test(text) ||
      /\d{4}[-./]\d{1,2}/.test(text) ||
      /\b(20\d{2}|19\d{2})(0[1-9]|1[0-2])([0-3]\d)?\b/.test(text) ||
      /fiscalperiod/i.test(text) ||
      /calmonth|\bmonth\b/.test(text)) {
      return false
    }
    return true
  }

  const forecastPeriodKey = member => {
    const date = memberDate(member)
    if (!date) {
      return ''
    }
    if (isAggregateDateMember(member)) {
      return 'Y' + fiscalYearOf(date)
    }
    return 'P' + fiscalYearOf(date) + '-' + fiscalPeriodOf(date)
  }

  const forecastDateCandidates = (fiscalYear, period) => {
    const fy = Number(fiscalYear)
    const p = Math.max(1, Math.min(12, Number(period) || 1))
    const start = fiscalPeriodStart(fy, p)
    const calYear = start.getFullYear()
    const calMonth = String(start.getMonth() + 1).padStart(2, '0')
    const yyyymm = String(calYear) + calMonth
    const p2 = String(p).padStart(2, '0')
    const p3 = String(p).padStart(3, '0')
    return [
      'P' + p2 + ' (' + fy + ')',
      yyyymm,
      calYear + '-' + calMonth,
      calYear + '-' + calMonth + '-01',
      String(fy) + p2,
      String(fy) + p3,
      '[Date].&[' + yyyymm + ']',
      '[Date].[YQM].&[' + yyyymm + ']',
      '[Date].[YQM].[Date.CALMONTH].&[' + yyyymm + ']',
      '[Date].[YHM].&[' + yyyymm + ']',
      '[Date].[FHQP].&[' + fy + p2 + ']',
      '[Date].[FISCALYEARPERIOD].&[' + fy + p3 + ']'
    ]
  }

  const normalizeFetchedCell = value => {
    if (value == null || value === '' || value === false) {
      return null
    }
    if (typeof value === 'number') {
      return Number.isNaN(value) ? null : { raw: value, formatted: String(value) }
    }
    if (typeof value === 'string') {
      const numeric = Number(String(value).replace(/,/g, ''))
      if (value.trim() === '' || Number.isNaN(numeric)) {
        return null
      }
      return { raw: numeric, formatted: value }
    }
    if (typeof value === 'object') {
      const raw = value.raw != null ? value.raw : (value.value != null ? value.value : value.formatted)
      if (raw == null || raw === '') {
        return null
      }
      const numeric = typeof raw === 'number' ? raw : Number(String(raw).replace(/,/g, ''))
      if (Number.isNaN(numeric)) {
        return null
      }
      return { raw: numeric, formatted: value.formatted || value.displayValue || String(raw) }
    }
    return null
  }

  const versionMatches = (cell, token) => {
    if (!token) {
      return true
    }
    const id = String((cell && cell.id) || '')
    const label = String((cell && cell.label) || (cell && cell.name) || '')
    const want = String(token)
    if (!id && !label) {
      return false
    }
    if (id === want || label === want ||
      id.toLowerCase() === want.toLowerCase() ||
      label.toLowerCase() === want.toLowerCase()) {
      return true
    }
    const compact = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '')
    const needle = compact(want)
    if (needle.length < 2) {
      return false
    }
    return compact(id).indexOf(needle) !== -1 || compact(label).indexOf(needle) !== -1
  }

  const lastBookedActualDate = (data, dateDim, versionDim, actualToken) => {
    let best = null
    ;(data || []).forEach(row => {
      if (versionDim) {
        const cell = rowCell(row, versionDim)
        const looksActual = /actual/i.test(String(cell.id || '')) || /actual/i.test(String(cell.label || ''))
        const tokenLooksActual = /actual/i.test(String(actualToken || ''))
        if (actualToken && !versionMatches(cell, actualToken) && !(tokenLooksActual && looksActual)) {
          return
        }
        if (!actualToken && !looksActual) {
          return
        }
      }
      if (!dateDim) {
        return
      }
      const dateCell = rowCell(row, dateDim)
      if (isAggregateDateMember(dateCell)) {
        return
      }
      const date = memberDate(dateCell)
      if (date && (!best || date.getTime() > best.getTime())) {
        best = date
      }
    })
    return best
  }

  const resolveCutOver = (setting, options) => {
    const opts = options || {}
    const mode = String(opts.mode || setting || 'Today')
    if (/last booked/i.test(mode) || mode === 'LastBooked') {
      return lastBookedActualDate(opts.data, opts.dateDim, opts.versionDim, opts.actualToken) || new Date()
    }
    if (/specific/i.test(mode) || mode === 'SpecificDate') {
      const token = opts.specificDate || setting
      const fromMember = (opts.dateMembers || []).find(item =>
        String(item.id) === String(token) || String(item.label) === String(token) || String(item.name) === String(token)
      )
      return (fromMember && memberDate(fromMember)) || parseLooseDate(token) || new Date()
    }
    const text = String(setting || mode || 'Today')
    if (!text || /^today/i.test(text) || /^current period/i.test(text)) {
      return new Date()
    }
    return parseLooseDate(text) || new Date()
  }

  const isForecastLookBack = (member, cutover) => {
    const date = memberDate(member)
    if (!date || !(cutover instanceof Date)) {
      return true
    }
    const bookedEnd = endOfPeriod(cutover, 'month')
    return date.getTime() <= bookedEnd.getTime()
  }

  const versionNameOf = (list, token) => {
    const item = (list || []).find(entry => String(entry.id) === String(token) || String(entry.label) === String(token) || String(entry.name) === String(token))
    return item ? (item.label || item.name || item.id) : (token || '')
  }

  const isActualVersion = token => /actual/i.test(String(token || ''))

  const sortVersionMembers = members => {
    const rank = item => {
      const text = String((item && (item.label || item.id)) || '').toLowerCase()
      if (/actual/.test(text)) {
        return 0
      }
      if (/\bfc\b|forecast/.test(text)) {
        return 1
      }
      if (/\bbdg\b|budget/.test(text)) {
        return 2
      }
      return 3
    }
    return (members || []).slice().sort((a, b) => {
      const diff = rank(a) - rank(b)
      if (diff) {
        return diff
      }
      return String(a.label || a.id).localeCompare(String(b.label || b.id))
    })
  }

  const expandVersionLeafColumns = (measures, versionMembers) => {
    const versions = (versionMembers || []).filter(item => item && item.id)
    if (!versions.length) {
      return measures.map(measure => ({ measure, date: null, versionId: '', versionLabel: '', key: measure.key }))
    }
    const leaves = []
    versions.forEach(ver => {
      measures.forEach(measure => {
        leaves.push({
          measure,
          date: null,
          versionId: ver.id,
          versionLabel: ver.label || ver.id,
          key: [ver.id, measure.key].join('|')
        })
      })
    })
    return leaves
  }

  const memberHierarchyDepth = member => {
    const id = String((member && member.id) || '')
    const label = String((member && member.label) || '')
    const text = (id + ' ' + label).toLowerCase()
    if (!id && !label) {
      return 0
    }
    if (/^\(all\)$|^all$|^total$/i.test(label.trim()) || /\[all\]|\.all\b/i.test(id)) {
      return 0
    }
    if (/\bq\s*[1-4]\b|quarter/.test(text)) {
      return 2
    }
    if (/\d{4}[-./]\d{1,2}[-./]\d{1,2}/.test(text) || /\b(20\d{2}|19\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\b/.test(text)) {
      return 4
    }
    if (/\bp\s*(0?[1-9]|1[0-2])\b/.test(text) || /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/.test(text) || /\d{4}[-./]\d{1,2}\b/.test(text) || /calmonth|\bmonth\b/.test(text)) {
      return 3
    }
    if (/\b(20\d{2}|19\d{2})\b/.test(text)) {
      return 1
    }
    const amps = (id.match(/&\[[^\]]+\]/g) || []).length
    if (amps) {
      return amps
    }
    const parts = id.split(/[./]/).filter(Boolean)
    return Math.max(1, parts.length)
  }

  const filterMembersByLevel = (members, levelKey) => {
    const list = (members || []).filter(item => item && (item.id || item.label))
    if (!levelKey || levelKey === 'all') {
      return list
    }
    const mapped = { year: 1, quarter: 2, month: 3, week: 3, day: 4 }
    const depth = mapped[levelKey] != null ? mapped[levelKey] : Number(levelKey)
    if (!Number.isFinite(depth)) {
      return list
    }
    const matched = list.filter(item => memberHierarchyDepth(item) === depth)
    return matched.length ? matched : list
  }

  const multiplyLeavesByMembers = (leaves, dimKey, members, asDate) => {
    const vals = (members || []).filter(item => item && (item.id || item.label))
    if (!vals.length) {
      return leaves
    }
    const out = []
    vals.forEach(member => {
      const token = { id: member.id || member.label, label: member.label || member.id }
      leaves.forEach(leaf => {
        const next = Object.assign({}, leaf, { stack: Object.assign({}, leaf.stack || {}) })
        next.stack[dimKey] = token
        if (asDate) {
          next.date = token
        }
        next.key = [token.id, leaf.key].join('|')
        out.push(next)
      })
    })
    return out
  }

  const startOfPeriod = (date, unit) => {
    const value = new Date(date.getTime())
    const key = String(unit || 'Year').toLowerCase()
    if (key === 'day') {
      return new Date(value.getFullYear(), value.getMonth(), value.getDate())
    }
    if (key === 'week') {
      const day = value.getDay()
      value.setDate(value.getDate() - day)
      return new Date(value.getFullYear(), value.getMonth(), value.getDate())
    }
    if (key === 'month') {
      return new Date(value.getFullYear(), value.getMonth(), 1)
    }
    if (key === 'quarter') {
      return new Date(value.getFullYear(), Math.floor(value.getMonth() / 3) * 3, 1)
    }
    return fiscalPeriodStart(fiscalYearOf(value), 1)
  }

  const endOfPeriod = (date, unit) => {
    const start = startOfPeriod(date, unit)
    const key = String(unit || 'Year').toLowerCase()
    if (key === 'day') {
      return new Date(start.getFullYear(), start.getMonth(), start.getDate(), 23, 59, 59, 999)
    }
    if (key === 'week') {
      return new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59, 999)
    }
    if (key === 'month') {
      return new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999)
    }
    if (key === 'quarter') {
      return new Date(start.getFullYear(), start.getMonth() + 3, 0, 23, 59, 59, 999)
    }
    const fyEnd = fiscalPeriodStart(fiscalYearOf(date), 12)
    return new Date(fyEnd.getFullYear(), fyEnd.getMonth() + 1, 0, 23, 59, 59, 999)
  }

  const addPeriods = (date, count, unit) => {
    const value = new Date(date.getTime())
    const n = Number(count) || 0
    const key = String(unit || 'Year').toLowerCase()
    if (key === 'day') {
      value.setDate(value.getDate() + n)
    } else if (key === 'week') {
      value.setDate(value.getDate() + (n * 7))
    } else if (key === 'month') {
      value.setMonth(value.getMonth() + n)
    } else if (key === 'quarter') {
      value.setMonth(value.getMonth() + (n * 3))
    } else {
      return fiscalPeriodStart(fiscalYearOf(value) + n, fiscalPeriodOf(value))
    }
    return value
  }

  const grainKeyOf = unit => {
    const key = String(unit || 'Month').toLowerCase()
    if (key === 'year') {
      return 'year'
    }
    if (key === 'quarter') {
      return 'quarter'
    }
    if (key === 'week' || key === 'day') {
      return key === 'week' ? 'week' : 'day'
    }
    return 'month'
  }

  const formatForecastDateLabel = (member, grain) => {
    const existing = String((member && member.label) || '')
    if (/P\s*(0?[1-9]|1[0-2])/i.test(existing) && /\d{4}/.test(existing)) {
      return existing
    }
    const date = memberDate(member)
    if (!date) {
      return existing || (member && member.id) || ''
    }
    const key = grainKeyOf(grain)
    if (key === 'year') {
      return String(fiscalYearOf(date))
    }
    if (key === 'quarter') {
      return fiscalYearOf(date) + ' Q' + Math.ceil(fiscalPeriodOf(date) / 3)
    }
    if (key === 'month') {
      const period = String(fiscalPeriodOf(date)).padStart(2, '0')
      return 'P' + period + ' (' + fiscalYearOf(date) + ')'
    }
    return existing || (member && member.id) || ''
  }

  const pickForecastDateMembers = (members, cutover, settings) => {
    const opts = settings || {}
    const grain = opts.granularity || 'Month'
    const range = opts.range || 'Year'
    const lookBackN = Number(opts.lookBackAdditional || 0)
    const lookBackUnit = opts.lookBackAdditionalUnit || 'Year'
    const lookAheadN = Number(opts.lookAheadAdditional || 0)
    const lookAheadUnit = opts.lookAheadAdditionalUnit || 'Year'
    const pivot = cutover instanceof Date ? cutover : new Date()
    const rangeStart = startOfPeriod(pivot, range)
    const rangeEnd = endOfPeriod(pivot, range)
    const from = addPeriods(rangeStart, -lookBackN, lookBackUnit)
    const to = addPeriods(rangeEnd, lookAheadN, lookAheadUnit)
    const dated = (members || []).map(member => ({ member, date: memberDate(member) })).filter(item => item.date)
    dated.sort((a, b) => a.date.getTime() - b.date.getTime())
    const lookBackExtra = []
    const inRange = []
    const lookAheadExtra = []
    dated.forEach(item => {
      if (item.date < from || item.date > to) {
        return
      }
      if (item.date < rangeStart) {
        lookBackExtra.push(item.member)
      } else if (item.date > rangeEnd) {
        lookAheadExtra.push(item.member)
      } else {
        inRange.push(item.member)
      }
    })
    const pick = (list, level) => {
      if (!list.length) {
        return []
      }
      const filtered = filterMembersByLevel(list, level)
      return filtered.length ? filtered : list
    }
    const backLevel = lookBackUnit.toLowerCase() === 'year' ? 'year' : grainKeyOf(lookBackUnit)
    const aheadExtraLevel = lookAheadUnit.toLowerCase() === 'year' ? 'year' : grainKeyOf(lookAheadUnit)
    const aheadLevel = grainKeyOf(grain)
    const picked = pick(lookBackExtra, backLevel).concat(pick(inRange, aheadLevel)).concat(pick(lookAheadExtra, aheadExtraLevel))
    const seen = new Set()
    return picked.filter(member => {
      const id = member.id || member.label
      if (!id || seen.has(id)) {
        return false
      }
      seen.add(id)
      return true
    })
  }

  const isForecastTableType = value => /forecast/i.test(String(value || '')) && !/cross[- ]?tab/i.test(String(value || ''))

  const synthesizeForecastAxis = (cutover, settings) => {
    const opts = settings || {}
    const grain = grainKeyOf(opts.granularity || 'Month')
    const range = opts.range || 'Year'
    const lookBackN = Number(opts.lookBackAdditional || 0)
    const lookBackUnit = opts.lookBackAdditionalUnit || 'Year'
    const lookAheadN = Number(opts.lookAheadAdditional || 0)
    const lookAheadUnit = opts.lookAheadAdditionalUnit || 'Year'
    const pivot = cutover instanceof Date && !Number.isNaN(cutover.getTime()) ? cutover : new Date()
    const rangeStart = startOfPeriod(pivot, range)
    const rangeEnd = endOfPeriod(pivot, range)
    const fy = fiscalYearOf(pivot)
    const members = []
    if (lookBackN > 0 && /year/i.test(lookBackUnit)) {
      for (let i = lookBackN; i >= 1; i--) {
        const year = String(fy - i)
        members.push({ id: year, label: year })
      }
    }
    if (grain === 'year') {
      members.push({ id: String(fy), label: String(fy) })
    } else if (grain === 'quarter') {
      for (let q = 1; q <= 4; q++) {
        const start = fiscalPeriodStart(fy, (q - 1) * 3 + 1)
        if (start >= rangeStart && start <= rangeEnd) {
          const label = fy + ' Q' + q
          members.push({ id: label, label: label })
        }
      }
    } else {
      for (let period = 1; period <= 12; period++) {
        const start = fiscalPeriodStart(fy, period)
        if (start < rangeStart || start > rangeEnd) {
          continue
        }
        const label = 'P' + String(period).padStart(2, '0') + ' (' + fy + ')'
        members.push({ id: label, label: label })
      }
    }
    if (lookAheadN > 0 && /year/i.test(lookAheadUnit)) {
      for (let i = 1; i <= lookAheadN; i++) {
        const year = String(fy + i)
        members.push({ id: year, label: year })
      }
    }
    return members
  }

  const mergeForecastAxis = (fromData, synthesized) => {
    const synth = synthesized || []
    if (!synth.length) {
      return fromData || []
    }
    const dataMonths = (fromData || []).filter(item => memberHierarchyDepth(item) >= 3)
    if (!dataMonths.length) {
      return synth
    }
    const seen = new Set()
    const out = []
    const add = member => {
      const id = member && (member.id || member.label)
      if (!id || seen.has(id)) {
        return
      }
      seen.add(id)
      out.push(member)
    }
    synth.forEach(member => {
      if (memberHierarchyDepth(member) <= 1) {
        add(member)
        return
      }
      const want = memberDate(member)
      const match = dataMonths.find(item => {
        const date = memberDate(item)
        return date && want && fiscalYearOf(date) === fiscalYearOf(want) && fiscalPeriodOf(date) === fiscalPeriodOf(want)
      })
      add(match || member)
    })
    return out
  }

  const isAllMember = member => {
    const id = String((member && member.id) || '').trim()
    const label = String((member && member.label) || '').trim()
    return !id || /^(\(all\)|all)$/i.test(id) || /^(\(all\)|all)$/i.test(label)
  }

  const sameForecastDate = (cell, columnDate) => {
    if (!columnDate) {
      return true
    }
    const id = String((cell && cell.id) || '')
    const label = String((cell && cell.label) || '')
    if (!id && !label) {
      return false
    }
    if (/^(\(all\)|all)$/i.test(id.trim()) || /^(\(all\)|all)$/i.test(label.trim())) {
      return false
    }
    if (id === columnDate.id || label === columnDate.id || label === columnDate.label || id === columnDate.label) {
      return true
    }
    if (isAggregateDateMember(cell) && memberHierarchyDepth(columnDate) >= 3) {
      return false
    }
    const a = memberDate({ id: id, label: label })
    const b = memberDate(columnDate)
    if (!a || !b) {
      return false
    }
    if (memberHierarchyDepth(columnDate) <= 1) {
      return fiscalYearOf(a) === fiscalYearOf(b)
    }
    return fiscalYearOf(a) === fiscalYearOf(b) && fiscalPeriodOf(a) === fiscalPeriodOf(b)
  }

  const drillOptionsFor = dimension => {
    if (isDateDim(dimension)) {
      return [
        { id: 'all', name: '(all)' },
        { id: 'year', name: 'Year' },
        { id: 'quarter', name: 'Quarter' },
        { id: 'month', name: 'Month' },
        { id: 'week', name: 'Week' },
        { id: 'day', name: 'Day' }
      ]
    }
    return [
      { id: 'all', name: '(all)' },
      { id: '1', name: 'Level 1' },
      { id: '2', name: 'Level 2' },
      { id: '3', name: 'Level 3' },
      { id: '4', name: 'Level 4' }
    ]
  }

  const setupMessage = extra => {
    return `
      <div class="placeholder">
        <strong>Connect data in the Builder panel</strong>
        <ol>
          <li>Use an <em>Optimized Story</em> (not Classic).</li>
          <li>Select this widget, open <em>Builder</em> (not Styling).</li>
          <li>Choose a model.</li>
          <li>Add ARE and Cost Center to <em>Rows</em>. Their names appear as row headers under the stacked column dimensions.</li>
          <li>Add Date, GL-Accounts, and Version to <em>Columns</em>. Date and GL-Accounts stack under Measures. Version members such as Actual, FC, and BDG become side-by-side column groups, each with the measures underneath.</li>
          <li>Add measures such as Global Currency and Local Currency to <em>Measures</em>.</li>
          <li>For a planning model, set a <em>Version</em> (and Date if required).</li>
        </ol>
        ${extra ? `<p>${extra}</p>` : ''}
      </div>
    `
  }

  const rowKey = (row, dimensions) => {
    return dimensions.map(dimension => {
      const cell = row[dimension.key]
      return cell && cell.id ? cell.id : ''
    }).join('|')
  }

  const changeKey = (row, dimensions, measureKey) => {
    return rowKey(row, dimensions) + '||' + measureKey
  }

  const formatNumber = (value, options, boundFormatted) => {
    if (value === null || value === undefined || value === '' || Number.isNaN(Number(value))) {
      return ''
    }
    const opts = options || {}
    if ((opts.decimalPlaces === 'Default' || opts.decimalPlaces === '' || opts.decimalPlaces === undefined) &&
        opts.scale === 'Default' && boundFormatted) {
      return boundFormatted
    }
    let numeric = Number(value)
    const scale = opts.scale
    if (scale === 'Thousand') numeric = numeric / 1000
    if (scale === 'Million') numeric = numeric / 1000000
    if (scale === 'Billion') numeric = numeric / 1000000000
    if (scale === 'Percent') numeric = numeric * 100
    const digits = (opts.decimalPlaces === 'Default' || opts.decimalPlaces === '' || opts.decimalPlaces === undefined)
      ? 2
      : Number(opts.decimalPlaces)
    const safeDigits = Number.isFinite(digits) ? Math.max(0, Math.min(9, digits)) : 2
    let text = Math.abs(numeric).toLocaleString(undefined, {
      minimumFractionDigits: safeDigits,
      maximumFractionDigits: safeDigits
    })
    if (scale === 'Thousand' && opts.scaleFormat !== 'Default') text += 'k'
    if (scale === 'Million' && opts.scaleFormat !== 'Default') text += 'M'
    if (scale === 'Billion' && opts.scaleFormat !== 'Default') text += 'Bn'
    if (scale === 'Percent') text += '%'
    const negative = numeric < 0
    if (opts.showSignAs === 'Parentheses' && negative) {
      return '(' + text + ')'
    }
    if (opts.showSignAs === 'PlusMinus') {
      return (negative ? '-' : '+') + text
    }
    return (negative ? '-' : '') + text
  }

  const DEFAULT_RULES = [
    { name: 'Editable IHBs', target: 'editable', background: '', color: '' },
    { name: 'Read-only Accounts IHB', target: 'readonly-account', background: '', color: '' },
    { name: 'Read-only IHB', target: 'readonly', background: '', color: '' },
    { name: 'ReadOnlyInternalAccounts', target: 'readonly-account', background: '', color: '' },
    { name: 'Editable', target: 'editable', background: '', color: '' },
    { name: 'Read-only', target: 'readonly', background: '', color: '' }
  ]

  const parseRules = json => {
    try {
      const parsed = JSON.parse(json || '[]')
      if (Array.isArray(parsed) && parsed.length) {
        return parsed
      }
    } catch (ignore) {}
    return DEFAULT_RULES.map(rule => Object.assign({}, rule))
  }

  const ruleHasStyle = rule => !!(rule && (rule.background || rule.color))

  const firstMatchingRule = (rules, kind) => {
    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i]
      if (!ruleHasStyle(rule)) {
        continue
      }
      const target = rule.target || 'all'
      if (target === 'all' || target === kind) {
        return rule
      }
      if (kind === 'readonly-account' && target === 'readonly') {
        return rule
      }
      if (kind === 'dimension' && (target === 'readonly' || target === 'readonly-account')) {
        return rule
      }
    }
    return null
  }

  const ruleStyle = (rule, extra) => {
    const parts = []
    if (rule && rule.background) {
      parts.push('background:' + rule.background)
    }
    if (rule && rule.color) {
      parts.push('color:' + rule.color)
    }
    if (extra) {
      parts.push(extra)
    }
    return parts.join(';')
  }

  const parseInputNumber = value => {
    if (value === null || value === undefined) {
      return null
    }
    const normalized = String(value).replace(/,/g, '').trim()
    if (!normalized) {
      return null
    }
    const parsed = Number(normalized)
    return Number.isNaN(parsed) ? null : parsed
  }

  const buildSelection = (row, dimensions, measure) => {
    const selection = {}
    dimensions.forEach(dimension => {
      const cell = row[dimension.key]
      if (cell && cell.id && dimension.id) {
        selection[dimension.id] = cell.id
      }
    })
    if (measure && measure.id) {
      selection[measure.id] = measure.id
    }
    return selection
  }

  const toPlanningChange = (row, dimensions, measure, oldValue, newValue) => {
    const selection = buildSelection(row, dimensions, measure)
    const dimensionMemberIds = dimensions.map(dimension => {
      const cell = row[dimension.key]
      return (dimension.id || dimension.key) + '=' + ((cell && cell.id) || '')
    }).join(';')
    const dimensionLabels = dimensions.map(dimension => {
      const cell = row[dimension.key]
      return (dimension.description || dimension.id || dimension.key) + '=' + ((cell && cell.label) || '')
    }).join(';')
    return {
      measureId: measure.id || measure.key,
      measureDescription: measure.label || measure.description || measure.id || measure.key,
      oldValue: oldValue === null || oldValue === undefined ? '' : String(oldValue),
      newValue: newValue === null || newValue === undefined ? '' : String(newValue),
      selectionJson: JSON.stringify(selection),
      dimensionMemberIds,
      dimensionLabels
    }
  }

  const template = document.createElement('template')
  template.innerHTML = `
    <style>
      :host {
        display: block;
        width: 100%;
        height: 100%;
        font-family: "72", "72full", Arial, Helvetica, sans-serif;
        color: #1d2d3e;
      }
      #root {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
        background: #fff;
        border: 1px solid #d9d9d9;
        position: relative;
      }
      .toolbar {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 10px;
        border-bottom: 1px solid #e5e5e5;
        background: #f5f6f7;
        flex: 0 0 auto;
      }
      .toolbar .version {
        font-size: 11px;
        font-weight: 700;
        color: #0854a0;
      }
      .toolbar .status {
        margin-left: auto;
        font-size: 12px;
        color: #556b82;
      }
      button {
        font: inherit;
        font-size: 12px;
        padding: 4px 10px;
        border: 1px solid #0854a0;
        background: #0854a0;
        color: #fff;
        border-radius: 4px;
        cursor: pointer;
      }
      button.secondary {
        background: #fff;
        color: #0854a0;
      }
      button:disabled {
        opacity: 0.45;
        cursor: default;
      }
      .table-wrap {
        overflow: auto;
        flex: 1 1 auto;
      }
      table {
        border-collapse: collapse;
        width: 100%;
        min-width: 100%;
      }
      th, td {
        border: 1px solid #d9d9d9;
        padding: 6px 8px;
        white-space: nowrap;
        text-align: left;
        vertical-align: middle;
      }
      th {
        position: static;
        z-index: 1;
        font-weight: 600;
      }
      td.measure, th.measure {
        text-align: right;
      }
      td.dim {
        background: #f8f9fa;
      }
      thead tr.axis th.axis-label,
      thead tr.selector th.axis-label {
        text-align: right;
        font-weight: 700;
        background: #fff;
        color: #32363a;
      }
      tr.selector th, tr.selector td {
        position: static;
        background: #fff;
        color: #32363a;
        font-weight: 700;
        text-align: right;
        border-bottom: 1px solid #d9d9d9;
      }
      thead tr.row-headers th.row-dim-name {
        position: static;
        text-align: left;
        font-weight: 700;
        background: #fff;
        color: #32363a;
        border-bottom: 1px solid #1d2d3e;
      }
      thead tr.row-headers th.measure-bar {
        position: static;
        background: #fff;
        border-bottom: 4px solid #4a5a6a;
      }
      thead tr.row-headers th.measure-bar.actual {
        border-bottom: 4px solid #4a5a6a;
      }
      thead tr.row-headers th.measure-bar.plan {
        border-bottom: 4px solid transparent;
        background: repeating-linear-gradient(-45deg, #9aa4ad, #9aa4ad 2px, #ffffff 2px, #ffffff 5px);
        background-origin: border-box;
      }
      select.member-link,
      span.member-link {
        max-width: 100%;
        border: 0;
        background: transparent;
        color: #0854a0;
        font: inherit;
        font-weight: 700;
        cursor: pointer;
        appearance: none;
        -webkit-appearance: none;
      }
      .chev {
        color: #0854a0;
        font-size: 11px;
        margin-left: 4px;
      }
      button.drill-btn {
        border: 0;
        background: none;
        color: #0854a0;
        cursor: pointer;
        font: inherit;
        font-weight: 700;
        padding: 0 4px;
      }
      .drill-menu {
        position: absolute;
        min-width: 148px;
        background: #fff;
        border: 1px solid #d9d9d9;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.16);
        z-index: 60;
        padding: 4px 0;
      }
      .drill-menu button {
        display: block;
        width: 100%;
        border: 0;
        background: none;
        text-align: left;
        padding: 6px 12px;
        font: inherit;
        cursor: pointer;
      }
      .drill-menu button:hover,
      .drill-menu button.active {
        background: #e8f2fe;
      }
      tfoot td {
        font-weight: 600;
        background: #f5f6f7;
      }
      input.cell-input {
        width: 100%;
        box-sizing: border-box;
        border: 1px solid transparent;
        background: transparent;
        text-align: right;
        font: inherit;
        color: inherit;
        padding: 2px 0;
      }
      input.cell-input:focus {
        outline: 2px solid #0854a0;
        background: #fff;
      }
      .changed input.cell-input {
        font-weight: 600;
      }
      .placeholder, .error {
        padding: 16px;
        color: #556b82;
        font-size: 13px;
        line-height: 1.45;
      }
      .placeholder ol {
        margin: 8px 0 0 18px;
        padding: 0;
      }
      .placeholder p {
        margin: 12px 0 0;
      }
      .error {
        color: #aa0808;
      }
    </style>
    <div id="root">
      <div id="toolbar" class="toolbar"></div>
      <div id="table-wrap" class="table-wrap"></div>
    </div>
  `

  class PlanningTable extends HTMLElement {
    constructor () {
      super()
      this._shadowRoot = this.attachShadow({ mode: 'open' })
      this._shadowRoot.appendChild(template.content.cloneNode(true))
      this._root = this._shadowRoot.getElementById('root')
      this._toolbar = this._shadowRoot.getElementById('toolbar')
      this._tableWrap = this._shadowRoot.getElementById('table-wrap')
      this._pending = new Map()
      this._lastChange = {
        measureId: '',
        measureDescription: '',
        oldValue: '',
        newValue: '',
        selectionJson: '{}',
        dimensionMemberIds: '',
        dimensionLabels: ''
      }
      this._editing = false
      this._props = {}
      this._dimFilters = {}
      this._drillLevels = {}
      this._forecastCache = null
      this._chosenTableType = ''
    }

    onCustomWidgetResize () {
      // Layout is CSS flex; no extra work required.
    }

    _resolvedTableType () {
      return this._chosenTableType || this.tableType || (this._props && this._props.tableType) || 'Cross-Tab'
    }

    onCustomWidgetAfterUpdate (changedProps) {
      Object.assign(this._props, changedProps || {})
      if (changedProps && changedProps.dataBinding) {
        this._bindingFromUpdate = changedProps.dataBinding
      }
      if (changedProps && changedProps.tableType) {
        const keys = Object.keys(changedProps)
        const echoedDefault = isForecastTableType(this._chosenTableType) &&
          !isForecastTableType(changedProps.tableType) &&
          changedProps.dataBinding &&
          keys.length > 1
        if (!echoedDefault) {
          this._chosenTableType = changedProps.tableType
          this._lastTableType = changedProps.tableType
          this._forecastPrimeStarted = false
          this._forecastDateMembers = []
          this._forecastCache = null
          this._forecastDrillDim = null
          this._forecastDrillLevel = null
          this._forecastDrillAt = 0
          this._forecastDrillTries = 0
          this._clearForecastDateFilter()
          if (isForecastTableType(changedProps.tableType)) {
            this._primeForecastDateMembers()
          }
        }
      }
      const forecastModeNow = isForecastTableType(this._resolvedTableType())
      if (forecastModeNow) {
        this._syncForecastDrillLevel()
        this._primeForecastDateMembers()
      }
      if (!this._editing) {
        this.render()
      }
    }

    _syncForecastDrillLevel () {
      const binding = this._resolveDataBinding()
      const metadata = binding && binding.metadata
      const data = binding && binding.data
      const dimensions = parseMetadata(metadata).dimensions
      const dateDim = (dimensions || []).find(isDateDim)
      if (!dateDim) {
        return
      }
      const grain = grainKeyOf(this.timeframeGranularity || 'Month')
      const hasPeriodRows = (data || []).some(row => !isAggregateDateMember(rowCell(row, dateDim)))
      if (hasPeriodRows) {
        this._forecastDrillDim = dateDim.key
        this._forecastDrillLevel = grain
        return
      }
      if ((this._forecastDrillTries || 0) >= 3) {
        return
      }
      const now = Date.now()
      if (this._forecastDrillAt && now - this._forecastDrillAt < 2000) {
        return
      }
      this._forecastDrillAt = now
      if (!this._forecastDrillTries) {
        this._clearForecastDateFilter()
      }
      this._forecastDrillTries = (this._forecastDrillTries || 0) + 1
      this._forecastDrillDim = null
      this._forecastDrillLevel = null
      this._applyHierarchyLevel(dateDim, grain)
    }

    getLastChange () {
      return this._lastChange
    }

    getPendingChanges () {
      return JSON.stringify(Array.from(this._pending.values()).map(entry => entry.change))
    }

    getPendingChangeCount () {
      return this._pending.size
    }

    submitChanges () {
      this.dispatchEvent(new Event('onSubmit'))
    }

    revertChanges () {
      this._pending.clear()
      this._editing = false
      this.render()
      this.dispatchEvent(new Event('onRevert'))
    }

    setReadOnly (value) {
      this.readOnly = !!value
      this.dispatchEvent(new CustomEvent('propertiesChanged', {
        detail: { properties: { readOnly: this.readOnly } }
      }))
    }

    _resolveDataBinding () {
      if (this.dataBinding && typeof this.dataBinding === 'object') {
        return this.dataBinding
      }
      if (this._bindingFromUpdate && typeof this._bindingFromUpdate === 'object') {
        return this._bindingFromUpdate
      }
      try {
        if (this.dataBindings && typeof this.dataBindings.getDataBinding === 'function') {
          const binding = this.dataBindings.getDataBinding('dataBinding')
          if (binding && binding.state) {
            return binding
          }
        }
      } catch (ignore) {}
      return this._props && this._props.dataBinding
    }

    render () {
      const dataBinding = this._resolveDataBinding()
      this._root.style.fontSize = (this.fontSize || 14) + 'px'
      this._root.style.fontFamily = this.fontFamily || 'Arial'
      this._toolbar.style.display = this.showToolbar === false ? 'none' : 'flex'

      try {
        this._renderTable(dataBinding)
      } catch (err) {
        this._tableWrap.innerHTML = `<div class="error">The table could not be rendered. ${this._escape(err && err.message ? err.message : err)}</div>`
        this._renderToolbar()
      }
    }

    _renderTable (dataBinding) {
      const state = dataBinding && dataBinding.state
      const data = dataBinding && dataBinding.data
      const metadata = dataBinding && dataBinding.metadata
      const { dimensions, measures } = parseMetadata(metadata)
      const selectorDims = pickColumnDimensions(dimensions, metadata, this.columnDimension, dataBinding)
      let rowDims = pickRowDimensions(dimensions, metadata, selectorDims, dataBinding)
      const hasFeeds = (rowDims.length > 0 || selectorDims.length > 0) && measures.length > 0

      if (!dataBinding || state === 'loading' || !state) {
        this._tableWrap.innerHTML = setupMessage('Waiting for the data binding to finish loading.')
        this._renderToolbar()
        return
      }

      if (state !== 'success' && !(data && metadata && hasFeeds)) {
        this._tableWrap.innerHTML = setupMessage(
          state === 'error'
            ? 'SAC reported a data-binding error. This usually means the model, Version, or feeds are not set yet.'
            : `Binding state: ${this._escape(state)}.`
        )
        this._renderToolbar()
        return
      }

      if (!hasFeeds) {
        this._tableWrap.innerHTML = setupMessage('The model is selected, but the dimension and measure feeds are still empty.')
        this._renderToolbar()
        return
      }

      if (!data || !data.length) {
        this._tableWrap.innerHTML = setupMessage('Feeds are set, but no rows were returned. Check Version, filters, and booked data (or enable unbooked members on a native table first).')
        this._renderToolbar()
        return
      }

      this._measures = measures
      if (!this._dimFilters) {
        this._dimFilters = {}
      }

      const membersOf = dimension => {
        const seen = new Map()
        data.forEach(row => {
          const cell = row[dimension.key] || {}
          const id = cell.id || cell.label || ''
          if (!id || /^(\(all\)|all)$/i.test(String(id).trim())) {
            return
          }
          if (!seen.has(id)) {
            seen.set(id, cell.label || cell.id || id)
          }
        })
        return Array.from(seen.keys()).map(id => ({ id, label: seen.get(id) }))
      }
      const selectedMember = dimension => {
        if (this._dimFilters[dimension.key]) {
          return this._dimFilters[dimension.key]
        }
        const members = membersOf(dimension)
        if (members.length === 1) {
          return members[0].id
        }
        const ids = members.map(item => item.id).filter((id, index, list) => list.indexOf(id) === index)
        return ids.length === 1 ? ids[0] : ''
      }
      let view = data
      selectorDims.forEach(dimension => {
        if (isVersionDim(dimension)) {
          return
        }
        const selected = this._dimFilters[dimension.key]
        if (!selected) {
          return
        }
        view = view.filter(row => ((row[dimension.key] && row[dimension.key].id) || '') === selected)
      })

      const forecastMode = isForecastTableType(this._resolvedTableType())
      const dateDim = selectorDims.concat(rowDims).find(isDateDim) || dimensions.find(isDateDim) || null
      const versionDim = selectorDims.concat(rowDims).find(isVersionDim) || dimensions.find(isVersionDim) || null
      let extraVersions = []
      try {
        const parsed = JSON.parse(this.additionalVersionsJson || '[]')
        extraVersions = Array.isArray(parsed)
          ? parsed.map(item => {
            if (item && typeof item === 'object') {
              return String(item.version || item.id || '')
            }
            return String(item || '')
          }).filter(Boolean)
          : []
      } catch (ignore) {
        extraVersions = []
      }
      let stackedDims = selectorDims.slice()
      let leafColumns = measures.map(measure => ({ measure, date: null, versionId: '', versionLabel: '', key: measure.key }))
      if (forecastMode && dateDim) {
        stackedDims = selectorDims.filter(dimension =>
          dimension.key !== dateDim.key &&
          (!versionDim || dimension.key !== versionDim.key)
        )
        rowDims = rowDims.filter(dimension => dimension.key !== dateDim.key && (!versionDim || dimension.key !== versionDim.key))
        const versionMembers = versionDim ? membersOf(versionDim) : []
        const lookBackId = this.lookBackOn || (versionMembers.find(item => /actual/i.test(String(item.label || item.id))) || { id: 'Actual' }).id
        const namedAhead = this.lookAheadOn
        const aheadInModel = namedAhead && versionMembers.some(item => versionMatches(item, namedAhead) || String(item.label) === String(namedAhead))
        const lookAheadId = (aheadInModel && namedAhead) ||
          (versionMembers.find(item => /\bfc\b|forecast/i.test(String(item.label || item.id))) ||
            versionMembers.find(item => /epmplusa/i.test(String(item.label || item.id))) ||
            { id: namedAhead || 'FC' }).id
        const allDates = membersOf(dateDim).filter(item => item.id || item.label)
        const cutMode = this.cutOverMode || this.cutOverDate
        const cachedBooked = this._forecastCache && this._forecastCache.lastBooked
        const cutover = (/last booked/i.test(String(cutMode)) && cachedBooked) || resolveCutOver(this.cutOverDate, {
          mode: cutMode,
          specificDate: this.cutOverDate,
          data: view,
          dateDim,
          versionDim,
          dateMembers: allDates.concat(this._forecastDateMembers || []),
          actualToken: lookBackId
        })
        this._forecastQuery = {
          dateDim,
          versionDim,
          measures,
          rowDims,
          lookBackId,
          lookAheadId,
          extraVersions,
          versionMembers
        }
        const forecastSettings = {
          granularity: this.timeframeGranularity || 'Month',
          range: this.timeframeRange || 'Year',
          lookBackAdditional: this.lookBackAdditional,
          lookBackAdditionalUnit: this.lookBackAdditionalUnit,
          lookAheadAdditional: this.lookAheadAdditional,
          lookAheadAdditionalUnit: this.lookAheadAdditionalUnit
        }
        const dateMembers = mergeForecastAxis(
          pickForecastDateMembers(allDates.concat(this._forecastDateMembers || []), cutover, forecastSettings),
          synthesizeForecastAxis(cutover, forecastSettings)
        )
        const grain = this.timeframeGranularity || 'Month'
        leafColumns = []
        const axisDates = dateMembers.length ? dateMembers : synthesizeForecastAxis(cutover, forecastSettings)
        axisDates.forEach(date => {
          const lookBack = isForecastLookBack(date, cutover)
          const primaryId = lookBack ? lookBackId : lookAheadId
          const versionIds = [primaryId].concat(extraVersions).filter((id, index, list) => id && list.indexOf(id) === index)
          const displayDate = {
            id: date.id || date.label,
            label: formatForecastDateLabel(date, memberHierarchyDepth(date) <= 1 ? 'Year' : grain)
          }
          ;(versionIds.length ? versionIds : ['']).forEach(versionId => {
            measures.forEach(measure => {
              leafColumns.push({
                measure,
                date: displayDate,
                versionId,
                versionLabel: versionNameOf(versionMembers, versionId) || versionId || '(all)',
                lookAhead: !lookBack,
                key: [displayDate.id, versionId, measure.key].join('|')
              })
            })
          })
        })
        if (!leafColumns.length) {
          leafColumns = measures.map(measure => ({ measure, date: null, versionId: '', versionLabel: '', key: measure.key }))
        }
      } else if (versionDim && selectorDims.some(isVersionDim)) {
        stackedDims = selectorDims.filter(dimension => dimension.key !== versionDim.key)
        rowDims = rowDims.filter(dimension => dimension.key !== versionDim.key)
        const versionMembers = sortVersionMembers(membersOf(versionDim).filter(item => item.id))
        leafColumns = expandVersionLeafColumns(measures, versionMembers)
      }
      if (!this._drillLevels) {
        this._drillLevels = {}
      }
      const expandedDims = []
      const dateAlready = !!(forecastMode && dateDim && leafColumns.some(column => column.date))
      if (!dateAlready) {
        selectorDims.forEach(dimension => {
          if (isVersionDim(dimension)) {
            return
          }
          const level = this._drillLevels[dimension.key] || 'all'
          const members = filterMembersByLevel(membersOf(dimension), level)
          const tokens = members.length ? members : [{ id: '', label: '(all)' }]
          leafColumns = multiplyLeavesByMembers(leafColumns, dimension.key, tokens, isDateDim(dimension))
          expandedDims.push(dimension)
        })
      }
      stackedDims = stackedDims.filter(dimension => !expandedDims.some(item => item.key === dimension.key) && !isVersionDim(dimension))
      this._dimensions = rowDims.concat(stackedDims)

      const headerBg = this.headerBackground || '#0854A0'
      const headerFg = this.headerTextColor || '#FFFFFF'
      const changedBg = this.changedCellColor || '#FFF3B8'
      const formatOpts = {
        scale: this.numberScale || 'Default',
        scaleFormat: this.numberScaleFormat || 'Default',
        decimalPlaces: this.numberDecimalPlaces || (Number.isInteger(this.decimalPlaces) ? String(this.decimalPlaces) : 'Default'),
        showSignAs: this.showSignAs || 'Default'
      }
      const numericDecimals = formatOpts.decimalPlaces === 'Default' ? 2 : Number(formatOpts.decimalPlaces)
      const decimalPlaces = Number.isFinite(numericDecimals) ? numericDecimals : 2
      const editable = !this.readOnly
      const rules = parseRules(this.stylingRulesJson)
      const lineColor = this.lineColor || '#d9d9d9'
      const lineWidth = this.lineType === 'None' ? 0 : Number(this.lineWidth || 1)
      const lineStyle = this.lineStyle === 'Dashed' ? 'dashed' : (this.lineStyle === 'Dotted' ? 'dotted' : 'solid')
      const padL = Number(this.leftPadding || 4)
      const padR = Number(this.rightPadding || 4)
      const fontFamily = this.fontFamily || 'Arial'
      const fontSizePx = Number(this.fontSize || 14)
      const fontColor = this.fontColor || '#32363A'
      const fontStyle = this.fontStyle || 'Default'
      const fontWeight = fontStyle === 'Bold' ? 'bold' : 'normal'
      const fontItalic = fontStyle === 'Italic' ? 'italic' : 'normal'
      const textDecor = [this.underline ? 'underline' : '', this.strikethrough ? 'line-through' : ''].filter(Boolean).join(' ') || 'none'
      const hAlign = this.hAlign || 'left'
      const vAlign = this.vAlign || 'middle'
      const cellChrome = `border:${lineWidth}px ${lineStyle} ${lineColor};padding:6px ${padR}px 6px ${padL}px;vertical-align:${vAlign};font-family:${fontFamily};font-size:${fontSizePx}px;color:${fontColor};font-weight:${fontWeight};font-style:${fontItalic};text-decoration:${textDecor}`

      const seenRows = new Set()
      const rowTuples = []
      view.forEach(row => {
        const key = rowKey(row, rowDims)
        if (!seenRows.has(key)) {
          seenRows.add(key)
          rowTuples.push(row)
        }
      })

      const totals = leafColumns.map(() => 0)
      const rowHeaderCount = Math.max(rowDims.length, 1)
      const axisLabel = (label, extraClass, extraStyle) => {
        return `<th class="${extraClass || 'axis-label'}" colspan="${rowHeaderCount}" style="${cellChrome};text-align:right;${extraStyle || ''}">${label}</th>`
      }
      let table = `<table style="font-family:${fontFamily};font-size:${fontSizePx}px;color:${fontColor}"><thead>`
      const appendGroupedRow = (dimension, readMember) => {
        table += '<tr class="selector">'
        table += axisLabel(
          this._escape(dimName(dimension)) +
          '<button type="button" class="chev drill-btn" data-dim="' + this._escape(dimension.key) + '" title="Change hierarchy level">›</button>',
          'axis-label selector'
        )
        let index = 0
        while (index < leafColumns.length) {
          const token = readMember(leafColumns[index]) || { id: '', label: '(all)' }
          let span = 0
          while (index + span < leafColumns.length) {
            const other = readMember(leafColumns[index + span]) || { id: '', label: '(all)' }
            if (String(other.id) !== String(token.id)) {
              break
            }
            span += 1
          }
          table += `<td class="selector" colspan="${span}"><span class="member-link">${this._escape(token.label || token.id || '(all)')}</span></td>`
          index += span
        }
        table += '</tr>'
      }
      if (forecastMode && dateDim && leafColumns.some(column => column.date)) {
        if (versionDim) {
          appendGroupedRow(versionDim, column => ({ id: column.versionId, label: column.versionLabel }))
        }
        appendGroupedRow(dateDim, column => column.date)
      } else if (versionDim && selectorDims.some(isVersionDim) && leafColumns.some(column => column.versionId)) {
        expandedDims.filter(dimension => !isVersionDim(dimension)).forEach(dimension => {
          appendGroupedRow(dimension, column => (column.stack && column.stack[dimension.key]) || null)
        })
        appendGroupedRow(versionDim, column => ({ id: column.versionId, label: column.versionLabel }))
      } else {
        expandedDims.forEach(dimension => {
          appendGroupedRow(dimension, column => (column.stack && column.stack[dimension.key]) || (isDateDim(dimension) ? column.date : null))
        })
      }
      table += '<tr class="axis">'
      table += axisLabel('Measures')
      leafColumns.forEach(column => {
        table += `<th class="measure" style="${cellChrome};text-align:right">${this._escape(column.measure.label || column.measure.description || column.measure.id || column.measure.key)}</th>`
      })
      table += '</tr>'
      stackedDims.forEach(dimension => {
        const members = membersOf(dimension)
        const selected = selectedMember(dimension)
        table += '<tr class="selector">'
        table += axisLabel(
          this._escape(dimName(dimension)) +
          '<button type="button" class="chev drill-btn" data-dim="' + this._escape(dimension.key) + '" title="Change hierarchy level">›</button>',
          'axis-label selector'
        )
        leafColumns.forEach(() => {
          table += '<td class="selector">'
          table += `<select class="member-link" data-dim="${this._escape(dimension.key)}" aria-label="${this._escape(dimName(dimension))}">`
          table += '<option value="">(all)</option>'
          members.forEach(item => {
            if (!item.id) {
              return
            }
            const isSel = item.id === selected ? ' selected' : ''
            table += `<option value="${this._escape(item.id)}"${isSel}>${this._escape(item.label || item.id || '(all)')}</option>`
          })
          table += '</select>'
          table += '</td>'
        })
        table += '</tr>'
      })
      table += '<tr class="row-headers">'
      if (rowDims.length) {
        rowDims.forEach(dimension => {
          table += `<th class="row-dim-name" style="${cellChrome};text-align:${hAlign}">${this._escape(dimName(dimension))}</th>`
        })
      } else {
        table += `<th class="row-dim-name" style="${cellChrome}"></th>`
      }
      leafColumns.forEach(column => {
        const barKind = column.lookAhead || (!isActualVersion(column.versionLabel || column.versionId) && column.versionId)
          ? 'plan'
          : 'actual'
        table += `<th class="measure-bar${barKind ? ' ' + barKind : ''}" style="${cellChrome}"></th>`
      })
      table += '</tr>'
      table += '</thead><tbody>'

      if (forecastMode && dateDim) {
        this._ensureForecastCells(rowTuples)
      }

      const findBound = (row, column) => {
        if (forecastMode && this._forecastCache && this._forecastCache.cells) {
          const cached = this._forecastCache.cells[this._forecastCellKey(row, rowDims, column)]
          if (cached) {
            return cached
          }
        }
        const rKey = rowKey(row, rowDims)
        const matches = view.filter(item => {
          if (rowKey(item, rowDims) !== rKey) {
            return false
          }
          if (column.date && dateDim) {
            const cell = forecastMode ? rowCell(item, dateDim) : (item[dateDim.key] || {})
            if (forecastMode) {
              if (!sameForecastDate(cell, column.date) && !isAllMember(cell)) {
                return false
              }
              if (isAllMember(cell) && column.date && !isAllMember(column.date)) {
                return false
              }
            } else if (!isAllMember(column.date)) {
              const dateId = cell.id || ''
              if (dateId !== column.date.id && cell.label !== column.date.id && cell.label !== column.date.label) {
                return false
              }
            }
          }
          if (versionDim && column.versionId) {
            const cell = forecastMode ? rowCell(item, versionDim) : (item[versionDim.key] || {})
            if (forecastMode) {
              if (!isAllMember(cell) && !versionMatches(cell, column.versionId) && !versionMatches(cell, column.versionLabel)) {
                return false
              }
            } else if (cell.id !== column.versionId && cell.label !== column.versionId && cell.label !== column.versionLabel) {
              return false
            }
          }
          const stack = column.stack || {}
          const stackKeys = Object.keys(stack)
          for (let i = 0; i < stackKeys.length; i++) {
            const dimKey = stackKeys[i]
            const want = stack[dimKey]
            if (!want || !want.id || isAllMember(want)) {
              continue
            }
            const cell = item[dimKey] || {}
            if (cell.id !== want.id && cell.label !== want.id && cell.label !== want.label) {
              return false
            }
          }
          return true
        })
        const measureOf = item => {
          if (!item) {
            return {}
          }
          const measure = column.measure
          if (!forecastMode) {
            return item[measure.key] || {}
          }
          return item[measure.key] || item[measure.id] || {}
        }
        let found = matches
        const columnIsYearLevel = forecastMode && column.date && memberHierarchyDepth(column.date) <= 1
        if (columnIsYearLevel && !found.length && column.versionId) {
          const wantDate = memberDate(column.date)
          const wantYear = wantDate ? fiscalYearOf(wantDate) : null
          found = view.filter(item => {
            if (rowKey(item, rowDims) !== rKey) {
              return false
            }
            if (versionDim) {
              const cell = rowCell(item, versionDim)
              if (!isAllMember(cell) && !versionMatches(cell, column.versionId) && !versionMatches(cell, column.versionLabel)) {
                return false
              }
            }
            if (wantYear != null && dateDim) {
              const dCell = rowCell(item, dateDim)
              const dDate = memberDate(dCell)
              if (dDate && fiscalYearOf(dDate) !== wantYear) {
                return false
              }
            }
            return true
          })
        }
        if (columnIsYearLevel && found.length) {
          let sum = 0
          let any = false
          let formatted = ''
          found.forEach(item => {
            const bound = measureOf(item)
            const numeric = bound.raw != null && bound.raw !== '' ? Number(bound.raw) : NaN
            if (!Number.isNaN(numeric)) {
              sum += numeric
              any = true
            } else if (bound.formatted && !formatted) {
              formatted = bound.formatted
            }
          })
          if (any) {
            return { raw: sum, formatted: formatted }
          }
        }
        if (found.length) {
          return measureOf(found[0])
        }
        if (!column.date && !column.versionId) {
          return row[column.measure.key] || {}
        }
        return {}
      }

      rowTuples.forEach((row, rowIndex) => {
        table += '<tr>'
        rowDims.forEach(dimension => {
          const cell = row[dimension.key] || {}
          const dimRule = firstMatchingRule(rules, 'dimension')
          table += `<td class="dim" title="${this._escape(cell.id || '')}" style="${ruleStyle(dimRule, cellChrome + ';text-align:' + hAlign)}">${this._escape(cell.label || '')}</td>`
        })
        if (!rowDims.length) {
          table += `<td class="dim" style="${cellChrome}"></td>`
        }
        leafColumns.forEach((column, columnIndex) => {
          const bound = findBound(row, column)
          const original = (bound.raw != null && bound.raw !== '') ? bound.raw : bound.formatted
          const key = changeKey(row, rowDims, column.measure.key) + '||' + column.key
          const pending = this._pending.get(key)
          const current = pending ? pending.value : original
          if (typeof current === 'number' && !Number.isNaN(current)) {
            totals[columnIndex] += current
          }
          const isChanged = !!pending
          const display = formatNumber(current, formatOpts, bound.formatted)
          const unit = bound.unit ? ` title="${this._escape(bound.unit)}"` : ''
          const measureKind = editable ? 'editable' : 'readonly-account'
          const measureRule = firstMatchingRule(rules, measureKind)
          const extra = (isChanged ? 'background:' + changedBg + ';' : '') + cellChrome + ';text-align:right'
          if (editable) {
            table += `<td class="measure${isChanged ? ' changed' : ''}" data-row="${rowIndex}" data-measure="${this._escape(column.measure.key)}" data-col="${this._escape(column.key)}" data-version="${this._escape(column.versionId || '')}" data-date="${this._escape((column.date && column.date.id) || '')}" data-stack="${this._escape(JSON.stringify(column.stack || {}))}"${unit} style="${ruleStyle(measureRule, extra)}">`
            table += `<input class="cell-input" inputmode="decimal" value="${this._escape(display)}" data-row="${rowIndex}" data-measure="${this._escape(column.measure.key)}" data-col="${this._escape(column.key)}" data-version="${this._escape(column.versionId || '')}" data-date="${this._escape((column.date && column.date.id) || '')}" data-stack="${this._escape(JSON.stringify(column.stack || {}))}" />`
            table += '</td>'
          } else {
            table += `<td class="measure"${unit} style="${ruleStyle(measureRule, extra)}">${this._escape(display)}</td>`
          }
        })
        table += '</tr>'
      })
      table += '</tbody>'

      if (this.showTotals !== false) {
        table += '<tfoot><tr>'
        table += `<td colspan="${rowHeaderCount}" style="${cellChrome};text-align:${hAlign}">Total</td>`
        totals.forEach(total => {
          table += `<td class="measure" style="${cellChrome};text-align:right">${this._escape(formatNumber(total, formatOpts))}</td>`
        })
        table += '</tr></tfoot>'
      }
      table += '</table>'

      this._tableWrap.innerHTML = table
      this._tableWrap.querySelectorAll('thead tr.axis th.measure').forEach(cell => {
        cell.style.background = headerBg
        cell.style.color = headerFg
      })

      this._tableWrap.querySelectorAll('select.member-link').forEach(select => {
        select.addEventListener('change', () => {
          const dimKey = select.getAttribute('data-dim')
          this._dimFilters[dimKey] = select.value
          const dimension = stackedDims.find(item => item.key === dimKey) || this._dimensions.find(item => item.key === dimKey)
          this._applyDimensionFilter(dimension, select.value)
          this.render()
        })
      })
      this._bindDrillMenus(selectorDims.concat(rowDims))

      this._tableWrap.querySelectorAll('input.cell-input').forEach(input => {
        input.addEventListener('focus', () => {
          this._editing = true
          input.select()
        })
        input.addEventListener('blur', () => {
          this._editing = false
          this._commitInput(input, rowTuples, rowDims, measures, decimalPlaces, view, dateDim, versionDim)
        })
        input.addEventListener('keydown', event => {
          if (event.key === 'Enter') {
            event.preventDefault()
            input.blur()
          } else if (event.key === 'Escape') {
            event.preventDefault()
            this._editing = false
            this.render()
          }
        })
      })

      this._renderToolbar()
    }

    _getDataSource () {
      const trySource = candidate => {
        if (!candidate) {
          return null
        }
        try {
          if (typeof candidate.getDataSource === 'function') {
            const ds = candidate.getDataSource()
            if (ds) {
              return ds
            }
          }
        } catch (ignore) {}
        if (typeof candidate.getData === 'function' || typeof candidate.getMembers === 'function') {
          return candidate
        }
        return null
      }
      try {
        const binding = this.dataBindings && this.dataBindings.getDataBinding && this.dataBindings.getDataBinding('dataBinding')
        const fromBinding = trySource(binding)
        if (fromBinding) {
          return fromBinding
        }
      } catch (ignore) {}
      return trySource(this._resolveDataBinding()) || trySource(this._bindingFromUpdate) || trySource(this.dataBinding)
    }

    _forecastCellKey (row, rowDims, column) {
      return [rowKey(row, rowDims), forecastPeriodKey(column && column.date), column && (column.versionId || column.versionLabel), column && column.measure && column.measure.key].join('|')
    }

    _normalizeMembers (members) {
      return (members || []).map(item => {
        if (!item) {
          return null
        }
        if (typeof item === 'string') {
          return { id: item, label: item }
        }
        const id = item.id || item.Id || item.memberId || item.key
        if (!id || /^(\(all\)|all)$/i.test(String(id).trim())) {
          return null
        }
        return { id: String(id), label: String(item.description || item.label || item.name || id) }
      }).filter(Boolean)
    }

    async _listMembers (ds, dimId, parent) {
      if (!ds || typeof ds.getMembers !== 'function') {
        return []
      }
      const calls = []
      if (parent == null) {
        calls.push([dimId])
        calls.push([dimId, {}])
      } else {
        const id = parent.id || parent.key || parent
        calls.push([dimId, { parentKey: id }])
        calls.push([dimId, { parentId: id }])
        calls.push([dimId, id])
      }
      const out = []
      for (let i = 0; i < calls.length; i++) {
        try {
          const result = await ds.getMembers.apply(ds, calls[i])
          const list = Array.isArray(result) ? result : ((result && result.members) || [])
          list.forEach(item => out.push(item))
          if (list.length) {
            break
          }
        } catch (ignore) {}
      }
      return this._normalizeMembers(out)
    }

    async _walkDateMembers (ds, dateDim) {
      const dimId = dateDim.id || dateDim.key
      const seen = new Set()
      const out = []
      const visit = async (parent, depth) => {
        if (depth > 6) {
          return
        }
        const list = await this._listMembers(ds, dimId, parent)
        for (let i = 0; i < list.length; i++) {
          const member = list[i]
          if (!member || seen.has(member.id)) {
            continue
          }
          seen.add(member.id)
          out.push(member)
          if (isAggregateDateMember(member) || memberHierarchyDepth(member) < 3) {
            await visit(member, depth + 1)
          }
        }
      }
      await visit(null, 0)
      return out
    }

    async _readDataCell (ds, selection) {
      if (!ds) {
        return null
      }
      const invoke = async name => {
        if (typeof ds[name] !== 'function') {
          return null
        }
        try {
          const result = ds[name](selection)
          const value = result && typeof result.then === 'function' ? await result : result
          return normalizeFetchedCell(value)
        } catch (ignore) {
          return null
        }
      }
      return (await invoke('getData')) || (await invoke('getDataCell'))
    }

    _forecastSelection (dateDim, versionDim, measure, row, rowDims, dateId, versionId, shape) {
      const selection = {}
      selection[shape.dateKey] = dateId
      if (shape.versionKey && versionId) {
        selection[shape.versionKey] = versionId
      }
      if (shape.measureKey && shape.measureValue) {
        selection[shape.measureKey] = shape.measureValue
      }
      ;(rowDims || []).forEach(dim => {
        const cell = rowCell(row, dim)
        if (cell && cell.id && !isAllMember(cell)) {
          const key = (shape.rowKeyField && dim[shape.rowKeyField]) || dim.id || dim.key
          if (key) {
            selection[key] = cell.id
          }
        }
      })
      return selection
    }

    async _fetchForecastValue (ds, dateDim, versionDim, measure, row, rowDims, dateId, versionId, shape) {
      if (shape) {
        return this._readDataCell(ds, this._forecastSelection(dateDim, versionDim, measure, row, rowDims, dateId, versionId, shape))
      }
      const dateKeys = [dateDim.id, dateDim.key, dateDim.description].filter(Boolean)
      const versionKeys = versionDim ? [versionDim.id, versionDim.key, versionDim.description].filter(Boolean) : [null]
      const measureKeys = ['@MeasureDimension', measure.id, measure.key].filter(Boolean)
      const measureValues = [measure.id, measure.key].filter(Boolean)
      const rowFields = ['id', 'key']
      for (let d = 0; d < dateKeys.length; d++) {
        for (let v = 0; v < versionKeys.length; v++) {
          for (let m = 0; m < measureKeys.length; m++) {
            for (let mv = 0; mv < measureValues.length; mv++) {
              for (let r = 0; r < rowFields.length; r++) {
                const nextShape = {
                  dateKey: dateKeys[d],
                  versionKey: versionKeys[v],
                  measureKey: measureKeys[m],
                  measureValue: measureValues[mv],
                  rowKeyField: rowFields[r]
                }
                const cell = await this._readDataCell(ds, this._forecastSelection(dateDim, versionDim, measure, row, rowDims, dateId, versionId, nextShape))
                if (cell) {
                  this._forecastSelectionShape = nextShape
                  return cell
                }
              }
            }
          }
        }
      }
      return null
    }

    _ensureForecastCells (rowTuples) {
      if (!isForecastTableType(this._resolvedTableType())) {
        return
      }
      const query = this._forecastQuery
      if (!query || !query.dateDim) {
        return
      }
      const key = [
        query.lookBackId,
        query.lookAheadId,
        (query.extraVersions || []).join(','),
        this.timeframeGranularity,
        this.cutOverMode || this.cutOverDate,
        (rowTuples || []).map(row => rowKey(row, query.rowDims || [])).join(';')
      ].join('|')
      const cache = this._forecastCache
      if (cache && cache.key === key && (cache.ready || cache.loading)) {
        return
      }
      if (cache && cache.key === key && cache.failedAt && Date.now() - cache.failedAt < 2000) {
        return
      }
      this._forecastCache = { key: key, loading: true, ready: false, cells: (cache && cache.cells) || {}, lastBooked: cache && cache.lastBooked, failedAt: 0 }
      Promise.resolve().then(() => this._loadForecastCells(rowTuples || [], key)).catch(() => {
        if (this._forecastCache && this._forecastCache.key === key) {
          this._forecastCache.loading = false
          this._forecastCache.failedAt = Date.now()
        }
      })
    }

    async _loadForecastCells (rowTuples, key) {
      const query = this._forecastQuery || {}
      const dateDim = query.dateDim
      const versionDim = query.versionDim
      const measures = query.measures || []
      const rowDims = query.rowDims || []
      if (!dateDim) {
        return
      }
      const ds = this._getDataSource()
      const dateMembers = ds ? await this._walkDateMembers(ds, dateDim) : []
      if (dateMembers.length) {
        this._forecastDateMembers = dateMembers
      }
      const monthMembers = dateMembers.filter(item => !isAggregateDateMember(item))
      if (ds && dateMembers.length) {
        const dimId = dateDim.id || dateDim.key
        for (let i = 0; i < dateMembers.length; i++) {
          const member = dateMembers[i]
          if (!isAggregateDateMember(member) && memberHierarchyDepth(member) >= 3) {
            continue
          }
          try {
            if (typeof ds.expandNode === 'function') {
              await ds.expandNode(dimId, member.id)
            } else if (typeof ds.expandMember === 'function') {
              await ds.expandMember(dimId, member.id)
            }
          } catch (ignore) {}
        }
      }
      const versions = [query.lookBackId, query.lookAheadId].concat(query.extraVersions || []).filter((id, index, list) => id && list.indexOf(id) === index)
      const versionIds = {}
      if (ds && versionDim) {
        const versionList = await this._listMembers(ds, versionDim.id || versionDim.key, null)
        versions.forEach(token => {
          const match = versionList.find(item => versionMatches(item, token))
          versionIds[token] = (match && match.id) || token
        })
      }
      versions.forEach(token => {
        if (!versionIds[token]) {
          versionIds[token] = token
        }
      })
      const pivot = new Date()
      const fy = fiscalYearOf(pivot)
      const periods = []
      for (let period = 1; period <= 12; period++) {
        const fromMembers = monthMembers.filter(item => {
          const date = memberDate(item)
          return date && fiscalYearOf(date) === fy && fiscalPeriodOf(date) === period
        })
        periods.push({
          fy: fy,
          period: period,
          date: { id: 'P' + String(period).padStart(2, '0') + ' (' + fy + ')', label: 'P' + String(period).padStart(2, '0') + ' (' + fy + ')' },
          ids: fromMembers.map(item => item.id).concat(forecastDateCandidates(fy, period))
        })
      }
      ;[fy - 1, fy + 1].forEach(year => {
        const fromMembers = dateMembers.filter(item => {
          const date = memberDate(item)
          return date && fiscalYearOf(date) === year
        })
        periods.push({
          fy: year,
          period: 0,
          date: { id: String(year), label: String(year) },
          ids: fromMembers.map(item => item.id).concat([String(year)])
        })
      })
      const cells = {}
      let lastBooked = null
      const rows = (rowTuples || []).length ? rowTuples : [{}]
      const probeRow = rows[0]
      const probeMeasure = measures[0]
      const lookBackId = versionIds[query.lookBackId] || query.lookBackId
      let workingDateIds = null
      const shape = this._forecastSelectionShape || null
      if (ds && probeMeasure) {
        for (let p = 0; p < periods.length && !workingDateIds; p++) {
          const entry = periods[p]
          if (!entry.period) {
            continue
          }
          for (let i = 0; i < entry.ids.length; i++) {
            const sample = entry.ids[i]
            const cell = await this._fetchForecastValue(ds, dateDim, versionDim, probeMeasure, probeRow, rowDims, sample, lookBackId, shape)
            if (!cell) {
              continue
            }
            const mapped = {}
            periods.forEach(other => {
              if (!other.period) {
                return
              }
              const start = fiscalPeriodStart(other.fy, other.period)
              const yyyymm = String(start.getFullYear()) + String(start.getMonth() + 1).padStart(2, '0')
              const p2 = String(other.period).padStart(2, '0')
              let next = sample
              if (/20\d{2}(0[1-9]|1[0-2])/.test(sample)) {
                next = sample.replace(/20\d{2}(0[1-9]|1[0-2])/, yyyymm)
              } else if (/P\s*(0?[1-9]|1[0-2])/i.test(sample)) {
                next = sample.replace(/P\s*(0?[1-9]|1[0-2])/i, 'P' + p2)
              }
              mapped[other.fy + '-' + other.period] = next
            })
            mapped[entry.fy + '-' + entry.period] = sample
            const other = periods.find(item => item.period && item.period !== entry.period)
            if (other) {
              const otherCell = await this._fetchForecastValue(ds, dateDim, versionDim, probeMeasure, probeRow, rowDims, mapped[other.fy + '-' + other.period], lookBackId, this._forecastSelectionShape || shape)
              if (otherCell && otherCell.raw === cell.raw) {
                continue
              }
            }
            workingDateIds = mapped
            break
          }
        }
      }
      const activeShape = this._forecastSelectionShape || shape
      if (ds && workingDateIds) {
        for (let r = 0; r < rows.length; r++) {
          const row = rows[r]
          for (let p = 0; p < periods.length; p++) {
            const entry = periods[p]
            const dateId = entry.period ? workingDateIds[entry.fy + '-' + entry.period] : entry.ids[0]
            if (!dateId) {
              continue
            }
            for (let v = 0; v < versions.length; v++) {
              const versionToken = versions[v]
              const versionId = versionIds[versionToken] || versionToken
              for (let m = 0; m < measures.length; m++) {
                const measure = measures[m]
                const cell = await this._fetchForecastValue(ds, dateDim, versionDim, measure, row, rowDims, dateId, versionId, activeShape)
                if (!cell) {
                  continue
                }
                const column = { date: entry.date, versionId: versionToken, versionLabel: versionToken, measure: measure }
                cells[this._forecastCellKey(row, rowDims, column)] = cell
                if (entry.period && versionMatches({ id: versionToken, label: versionToken }, query.lookBackId)) {
                  const booked = fiscalPeriodStart(entry.fy, entry.period)
                  if (!lastBooked || booked.getTime() > lastBooked.getTime()) {
                    lastBooked = booked
                  }
                }
              }
            }
          }
        }
      }
      if (!this._forecastCache || this._forecastCache.key !== key) {
        return
      }
      const ready = Object.keys(cells).length > 0
      this._forecastCache = {
        key: key,
        loading: false,
        ready: ready,
        cells: cells,
        lastBooked: lastBooked,
        failedAt: ready ? 0 : Date.now()
      }
      if ((ready || dateMembers.length) && !this._editing) {
        this.render()
      }
    }

    _primeForecastDateMembers () {
      if (!isForecastTableType(this._resolvedTableType())) {
        return
      }
      const binding = this._resolveDataBinding()
      const metadata = binding && binding.metadata
      const parsed = parseMetadata(metadata)
      const dateDim = (parsed.dimensions || []).find(isDateDim)
      const versionDim = (parsed.dimensions || []).find(isVersionDim)
      if (!dateDim) {
        return
      }
      if (!this._forecastQuery) {
        this._forecastQuery = {
          dateDim: dateDim,
          versionDim: versionDim,
          measures: parsed.measures,
          rowDims: [],
          lookBackId: this.lookBackOn || 'Actual',
          lookAheadId: this.lookAheadOn || 'FC',
          extraVersions: [],
          versionMembers: []
        }
      }
      this._ensureForecastCells((binding && binding.data) || [])
    }

    _bindDrillMenus (dimensions) {
      const host = this._tableWrap
      host.querySelectorAll('.drill-menu').forEach(menu => menu.remove())
      host.querySelectorAll('button.drill-btn').forEach(btn => {
        btn.addEventListener('click', event => {
          event.preventDefault()
          event.stopPropagation()
          const dimKey = btn.getAttribute('data-dim')
          const dimension = (dimensions || []).find(item => item.key === dimKey)
          if (!dimension) {
            return
          }
          host.querySelectorAll('.drill-menu').forEach(menu => menu.remove())
          const menu = document.createElement('div')
          menu.className = 'drill-menu'
          const current = (this._drillLevels && this._drillLevels[dimKey]) || 'all'
          drillOptionsFor(dimension).forEach(option => {
            const item = document.createElement('button')
            item.type = 'button'
            item.textContent = option.name
            if (option.id === current) {
              item.className = 'active'
            }
            item.addEventListener('click', () => {
              menu.remove()
              this._applyHierarchyLevel(dimension, option.id)
            })
            menu.appendChild(item)
          })
          const rect = btn.getBoundingClientRect()
          const rootRect = this._root.getBoundingClientRect()
          menu.style.left = Math.max(8, rect.left - rootRect.left) + 'px'
          menu.style.top = (rect.bottom - rootRect.top + 4) + 'px'
          this._root.appendChild(menu)
          const close = click => {
            if (!menu.contains(click.target) && click.target !== btn) {
              menu.remove()
              this._root.removeEventListener('click', close, true)
            }
          }
          setTimeout(() => this._root.addEventListener('click', close, true), 0)
        })
      })
    }

    async _applyHierarchyLevel (dimension, levelKey) {
      if (!this._drillLevels) {
        this._drillLevels = {}
      }
      this._drillLevels[dimension.key] = levelKey
      const ds = this._getDataSource()
      const dimIds = [dimension.id, dimension.key, dimension.description].filter((id, index, list) => id && list.indexOf(id) === index)
      const levelNumber = ({ all: 0, year: 1, quarter: 2, month: 3, week: 3, day: 4 })[levelKey]
      const n = levelNumber != null ? levelNumber : Number(levelKey)
      const call = async (name, args) => {
        if (!ds || typeof ds[name] !== 'function') {
          return false
        }
        try {
          await ds[name].apply(ds, args)
          return true
        } catch (ignore) {
          return false
        }
      }
      for (let i = 0; i < dimIds.length; i++) {
        const dimId = dimIds[i]
        if (levelKey === 'all') {
          await call('removeHierarchy', [dimId])
          await call('setHierarchyLevel', [dimId, 0])
          await call('setDrillLevel', [dimId, 0])
        } else {
          await call('setHierarchyLevel', [dimId, n])
          await call('setDrillLevel', [dimId, n])
          await call('setInitialDrillLevel', [dimId, n])
          try {
            const hierarchies = ds && ds.getHierarchies ? await ds.getHierarchies(dimId) : []
            if (hierarchies && hierarchies.length) {
              const pick = hierarchies.find(item => /yqm|yhqm|time|parent|date/i.test(JSON.stringify(item))) || hierarchies[0]
              const hierarchyId = pick.id || pick.hierarchyId || pick.name || pick
              await call('setHierarchy', [dimId, hierarchyId])
              await call('setHierarchyLevel', [dimId, n])
            }
          } catch (ignore) {}
        }
      }
      this.render()
    }

    async _clearForecastDateFilter () {
      const binding = this._resolveDataBinding()
      const dimensions = parseMetadata(binding && binding.metadata).dimensions
      const dateDim = (dimensions || []).find(isDateDim)
      const ds = this._getDataSource()
      if (!ds || !dateDim) {
        return
      }
      const ids = [dateDim.id, dateDim.key].filter((id, index, list) => id && list.indexOf(id) === index)
      for (let i = 0; i < ids.length; i++) {
        try {
          if (typeof ds.removeDimensionFilter === 'function') {
            await ds.removeDimensionFilter(ids[i])
          }
        } catch (ignore) {}
      }
    }

    async _applyDimensionFilter (dimension, memberId) {
      if (!dimension) {
        return
      }
      try {
        const binding = this.dataBindings && this.dataBindings.getDataBinding && this.dataBindings.getDataBinding('dataBinding')
        const ds = binding && binding.getDataSource && binding.getDataSource()
        if (ds && ds.setDimensionFilter) {
          if (memberId) {
            await ds.setDimensionFilter(dimension.id || dimension.key, memberId)
          } else if (ds.removeDimensionFilter) {
            await ds.removeDimensionFilter(dimension.id || dimension.key)
          } else {
            await ds.setDimensionFilter(dimension.id || dimension.key, [])
          }
        }
      } catch (ignore) {}
    }

    _commitInput (input, rowTuples, rowDims, measures, decimalPlaces, data, dateDim, versionDim) {
      const rowIndex = Number(input.getAttribute('data-row'))
      const measureKey = input.getAttribute('data-measure')
      const colKey = input.getAttribute('data-col') || ''
      const versionId = input.getAttribute('data-version') || ''
      const dateId = input.getAttribute('data-date') || ''
      const row = rowTuples[rowIndex]
      const measure = measures.find(item => item.key === measureKey)
      if (!row || !measure) {
        return
      }
      const rKey = rowKey(row, rowDims)
      const source = data.find(item => {
        if (rowKey(item, rowDims) !== rKey) {
          return false
        }
        if (dateId && dateDim) {
          if (((item[dateDim.key] && item[dateDim.key].id) || '') !== dateId) {
            return false
          }
        }
        if (versionId && versionDim) {
          const cell = item[versionDim.key] || {}
          if (cell.id !== versionId && cell.label !== versionId) {
            return false
          }
        }
        let stack = {}
        try {
          stack = JSON.parse(input.getAttribute('data-stack') || '{}')
        } catch (ignore) {
          stack = {}
        }
        const stackKeys = Object.keys(stack)
        for (let i = 0; i < stackKeys.length; i++) {
          const dimKey = stackKeys[i]
          const want = stack[dimKey]
          if (!want || !want.id) {
            continue
          }
          const cell = item[dimKey] || {}
          if (cell.id !== want.id && cell.label !== want.id && cell.label !== want.label) {
            return false
          }
        }
        return true
      }) || row
      const bound = source[measure.key] || {}
      const original = bound.raw
      const parsed = parseInputNumber(input.value)
      const key = changeKey(row, rowDims, measure.key) + '||' + colKey

      if (parsed === null) {
        this._pending.delete(key)
        this.render()
        return
      }

      const originalNumber = typeof original === 'number' ? original : parseInputNumber(original)
      if (originalNumber !== null && Math.abs(parsed - originalNumber) < Math.pow(10, -Math.max(decimalPlaces, 6))) {
        this._pending.delete(key)
        this.render()
        return
      }

      const extraDims = [dateDim, versionDim].filter(Boolean)
      const change = toPlanningChange(source, rowDims.concat(extraDims), measure, original, parsed)
      this._pending.set(key, { value: parsed, change })
      this._lastChange = change
      this.render()
      this.dispatchEvent(new Event('onCellChange'))
    }

    _renderToolbar () {
      const count = this._pending.size
      const locked = !!this.readOnly
      this._toolbar.innerHTML = `
        <span class="version">v${WIDGET_VERSION}</span>
        <button id="btn-submit" ${count && !locked ? '' : 'disabled'}>Submit</button>
        <button id="btn-revert" class="secondary" ${count ? '' : 'disabled'}>Revert</button>
        <span class="status">${locked ? 'Read only' : (count ? count + ' unpublished change' + (count === 1 ? '' : 's') : 'No unpublished changes')}</span>
      `
      const submit = this._shadowRoot.getElementById('btn-submit')
      const revert = this._shadowRoot.getElementById('btn-revert')
      if (submit) {
        submit.addEventListener('click', () => this.submitChanges())
      }
      if (revert) {
        revert.addEventListener('click', () => this.revertChanges())
      }
    }

    _escape (value) {
      return String(value === null || value === undefined ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
    }
  }

  if (!customElements.get('com-sap-sac-sample-planning-table-v13')) {
    customElements.define('com-sap-sac-sample-planning-table-v13', PlanningTable)
  }
})()
