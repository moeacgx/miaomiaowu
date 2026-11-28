import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  appendCollectionsToProxyGroup,
  applyProxyOrderFromEditor,
  createDefaultFormState,
  ensureProxyOrderMarkers,
  extractProxyGroups,
  extractProxyProviderSnapshots,
  formStateToConfig,
  hasProxyNodes,
  hasProxyProviders,
  planNewProxyGroupsFromCollections,
  providerNamesForGroup,
  proxyReferenceChecked,
  selectProxyReference,
  snapshotsAfterGroupDelete,
  updateProxyGroups,
  updateProxyProviderSnapshots,
  type ProxyCollectionSource,
  type ProxyGroupFormState,
  type ProxyProviderSnapshot,
} from './template-v3-utils.ts'

const HK = '良心云-HK香港节点'
const SG = '良心云 新加坡'

const collections: ProxyCollectionSource[] = [
  {
    name: HK,
    subscriptionId: 7,
    filter: 'HK|香港',
    excludeFilter: '到期',
    processMode: 'client',
  },
  {
    name: SG,
    subscriptionId: 7,
    filter: '新加坡|SG',
    excludeFilter: '',
    processMode: 'client',
  },
]

function plan(
  selectedNames: string[],
  nameEdits: Record<string, string | undefined> = {},
  existingGroupNames: string[] = [],
  existingSnapshots: ProxyProviderSnapshot[] = []
) {
  return planNewProxyGroupsFromCollections({
    selectedNames,
    nameEdits,
    existingGroupNames,
    existingSnapshots,
    collections,
  })
}

function orderAfterSourceToggles(group: ProxyGroupFormState): string[] {
  return ensureProxyOrderMarkers(group.proxyOrder, {
    showNodesMarker: hasProxyNodes(group),
    showProvidersMarker: hasProxyProviders(group),
    showRegionGroupsMarker: group.includeRegionProxyGroups,
    showDefaultOutboundMarker: group.includeDefaultOutbound,
  })
}

function saveAndReopen(
  groups: ProxyGroupFormState[],
  snapshots: ProxyProviderSnapshot[]
) {
  let content = 'proxy-groups: []\n'
  content = updateProxyGroups(content, groups)
  content = updateProxyProviderSnapshots(content, snapshots)
  return {
    content,
    groups: extractProxyGroups(content),
    snapshots: extractProxyProviderSnapshots(content),
  }
}

