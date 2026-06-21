  /**
   * Render COST panel — budget, spending, alerts
   */
  function renderCost() {
    fetch('/api/cost/session')
      .then(r => r.json())
      .then(data => {
        if (!data.success) return;
        const s = data.data;
        const budgetEl = document.getElementById('cost-budget-value');
        const barEl = document.getElementById('cost-progress-bar');
        const pctEl = document.getElementById('cost-budget-pct');
        if (budgetEl) budgetEl.textContent = `$${s.totalCostUsd.toFixed(4)}`;
        fetch('/api/cost/budget').then(r => r.json()).then(bd => {
          if (!bd.success) return;
          const b = bd.data;
          if (barEl) {
            barEl.style.width = `${Math.min(b.pct, 100)}%`;
            barEl.className = `cost-progress-fill ${b.pct >= 90 ? 'cost-danger' : b.pct >= 70 ? 'cost-warn' : 'cost-ok'}`;
          }
          if (pctEl) pctEl.textContent = `${b.pct.toFixed(1)}% used`;
          if (budgetEl) budgetEl.textContent = `$${b.spentUsd.toFixed(4)} / $${b.budgetUsd}`;
        }).catch(() => {});
        const spentEl = document.getElementById('cost-spent-value');
        const remainEl = document.getElementById('cost-remaining');
        if (spentEl) spentEl.textContent = `$${s.totalCostUsd.toFixed(4)}`;
        if (remainEl) remainEl.textContent = `${s.totalCalls} API calls`;
        const callsEl = document.getElementById('cost-calls-value');
        const tokensEl = document.getElementById('cost-tokens');
        if (callsEl) callsEl.textContent = s.totalCalls;
        if (tokensEl) tokensEl.textContent = `${(s.totalInput + s.totalOutput).toLocaleString()} tokens (in: ${s.totalInput.toLocaleString()}, out: ${s.totalOutput.toLocaleString()})`;
        const modelEl = document.getElementById('cost-by-model');
        if (modelEl && s.byModel && Object.keys(s.byModel).length > 0) {
          let html = '<div class="cost-model-grid">';
          for (const [model, info] of Object.entries(s.byModel)) {
            html += `<div class="cost-model-item">
              <div class="cost-model-name">${escapeHtml(model)}</div>
              <div class="cost-model-calls">${info.calls} calls</div>
              <div class="cost-model-cost">$${info.cost.toFixed(4)}</div>
              <div class="cost-model-tokens">${info.input.toLocaleString()} in / ${info.output.toLocaleString()} out</div>
            </div>`;
          }
          html += '</div>';
          modelEl.innerHTML = html;
        }
        const summaryEl = document.getElementById('cost-summary');
        if (summaryEl) {
          const tok = s.totalInput + s.totalOutput;
          summaryEl.textContent = `${s.totalCalls} calls \u00B7 $${s.totalCostUsd.toFixed(4)} spent \u00B7 ${tok.toLocaleString()} tokens`;
        }
      })
      .catch(() => {});
    fetch('/api/cost/alerts')
      .then(r => r.json())
      .then(data => {
        const alertsEl = document.getElementById('cost-alerts');
        if (!alertsEl || !data.success || !data.data?.length) return;
        let html = '<div class="cost-alert-list">';
        for (const alert of data.data.slice(-5)) {
          const icon = alert.severity === 'critical' ? '\u{1F534}' : alert.severity === 'warning' ? '\u{1F7E1}' : '\u{1F535}';
          html += `<div class="cost-alert-item cost-alert-${alert.severity}">${icon} ${escapeHtml(alert.message)}</div>`;
        }
        html += '</div>';
        alertsEl.innerHTML = html;
      })
      .catch(() => {});
  }

