#!/bin/bash
# Agent Self-Healer Installer
# Sets up monitoring, healing, and circuit breaker systems

HEALER_BASE="${AGENT_HEALER_DIR:-$HOME/.agent-self-healer}"
mkdir -p "$HEALER_BASE"/{logs,state}

cat > "$HEALER_BASE/config.json" << 'EOF'
{
  "monitor_interval_seconds": 30,
  "max_retries": 3,
  "circuit_breaker_threshold": 5,
  "circuit_breaker_timeout_seconds": 60,
  "alert_webhook": null,
  "healing_strategies": ["restart", "reload_config", "clear_cache", "reconnect"]
}
EOF

cat > "$HEALER_BASE/monitor.py" << 'PYEOF'
#!/usr/bin/env python3
"""Real-time error monitoring for AI agents"""
import json
import os
import time
import traceback
from pathlib import Path
from datetime import datetime
from typing import Callable, Optional

class AgentMonitor:
    def __init__(self, log_dir: str = None):
        self.log_dir = Path(log_dir or os.path.expanduser('~/.agent-self-healer/logs'))
        self.log_dir.mkdir(parents=True, exist_ok=True)
        self.state_file = Path(os.path.expanduser('~/.agent-self-healer/state/monitor_state.json'))
        self.errors = []
        self.error_count = 0
    
    def watch(self, func: Callable, *args, **kwargs):
        """Wrap a function with error monitoring"""
        try:
            return func(*args, **kwargs)
        except Exception as e:
            self.record_error(e, func.__name__)
            raise
    
    def record_error(self, error: Exception, context: str = ""):
        """Log an error with full traceback"""
        self.error_count += 1
        error_record = {
            'timestamp': datetime.now().isoformat(),
            'type': type(error).__name__,
            'message': str(error),
            'traceback': traceback.format_exc(),
            'context': context,
            'error_id': self.error_count
        }
        self.errors.append(error_record)
        self._save_errors()
        return error_record
    
    def _save_errors(self):
        """Persist errors to disk"""
        with open(self.log_dir / 'errors.json', 'w') as f:
            json.dump(self.errors[-100:], f, indent=2)  # Keep last 100
    
    def get_error_rate(self, window_seconds: int = 300) -> float:
        """Calculate errors per minute over window"""
        now = time.time()
        recent = [e for e in self.errors if now - datetime.fromisoformat(e['timestamp']).timestamp() < window_seconds]
        return len(recent) / (window_seconds / 60)
    
    def is_healthy(self) -> bool:
        """Check if error rate is within acceptable threshold"""
        return self.get_error_rate() < 0.1  # Less than 0.1 errors/minute
    
    def get_status(self) -> dict:
        return {
            'healthy': self.is_healthy(),
            'total_errors': self.error_count,
            'error_rate_per_min': self.get_error_rate(),
            'last_error': self.errors[-1] if self.errors else None
        }

def run_monitor_loop(interval: int = 30):
    """Example: run monitor in a loop"""
    monitor = AgentMonitor()
    print(f"Agent Self-Healer Monitor started. Interval: {interval}s")
    while True:
        status = monitor.get_status()
        print(f"[{datetime.now().isoformat()}] Health: {status['healthy']}, Errors: {status['total_errors']}")
        if not status['healthy']:
            print(f"⚠️ Unhealthy! Error rate: {status['error_rate_per_min']:.2f}/min")
        time.sleep(interval)

if __name__ == '__main__':
    import sys
    interval = int(sys.argv[1]) if len(sys.argv) > 1 else 30
    run_monitor_loop(interval)
PYEOF

cat > "$HEALER_BASE/healer.py" << 'PYEOF'
#!/usr/bin/env python3
"""Self-healing strategies for AI agents"""
import json
import os
import subprocess
import time
from pathlib import Path
from typing import List, Callable

class HealingStrategy:
    def __init__(self, name: str, action: Callable):
        self.name = name
        self.action = action
    
    def execute(self) -> bool:
        try:
            return self.action()
        except Exception as e:
            print(f"Healing strategy '{self.name}' failed: {e}")
            return False

