import { load as parseYAML, dump as dumpYAML } from 'js-yaml'

// Predefined region proxy groups with their comprehensive filter patterns
export const REGION_PROXY_GROUPS = [
  { name: '🇭🇰 香港节点', filter: '🇭🇰|港|\\bHK(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|hk|Hong Kong|HongKong|hongkong|HONG KONG|HONGKONG|深港|HKG|九龙|Kowloon|新界|沙田|荃湾|葵涌' },
  { name: '🇺🇸 美国节点', filter: '🇺🇸|美|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|纽约|纽纽|亚特兰大|迈阿密|华盛顿|\\bUS(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|United States|UnitedStates|UNITED STATES|USA|America|AMERICA|JFK|EWR|IAD|ATL|ORD|MIA|NYC|LAX|SFO|SEA|DFW|SJC' },
  { name: '🇯🇵 日本节点', filter: '🇯🇵|日本|川日|东京|大阪|泉日|埼玉|沪日|深日|(?<!尼|-)日|\\bJP(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Japan|JAPAN|JPN|NRT|HND|KIX|TYO|OSA|关西|Kansai|KANSAI' },
  { name: '🇸🇬 新加坡节点', filter: '🇸🇬|新加坡|坡|狮城|\\bSG(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Singapore|SINGAPORE|SIN' },
  { name: '🇼🇸 台湾节点', filter: '🇹🇼|🇼🇸|台|新北|彰化|\\bTW(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Taiwan|TAIWAN|TWN|TPE|ROC' },
  { name: '🇰🇷 韩国节点', filter: '🇰🇷|\\bKR(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Korea|KOREA|KOR|首尔|韩|韓|春川|Chuncheon|ICN' },
  { name: '🇨🇦 加拿大节点', filter: '🇨🇦|加拿大|\\bCA(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Canada|CANADA|CAN|渥太华|温哥华|卡尔加里|蒙特利尔|Montreal|YVR|YYZ|YUL' },
  { name: '🇬🇧 英国节点', filter: '🇬🇧|英国|Britain|United Kingdom|UNITED KINGDOM|England|伦敦|曼彻斯特|Manchester|\\bUK(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|GBR|LHR|MAN' },
  { name: '🇫🇷 法国节点', filter: '🇫🇷|法国|\\bFR(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|France|FRANCE|FRA|巴黎|马赛|Marseille|CDG|MRS' },
  { name: '🇩🇪 德国节点', filter: '🇩🇪|德国|Germany|GERMANY|\\bDE(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|DEU|柏林|法兰克福|慕尼黑|Munich|MUC' },
  { name: '🇳🇱 荷兰节点', filter: '🇳🇱|荷兰|Netherlands|NETHERLANDS|\\bNL(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|NLD|阿姆斯特丹|AMS' },
  { name: '🇹🇷 土耳其节点', filter: '🇹🇷|土耳其|Turkey|TURKEY|Türkiye|\\bTR(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|TUR|IST|ANK' },
] as const

// Comprehensive exclude filter for "Other regions" group
export const OTHER_REGIONS_EXCLUDE_FILTER = '(^(?!.*(港|\\bHK(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|hk|Hong Kong|HongKong|hongkong|HONG KONG|HONGKONG|深港|HKG|🇭🇰|九龙|Kowloon|新界|沙田|荃湾|葵涌|美|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|纽约|纽纽|亚特兰大|迈阿密|华盛顿|\\bUS(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|United States|UnitedStates|UNITED STATES|USA|America|AMERICA|JFK|EWR|IAD|ATL|ORD|MIA|NYC|LAX|SFO|SEA|DFW|SJC|🇺🇸|日本|川日|东京|大阪|泉日|埼玉|沪日|深日|(?<!尼|-)日|\\bJP(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Japan|JAPAN|JPN|NRT|HND|KIX|TYO|OSA|🇯🇵|关西|Kansai|KANSAI|新加坡|坡|狮城|\\bSG(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Singapore|SINGAPORE|SIN|🇸🇬|台|新北|彰化|\\bTW(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Taiwan|TAIWAN|TWN|TPE|ROC|🇹🇼|\\bKR(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Korea|KOREA|KOR|首尔|韩|韓|春川|Chuncheon|ICN|🇰🇷|加拿大|\\bCA(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Canada|CANADA|CAN|渥太华|温哥华|卡尔加里|蒙特利尔|Montreal|YVR|YYZ|YUL|🇨🇦|英国|Britain|United Kingdom|UNITED KINGDOM|England|伦敦|曼彻斯特|Manchester|\\bUK(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|GBR|LHR|MAN|🇬🇧|法国|\\bFR(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|France|FRANCE|FRA|巴黎|马赛|Marseille|CDG|MRS|🇫🇷|德国|Germany|GERMANY|\\bDE(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|DEU|柏林|法兰克福|慕尼黑|Munich|MUC|🇩🇪|荷兰|Netherlands|NETHERLANDS|\\bNL(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|NLD|阿姆斯特丹|AMS|🇳🇱|土耳其|Turkey|TURKEY|Türkiye|\\bTR(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|TUR|IST|ANK|🇹🇷)).*)'

