package handler

import (
	"context"
	"regexp"
	"strconv"
	"strings"

	"miaomiaowu/internal/logger"
	"miaomiaowu/internal/storage"

	"gopkg.in/yaml.v3"
)

const (
	proxyProviderSnapshotsKey = "proxy-provider-snapshots"
	// 仅用于避免「只引用了客户端模式集合、组里没有其他成员」时，模板处理器把全部节点塞进组。
	clientProviderUsePlaceholder = "__MMW_PROVIDER_USE__"
)

// proxyProviderSnapshot 是模板里保存的代理集合副本。
type proxyProviderSnapshot struct {
	Name           string `yaml:"name"`
	SubscriptionID int64  `yaml:"subscription_id"`
	Filter         string `yaml:"filter"`
	ExcludeFilter  string `yaml:"exclude_filter"`
	ProcessMode    string `yaml:"process_mode"`
}

// templateProviderPlan 记录生成前从 use 里拆出去、生成后要写回的客户端模式集合。
type templateProviderPlan struct {
	clientUses map[string][]string
}

func (p *templateProviderPlan) empty() bool {
	return p == nil || len(p.clientUses) == 0
}

// prepareTemplateProviderSnapshots 读取模板副本。
// 没有副本时原样返回，保证旧模板交给处理器的内容和以前一致。
// 妙妙屋模式按订阅来源和过滤覆盖 providers 里同名集合；客户端模式先从 use 拆走，避免被展开成全部节点。
func prepareTemplateProviderSnapshots(ctx context.Context, repo *storage.TrafficRepository, username, templateContent string, nodes []storage.Node, providers map[string][]string) (string, *templateProviderPlan) {
	if !strings.Contains(templateContent, proxyProviderSnapshotsKey) {
		return templateContent, nil
	}
	snapshots, ok := parseProxyProviderSnapshots(templateContent)
	if !ok {
		return templateContent, nil
	}
	subs := loadSnapshotSubscriptions(ctx, repo, username, snapshots)
	return applyProxyProviderSnapshots(templateContent, nodes, subs, providers, snapshots)
}

func loadSnapshotSubscriptions(ctx context.Context, repo *storage.TrafficRepository, username string, snapshots []proxyProviderSnapshot) map[int64]storage.ExternalSubscription {
	subs := make(map[int64]storage.ExternalSubscription)
	if repo == nil {
		return subs
	}
	for _, snapshot := range snapshots {
		if snapshot.SubscriptionID <= 0 {
			continue
		}
		if _, exists := subs[snapshot.SubscriptionID]; exists {
			continue
		}
		sub, err := repo.GetExternalSubscription(ctx, snapshot.SubscriptionID, username)
		if err != nil {
			logger.Info("[模板生成] 代理集合副本的订阅来源不存在", "name", snapshot.Name, "subscription_id", snapshot.SubscriptionID, "error", err)
			continue
		}
		subs[snapshot.SubscriptionID] = sub
	}
	return subs
}

func parseProxyProviderSnapshots(content string) ([]proxyProviderSnapshot, bool) {
	var root yaml.Node
	if err := yaml.Unmarshal([]byte(content), &root); err != nil {
		return nil, false
	}
	mapping := documentMapping(&root)
	if mapping == nil {
		return nil, false
	}
	node := mappingValue(mapping, proxyProviderSnapshotsKey)
	if node == nil || node.Kind != yaml.SequenceNode {
		return nil, false
	}
	var snapshots []proxyProviderSnapshot
	for _, item := range node.Content {
		if item.Kind != yaml.MappingNode {
			continue
		}
		snapshot := proxyProviderSnapshot{
			Name:           strings.TrimSpace(mappingScalar(item, "name")),
			SubscriptionID: int64(parseInt(mappingScalar(item, "subscription_id"))),
			Filter:         mappingScalar(item, "filter"),
			ExcludeFilter:  mappingScalar(item, "exclude_filter"),
			ProcessMode:    strings.TrimSpace(mappingScalar(item, "process_mode")),
		}
		if snapshot.Name == "" {
			continue
		}
		if snapshot.ProcessMode == "" {
			snapshot.ProcessMode = "client"
		}
		snapshots = append(snapshots, snapshot)
	}
	return snapshots, true
}

