package handler

import (
	"strings"
	"testing"

	"miaomiaowu/internal/storage"
)

func TestPrepareTemplateWithoutSnapshotsIsUntouched(t *testing.T) {
	content := "proxy-groups:\n  - name: 节点选择\n    type: select\n    include-all-providers: true\n"
	providers := map[string][]string{"旧集合": {"节点A"}}
	got, plan := prepareTemplateProviderSnapshots(t.Context(), nil, "", content, nil, providers)
	if got != content {
		t.Fatalf("old template content changed:\n%s", got)
	}
	if plan != nil {
		t.Fatal("old template should not produce a provider plan")
	}
	if len(providers) != 1 || providers["旧集合"][0] != "节点A" {
		t.Fatalf("providers map changed: %#v", providers)
	}
}

func TestApplyMMWSnapshotResolvesOnlyMatchingSubscription(t *testing.T) {
	content := `proxy-provider-snapshots:
  - name: 良心云-HK香港节点
    subscription_id: 7
    filter: HK|香港
    process_mode: mmw
proxy-groups:
  - name: 节点选择
    type: select
    use:
      - 良心云-HK香港节点
    proxies:
      - 🚀 自动选择
      - 良心云-HK香港节点
`
	nodes := []storage.Node{
		{NodeName: "HK-1", Enabled: true, Tag: "良心云", Tags: []string{"良心云"}},
		{NodeName: "US-1", Enabled: true, Tag: "良心云", Tags: []string{"良心云"}},
		{NodeName: "HK-其他", Enabled: true, Tag: "别的订阅", Tags: []string{"别的订阅"}},
		{NodeName: "停用", Enabled: false, Tag: "良心云", Tags: []string{"良心云"}},
	}
	subs := map[int64]storage.ExternalSubscription{7: {ID: 7, Name: "良心云"}}
	providers := map[string][]string{"未选集合": {"别的节点"}}
	got, plan := applyProxyProviderSnapshots(content, nodes, subs, providers, []proxyProviderSnapshot{{
		Name: "良心云-HK香港节点", SubscriptionID: 7, Filter: "HK|香港", ProcessMode: "mmw",
	}})
	if plan != nil {
		t.Fatalf("mmw snapshot should stay in use, plan=%#v", plan.clientUses)
	}
	if _, ok := providers["未选集合"]; !ok {
		t.Fatal("unselected provider was removed")
	}
	gotNames := providers["良心云-HK香港节点"]
	if len(gotNames) != 1 || gotNames[0] != "HK-1" {
		t.Fatalf("resolved nodes = %#v", gotNames)
	}
	if strings.Contains(got, "proxy-provider-snapshots:") {
		t.Fatalf("snapshot key leaked into processor input:\n%s", got)
	}
	proxies := got[strings.Index(got, "proxies:"):]
	if strings.Contains(proxies, "良心云-HK香港节点") {
		t.Fatalf("snapshot name still listed as a proxy member:\n%s", got)
	}
	if !strings.Contains(got, "use:") || !strings.Contains(got, "良心云-HK香港节点") {
		t.Fatalf("use reference missing:\n%s", got)
	}
}

func TestApplyClientSnapshotRestoresUseWithoutOtherProviders(t *testing.T) {
	content := `proxy-provider-snapshots:
  - name: 良心云-HK香港节点
    subscription_id: 7
    filter: HK
    process_mode: client
  - name: 未选集合
    subscription_id: 8
    process_mode: client
proxy-groups:
  - name: 节点选择
    type: select
    use:
      - 良心云-HK香港节点
`
	snapshots := []proxyProviderSnapshot{
		{Name: "良心云-HK香港节点", SubscriptionID: 7, Filter: "HK", ProcessMode: "client"},
		{Name: "未选集合", SubscriptionID: 8, ProcessMode: "client"},
	}
	prepared, plan := applyProxyProviderSnapshots(content, nil, nil, map[string][]string{}, snapshots)
	if plan == nil || len(plan.clientUses["节点选择"]) != 1 || plan.clientUses["节点选择"][0] != "良心云-HK香港节点" {
		t.Fatalf("client use plan = %#v", plan)
	}
	if strings.Contains(prepared, "未选集合") {
		t.Fatalf("unselected snapshot leaked:\n%s", prepared)
	}
	configs := []storage.ProxyProviderConfig{
		{ID: 3, Name: "良心云-HK香港节点", Type: "http", Interval: 3600, ProcessMode: "client"},
		{ID: 4, Name: "未选集合", Type: "http", Interval: 3600, ProcessMode: "client"},
	}
	// 处理器会删掉占位符以外的 use。这里直接把准备后的结果交给收尾，确认只写回选中的集合。
	finished := finishTemplateProviderSnapshots(prepared, plan, configs)
	if !strings.Contains(finished, "use:") || !strings.Contains(finished, "良心云-HK香港节点") {
		t.Fatalf("selected provider missing from use:\n%s", finished)
	}
	if strings.Contains(finished, "未选集合") {
		t.Fatalf("unselected provider was added:\n%s", finished)
	}
	if !strings.Contains(finished, "/api/proxy-provider/3") {
		t.Fatalf("client proxy-provider url missing:\n%s", finished)
	}
	if strings.Contains(finished, clientProviderUsePlaceholder) {
		t.Fatalf("placeholder left in output:\n%s", finished)
	}
}

func TestIncludeAllProvidersKeepsClientUseInProcessorInput(t *testing.T) {
	content := `proxy-provider-snapshots:
  - name: 选中集合
    subscription_id: 1
    process_mode: client
proxy-groups:
  - name: 节点选择
    type: select
    include-all-providers: true
    use:
      - 选中集合
`
	prepared, plan := applyProxyProviderSnapshots(content, nil, nil, map[string][]string{}, []proxyProviderSnapshot{{
		Name: "选中集合", SubscriptionID: 1, ProcessMode: "client",
	}})
	if plan != nil {
		t.Fatal("include-all-providers should keep the old expansion path")
	}
	if !strings.Contains(prepared, "include-all-providers: true") || !strings.Contains(prepared, "选中集合") {
		t.Fatalf("old switch input changed:\n%s", prepared)
	}
}