// Proxy types supported by mihomo/clash
export const PROXY_TYPES = [
  'ss', 'ssr', 'vmess', 'vless', 'trojan', 'hysteria', 'hysteria2',
  'tuic', 'wireguard', 'socks5', 'http', 'snell', 'anytls', 'ssh'
] as const

export type ProxyType = typeof PROXY_TYPES[number]

// Proxy group types
export const PROXY_GROUP_TYPES = [
  'select', 'url-test', 'fallback', 'load-balance', 'relay'
] as const

export type ProxyGroupType = typeof PROXY_GROUP_TYPES[number]

// 代理节点、代理集合、区域代理组占位符
export const PROXY_NODES_MARKER = '__PROXY_NODES__'
export const PROXY_PROVIDERS_MARKER = '__PROXY_PROVIDERS__'
export const REGION_PROXY_GROUPS_MARKER = '__REGION_PROXY_GROUPS__'
export const PROXY_PROVIDER_SNAPSHOTS_KEY = 'proxy-provider-snapshots'

// 默认出站:DIRECT / REJECT 是 Clash 内置代理名，直接以字面量参与代理顺序与输出，
// 由「默认出站」开关(includeDefaultOutbound)控制是否出现，可在代理顺序里拖动排序。
export const DIRECT_MARKER = 'DIRECT'
export const REJECT_MARKER = 'REJECT'

// Type for proxy order item
export type ProxyOrderItem = string // Can be group name, PROXY_NODES_MARKER, PROXY_PROVIDERS_MARKER, or REGION_PROXY_GROUPS_MARKER

// V3 Proxy Group configuration (matches backend ProxyGroupV3)
export interface ProxyGroupV3Config {
  name: string
  type: ProxyGroupType
  proxies?: string[]
  use?: string[]
  'include-all'?: boolean
  'include-all-proxies'?: boolean
  'include-all-providers'?: boolean
  'include-region-proxy-groups'?: boolean
  'include-type'?: string
  'exclude-type'?: string
  filter?: string
  'exclude-filter'?: string
  url?: string
  interval?: number
  tolerance?: number
  lazy?: boolean
  'disable-udp'?: boolean
  strategy?: string
  'interface-name'?: string
  'routing-mark'?: number
  'dialer-proxy-group'?: string
  hidden?: boolean
  icon?: string
}

// 模板内保存的代理集合副本。生成订阅时按这份副本解析，不跟随订阅管理里之后的修改。
export interface ProxyProviderSnapshot {
  name: string
  subscriptionId: number
  filter: string
  excludeFilter: string
  processMode: string
}

// Parsed template structure
export interface ParsedTemplate {
  port?: number
  'socks-port'?: number
  'allow-lan'?: boolean
  mode?: string
  'log-level'?: string
  'external-controller'?: string
  dns?: Record<string, unknown>
  proxies?: Array<Record<string, unknown>>
  'proxy-groups'?: ProxyGroupV3Config[]
  'proxy-provider-snapshots'?: Array<Record<string, unknown>>
  rules?: string[]
  'rule-providers'?: Record<string, unknown>
}

// Form state for proxy group editor
export interface ProxyGroupFormState {
  name: string
  type: ProxyGroupType
  filterKeywords: string
  excludeFilterKeywords: string
  filterFromVariable?: string       // 原始变量名（如 'FliterUS'），标识 filter 来自模板变量
  excludeFilterFromVariable?: string
  includeTypes: ProxyType[]
  excludeTypes: ProxyType[]
  includeAll: boolean
  includeAllProxies: boolean
  includeAllProviders: boolean
  includeRegionProxyGroups: boolean
  includeDefaultOutbound: boolean // 是否在代理顺序中加入 DIRECT / REJECT
  usedProviders: string[] // 本模板代理集合副本的名称，写入 use
  includedProxyGroups: string[]
  proxyOrder: ProxyOrderItem[] // Order of proxy groups, nodes marker, providers marker
  staticProxies: string[]
  url: string
  interval: number
  tolerance: number
  dialerProxyGroup: string
  hidden: boolean
  icon: string
}