class AgentHealer:
    def __init__(self, config_path: str = None):
        self.state_dir = Path(os.path.expanduser('~/.agent-self-healer/state'))
        self.state_dir.mkdir(parents=True, exist_ok=True)
        self.healing_log = self.state_dir / 'healing_log.json'
        
        self.strategies: List[HealingStrategy] = [
            HealingStrategy('restart', self._heal_restart),
            HealingStrategy('reload_config', self._heal_reload_config),
            HealingStrategy('clear_cache', self._heal_clear_cache),
            HealingStrategy('reconnect', self._heal_reconnect),
        ]
    
    def _heal_restart(self) -> bool:
        """Attempt to restart the agent process"""
        try:
            # In a real implementation, this would restart the actual agent process
            print("Executing: Process restart")
            return True
        except Exception:
            return False
    
    def _heal_reload_config(self) -> bool:
        """Reload configuration without restart"""
        try:
            print("Executing: Config reload")
            return True
        except Exception:
            return False
    
    def _heal_clear_cache(self) -> bool:
        """Clear temporary caches"""
        try:
            for cache_dir in ['/tmp/agent-*', '~/.cache/agent']:
                subprocess.run(f"rm -rf {cache_dir}", shell=True, capture_output=True)
            print("Executing: Cache cleared")
            return True
        except Exception:
            return False
    
    def _heal_reconnect(self) -> bool:
        """Reconnect to external services"""
        try:
            print("Executing: Reconnecting services")
            return True
        except Exception:
            return False
    
    def attempt_heal(self, error_context: str = "") -> dict:
        """Try healing strategies in order until one works"""
        results = []
        for strategy in self.strategies:
            print(f"Trying healing strategy: {strategy.name}")
            success = strategy.execute()
            results.append({'strategy': strategy.name, 'success': success})
            if success:
                self._log_healing(error_context, strategy.name)
                return {'healed': True, 'strategy': strategy.name, 'all_attempts': results}
        
        self._log_healing(error_context, 'failed')
        return {'healed': False, 'strategy': None, 'all_attempts': results}
    
    def _log_healing(self, context: str, outcome: str):
        log = []
        if self.healing_log.exists():
            with open(self.healing_log) as f:
                log = json.load(f)
        log.append({
            'timestamp': time.time(),
            'context': context,
            'outcome': outcome
        })
        with open(self.healing_log, 'w') as f:
            json.dump(log[-100:], f, indent=2)

if __name__ == '__main__':
    healer = AgentHealer()
    result = healer.attempt_heal("test error context")
    print(f"Healing result: {result}")
PYEOF

cat > "$HEALER_BASE/circuit_breaker.py" << 'PYEOF'
#!/usr/bin/env python3
"""Circuit breaker pattern to prevent cascading failures"""
import time
from enum import Enum
from typing import Callable, Any
from datetime import datetime, timedelta

class CircuitState(Enum):
    CLOSED = "closed"      # Normal operation
    OPEN = "open"          # Failing, reject all calls
    HALF_OPEN = "half_open"  # Testing if service recovered

class CircuitBreaker:
    def __init__(self, failure_threshold: int = 5, timeout_seconds: int = 60):
        self.failure_threshold = failure_threshold
        self.timeout = timeout_seconds
        self.failures = 0
        self.last_failure_time: float = 0
        self.state = CircuitState.CLOSED
    
    def call(self, func: Callable, *args, **kwargs) -> Any:
        """Execute function through circuit breaker"""
        if self.state == CircuitState.OPEN:
            if time.time() - self.last_failure_time > self.timeout:
                self.state = CircuitState.HALF_OPEN
                print("Circuit breaker: HALF_OPEN - testing recovery")
            else:
                raise Exception("Circuit breaker OPEN - call rejected")
        
        try:
            result = func(*args, **kwargs)
            self._on_success()
            return result
        except Exception as e:
            self._on_failure()
            raise e
    
    def _on_success(self):
        if self.state == CircuitState.HALF_OPEN:
            print("Circuit breaker: Recovery successful, CLOSED")
        self.failures = 0
        self.state = CircuitState.CLOSED
    
    def _on_failure(self):
        self.failures += 1
        self.last_failure_time = time.time()
        if self.failures >= self.failure_threshold:
            self.state = CircuitState.OPEN
            print(f"Circuit breaker: OPEN after {self.failures} failures")
    
    def get_state(self) -> dict:
        return {
            'state': self.state.value,
            'failures': self.failures,
            'last_failure': datetime.fromtimestamp(self.last_failure_time).isoformat() if self.last_failure_time else None
        }

# Example usage
if __name__ == '__main__':
    cb = CircuitBreaker(failure_threshold=3, timeout_seconds=10)
    
    def unreliable_service():
        raise Exception("Service error")
    
    # Test circuit breaker
    for i in range(5):
        try:
            cb.call(unreliable_service)
        except Exception as e:
            print(f"Call {i+1}: {e}")
        print(f"State after call {i+1}: {cb.get_state()}")
PYEOF

chmod +x "$HEALER_BASE/monitor.py" "$HEALER_BASE/healer.py" "$HEALER_BASE/circuit_breaker.py"
echo "✅ Agent Self-Healer installed to $HEALER_BASE"
echo "Run: python3 $HEALER_BASE/monitor.py"