func applyProxyProviderSnapshots(content string, nodes []storage.Node, subs map[int64]storage.ExternalSubscription, providers map[string][]string, snapshots []proxyProviderSnapshot) (string, *templateProviderPlan) {
	var root yaml.Node
	if err := yaml.Unmarshal([]byte(content), &root); err != nil {
		return content, nil
	}
	mapping := documentMapping(&root)
	if mapping == nil || mappingValue(mapping, proxyProviderSnapshotsKey) == nil {
		return content, nil
	}

	byName := make(map[string]proxyProviderSnapshot, len(snapshots))
	for _, snapshot := range snapshots {
		byName[snapshot.Name] = snapshot
		if snapshot.ProcessMode == "mmw" {
			if providers == nil {
				continue
			}
			providers[snapshot.Name] = resolveMMWSnapshotNodes(snapshot, nodes, subs)
		}
	}

	deleteMappingKey(mapping, proxyProviderSnapshotsKey)
	plan := &templateProviderPlan{clientUses: map[string][]string{}}
	if groups := mappingValue(mapping, "proxy-groups"); groups != nil && groups.Kind == yaml.SequenceNode {
		for _, group := range groups.Content {
			if group.Kind != yaml.MappingNode {
				continue
			}
			detachSnapshotUses(group, byName, plan)
		}
	}
	encoded, err := marshalYAMLNode(&root)
	if err != nil {
		return content, nil
	}
	if plan.empty() {
		plan = nil
	}
	return encoded, plan
}

func resolveMMWSnapshotNodes(snapshot proxyProviderSnapshot, nodes []storage.Node, subs map[int64]storage.ExternalSubscription) []string {
	sub, hasSub := subs[snapshot.SubscriptionID]
	var names []string
	for _, node := range nodes {
		if !node.Enabled {
			continue
		}
		if hasSub {
			if !nodeTagged(node, sub.Name) {
				continue
			}
		} else if !nodeTagged(node, snapshot.Name) {
			continue
		}
		if !snapshotAllowsNode(snapshot, node.NodeName) {
			continue
		}
		names = append(names, node.NodeName)
	}
	if len(names) == 0 {
		// 显式选中的集合没有节点时，不能走处理器的「解析不到就塞进全部节点」兜底。
		return []string{"REJECT"}
	}
	return names
}

func snapshotAllowsNode(snapshot proxyProviderSnapshot, name string) bool {
	if snapshot.Filter != "" {
		re, err := regexp.Compile(snapshot.Filter)
		if err != nil {
			logger.Info("[模板生成] 代理集合副本过滤正则无效，忽略该过滤", "name", snapshot.Name, "filter", snapshot.Filter, "error", err)
		} else if !re.MatchString(name) {
			return false
		}
	}
	if snapshot.ExcludeFilter != "" {
		re, err := regexp.Compile(snapshot.ExcludeFilter)
		if err != nil {
			logger.Info("[模板生成] 代理集合副本排除正则无效，忽略该过滤", "name", snapshot.Name, "filter", snapshot.ExcludeFilter, "error", err)
		} else if re.MatchString(name) {
			return false
		}
	}
	return true
}

func nodeTagged(node storage.Node, name string) bool {
	name = strings.TrimSpace(name)
	if name == "" {
		return false
	}
	if strings.TrimSpace(node.Tag) == name {
		return true
	}
	for _, tag := range node.Tags {
		if strings.TrimSpace(tag) == name {
			return true
		}
	}
	return false
}