// Convert comma-separated keywords to regex pattern
export function keywordsToRegex(keywords: string): string {
  if (!keywords.trim()) return ''
  return keywords
    .split(/[,，]/)
    .map(k => k.trim())
    .filter(k => k.length > 0)
    .join('|')
}

// Clash/mihomo 标准顶级键（不视为自定义变量）
const STANDARD_TOP_LEVEL_KEYS = new Set([
  'port', 'socks-port', 'redir-port', 'tproxy-port',
  'mixed-port', 'allow-lan', 'bind-address', 'mode',
  'log-level', 'external-controller', 'external-ui',
  'ipv6', 'dns', 'proxies', 'proxy-groups',
  'proxy-providers', 'rules', 'rule-providers',
  'hosts', 'profile', 'tun', 'sniffer',
  'authentication', 'unified-delay', 'tcp-concurrent',
  'find-process-mode', 'global-client-fingerprint',
  'keep-alive-interval', 'geodata-mode', 'geo-auto-update',
  'geo-update-interval', 'geox-url',
  'add-region-proxy-groups',
  PROXY_PROVIDER_SNAPSHOTS_KEY,
])

// 从模板内容中提取自定义变量（非标准顶级键的标量字符串值）
export function extractTemplateVariables(content: string): Record<string, string> {
  try {
    const parsed = parseYAML(content) as Record<string, unknown>
    if (!parsed || typeof parsed !== 'object') return {}
    const vars: Record<string, string> = {}
    for (const [key, value] of Object.entries(parsed)) {
      if (!STANDARD_TOP_LEVEL_KEYS.has(key) && typeof value === 'string') {
        vars[key] = value
      }
    }
    return vars
  } catch {
    return {}
  }
}

// Convert regex pattern back to keywords (best effort)
export function regexToKeywords(regex: string): string {
  if (!regex) return ''
  return regex.split('|').join(', ')
}

// Create default form state for a new proxy group
export function createDefaultFormState(name = '新代理组'): ProxyGroupFormState {
  return {
    name,
    type: 'select',
    filterKeywords: '',
    excludeFilterKeywords: '',
    includeTypes: [],
    excludeTypes: [],
    includeAll: false,
    includeAllProxies: false,
    includeAllProviders: false,
    includeRegionProxyGroups: false,
    includeDefaultOutbound: false,
    usedProviders: [],
    includedProxyGroups: [],
    proxyOrder: [],
    staticProxies: [],
    url: 'https://www.gstatic.com/generate_204',
    interval: 300,
    tolerance: 50,
    dialerProxyGroup: '',
    hidden: false,
    icon: '',
  }
}

// Check if proxy nodes should be shown (has filter/include-all-proxies/include-type)
export function hasProxyNodes(state: ProxyGroupFormState): boolean {
  return state.includeAll || state.includeAllProxies ||
         state.filterKeywords.trim() !== '' || state.includeTypes.length > 0
}

// Check if proxy providers should be shown (has use/include-all-providers)
export function hasProxyProviders(state: ProxyGroupFormState): boolean {
  return state.includeAll || state.includeAllProviders
}

// Get default proxy order based on include options
export function getDefaultProxyOrder(state: ProxyGroupFormState): ProxyOrderItem[] {
  const order: ProxyOrderItem[] = []

  // Add region proxy groups marker if enabled
  if (state.includeRegionProxyGroups) {
    order.push(REGION_PROXY_GROUPS_MARKER)
  }

  // For include-all, providers come before nodes
  if (state.includeAll) {
    order.push(PROXY_PROVIDERS_MARKER)
    order.push(PROXY_NODES_MARKER)
  } else {
    if (hasProxyNodes(state)) {
      order.push(PROXY_NODES_MARKER)
    }
    if (hasProxyProviders(state)) {
      order.push(PROXY_PROVIDERS_MARKER)
    }
  }

  // 默认出站(DIRECT / REJECT)默认排在末尾
  if (state.includeDefaultOutbound) {
    order.push(DIRECT_MARKER)
    order.push(REJECT_MARKER)
  }

  return order
}

