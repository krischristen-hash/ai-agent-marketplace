#!/bin/bash
# Agent Memory Manager Installer
# Creates HOT/WARM/COLD memory tier directories and config

MEMORY_BASE="${AGENT_MEMORY_DIR:-$HOME/.agent-memory}"
mkdir -p "$MEMORY_BASE"/{hot,warm,cold,index}

cat > "$MEMORY_BASE/config.json" << 'EOF'
{
  "tiers": {
    "hot": { "max_mb": 100, "ttl_seconds": 3600, "storage": "memory" },
    "warm": { "max_mb": 500, "ttl_seconds": 86400, "storage": "ssd" },
    "cold": { "max_mb": 5000, "ttl_seconds": 2592000, "storage": "disk" }
  },
  "consolidation_interval_hours": 24,
  "search_index": "memory-index"
}
EOF

cat > "$MEMORY_BASE/memory_tier.py" << 'PYEOF'
#!/usr/bin/env python3
"""HOT/WARM/COLD memory tier system for AI agents"""
import json
import os
import time
from pathlib import Path
from typing import Optional, Dict, Any

class MemoryTier:
    def __init__(self, name: str, config: Dict):
        self.name = name
        self.max_mb = config.get('max_mb', 100)
        self.ttl = config.get('ttl_seconds', 3600)
        self.storage = config.get('storage', 'memory')
        self.base_path = Path(os.environ.get('AGENT_MEMORY_DIR', os.path.expanduser('~/.agent-memory'))) / name
        self.base_path.mkdir(parents=True, exist_ok=True)
    
    def write(self, key: str, value: str, priority: int = 0) -> bool:
        path = self.base_path / f"{key}.json"
        data = {
            'key': key, 'value': value, 'priority': priority,
            'created': time.time(), 'accessed': time.time()
        }
        try:
            with open(path, 'w') as f:
                json.dump(data, f)
            return True
        except Exception as e:
            print(f"Error writing to {self.name}: {e}")
            return False
    
    def read(self, key: str) -> Optional[Dict]:
        path = self.base_path / f"{key}.json"
        if not path.exists():
            return None
        try:
            with open(path, 'r') as f:
                data = json.load(f)
            data['accessed'] = time.time()
            with open(path, 'w') as f:
                json.dump(data, f)
            return data
        except Exception:
            return None
    
    def delete(self, key: str) -> bool:
        path = self.base_path / f"{key}.json"
        return path.exists() and path.unlink()
    
    def list_keys(self) -> list:
        return [p.stem for p in self.base_path.glob('*.json')]
    
    def size_mb(self) -> float:
        total = sum(f.stat().st_size for f in self.base_path.glob('*.json'))
        return total / (1024 * 1024)

class MemoryManager:
    def __init__(self):
        config_path = Path(os.environ.get('AGENT_MEMORY_DIR', os.path.expanduser('~/.agent-memory'))) / 'config.json'
        if config_path.exists():
            with open(config_path) as f:
                self.config = json.load(f)
        else:
            self.config = {'tiers': {}}
        self.hot = MemoryTier('hot', self.config.get('tiers', {}).get('hot', {}))
        self.warm = MemoryTier('warm', self.config.get('tiers', {}).get('warm', {}))
        self.cold = MemoryTier('cold', self.config.get('tiers', {}).get('cold', {}))
    
    def store(self, key: str, value: str, priority: int = 0) -> str:
        """Auto-tier based on priority and age"""
        if priority >= 8:
            self.hot.write(key, value, priority)
            return 'hot'
        elif priority >= 4:
            self.warm.write(key, value, priority)
            return 'warm'
        else:
            self.cold.write(key, value, priority)
            return 'cold'
    
    def retrieve(self, key: str) -> Optional[str]:
        for tier in [self.hot, self.warm, self.cold]:
            data = tier.read(key)
            if data:
                return data.get('value')
        return None
    
    def search(self, query: str, limit: int = 10) -> list:
        """Simple keyword search across all tiers"""
        results = []
        for tier in [self.hot, self.warm, self.cold]:
            for key in tier.list_keys():
                data = tier.read(key)
                if data and query.lower() in data.get('value', '').lower():
                    results.append(data)
        return sorted(results, key=lambda x: x.get('priority', 0), reverse=True)[:limit]
    
    def consolidate(self):
        """Move old HOT items to WARM, old WARM to COLD"""
        for key in self.hot.list_keys():
            data = self.hot.read(key)
            if data and (time.time() - data['created']) > self.hot.ttl:
                self.warm.write(key, data['value'], data.get('priority', 0))
                self.hot.delete(key)
        for key in self.warm.list_keys():
            data = self.warm.read(key)
            if data and (time.time() - data['created']) > self.warm.ttl:
                self.cold.write(key, data['value'], data.get('priority', 0))
                self.warm.delete(key)