func detachSnapshotUses(group *yaml.Node, snapshots map[string]proxyProviderSnapshot, plan *templateProviderPlan) {
	use := mappingList(group, "use")
	if len(use) == 0 {
		return
	}
	groupName := mappingScalar(group, "name")
	proxies := mappingList(group, "proxies")
	includeAll := mappingBool(group, "include-all") || mappingBool(group, "include-all-providers")

	var keptUse []string
	var clientUses []string
	proxyDrop := map[string]bool{}
	for _, name := range use {
		snapshot, ok := snapshots[name]
		if !ok {
			keptUse = append(keptUse, name)
			continue
		}
		proxyDrop[name] = true
		if snapshot.ProcessMode == "client" && !includeAll {
			clientUses = append(clientUses, name)
			continue
		}
		keptUse = append(keptUse, name)
	}

	var keptProxies []string
	for _, name := range proxies {
		if proxyDrop[name] {
			continue
		}
		keptProxies = append(keptProxies, name)
	}
	if len(clientUses) > 0 && !groupHasMembers(group, keptUse, keptProxies) {
		keptProxies = append(keptProxies, clientProviderUsePlaceholder)
	}
	setMappingList(group, "use", keptUse)
	setMappingList(group, "proxies", keptProxies)
	if len(clientUses) > 0 && groupName != "" {
		plan.clientUses[groupName] = clientUses
	}
}

func groupHasMembers(group *yaml.Node, use, proxies []string) bool {
	if len(use) > 0 {
		return true
	}
	if mappingBool(group, "include-all") || mappingBool(group, "include-all-proxies") || mappingBool(group, "include-all-providers") || mappingBool(group, "include-region-proxy-groups") {
		return true
	}
	if strings.TrimSpace(mappingScalar(group, "filter")) != "" || strings.TrimSpace(mappingScalar(group, "include-type")) != "" {
		return true
	}
	for _, name := range proxies {
		switch name {
		case "", "__PROXY_NODES__", "__PROXY_PROVIDERS__", "__REGION_PROXY_GROUPS__":
			continue
		default:
			return true
		}
	}
	return false
}

// finishTemplateProviderSnapshots 把客户端模式的集合写回 use，并只为这些副本补 proxy-providers。
func finishTemplateProviderSnapshots(result string, plan *templateProviderPlan, configs []storage.ProxyProviderConfig) string {
	if plan.empty() || !strings.Contains(result, "proxy-groups:") {
		return result
	}
	var root yaml.Node
	if err := yaml.Unmarshal([]byte(result), &root); err != nil {
		return result
	}
	mapping := documentMapping(&root)
	if mapping == nil {
		return result
	}
	groups := mappingValue(mapping, "proxy-groups")
	if groups == nil || groups.Kind != yaml.SequenceNode {
		return result
	}
	used := map[string]bool{}
	for _, group := range groups.Content {
		if group.Kind != yaml.MappingNode {
			continue
		}
		name := mappingScalar(group, "name")
		clientUses := plan.clientUses[name]
		if len(clientUses) == 0 {
			continue
		}
		proxies := mappingList(group, "proxies")
		var kept []string
		for _, proxy := range proxies {
			if proxy == clientProviderUsePlaceholder {
				continue
			}
			kept = append(kept, proxy)
		}
		setMappingList(group, "proxies", kept)
		merged := mappingList(group, "use")
		for _, providerName := range clientUses {
			if !containsString(merged, providerName) {
				merged = append(merged, providerName)
			}
			used[providerName] = true
		}
		setMappingList(group, "use", merged)
	}
	if len(used) > 0 {
		appendClientProxyProviders(mapping, used, configs)
	}
	encoded, err := marshalYAMLNode(&root)
	if err != nil {
		return result
	}
	return encoded
}