// Convert ProxyGroupFormState to ProxyGroupV3Config
export function formStateToConfig(state: ProxyGroupFormState): ProxyGroupV3Config {
  const config: ProxyGroupV3Config = {
    name: state.name,
    type: state.type,
  }

  // Include options
  if (state.includeAll) config['include-all'] = true
  if (state.includeAllProxies) config['include-all-proxies'] = true
  if (state.includeAllProviders) config['include-all-providers'] = true
  if (state.includeRegionProxyGroups) config['include-region-proxy-groups'] = true

  // Filter patterns
  const filter = keywordsToRegex(state.filterKeywords)
  if (filter) config.filter = filter

  const excludeFilter = keywordsToRegex(state.excludeFilterKeywords)
  if (excludeFilter) config['exclude-filter'] = excludeFilter

  // Type filters
  if (state.includeTypes.length > 0) {
    config['include-type'] = state.includeTypes.join('|')
  }

  if (state.excludeTypes.length > 0) {
    config['exclude-type'] = state.excludeTypes.join('|')
  }

  // Build proxies list from proxyOrder (including markers for backend) and staticProxies
  // Only include markers if the corresponding include option is set.
  // 选中的代理集合副本留在 proxies 里只为记住和代理组的相对顺序；同时写入 use。
  const usedProviders = state.usedProviders ?? []
  const proxiesFromOrder = state.proxyOrder.filter(item => {
    if (item === PROXY_NODES_MARKER) return hasProxyNodes(state)
    if (item === PROXY_PROVIDERS_MARKER) return hasProxyProviders(state)
    if (item === REGION_PROXY_GROUPS_MARKER) return state.includeRegionProxyGroups
    if (item === DIRECT_MARKER || item === REJECT_MARKER) return state.includeDefaultOutbound
    return true
  })
  const allProxies = [...proxiesFromOrder, ...state.staticProxies]
  if (allProxies.length > 0) {
    config.proxies = allProxies
  }

  const useList: string[] = []
  for (const item of state.proxyOrder) {
    if (usedProviders.includes(item) && !useList.includes(item)) useList.push(item)
  }
  for (const name of usedProviders) {
    if (!useList.includes(name)) useList.push(name)
  }
  if (useList.length > 0) config.use = useList

  // URL test options
  if (state.type === 'url-test' || state.type === 'fallback' || state.type === 'load-balance') {
    if (state.url) config.url = state.url
    if (state.interval) config.interval = state.interval
    if (state.tolerance && state.type !== 'load-balance') config.tolerance = state.tolerance
  }

  if (state.dialerProxyGroup) {
    config['dialer-proxy-group'] = state.dialerProxyGroup
  }

  if (state.hidden) config.hidden = true
  if (state.icon) config.icon = state.icon

  return config
}

// Convert ProxyGroupV3Config to ProxyGroupFormState
export function configToFormState(config: ProxyGroupV3Config, allGroupNames: string[] = [], variables?: Record<string, string>): ProxyGroupFormState {
  // Separate proxy groups, markers, and static proxies
  const proxies = config.proxies || []
  const proxyOrder: string[] = []
  const staticProxies: string[] = []
  // 同名项如果已经是另一个代理组，打开时就改回组引用。以前写进 use 也不能继续当成集合。
  const rawUse = [...(config.use || [])]
  const usedProviders = usedProvidersRespectingGroups(rawUse, config.name, allGroupNames)
  const usedProviderSet = new Set(usedProviders)

  for (const p of proxies) {
    if (p === PROXY_NODES_MARKER || p === PROXY_PROVIDERS_MARKER || p === REGION_PROXY_GROUPS_MARKER) {
      proxyOrder.push(p)
    } else if (p === DIRECT_MARKER || p === REJECT_MARKER) {
      // 默认出站:DIRECT / REJECT 作为可拖拽项归入代理顺序
      proxyOrder.push(p)
    } else if (allGroupNames.includes(p) || usedProviderSet.has(p)) {
      proxyOrder.push(p)
    } else {
      staticProxies.push(p)
    }
  }
  for (const name of rawUse) {
    if (!proxyOrder.includes(name)) proxyOrder.push(name)
  }

  // include-all 等同于同时开启 include-all-proxies 和 include-all-providers
  // __PROXY_NODES__ 占位符等同于 include-all-proxies
  const hasNodesMarker = proxyOrder.includes(PROXY_NODES_MARKER)
  const hasProvidersMarker = proxyOrder.includes(PROXY_PROVIDERS_MARKER)
  // 默认出站开关派生自 DIRECT / REJECT 是否存在(无独立配置键)
  const includeDefaultOutbound = proxyOrder.includes(DIRECT_MARKER) || proxyOrder.includes(REJECT_MARKER)
  const includeAll = config['include-all'] || false
  const includeAllProxies = config['include-all-proxies'] || includeAll || hasNodesMarker
  const includeAllProviders = config['include-all-providers'] || includeAll || hasProvidersMarker

  // 解析 filter 变量引用：如果 filter 值是自定义变量名，替换为变量值
  let filterValue = config.filter || ''
  let filterFromVariable: string | undefined
  if (variables && filterValue && variables[filterValue]) {
    filterFromVariable = filterValue
    filterValue = variables[filterValue]
  }

  let excludeFilterValue = config['exclude-filter'] || ''
  let excludeFilterFromVariable: string | undefined
  if (variables && excludeFilterValue && variables[excludeFilterValue]) {
    excludeFilterFromVariable = excludeFilterValue
    excludeFilterValue = variables[excludeFilterValue]
  }

  const state: ProxyGroupFormState = {
    name: config.name,
    type: config.type,
    filterKeywords: regexToKeywords(filterValue),
    excludeFilterKeywords: regexToKeywords(excludeFilterValue),
    filterFromVariable,
    excludeFilterFromVariable,
    includeTypes: (config['include-type']?.split('|').filter(t => PROXY_TYPES.includes(t as ProxyType)) || []) as ProxyType[],
    excludeTypes: (config['exclude-type']?.split('|').filter(t => PROXY_TYPES.includes(t as ProxyType)) || []) as ProxyType[],
    includeAll,
    includeAllProxies,
    includeAllProviders,
    includeRegionProxyGroups: config['include-region-proxy-groups'] || false,
    includeDefaultOutbound,
    usedProviders,
    includedProxyGroups: proxyOrder.filter(p => p !== PROXY_NODES_MARKER && p !== PROXY_PROVIDERS_MARKER && p !== REGION_PROXY_GROUPS_MARKER && p !== DIRECT_MARKER && p !== REJECT_MARKER && !usedProviderSet.has(p)),
    proxyOrder,
    staticProxies,
    url: config.url || 'https://www.gstatic.com/generate_204',
    interval: config.interval || 300,
    tolerance: config.tolerance || 50,
    dialerProxyGroup: config['dialer-proxy-group'] || '',
    hidden: config.hidden || false,
    icon: config.icon || '',
  }

  // Add default markers if not present but should be shown
  const defaultOrder = getDefaultProxyOrder(state)
  for (const marker of defaultOrder) {
    if (!state.proxyOrder.includes(marker)) {
      state.proxyOrder.push(marker)
    }
  }

  return state
}