if __name__ == '__main__':
    mm = MemoryManager()
    mm.store('test', 'Hello world', priority=5)
    print(f"Retrieved: {mm.retrieve('test')}")
    print(f"HOT size: {mm.hot.size_mb():.2f} MB")
PYEOF

cat > "$MEMORY_BASE/search.py" << 'PYEOF'
#!/usr/bin/env python3
"""Semantic search across all memory tiers"""
import json
import os
from pathlib import Path
from typing import List, Dict

class MemorySearch:
    def __init__(self, base_path: str = None):
        self.base_path = Path(base_path or os.path.expanduser('~/.agent-memory'))
    
    def search(self, query: str, tier: str = 'all', limit: int = 20) -> List[Dict]:
        results = []
        query_lower = query.lower()
        tiers = [tier] if tier != 'all' else ['hot', 'warm', 'cold']
        for t in tiers:
            tier_path = self.base_path / t
            if not tier_path.exists():
                continue
            for fp in tier_path.glob('*.json'):
                try:
                    with open(fp) as f:
                        data = json.load(f)
                    value_lower = data.get('value', '').lower()
                    if query_lower in value_lower:
                        results.append({**data, 'tier': t})
                except Exception:
                    continue
        return sorted(results, key=lambda x: x.get('priority', 0), reverse=True)[:limit]
    
    def count(self) -> Dict[str, int]:
        counts = {}
        for t in ['hot', 'warm', 'cold']:
            tier_path = self.base_path / t
            counts[t] = len(list(tier_path.glob('*.json'))) if tier_path.exists() else 0
        return counts

if __name__ == '__main__':
    search = MemorySearch()
    print(f"Memory counts: {search.count()}")
    print("Search results:", search.search('test', limit=5))
PYEOF

cat > "$MEMORY_BASE/consolidate.py" << 'PYEOF'
#!/usr/bin/env python3
"""Automatic memory consolidation - promotes/demotes based on age and priority"""
import json
import os
import time
from pathlib import Path

def consolidate():
    base = Path(os.environ.get('AGENT_MEMORY_DIR', os.path.expanduser('~/.agent-memory')))
    config_path = base / 'config.json'
    
    if not config_path.exists():
        print("No config found")
        return
    
    with open(config_path) as f:
        config = json.load(f)
    
    tiers_config = config.get('tiers', {})
    hot_ttl = tiers_config.get('hot', {}).get('ttl_seconds', 3600)
    warm_ttl = tiers_config.get('warm', {}).get('ttl_seconds', 86400)
    
    now = time.time()
    demotions = 0
    
    # HOT -> WARM (expired hot items)
    for fp in (base / 'hot').glob('*.json'):
        try:
            with open(fp) as f:
                data = json.load(f)
            if now - data.get('created', 0) > hot_ttl:
                new_tier = 'warm'
                with open(base / new_tier / fp.name, 'w') as f:
                    json.dump(data, f)
                fp.unlink()
                demotions += 1
        except Exception:
            continue
    
    # WARM -> COLD (expired warm items)
    for fp in (base / 'warm').glob('*.json'):
        try:
            with open(fp) as f:
                data = json.load(f)
            if now - data.get('created', 0) > warm_ttl:
                new_tier = 'cold'
                with open(base / new_tier / fp.name, 'w') as f:
                    json.dump(data, f)
                fp.unlink()
                demotions += 1
        except Exception:
            continue
    
    print(f"Consolidation complete. Demoted {demotions} items.")

if __name__ == '__main__':
    consolidate()
PYEOF

chmod +x "$MEMORY_BASE/memory_tier.py" "$MEMORY_BASE/search.py" "$MEMORY_BASE/consolidate.py"
echo "✅ Agent Memory Manager installed to $MEMORY_BASE"
echo "Run: python3 $MEMORY_BASE/memory_tier.py"
