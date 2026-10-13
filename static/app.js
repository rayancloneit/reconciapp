(function () {
    const state = {
        currentTableType: null,
        currentImport: null,
        presets: (window.reconApp && window.reconApp.presets) || { A: [], B: [] },
        debugMatching: true,
    };

    function $(id) {
        return document.getElementById(id);
    }

    function showToast(title, body, type = "info", timeout = 3200) {
        const stack = $("toastStack");
        if (!stack) return;

        const toast = document.createElement("div");
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-title">${escapeHtml(title)}</div>
            <div class="toast-body">${escapeHtml(body)}</div>
        `;
        stack.appendChild(toast);

        window.setTimeout(() => {
            toast.style.opacity = "0";
            toast.style.transform = "translateY(-6px)";
            window.setTimeout(() => toast.remove(), 180);
        }, timeout);
    }

    function debugMatch(message) {
        if (!state.debugMatching) return;
        showToast("Match Debug", message, "info", 2600);
    }

    function safeParseFloat(value) {
        const parsed = parseFloat(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }

    function getSortStorageKey(tableId) {
        return `recon_sort_${tableId}`;
    }

    function saveSortPreference(tableId, mode, asc) {
        try {
            window.localStorage.setItem(getSortStorageKey(tableId), JSON.stringify({ mode, asc }));
        } catch (error) {
            return;
        }
    }

    function loadSortPreference(tableId) {
        try {
            const raw = window.localStorage.getItem(getSortStorageKey(tableId));
            return raw ? JSON.parse(raw) : null;
        } catch (error) {
            return null;
        }
    }

    function applyTableSort(tableId, mode, asc) {
        const tbody = document.querySelector(`#${tableId} tbody`);
        if (!tbody) return;
        const rows = Array.from(tbody.querySelectorAll("tr.primary-row"));

        rows.sort((a, b) => {
            if (mode === "amount") {
                return asc
                    ? safeParseFloat(a.dataset.price) - safeParseFloat(b.dataset.price)
                    : safeParseFloat(b.dataset.price) - safeParseFloat(a.dataset.price);
            }
            const first = a.dataset.description || "";
            const second = b.dataset.description || "";
            return asc ? first.localeCompare(second) : second.localeCompare(first);
        });

        rows.forEach((row) => {
            tbody.appendChild(row);
            const detailId = row.dataset.detailId;
            if (detailId) {
                const detailRow = $(detailId);
                if (detailRow) tbody.appendChild(detailRow);
            }
        });

        updateVisibleCount(tableId);
    }

    function getReconAmount(source, amount) {
        const parsed = safeParseFloat(amount);
        return source === "B" ? -parsed : parsed;
    }

    function formatAmount(value) {
        return safeParseFloat(value).toFixed(2);
    }

    function clearMatchState(row) {
        row.classList.remove(
            "price-match-highlight",
            "exact-match-highlight",
            "near-match-highlight",
            "conflict-warning"
        );
        row.style.opacity = "1";
        row.querySelectorAll("td").forEach((cell) => {
            cell.style.background = "";
            cell.style.boxShadow = "";
            cell.style.borderTop = "";
            cell.style.borderBottom = "";
        });
    }

    function applyMatchState(row, type) {
        const styles = {
            selected: {
                className: "price-match-highlight",
                background: "rgba(255, 255, 255, 0.12)",
                boxShadow: "inset 4px 0 0 #ffffff",
                borderTop: "1px solid rgba(255,255,255,0.12)",
                borderBottom: "1px solid rgba(255,255,255,0.12)",
            },
            exact: {
                className: "exact-match-highlight",
                background: "rgba(0, 210, 122, 0.22)",
                boxShadow:
                    "inset 4px 0 0 #00d27a, inset 0 0 0 1px rgba(0,210,122,0.45)",
                borderTop: "1px solid rgba(0,210,122,0.20)",
                borderBottom: "1px solid rgba(0,210,122,0.20)",
            },
            near: {
                className: "near-match-highlight",
                background: "rgba(255, 255, 255, 0.18)",
                boxShadow:
                    "inset 4px 0 0 #ffffff, inset 0 0 0 1px rgba(255,255,255,0.24)",
                borderTop: "1px solid rgba(255,255,255,0.16)",
                borderBottom: "1px solid rgba(255,255,255,0.16)",
            },
            warning: {
                className: "conflict-warning",
                background: "rgba(255, 182, 72, 0.18)",
                boxShadow:
                    "inset 4px 0 0 #ffb648, inset 0 0 0 1px rgba(255,182,72,0.30)",
                borderTop: "1px solid rgba(255,182,72,0.16)",
                borderBottom: "1px solid rgba(255,182,72,0.16)",
            },
        };

        const style = styles[type];
        if (!style) return;

        row.classList.add(style.className);
        row.querySelectorAll("td").forEach((cell) => {
            cell.style.background = style.background;
            cell.style.boxShadow = style.boxShadow;
            cell.style.borderTop = style.borderTop;
            cell.style.borderBottom = style.borderBottom;
        });
    }

    function shouldIgnoreRowClick(event) {
        return Boolean(
            event &&
                event.target &&
                event.target.closest &&
                event.target.closest("input, label, button, a, form")
        );
    }

    function updateVisibleCount(tableId) {
        const rows = Array.from(document.querySelectorAll(`#${tableId} tbody tr.primary-row`));
        const visibleRows = rows.filter((row) => row.style.display !== "none");
        const suffix = tableId === "tableA" ? "A" : "B";
        const countLabel = $(`count${suffix}`);
        const emptyMessage = $(`empty${suffix}`);

        if (countLabel) {
            countLabel.textContent = `${visibleRows.length} item${visibleRows.length === 1 ? "" : "s"} shown`;
        }
        if (emptyMessage) {
            emptyMessage.hidden = visibleRows.length > 0;
        }
    }

    function syncRowSelectionState() {
        document
            .querySelectorAll('#tableA tbody input[type="checkbox"], #tableB tbody input[type="checkbox"]')
            .forEach((input) => {
                var row = input.closest ? input.closest("tr") : null;
                if (row && row.classList.contains("primary-row")) {
                    row.classList.toggle("row-selected", input.checked);
                }
            });
    }

    function showImportError(message) {
        const error = $("importError");
        error.hidden = !message;
        error.textContent = message || "";
        if (message) {
            showToast("Import Error", message, "error", 4200);
        }
    }

    function updateWizardSteps(hasPreview, hasSummary) {
        $("stepMap").classList.toggle("active", Boolean(hasPreview));
        $("stepConfirm").classList.toggle("active", Boolean(hasSummary));
    }

    function renderPreview(importData) {
        state.currentImport = importData;
        $("sheetSection").hidden = false;
        $("presetSection").hidden = false;
        $("mappingSection").hidden = false;
        $("presetSaveSection").hidden = false;
        $("confirmSection").hidden = false;
        $("previewTableWrap").hidden = false;
        $("previewFileName").textContent = importData.file_name;
        $("previewRowCount").textContent = `${importData.row_count} rows`;
        updateWizardSteps(true, false);

        const sheetSelect = $("sheetSelect");
        sheetSelect.innerHTML = "";
        importData.sheet_names.forEach((name) => {
            const option = document.createElement("option");
            option.value = name;
            option.textContent = name;
            option.selected = name === importData.active_sheet;
            sheetSelect.appendChild(option);
        });

        renderPresetOptions(importData.table_type);
        renderMapping(importData.headers, importData.detected_mapping);
        renderPreviewTable(importData.headers, importData.preview_rows);
        showImportError("");
    }

    function renderPresetOptions(tableType) {
        const presetSelect = $("presetSelect");
        presetSelect.innerHTML = '<option value="">Use detected mapping</option>';
        (state.presets[tableType] || []).forEach((preset) => {
            const option = document.createElement("option");
            option.value = preset.id;
            option.textContent = preset.name;
            presetSelect.appendChild(option);
        });
    }

    function renderMapping(headers, detectedMapping) {
        const wrap = $("mappingFields");
        wrap.innerHTML = "";
        headers.forEach((header) => {
            const row = document.createElement("div");
            row.className = "mapping-row";

            const label = document.createElement("label");
            label.textContent = header;

            const select = document.createElement("select");
            select.className = "input-shell mapping-select";
            select.dataset.header = header;

            window.reconApp.canonicalFields.forEach((field) => {
                const option = document.createElement("option");
                option.value = field;
                option.textContent = field;
                option.selected = (detectedMapping[header] || "ignore") === field;
                select.appendChild(option);
            });

            row.appendChild(label);
            row.appendChild(select);
            wrap.appendChild(row);
        });
    }

    function renderPreviewTable(headers, rows) {
        const table = $("previewTable");
        const headHtml = `<thead><tr>${headers
            .map((header) => `<th>${escapeHtml(header)}</th>`)
            .join("")}</tr></thead>`;

        const bodyRows = rows.length
            ? rows
                  .map(
                      (row) =>
                          `<tr>${headers
                              .map(
                                  (header) =>
                                      `<td>${escapeHtml(row[header] != null ? row[header] : "")}</td>`
                              )
                              .join("")}</tr>`
                  )
                  .join("")
            : `<tr><td colspan="${headers.length || 1}">No preview rows available.</td></tr>`;

        table.innerHTML = `${headHtml}<tbody>${bodyRows}</tbody>`;
    }

    function collectMapping() {
        const mapping = {};
        document.querySelectorAll(".mapping-select").forEach((select) => {
            mapping[select.dataset.header] = select.value;
        });
        return mapping;
    }

    function getSelectedPreset() {
        const presetId = $("presetSelect").value;
        return (state.presets[state.currentTableType] || []).find(
            (preset) => preset.id === presetId
        );
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function syncBodyScrollLock() {
        const hasOpenOverlay = Array.from(document.querySelectorAll(".modal-overlay")).some(
            (overlay) => overlay.style.display === "flex"
        );
        document.body.classList.toggle("modal-open", hasOpenOverlay);
    }

    window.openImportWizard = function (tableType) {
        state.currentTableType = tableType;
        state.currentImport = null;
        $("importTitle").textContent =
            tableType === "A" ? "Import General Ledger File" : "Import Bank File";
        $("importOverlay").style.display = "flex";
        $("importFileInput").value = "";
        $("sheetSection").hidden = true;
        $("presetSection").hidden = true;
        $("mappingSection").hidden = true;
        $("presetSaveSection").hidden = true;
        $("confirmSection").hidden = true;
        $("previewTableWrap").hidden = true;
        $("importSummary").hidden = true;
        $("presetNameInput").value = "";
        $("savePresetCheckbox").checked = false;
        $("previewFileName").textContent = "Upload a file to begin";
        $("previewRowCount").textContent = "0 rows";
        showImportError("");
        updateWizardSteps(false, false);
        syncBodyScrollLock();
    };

    window.closeImportWizard = function () {
        $("importOverlay").style.display = "none";
        syncBodyScrollLock();
    };

    window.uploadImportFile = async function () {
        const input = $("importFileInput");
        const file = input.files[0];
        if (!file || !state.currentTableType) {
            showImportError("Choose a CSV or Excel file first.");
            return;
        }

        const formData = new FormData();
        formData.append("file", file);
        showImportError("");

        const response = await fetch(`/upload_import/${state.currentTableType}`, {
            method: "POST",
            body: formData,
        });
        const payload = await response.json();
        if (!response.ok) {
            showImportError(payload.error || "Upload failed.");
            return;
        }
        showToast("File Uploaded", "Preview loaded. Map the columns and confirm the import.", "info");
        renderPreview(payload);
    };

    if ($("sheetSelect")) {
        $("sheetSelect").addEventListener("change", async (event) => {
            if (!state.currentImport) return;
            const response = await fetch(`/set_import_sheet/${state.currentImport.import_id}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sheet_name: event.target.value }),
            });
            const payload = await response.json();
            if (!response.ok) {
                showImportError(payload.error || "Could not switch worksheet.");
                return;
            }
            showToast("Worksheet Updated", "Preview switched to the selected sheet.", "info", 2400);
            renderPreview(payload);
        });
    }

    if ($("presetSelect")) {
        $("presetSelect").addEventListener("change", () => {
            const preset = getSelectedPreset();
            if (!preset || !state.currentImport) {
                renderMapping(
                    (state.currentImport && state.currentImport.headers) || [],
                    (state.currentImport && state.currentImport.detected_mapping) || {}
                );
                return;
            }
            renderMapping(
                state.currentImport.headers,
                Object.assign({}, state.currentImport.detected_mapping, preset.mapping)
            );
        });
    }

    window.confirmImport = async function () {
        if (!state.currentImport) return;

        const payload = {
            mapping: collectMapping(),
            save_preset: $("savePresetCheckbox").checked,
            preset_name: $("presetNameInput").value.trim(),
        };
        const response = await fetch(`/apply_import/${state.currentImport.import_id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const body = await response.json();
        if (!response.ok) {
            showImportError(body.error || "Import failed.");
            return;
        }

        const summary = body.summary;
        const lines = [
            `Rows read: ${summary.rows_read}`,
            `Rows imported: ${summary.rows_imported}`,
            `Rows skipped: ${summary.rows_skipped}`,
            `Duplicates: ${summary.duplicates}`,
        ];
        if (summary.validation_errors.length) {
            lines.push(`Validation notes: ${summary.validation_errors.join(" | ")}`);
        }

        const summaryBox = $("importSummary");
        summaryBox.hidden = false;
        summaryBox.textContent = lines.join("\n");
        updateWizardSteps(true, true);
        showToast(
            "Import Complete",
            `${summary.rows_imported} row(s) imported, ${summary.duplicates} duplicate(s) skipped.`,
            "success",
            3600
        );

        setTimeout(() => window.location.reload(), 1200);
    };

    window.sortTable = function (tableId, mode) {
        const key = `${tableId}_${mode}`;
        window[key] = !window[key];
        const asc = window[key];
        applyTableSort(tableId, mode, asc);
        saveSortPreference(tableId, mode, asc);
    };

    window.matchPrice = function (row, targetTableId, event) {
        if (shouldIgnoreRowClick(event || window.event)) return;

        document.querySelectorAll("tbody tr").forEach(clearMatchState);

        const sourcePrice = Math.abs(safeParseFloat(row.dataset.price));
        const sourceDate = row.dataset.date || "";
        const sourceDescription = (row.dataset.description || "").toLowerCase();
        const rows = document.querySelectorAll(`#${targetTableId} tbody tr`);
        let exactCount = 0;
        let nearCount = 0;
        let warningCount = 0;

        applyMatchState(row, "selected");

        let best = null;
        let bestScore = -1;
        rows.forEach((targetRow) => {
            const targetPrice = Math.abs(safeParseFloat(targetRow.dataset.price));
            const delta = Math.abs(sourcePrice - targetPrice);
            const priceScore =
                delta === 0 ? 3 : sourcePrice && delta / sourcePrice <= 0.0235 ? 2 : delta <= 25 ? 1 : 0;

            const targetDate = targetRow.dataset.date || "";
            const targetDescription = (targetRow.dataset.description || "").toLowerCase();
            const dateScore = sourceDate && targetDate && sourceDate === targetDate ? 1 : 0;
            const descriptionScore =
                sourceDescription && targetDescription &&
                (sourceDescription.includes(targetDescription.slice(0, 8)) ||
                    targetDescription.includes(sourceDescription.slice(0, 8)))
                    ? 1
                    : 0;
            const score = priceScore + dateScore + descriptionScore;

            if (priceScore >= 3) {
                applyMatchState(targetRow, "exact");
                exactCount += 1;
            } else if (priceScore === 2) {
                applyMatchState(targetRow, "near");
                nearCount += 1;
            } else if (priceScore > 0) {
                applyMatchState(targetRow, "warning");
                warningCount += 1;
            } else {
                targetRow.style.opacity = "0.28";
            }

            if (score > bestScore) {
                bestScore = score;
                best = targetRow;
            }
        });

        if (best) {
            best.scrollIntoView({ behavior: "smooth", block: "center" });
            debugMatch(
                `Source ${formatAmount(sourcePrice)} -> exact: ${exactCount}, near: ${nearCount}, warning: ${warningCount}`
            );
        } else {
            debugMatch(`Source ${formatAmount(sourcePrice)} -> exact: 0, near: 0, warning: 0`);
            showToast(
                "No Close Match",
                "No transaction in the opposite table is within the current amount tolerance.",
                "info",
                2400
            );
        }
    };

    window.handleRowKeydown = function (row, targetTableId, event) {
        event = event || window.event;
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            window.matchPrice(row, targetTableId, event);
        }
    };

    window.validateAndProcess = function () {
        const diff = safeParseFloat($("qDiffVal").innerText);
        const submit = () =>
            document.querySelector('form[action="/clear_queue"]').submit();

        if (Math.abs(diff) > 0.01) {
            showCustomModal(
                "Unbalanced Queue",
                `Variance is ${diff.toFixed(2)}. Process this group anyway?`,
                submit
            );
        } else {
            submit();
        }
    };

    function showCustomModal(title, body, confirm, cancel = true) {
        $("modalTitle").innerText = title;
        $("modalBody").innerText = body;
        $("modalOverlay").style.display = "flex";
        syncBodyScrollLock();
        $("modalConfirm").onclick = () => {
            $("modalOverlay").style.display = "none";
            syncBodyScrollLock();
            confirm();
        };
        $("modalCancel").style.display = cancel ? "block" : "none";
        $("modalCancel").onclick = () => {
            $("modalOverlay").style.display = "none";
            syncBodyScrollLock();
        };
    }

    window.showAlertPopup = function (title, body) {
        showCustomModal(title, body, () => {}, false);
    };

    window.filterTable = function (inputId, tableId, totalId) {
        const filter = $(inputId).value.toUpperCase();
        const rows = document.querySelectorAll(`#${tableId} tbody tr.primary-row`);
        rows.forEach((row) => {
            const text = row.innerText.toUpperCase();
            const visible = text.includes(filter);
            row.style.display = visible ? "" : "none";
            const detailId = row.dataset.detailId;
            if (detailId) {
                const detailRow = $(detailId);
                if (detailRow) {
                    detailRow.style.display = "none";
                }
            }
        });
        updateTableSum(tableId, totalId);
        updateVisibleCount(tableId);
        const suffix = tableId === "tableA" ? "A" : "B";
        const clearButton = $(`clearSearch${suffix}`);
        if (clearButton) {
            clearButton.hidden = filter.length === 0;
        }
    };

    window.clearSearch = function (inputId, tableId, totalId) {
        const input = $(inputId);
        if (!input) return;
        input.value = "";
        window.filterTable(inputId, tableId, totalId);
        input.focus();
    };

    function updateTableSum(tableId, totalId) {
        let total = 0;
        document.querySelectorAll(`#${tableId} tbody tr.primary-row`).forEach((row) => {
            if (row.style.display !== "none") {
                total += safeParseFloat(row.dataset.price);
            }
        });
        $(totalId).innerText = total.toFixed(2);
    }

    window.toggleColumn = function (tableId, columnKey, visible) {
        document
            .querySelectorAll(`#${tableId} [data-col-key="${columnKey}"]`)
            .forEach((element) => {
                element.classList.toggle("dynamic-col-hidden", !visible);
            });
    };

    window.toggleTransactionDetails = function (detailId) {
        const row = $(detailId);
        if (!row) return;
        row.style.display = row.style.display === "none" ? "table-row" : "none";
    };

    function applyProcessedFilters() {
        const activeTab = document.querySelector(".tab-link.active");
        const mode = activeTab ? activeTab.textContent.trim().toLowerCase().replace("-", "") : "all";
        const query = (($("historySearch") && $("historySearch").value) || "").trim().toLowerCase();

        document.querySelectorAll(".processed-row").forEach((row) => {
            const sum = safeParseFloat(row.dataset.sum);
            const matchesTab =
                mode === "all" ||
                (mode === "nonzero" && sum !== 0) ||
                (mode === "zero" && sum === 0);
            const details = $(`details-${row.dataset.groupId}`);
            const searchText = `${row.textContent} ${details ? details.textContent : ""}`.toLowerCase();
            const matchesSearch = !query || searchText.indexOf(query) !== -1;
            const visible = matchesTab && matchesSearch;

            row.style.display = visible ? "table-row" : "none";
            if (!visible && details) {
                details.style.display = "none";
            }
        });

        updateProcessedGrandTotal();
    }

    window.filterProcessedHistory = function () {
        applyProcessedFilters();
    };

    window.switchTab = function (btn, mode) {
        document.querySelectorAll(".tab-link").forEach((item) => {
            item.classList.remove("active");
        });
        btn.classList.add("active");
        applyProcessedFilters();
    };

    function updateProcessedGrandTotal() {
        let total = 0;
        document.querySelectorAll(".processed-row").forEach((row) => {
            if (row.style.display !== "none") {
                total += safeParseFloat(row.dataset.sum);
            }
        });
        $("processedGrandTotal").innerText = total.toFixed(2);
    }

    window.toggleRow = function (id) {
        const element = $(`details-${id}`);
        if (element) {
            element.style.display = element.style.display === "none" ? "table-row" : "none";
        }
    };

    window.handleProcessedRowKeydown = function (event, id) {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            window.toggleRow(id);
        }
    };

    function updateQueueDrilldown() {
        let gl = 0;
        let bank = 0;
        document.querySelectorAll("#queueList li").forEach((item) => {
            const source = item.dataset.source;
            const amount = safeParseFloat(item.dataset.amount);
            if (source === "A") {
                gl += getReconAmount(source, amount);
            } else {
                bank += getReconAmount(source, amount);
            }
        });

        const variance = gl + bank;
        if ($("drill_gl")) {
            $("drill_gl").innerText = gl.toFixed(2);
            $("drill_bank").innerText = bank.toFixed(2);
            $("drill_var").innerText = variance.toFixed(2);
            $("drill_var").style.color =
                Math.abs(variance) < 0.01 ? "#39d98a" : "#ff7979";
        }
    }

    function attachSelectionListeners() {
        document
            .querySelectorAll('#tableA tbody input[type="checkbox"], #tableB tbody input[type="checkbox"]')
            .forEach((input) => {
                input.addEventListener("change", syncRowSelectionState);
            });
    }

    function attachMatchListeners() {
        return;
    }

    function attachModalShortcuts() {
        if ($("modalOverlay")) {
            $("modalOverlay").addEventListener("click", (event) => {
                if (event.target === $("modalOverlay")) {
                    $("modalOverlay").style.display = "none";
                    syncBodyScrollLock();
                }
            });
        }

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                if ($("modalOverlay")) $("modalOverlay").style.display = "none";
                if ($("importOverlay")) $("importOverlay").style.display = "none";
                syncBodyScrollLock();
            }
        });
    }

    window.addEventListener("load", () => {
        updateTableSum("tableA", "totalA");
        updateTableSum("tableB", "totalB");
        updateVisibleCount("tableA");
        updateVisibleCount("tableB");
        const tableASort = loadSortPreference("tableA");
        const tableBSort = loadSortPreference("tableB");
        if (tableASort && tableASort.mode) {
            window[`tableA_${tableASort.mode}`] = !tableASort.asc;
            applyTableSort("tableA", tableASort.mode, tableASort.asc);
        }
        if (tableBSort && tableBSort.mode) {
            window[`tableB_${tableBSort.mode}`] = !tableBSort.asc;
            applyTableSort("tableB", tableBSort.mode, tableBSort.asc);
        }
        updateQueueDrilldown();
        updateProcessedGrandTotal();
        syncRowSelectionState();
        attachSelectionListeners();
        attachMatchListeners();
        attachModalShortcuts();
    });
})();