// Parse YAML template to structured object
export function parseTemplate(content: string): ParsedTemplate | null {
  try {
    return parseYAML(content) as ParsedTemplate
  } catch {
    return null
  }
}

// Serialize structured object back to YAML
export function serializeTemplate(template: ParsedTemplate): string {
  return dumpYAML(template, { indent: 2, lineWidth: -1, noRefs: true })
}

// Extract proxy groups from template content
export function extractProxyGroups(content: string, variables?: Record<string, string>): ProxyGroupFormState[] {
  const template = parseTemplate(content)
  if (!template || !template['proxy-groups']) return []
  // 如果未传入 variables，自动从内容中提取
  const vars = variables ?? extractTemplateVariables(content)
  const allGroupNames = template['proxy-groups'].map(g => g.name)
  return template['proxy-groups'].map(config => configToFormState(config, allGroupNames, Object.keys(vars).length > 0 ? vars : undefined))
}

// Update proxy-groups in template content
export function updateProxyGroups(content: string, groups: ProxyGroupFormState[]): string {
  const template = parseTemplate(content)
  if (!template) return content

  const names = groups.map(group => group.name)
  template['proxy-groups'] = groups.map(group => formStateToConfig(dropCollidingUsedProviders(group, names)))
  return serializeTemplate(template)
}

function snapshotFromYAML(raw: Record<string, unknown>): ProxyProviderSnapshot | null {
  const name = typeof raw.name === 'string' ? raw.name.trim() : ''
  if (!name) return null
  const subscriptionId = typeof raw.subscription_id === 'number' ? raw.subscription_id : Number(raw.subscription_id) || 0
  return {
    name,
    subscriptionId,
    filter: typeof raw.filter === 'string' ? raw.filter : '',
    excludeFilter: typeof raw.exclude_filter === 'string' ? raw.exclude_filter : '',
    processMode: typeof raw.process_mode === 'string' && raw.process_mode ? raw.process_mode : 'client',
  }
}

export function extractProxyProviderSnapshots(content: string): ProxyProviderSnapshot[] {
  const template = parseTemplate(content)
  const raw = template?.['proxy-provider-snapshots']
  if (!Array.isArray(raw)) return []
  const snapshots: ProxyProviderSnapshot[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const snapshot = snapshotFromYAML(item as Record<string, unknown>)
    if (snapshot && !snapshots.some(existing => existing.name === snapshot.name)) snapshots.push(snapshot)
  }
  return snapshots
}