describe('从代理集合新建代理组', () => {
  it('自定义组名仍引用集合原名，快照也不改名', () => {
    const planned = plan([HK], { [HK]: '新加坡节点' })
    assert.equal(planned.ok, true)
    if (!planned.ok) return

    const group = planned.groups[0]
    assert.equal(planned.groups.length, 1)
    assert.equal(group.name, '新加坡节点')
    assert.deepEqual(group.proxyOrder, [HK])
    assert.deepEqual(group.usedProviders, [HK])
    assert.equal(group.type, 'select')
    assert.equal(group.filterKeywords, '')
    assert.equal(group.excludeFilterKeywords, '')
    assert.equal(group.url, 'https://www.gstatic.com/generate_204')
    assert.equal(group.interval, 300)
    assert.equal(group.tolerance, 50)

    const snapshot = planned.snapshotsToAdd[0]
    assert.deepEqual(snapshot, {
      name: HK,
      subscriptionId: 7,
      filter: 'HK|香港',
      excludeFilter: '到期',
      processMode: 'client',
    })

    const config = formStateToConfig(group)
    assert.equal(config.name, '新加坡节点')
    assert.deepEqual(config.use, [HK])
    assert.equal(config.filter, undefined)
  })

  it('空编辑名回退成集合原名，不发明新代理组序号', () => {
    const planned = plan([HK], { [HK]: '   ' })
    assert.equal(planned.ok, true)
    if (!planned.ok) return
    assert.equal(planned.groups[0].name, HK)
    assert.equal(planned.groups[0].name.includes('新代理组'), false)
    assert.deepEqual(planned.groups[0].usedProviders, [HK])
  })

  it('保存再打开后，代理顺序和 use 仍是集合原名', () => {
    const planned = plan([HK], { [HK]: '新加坡节点' })
    assert.equal(planned.ok, true)
    if (!planned.ok) return

    const saved = saveAndReopen(planned.groups, planned.snapshotsToAdd)
    assert.match(saved.content, /use:\n\s+- 良心云-HK香港节点/)
    assert.match(saved.content, /proxy-provider-snapshots:/)
    assert.equal(saved.snapshots[0]?.name, HK)
    assert.equal(saved.snapshots[0]?.filter, 'HK|香港')
    assert.equal(saved.snapshots[0]?.subscriptionId, 7)
    assert.equal(saved.snapshots[0]?.processMode, 'client')

    const group = saved.groups[0]
    assert.equal(group?.name, '新加坡节点')
    assert.equal(group?.proxyOrder.includes(HK), true)
    assert.deepEqual(group?.usedProviders, [HK])
    assert.equal(group?.staticProxies.includes(HK), false)
    assert.equal(group?.proxyOrder.length === 0, false)
  })

  it('改成故障转移并写入过滤关键字后，集合引用还在', () => {
    const planned = plan([HK], { [HK]: '新加坡节点' })
    assert.equal(planned.ok, true)
    if (!planned.ok) return

    let group = planned.groups[0]
    group = { ...group, type: 'fallback', filterKeywords: '新加坡' }
    // 过滤关键字会打开节点占位符，编辑器据此重算顺序。此刻集合名不在 providerNames 里。
    group = applyProxyOrderFromEditor(group, orderAfterSourceToggles(group), [])

    assert.equal(group.type, 'fallback')
    assert.equal(group.filterKeywords, '新加坡')
    assert.equal(group.proxyOrder.includes(HK), true)
    assert.deepEqual(group.usedProviders, [HK])

    const config = formStateToConfig(group)
    assert.equal(config.type, 'fallback')
    assert.equal(config.filter, '新加坡')
    assert.deepEqual(config.use, [HK])
    assert.equal(config.url, 'https://www.gstatic.com/generate_204')

    const saved = saveAndReopen([group], planned.snapshotsToAdd)
    const reopened = saved.groups[0]
    assert.equal(reopened?.proxyOrder.includes(HK), true)
    assert.deepEqual(reopened?.usedProviders, [HK])
    assert.equal(reopened?.filterKeywords, '新加坡')
    assert.equal(reopened?.type, 'fallback')
    assert.equal(reopened?.staticProxies.includes(HK), false)
  })

  it('组名等于集合名时，引用不会被当成自引用删掉', () => {
    const planned = plan([SG])
    assert.equal(planned.ok, true)
    if (!planned.ok) return

    const group = planned.groups[0]
    assert.equal(group.name, SG)
    const visible = providerNamesForGroup([SG], group.name)
    assert.deepEqual(visible, [SG])

    // 旧编辑器会把同名集合从可选列表里滤掉，随后重算 use 时名单是空的。
    const hiddenAsSelf = visible.filter((name) => name !== group.name)
    assert.deepEqual(hiddenAsSelf, [])

    let edited: ProxyGroupFormState = {
      ...group,
      type: 'fallback',
      filterKeywords: '坡',
    }
    edited = applyProxyOrderFromEditor(
      edited,
      orderAfterSourceToggles(edited),
      hiddenAsSelf
    )
    assert.equal(edited.name, SG)
    assert.deepEqual(edited.usedProviders, [SG])
    assert.equal(edited.proxyOrder.includes(SG), true)

    const saved = saveAndReopen([edited], planned.snapshotsToAdd)
    const reopened = saved.groups[0]
    assert.equal(reopened?.name, SG)
    assert.deepEqual(reopened?.usedProviders, [SG])
    assert.equal(reopened?.proxyOrder.filter((name) => name === SG).length, 1)
    assert.equal(reopened?.includedProxyGroups.includes(SG), false)
    assert.deepEqual(formStateToConfig(reopened!).use, [SG])
  })

  it('改组名不会把 use 改成新组名', () => {
    const planned = plan([HK])
    assert.equal(planned.ok, true)
    if (!planned.ok) return
    const renamed = { ...planned.groups[0], name: '改过的名字' }
    const config = formStateToConfig(renamed)
    assert.equal(config.name, '改过的名字')
    assert.deepEqual(config.use, [HK])
    assert.deepEqual(renamed.proxyOrder, [HK])
  })

  it('重名拒绝覆盖，不会并进已有组', () => {
    const existing = createDefaultFormState('节点选择')
    existing.proxyOrder = ['旧节点']
    const planned = plan([HK], { [HK]: '节点选择' }, ['节点选择'])
    assert.deepEqual(planned, { ok: false, conflictName: '节点选择' })
    assert.equal('groups' in planned, false)
    // 调用方看到失败就不能合并。已有组保持原样，不会被静默覆盖。
    assert.equal(existing.name, '节点选择')
    assert.deepEqual(existing.proxyOrder, ['旧节点'])
    assert.deepEqual(existing.usedProviders, [])
  })

  it('集合已被别的组 use，只要组名不同就仍然新建', () => {
    const existing = createDefaultFormState('节点选择')
    existing.proxyOrder = [HK]
    existing.usedProviders = [HK]
    const planned = plan([HK], {}, ['节点选择'])
    assert.equal(planned.ok, true)
    if (!planned.ok) return
    assert.equal(planned.groups.length, 1)
    assert.equal(planned.groups[0].name, HK)
    assert.deepEqual(existing.usedProviders, [HK])
    assert.equal(existing.name, '节点选择')
  })

  it('两个集合得到两个组，不塞进已有的节点选择', () => {
    const selector = createDefaultFormState('节点选择')
    selector.proxyOrder = ['旧节点']
    const planned = plan([HK, SG], { [HK]: '香港组' })
    assert.equal(planned.ok, true)
    if (!planned.ok) return
    assert.equal(planned.groups.length, 2)
    assert.deepEqual(
      planned.groups.map((group) => group.name),
      ['香港组', SG]
    )
    assert.deepEqual(planned.groups[0].usedProviders, [HK])
    assert.deepEqual(planned.groups[1].usedProviders, [SG])
    assert.deepEqual(
      planned.snapshotsToAdd.map((snapshot) => snapshot.name),
      [HK, SG]
    )

    const merged = [selector, ...planned.groups]
    assert.equal(merged.length, 3)
    assert.deepEqual(merged[0].proxyOrder, ['旧节点'])
    assert.deepEqual(merged[0].usedProviders, [])

    const saved = saveAndReopen(merged, planned.snapshotsToAdd)
    const reopenedSelector = saved.groups.find(
      (group) => group.name === '节点选择'
    )
    assert.equal(reopenedSelector?.proxyOrder.includes(HK), false)
    assert.equal(reopenedSelector?.proxyOrder.includes(SG), false)
    assert.deepEqual(reopenedSelector?.usedProviders, [])
    assert.equal(
      saved.groups.find((group) => group.name === '香港组')?.usedProviders[0],
      HK
    )
    assert.equal(
      saved.groups.find((group) => group.name === SG)?.usedProviders[0],
      SG
    )
  })

  it('两个集合改成同一个组名时拒绝，不覆盖', () => {
    const planned = plan([HK, SG], { [HK]: '同名', [SG]: '同名' })
    assert.deepEqual(planned, { ok: false, conflictName: '同名' })
  })

  it('添加到已有代理组只追加集合原名，之后改过滤也不丢掉', () => {
    let group = appendCollectionsToProxyGroup(
      createDefaultFormState('节点选择'),
      [HK, SG]
    )
    assert.equal(group.name, '节点选择')
    assert.deepEqual(group.proxyOrder, [HK, SG])
    assert.deepEqual(group.usedProviders, [HK, SG])

    const again = appendCollectionsToProxyGroup(group, [HK])
    assert.deepEqual(again.proxyOrder, [HK, SG])
    assert.deepEqual(again.usedProviders, [HK, SG])

    group = { ...group, type: 'fallback', filterKeywords: '港' }
    group = applyProxyOrderFromEditor(group, orderAfterSourceToggles(group), [])
    assert.equal(group.name, '节点选择')
    assert.deepEqual(group.usedProviders, [HK, SG])
    assert.deepEqual(formStateToConfig(group).use, [HK, SG])
  })

  it('只有名字、没有 use 的旧组打开后行为不变', () => {
    const content = `
proxy-groups:
  - name: 良心云 新加坡
    type: fallback
    filter: 新加坡|SG
    proxies:
      - 良心云-HK香港节点
  - name: 节点选择
    type: select
    proxies:
      - 自动选择
  - name: 自动选择
    type: select
`
    const groups = extractProxyGroups(content)
    const legacy = groups.find((group) => group.name === '良心云 新加坡')
    assert.ok(legacy)
    assert.equal(legacy?.type, 'fallback')
    assert.equal(legacy?.filterKeywords, '新加坡, SG')
    assert.deepEqual(legacy?.usedProviders, [])
    assert.equal(legacy?.proxyOrder.includes(HK), false)
    assert.deepEqual(legacy?.staticProxies, [HK])

    const selector = groups.find((group) => group.name === '节点选择')
    assert.equal(selector?.proxyOrder.includes('自动选择'), true)
    assert.deepEqual(selector?.usedProviders, [])
    assert.equal(selector?.staticProxies.includes('自动选择'), false)
  })

  it('点代理集合时，即使另一个组同名也写入 use，不放进 proxies', () => {
    const UK = '良心云-🇬🇧英国节点'
    const ukCollection: ProxyCollectionSource = {
      name: UK,
      subscriptionId: 7,
      filter: '伦敦|英国|UK',
      excludeFilter: '',
      processMode: 'client',
    }
    const planned = planNewProxyGroupsFromCollections({
      selectedNames: [UK],
      nameEdits: {},
      existingGroupNames: ['节点选择'],
      existingSnapshots: [],
      collections: [ukCollection],
    })
    assert.equal(planned.ok, true)
    if (!planned.ok) return

    const child = planned.groups[0]
    assert.equal(child.name, UK)
    assert.deepEqual(child.usedProviders, [UK])
    assert.deepEqual(providerNamesForGroup([UK], child.name, ['节点选择']), [UK])
    // 父组的集合列表也要列出这个同名集合。
    assert.deepEqual(providerNamesForGroup([UK], '节点选择', [UK]), [UK])

    let parent = createDefaultFormState('节点选择')
    parent = selectProxyReference(parent, UK, 'provider')
    parent = applyProxyOrderFromEditor(parent, parent.proxyOrder, [UK], [UK])
    assert.equal(parent.proxyOrder.includes(UK), true)
    assert.deepEqual(parent.usedProviders, [UK])
    assert.equal(proxyReferenceChecked(parent.proxyOrder, parent.usedProviders, UK, 'provider'), true)
    assert.equal(proxyReferenceChecked(parent.proxyOrder, parent.usedProviders, UK, 'group'), false)

    const picked = formStateToConfig(parent)
    assert.deepEqual(picked.use, [UK])
    assert.ok(!picked.proxies?.includes(UK))

    const saved = saveAndReopen([parent, child], planned.snapshotsToAdd)
    const reopenedParent = saved.groups.find((group) => group.name === '节点选择')
    const reopenedChild = saved.groups.find((group) => group.name === UK)
    assert.ok(reopenedParent)
    assert.ok(reopenedChild)
    assert.deepEqual(reopenedParent?.usedProviders, [UK])
    assert.equal(reopenedParent?.proxyOrder.includes(UK), true)
    assert.deepEqual(reopenedChild?.usedProviders, [UK])
    assert.deepEqual(formStateToConfig(reopenedParent!).use, [UK])
    assert.ok(!formStateToConfig(reopenedParent!).proxies?.includes(UK))
    assert.deepEqual(formStateToConfig(reopenedChild!).use, [UK])
  })

  it('点代理组时，即使存在同名快照也不进 use', () => {
    const UK = '良心云-🇬🇧英国节点'
    const child = createDefaultFormState(UK)
    child.proxyOrder = [UK]
    child.usedProviders = [UK]

    let parent = createDefaultFormState('节点选择')
    parent = selectProxyReference(parent, UK, 'group')
    parent = applyProxyOrderFromEditor(parent, parent.proxyOrder, [UK], [UK])
    assert.equal(parent.proxyOrder.includes(UK), true)
    assert.deepEqual(parent.usedProviders, [])
    assert.equal(proxyReferenceChecked(parent.proxyOrder, parent.usedProviders, UK, 'group'), true)
    assert.equal(proxyReferenceChecked(parent.proxyOrder, parent.usedProviders, UK, 'provider'), false)

    const picked = formStateToConfig(parent)
    assert.equal(picked.proxies?.includes(UK), true)
    assert.equal(picked.use, undefined)

    const saved = saveAndReopen([parent, child], [{
      name: UK,
      subscriptionId: 7,
      filter: '伦敦|英国|UK',
      excludeFilter: '',
      processMode: 'client',
    }])
    const reopenedParent = saved.groups.find((group) => group.name === '节点选择')
    const reopenedChild = saved.groups.find((group) => group.name === UK)
    assert.deepEqual(reopenedParent?.usedProviders, [])
    assert.equal(reopenedParent?.proxyOrder.includes(UK), true)
    assert.equal(formStateToConfig(reopenedParent!).proxies?.includes(UK), true)
    assert.equal(formStateToConfig(reopenedParent!).use, undefined)
    assert.deepEqual(reopenedChild?.usedProviders, [UK])
    assert.deepEqual(formStateToConfig(reopenedChild!).use, [UK])
  })

  it('再点另一栏是切换类型，再点当前栏才移除', () => {
    const UK = '良心云-🇬🇧英国节点'
    let parent = createDefaultFormState('节点选择')
    parent = selectProxyReference(parent, UK, 'group')
    parent = selectProxyReference(parent, UK, 'provider')
    assert.deepEqual(parent.proxyOrder, [UK])
    assert.deepEqual(parent.usedProviders, [UK])
    parent = selectProxyReference(parent, UK, 'group')
    assert.deepEqual(parent.proxyOrder, [UK])
    assert.deepEqual(parent.usedProviders, [])
    parent = selectProxyReference(parent, UK, 'group')
    assert.deepEqual(parent.proxyOrder, [])
    assert.deepEqual(parent.usedProviders, [])
  })

  it('只含 proxies 的已保存同名项，加载后仍不是 use', () => {
    const UK = '良心云-🇬🇧英国节点'
    const content = `
proxy-groups:
  - name: 节点选择
    type: select
    proxies:
      - 故障转移
      - ${UK}
      - DIRECT
  - name: ${UK}
    type: select
    use:
      - ${UK}
  - name: 故障转移
    type: fallback
proxy-provider-snapshots:
  - name: ${UK}
    subscription_id: 7
    process_mode: client
`
    const groups = extractProxyGroups(content)
    const parent = groups.find((group) => group.name === '节点选择')
    const child = groups.find((group) => group.name === UK)
    assert.ok(parent)
    assert.ok(child)
    assert.equal(parent?.proxyOrder.includes(UK), true)
    assert.equal(parent?.proxyOrder.includes('故障转移'), true)
    assert.deepEqual(parent?.usedProviders, [])
    assert.equal(parent?.includedProxyGroups.includes(UK), true)
    assert.deepEqual(child?.usedProviders, [UK])

    const edited = applyProxyOrderFromEditor(parent!, parent!.proxyOrder, [UK], [UK])
    assert.deepEqual(edited.usedProviders, [])
    assert.equal(formStateToConfig(edited).proxies?.includes(UK), true)
    assert.equal(formStateToConfig(edited).use, undefined)
    assert.deepEqual(formStateToConfig(child!).use, [UK])
  })

  it('已保存的同名 use，加载后仍是 use', () => {
    const UK = '良心云-🇬🇧英国节点'
    const content = `
proxy-groups:
  - name: 节点选择
    type: select
    proxies:
      - 故障转移
      - DIRECT
    use:
      - ${UK}
  - name: ${UK}
    type: select
    proxies:
      - ${UK}
    use:
      - ${UK}
  - name: 故障转移
    type: fallback
`
    const groups = extractProxyGroups(content)
    const parent = groups.find((group) => group.name === '节点选择')
    const child = groups.find((group) => group.name === UK)
    assert.ok(parent)
    assert.ok(child)
    assert.equal(parent?.proxyOrder.includes(UK), true)
    assert.deepEqual(parent?.usedProviders, [UK])
    assert.equal(parent?.includedProxyGroups.includes(UK), false)
    assert.deepEqual(child?.usedProviders, [UK])
    assert.equal(child?.includedProxyGroups.includes(UK), false)

    const parentConfig = formStateToConfig(parent!)
    assert.deepEqual(parentConfig.use, [UK])
    assert.ok(!parentConfig.proxies?.includes(UK))
    assert.equal(parentConfig.proxies?.includes('DIRECT'), true)
    assert.deepEqual(formStateToConfig(child!).use, [UK])
    assert.ok(!formStateToConfig(child!).proxies?.includes(UK))

    const saved = saveAndReopen(groups, [])
    const reopenedParent = saved.groups.find((group) => group.name === '节点选择')
    const reopenedChild = saved.groups.find((group) => group.name === UK)
    assert.deepEqual(reopenedParent?.usedProviders, [UK])
    assert.deepEqual(formStateToConfig(reopenedParent!).use, [UK])
    assert.ok(!formStateToConfig(reopenedParent!).proxies?.includes(UK))
    assert.deepEqual(reopenedChild?.usedProviders, [UK])
  })

  it('删组后没有引用就去掉同名快照，还有引用则保留', () => {
    const UK = '良心云-🇬🇧英国节点'
    const snapshots: ProxyProviderSnapshot[] = [
      { name: UK, subscriptionId: 7, filter: '伦敦|英国|UK', excludeFilter: '', processMode: 'client' },
      { name: HK, subscriptionId: 7, filter: 'HK|香港', excludeFilter: '', processMode: 'client' },
    ]
    const child = createDefaultFormState(UK)
    child.proxyOrder = [UK]
    child.usedProviders = [UK]
    const parentReferencingOrder = createDefaultFormState('节点选择')
    parentReferencingOrder.proxyOrder = ['故障转移', UK]

    const keptBecauseOrder = snapshotsAfterGroupDelete(snapshots, UK, [parentReferencingOrder])
    assert.deepEqual(keptBecauseOrder.map((snapshot) => snapshot.name), [UK, HK])
    assert.deepEqual(parentReferencingOrder.proxyOrder, ['故障转移', UK])

    const parentReferencingUse = createDefaultFormState('故障转移')
    parentReferencingUse.usedProviders = [UK]
    parentReferencingUse.proxyOrder = [UK]
    const keptBecauseUse = snapshotsAfterGroupDelete(snapshots, child.name, [parentReferencingUse])
    assert.deepEqual(keptBecauseUse.map((snapshot) => snapshot.name), [UK, HK])

    const untouched = createDefaultFormState('节点选择')
    untouched.proxyOrder = ['故障转移']
    const removed = snapshotsAfterGroupDelete(snapshots, UK, [untouched])
    assert.deepEqual(removed.map((snapshot) => snapshot.name), [HK])

    const unrelatedDelete = snapshotsAfterGroupDelete(snapshots, '节点选择', [child])
    assert.deepEqual(unrelatedDelete.map((snapshot) => snapshot.name), [UK, HK])
  })

  it('组名和集合名不同时，引用组名不是 use，直接引用集合名仍是 use', () => {
    const region = '香港节点'
    let parent = createDefaultFormState('节点选择')
    parent = selectProxyReference(parent, region, 'group')
    parent = selectProxyReference(parent, HK, 'provider')
    // 快照名单里就算带上组名，重算也不会把组引用收进 use。
    parent = applyProxyOrderFromEditor(parent, parent.proxyOrder, [HK, region], [region])
    assert.equal(parent.proxyOrder.includes(region), true)
    assert.equal(parent.proxyOrder.includes(HK), true)
    assert.deepEqual(parent.usedProviders, [HK])
    assert.deepEqual(providerNamesForGroup([HK, region], parent.name, [region]), [HK, region])

    const config = formStateToConfig(parent)
    assert.equal(config.proxies?.includes(region), true)
    assert.equal(config.proxies?.includes(HK), false)
    assert.deepEqual(config.use, [HK])

    const regionGroup = createDefaultFormState(region)
    const saved = saveAndReopen([parent, regionGroup], [{
      name: HK,
      subscriptionId: 7,
      filter: 'HK|香港',
      excludeFilter: '到期',
      processMode: 'client',
    }])
    const reopened = saved.groups.find((group) => group.name === '节点选择')
    assert.equal(reopened?.proxyOrder.includes(region), true)
    assert.deepEqual(reopened?.usedProviders, [HK])
    assert.deepEqual(formStateToConfig(reopened!).use, [HK])
    assert.equal(saved.groups.find((group) => group.name === region)?.name, region)
  })

  it('新建同名组不会自动进入节点选择', () => {
    const UK = '良心云-🇬🇧英国节点'
    const selector = createDefaultFormState('节点选择')
    selector.proxyOrder = ['香港节点']
    const planned = planNewProxyGroupsFromCollections({
      selectedNames: [UK],
      nameEdits: {},
      existingGroupNames: ['节点选择'],
      existingSnapshots: [],
      collections: [{
        name: UK,
        subscriptionId: 7,
        filter: '伦敦|英国|UK',
        excludeFilter: '',
        processMode: 'client',
      }],
    })
    assert.equal(planned.ok, true)
    if (!planned.ok) return
    const merged = [selector, ...planned.groups]
    assert.equal(merged[0].name, '节点选择')
    assert.deepEqual(merged[0].proxyOrder, ['香港节点'])
    assert.equal(merged[0].proxyOrder.includes(UK), false)
    assert.deepEqual(merged[0].usedProviders, [])
    assert.equal(planned.groups[0].name, UK)
    assert.deepEqual(planned.groups[0].usedProviders, [UK])
  })

  it('找不到集合配置时仍建组，但不编造快照', () => {
    const planned = planNewProxyGroupsFromCollections({
      selectedNames: ['不存在的集合'],
      nameEdits: {},
      existingGroupNames: [],
      existingSnapshots: [],
      collections: [],
    })
    assert.equal(planned.ok, true)
    if (!planned.ok) return
    assert.equal(planned.groups[0].name, '不存在的集合')
    assert.deepEqual(planned.groups[0].usedProviders, ['不存在的集合'])
    assert.deepEqual(planned.snapshotsToAdd, [])
  })
})