func appendClientProxyProviders(root *yaml.Node, used map[string]bool, configs []storage.ProxyProviderConfig) {
	providers := mappingValue(root, "proxy-providers")
	if providers == nil {
		providers = &yaml.Node{Kind: yaml.MappingNode}
		root.Content = append(root.Content,
			&yaml.Node{Kind: yaml.ScalarNode, Value: "proxy-providers"},
			providers,
		)
	}
	if providers.Kind != yaml.MappingNode {
		return
	}
	for _, config := range configs {
		if !used[config.Name] || config.ProcessMode == "mmw" {
			continue
		}
		if mappingValue(providers, config.Name) != nil {
			continue
		}
		cfg := config
		providers.Content = append(providers.Content,
			&yaml.Node{Kind: yaml.ScalarNode, Value: config.Name},
			createProxyProviderYAMLNode(&cfg),
		)
		delete(used, config.Name)
	}
}

func documentMapping(root *yaml.Node) *yaml.Node {
	if root == nil {
		return nil
	}
	if root.Kind == yaml.DocumentNode {
		if len(root.Content) == 0 || root.Content[0].Kind != yaml.MappingNode {
			return nil
		}
		return root.Content[0]
	}
	if root.Kind == yaml.MappingNode {
		return root
	}
	return nil
}

func mappingValue(mapping *yaml.Node, key string) *yaml.Node {
	if mapping == nil || mapping.Kind != yaml.MappingNode {
		return nil
	}
	for i := 0; i+1 < len(mapping.Content); i += 2 {
		if mapping.Content[i].Value == key {
			return mapping.Content[i+1]
		}
	}
	return nil
}

func mappingScalar(mapping *yaml.Node, key string) string {
	value := mappingValue(mapping, key)
	if value == nil {
		return ""
	}
	return value.Value
}

func mappingBool(mapping *yaml.Node, key string) bool {
	return mappingScalar(mapping, key) == "true"
}

func mappingList(mapping *yaml.Node, key string) []string {
	value := mappingValue(mapping, key)
	if value == nil || value.Kind != yaml.SequenceNode {
		return nil
	}
	names := make([]string, 0, len(value.Content))
	for _, item := range value.Content {
		if item.Value != "" {
			names = append(names, item.Value)
		}
	}
	return names
}

func setMappingList(mapping *yaml.Node, key string, values []string) {
	if len(values) == 0 {
		deleteMappingKey(mapping, key)
		return
	}
	seq := &yaml.Node{Kind: yaml.SequenceNode, Tag: "!!seq"}
	for _, value := range values {
		seq.Content = append(seq.Content, &yaml.Node{Kind: yaml.ScalarNode, Tag: "!!str", Value: value})
	}
	for i := 0; i+1 < len(mapping.Content); i += 2 {
		if mapping.Content[i].Value == key {
			mapping.Content[i+1] = seq
			return
		}
	}
	mapping.Content = append(mapping.Content,
		&yaml.Node{Kind: yaml.ScalarNode, Tag: "!!str", Value: key},
		seq,
	)
}

func deleteMappingKey(mapping *yaml.Node, key string) {
	if mapping == nil || mapping.Kind != yaml.MappingNode {
		return
	}
	next := make([]*yaml.Node, 0, len(mapping.Content))
	for i := 0; i+1 < len(mapping.Content); i += 2 {
		if mapping.Content[i].Value == key {
			continue
		}
		next = append(next, mapping.Content[i], mapping.Content[i+1])
	}
	mapping.Content = next
}

func containsString(values []string, want string) bool {
	for _, value := range values {
		if value == want {
			return true
		}
	}
	return false
}

func marshalYAMLNode(root *yaml.Node) (string, error) {
	var buf strings.Builder
	enc := yaml.NewEncoder(&buf)
	enc.SetIndent(2)
	err := enc.Encode(root)
	_ = enc.Close()
	return buf.String(), err
}

func parseInt(value string) int {
	n, _ := strconv.Atoi(strings.TrimSpace(value))
	return n
}