export function updateProxyProviderSnapshots(content: string, snapshots: ProxyProviderSnapshot[]): string {
  const template = parseTemplate(content)
  if (!template) return content
  if (snapshots.length === 0) {
    delete template['proxy-provider-snapshots']
  } else {
    template['proxy-provider-snapshots'] = snapshots.map(snapshot => {
      const entry: Record<string, unknown> = {
        name: snapshot.name,
        subscription_id: snapshot.subscriptionId,
        process_mode: snapshot.processMode || 'client',
      }
      if (snapshot.filter) entry.filter = snapshot.filter
      if (snapshot.excludeFilter) entry.exclude_filter = snapshot.excludeFilter
      return entry
    })
  }
  return serializeTemplate(template)
}

// Display names for markers in preview (Chinese for better user understanding)
export const PROXY_NODES_DISPLAY = '⛓️‍💥 代理节点'
export const PROXY_PROVIDERS_DISPLAY = '📦 代理集合'
export const REGION_PROXY_GROUPS_DISPLAY = '🌏 区域代理组'
// DIRECT / REJECT 仅在编辑器代理顺序里用友好名展示；预览与实际输出保持字面量
export const DIRECT_DISPLAY = '🎯 直连 (DIRECT)'
export const REJECT_DISPLAY = '🚫 拒绝 (REJECT)'

// Generate proxy-groups YAML preview from form states
export function generateProxyGroupsPreview(groups: ProxyGroupFormState[]): string {
  const names = groups.map(group => group.name)
  const configs = groups.map(group => formStateToConfig(dropCollidingUsedProviders(group, names))).map(config => {
    // Replace markers with Chinese display names for preview
    if (config.proxies) {
      config.proxies = config.proxies.map(p => {
        if (p === PROXY_NODES_MARKER) return PROXY_NODES_DISPLAY
        if (p === PROXY_PROVIDERS_MARKER) return PROXY_PROVIDERS_DISPLAY
        if (p === REGION_PROXY_GROUPS_MARKER) return REGION_PROXY_GROUPS_DISPLAY
        return p
      })
    }
    return config
  })
  return dumpYAML({ 'proxy-groups': configs }, { indent: 2, lineWidth: -1, noRefs: true })
}

// Generate region proxy groups as ProxyGroupFormState array
export function generateRegionProxyGroups(type: ProxyGroupType = 'url-test'): ProxyGroupFormState[] {
  const groups: ProxyGroupFormState[] = REGION_PROXY_GROUPS.map(region => {
    const state = {
      ...createDefaultFormState(region.name),
      type,
      filterKeywords: region.filter, // Keep original regex filter as-is
      includeAllProxies: true,
    }
    state.proxyOrder = getDefaultProxyOrder(state)
    return state
  })

  // Add "Other regions" group
  const otherState = {
    ...createDefaultFormState('🌐 其他地区'),
    type,
    filterKeywords: OTHER_REGIONS_EXCLUDE_FILTER, // Keep original regex filter as-is
    includeAllProxies: true,
  }
  otherState.proxyOrder = getDefaultProxyOrder(otherState)
  groups.push(otherState)

  return groups
}

// Get region proxy group names
export function getRegionProxyGroupNames(): string[] {
  return [...REGION_PROXY_GROUPS.map(r => r.name), '🌐 其他地区']
}

// Create a blank v3 template
export function createBlankTemplate(): string {
  const template: ParsedTemplate = {
    port: 7890,
    'socks-port': 7891,
    'allow-lan': true,
    mode: 'rule',
    'log-level': 'info',
    'external-controller': '127.0.0.1:9090',
    dns: {
      enable: true,
      ipv6: true,
      'enhanced-mode': 'fake-ip',
      nameserver: [
        'https://dns.alidns.com/dns-query',
        'https://doh.pub/dns-query',
      ],
    },
    proxies: [],
    'proxy-groups': [
      {
        name: '🚀 节点选择',
        type: 'select',
        'include-all-proxies': true,
      },
      {
        name: '♻️ 自动选择',
        type: 'url-test',
        'include-all-proxies': true,
        url: 'https://www.gstatic.com/generate_204',
        interval: 300,
        tolerance: 50,
      },
      {
        name: '🎯 全球直连',
        type: 'select',
        proxies: ['DIRECT'],
      },
    ],
    rules: [
      'GEOSITE,private,🎯 全球直连',
      'GEOIP,private,🎯 全球直连,no-resolve',
      'GEOSITE,cn,🎯 全球直连',
      'GEOIP,cn,🎯 全球直连,no-resolve',
      'MATCH,🚀 节点选择',
    ],
  }
  return serializeTemplate(template)
}

// 占位符和 Clash 内置出站不是代理集合，不能写进 use。
const NON_PROVIDER_ORDER_ITEMS = new Set<string>([
  PROXY_NODES_MARKER,
  PROXY_PROVIDERS_MARKER,
  REGION_PROXY_GROUPS_MARKER,
  DIRECT_MARKER,
  REJECT_MARKER,
])

export interface ProxyCollectionSource {
  name: string
  subscriptionId: number
  filter?: string
  excludeFilter?: string
  processMode?: string
}

// 空的编辑名回退成集合原名，不另起「新代理组 N」。
export function resolveNewProxyGroupName(collectionName: string, editedName: string | undefined): string {
  const trimmed = (editedName ?? '').trim()
  return trimmed || collectionName
}

// 重名只比较代理组名字。集合已经出现在别的组的 use 里不算重名。
export function conflictingNewProxyGroupNames(
  selectedNames: readonly string[],
  nameEdits: Readonly<Record<string, string | undefined>>,
  existingGroupNames: readonly string[],
): Set<string> {
  const existing = new Set(existingGroupNames)
  const seen = new Map<string, number>()
  const conflicts = new Set<string>()
  for (const collectionName of selectedNames) {
    const finalName = resolveNewProxyGroupName(collectionName, nameEdits[collectionName])
    if (existing.has(finalName)) conflicts.add(finalName)
    seen.set(finalName, (seen.get(finalName) ?? 0) + 1)
  }
  for (const [finalName, count] of seen) {
    if (count > 1) conflicts.add(finalName)
  }
  return conflicts
}

export function snapshotsForSelectedCollections(
  selectedNames: readonly string[],
  existingSnapshots: readonly ProxyProviderSnapshot[],
  collections: readonly ProxyCollectionSource[],
): ProxyProviderSnapshot[] {
  const existing = new Set(existingSnapshots.map((snapshot) => snapshot.name))
  const added: ProxyProviderSnapshot[] = []
  for (const collectionName of selectedNames) {
    if (existing.has(collectionName)) continue
    const config = collections.find((item) => item.name === collectionName)
    if (!config) continue
    added.push({
      name: config.name,
      subscriptionId: config.subscriptionId || 0,
      filter: config.filter || '',
      excludeFilter: config.excludeFilter || '',
      processMode: config.processMode || 'client',
    })
    existing.add(config.name)
  }
  return added
}

export type PlanNewProxyGroupsResult =
  | { ok: true; groups: ProxyGroupFormState[]; snapshotsToAdd: ProxyProviderSnapshot[] }
  | { ok: false; conflictName: string }

// 每个勾选的集合单独成为一个代理组。组名可以改，use 和快照仍用集合原名。
// 不把集合塞进已有组，也不把新组塞进「节点选择」。
export function planNewProxyGroupsFromCollections(input: {
  selectedNames: readonly string[]
  nameEdits: Readonly<Record<string, string | undefined>>
  existingGroupNames: readonly string[]
  existingSnapshots: readonly ProxyProviderSnapshot[]
  collections: readonly ProxyCollectionSource[]
}): PlanNewProxyGroupsResult {
  const conflicts = conflictingNewProxyGroupNames(input.selectedNames, input.nameEdits, input.existingGroupNames)
  if (conflicts.size > 0) {
    for (const collectionName of input.selectedNames) {
      const finalName = resolveNewProxyGroupName(collectionName, input.nameEdits[collectionName])
      if (conflicts.has(finalName)) return { ok: false, conflictName: finalName }
    }
  }

  const groups = input.selectedNames.map((collectionName) => {
    const group = createDefaultFormState(resolveNewProxyGroupName(collectionName, input.nameEdits[collectionName]))
    // 引用的是集合原名，不是改过的组名。集合自己的 filter 只留在 snapshot。
    group.proxyOrder = [collectionName]
    group.usedProviders = [collectionName]
    return group
  })

  return {
    ok: true,
    groups,
    snapshotsToAdd: snapshotsForSelectedCollections(input.selectedNames, input.existingSnapshots, input.collections),
  }
}

// 「添加到已有代理组」：把集合原名追加到所选组，不新建、不改组名。
export function appendCollectionsToProxyGroup(group: ProxyGroupFormState, collectionNames: readonly string[]): ProxyGroupFormState {
  const proxyOrder = [...group.proxyOrder]
  const usedProviders = [...(group.usedProviders ?? [])]
  for (const name of collectionNames) {
    if (!proxyOrder.includes(name)) proxyOrder.push(name)
    if (!usedProviders.includes(name)) usedProviders.push(name)
  }
  return { ...group, proxyOrder, usedProviders }
}

// 另一个代理组（不是本组）已经占用这个名字。本组自己的同名集合不算占用。
function namesClaimedByOtherGroups(groupName: string, groupNames: readonly string[]): Set<string> {
  const claimed = new Set<string>()
  for (const name of groupNames) {
    if (name !== groupName) claimed.add(name)
  }
  return claimed
}

// 名字冲突时，其它组只能引用代理组，不能再把同名集合留在 use 里。
function usedProvidersRespectingGroups(
  usedProviders: readonly string[],
  groupName: string,
  groupNames: readonly string[],
): string[] {
  const claimed = namesClaimedByOtherGroups(groupName, groupNames)
  const used: string[] = []
  for (const name of usedProviders) {
    if (claimed.has(name) || used.includes(name)) continue
    used.push(name)
  }
  return used
}

function dropCollidingUsedProviders(group: ProxyGroupFormState, groupNames: readonly string[]): ProxyGroupFormState {
  const usedProviders = usedProvidersRespectingGroups(group.usedProviders ?? [], group.name, groupNames)
  const current = group.usedProviders ?? []
  if (current.length === usedProviders.length && current.every((name, index) => name === usedProviders[index])) {
    return group
  }
  return { ...group, usedProviders }
}

// 组名等于集合名不是自引用。自引用只从其他代理组列表里排除本组。
// 别的组已经叫这个名字时，父组的集合列表里不再提供它，芯片也就不会涂成集合的绿色。
export function providerNamesForGroup(
  providerNames: readonly string[],
  groupName: string,
  otherGroupNames: readonly string[] = [],
): string[] {
  const claimed = namesClaimedByOtherGroups(groupName, otherGroupNames)
  return providerNames.filter((name) => (name !== '' || name === groupName) && !claimed.has(name))
}

// 代理顺序变化时重算 use。已经绑定的集合即使此刻不在 providerNames 里也要留下，
// 否则过滤关键字打开节点占位符时会把 use 清掉。用户从顺序里删掉芯片则不再保留。
// 已有同名代理组时这一项是组引用，previouslyUsed 不能把它留成 use。
export function reconcileUsedProviders(
  nextOrder: readonly string[],
  providerNames: readonly string[],
  previousUsed: readonly string[] = [],
  otherGroupNames: readonly string[] = [],
): string[] {
  const providers = new Set(providerNames)
  const previouslyUsed = new Set(previousUsed)
  const claimed = new Set(otherGroupNames)
  const used: string[] = []
  for (const name of nextOrder) {
    if (NON_PROVIDER_ORDER_ITEMS.has(name) || used.includes(name)) continue
    if (claimed.has(name)) continue
    if (providers.has(name) || previouslyUsed.has(name)) used.push(name)
  }
  return used
}

export function applyProxyOrderFromEditor(
  group: ProxyGroupFormState,
  nextOrder: readonly string[],
  providerNames: readonly string[],
  otherGroupNames: readonly string[] = [],
): ProxyGroupFormState {
  const proxyOrder = [...nextOrder]
  const claimed = [...namesClaimedByOtherGroups(group.name, otherGroupNames)]
  return {
    ...group,
    proxyOrder,
    usedProviders: reconcileUsedProviders(proxyOrder, providerNames, group.usedProviders ?? [], claimed),
  }
}

export function ensureProxyOrderMarkers(
  order: readonly string[],
  flags: {
    showNodesMarker: boolean
    showProvidersMarker: boolean
    showRegionGroupsMarker: boolean
    showDefaultOutboundMarker: boolean
  },
): string[] {
  let result = [...order]
  if (flags.showRegionGroupsMarker && !result.includes(REGION_PROXY_GROUPS_MARKER)) {
    result.push(REGION_PROXY_GROUPS_MARKER)
  }
  if (flags.showNodesMarker && !result.includes(PROXY_NODES_MARKER)) {
    result.push(PROXY_NODES_MARKER)
  }
  if (flags.showProvidersMarker && !result.includes(PROXY_PROVIDERS_MARKER)) {
    result.push(PROXY_PROVIDERS_MARKER)
  }
  if (flags.showDefaultOutboundMarker) {
    if (!result.includes(DIRECT_MARKER)) result.push(DIRECT_MARKER)
    if (!result.includes(REJECT_MARKER)) result.push(REJECT_MARKER)
  }
  if (!flags.showNodesMarker) {
    result = result.filter((item) => item !== PROXY_NODES_MARKER)
  }
  if (!flags.showProvidersMarker) {
    result = result.filter((item) => item !== PROXY_PROVIDERS_MARKER)
  }
  if (!flags.showRegionGroupsMarker) {
    result = result.filter((item) => item !== REGION_PROXY_GROUPS_MARKER)
  }
  if (!flags.showDefaultOutboundMarker) {
    result = result.filter((item) => item !== DIRECT_MARKER && item !== REJECT_MARKER)
  }
  return result
}
