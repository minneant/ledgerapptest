import React, { useCallback, useEffect, useMemo, useState } from "react";

function AccountManageView({ webAppUrl, onBack }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const typeOptions = useMemo(
    () => ["수입", "비용", "자본", "자산", "부채"],
    []
  );

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);

      const response = await fetch(`${webAppUrl}?action=getAccounts`);
      const data = await response.json();

      const mapped = (data || []).map((item, index) => ({
        id: `${Date.now()}-${index}-${Math.random()}`,
        originalName: item.name || "",
        type: item.type || "비용",
        order:
          item.order && !Number.isNaN(Number(item.order))
            ? Number(item.order)
            : index + 1,
        displayName: item.displayName || extractDisplayName(item.name || ""),
        vatApplicable: item.vatApplicable === "O" ? "O" : "",
      }));

      setRows(mapped);
    } catch (error) {
      console.error("계정 목록 조회 오류:", error);
      setMessage("계정 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [webAppUrl]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const makeEmptyRow = (overrides = {}) => ({
    id: `${Date.now()}-${Math.random()}`,
    originalName: "",
    type: "비용",
    order: 1,
    displayName: "",
    vatApplicable: "",
    ...overrides,
  });

  const resequenceWithinType = (targetRows) => {
    const grouped = {};

    targetRows.forEach((row) => {
      const type = row.type || "비용";
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push({ ...row });
    });

    Object.keys(grouped).forEach((type) => {
      grouped[type]
        .sort((a, b) => {
          const aOrder = Number(a.order) || 9999;
          const bOrder = Number(b.order) || 9999;
          return aOrder - bOrder;
        })
        .forEach((row, index) => {
          row.order = index + 1;
        });
    });

    return targetRows.map((row) => {
      const typeRows = grouped[row.type || "비용"] || [];
      const found = typeRows.find((r) => r.id === row.id);
      return found ? found : row;
    });
  };

  const handleChange = (id, field, value) => {
    setRows((prev) => {
      let updated = prev.map((row) =>
        row.id === id
          ? {
              ...row,
              [field]:
                field === "order"
                  ? value === ""
                    ? ""
                    : Number(value)
                  : value,
            }
          : row
      );

      if (field === "type") {
        updated = resequenceWithinType(updated);
      }

      return updated;
    });
  };

  const handleInsertAbove = (index) => {
    setRows((prev) => {
      const baseRow = prev[index];
      const newRow = makeEmptyRow({
        type: baseRow?.type || "비용",
        order: Number(baseRow?.order) || 1,
      });
      const next = [...prev];
      next.splice(index, 0, newRow);
      return resequenceWithinType(next);
    });
    setMessage("");
  };

  const handleInsertBelow = (index) => {
    setRows((prev) => {
      const baseRow = prev[index];
      const newRow = makeEmptyRow({
        type: baseRow?.type || "비용",
        order: (Number(baseRow?.order) || 1) + 1,
      });
      const next = [...prev];
      next.splice(index + 1, 0, newRow);
      return resequenceWithinType(next);
    });
    setMessage("");
  };

  const handleAddRow = () => {
    setRows((prev) => {
      const costRows = prev.filter((row) => row.type === "비용");
      const nextOrder = costRows.length + 1;
      const next = [
        ...prev,
        makeEmptyRow({
          type: "비용",
          order: nextOrder,
        }),
      ];
      return resequenceWithinType(next);
    });
    setMessage("");
  };

  const handleDeleteRow = (id) => {
    setRows((prev) => {
      const next = prev.filter((row) => row.id !== id);
      return resequenceWithinType(next);
    });
    setMessage("");
  };

  const handleNormalizeOrders = () => {
    setRows((prev) => resequenceWithinType(prev));
    setMessage("유형별 순서를 정리했습니다.");
  };

  const validateRows = () => {
    if (rows.length === 0) {
      return "저장할 계정이 없습니다.";
    }

    for (const row of rows) {
      if (!row.type || !String(row.type).trim()) {
        return "유형이 비어 있는 행이 있습니다.";
      }
      if (!row.displayName || !String(row.displayName).trim()) {
        return "계정명이 비어 있는 행이 있습니다.";
      }
      if (
        row.order === "" ||
        Number.isNaN(Number(row.order)) ||
        Number(row.order) <= 0
      ) {
        return "순서는 1 이상의 숫자여야 합니다.";
      }
      if (row.vatApplicable !== "" && row.vatApplicable !== "O") {
        return "부가세대상은 O 또는 빈칸만 가능합니다.";
      }
    }

    return "";
  };

  const handleSave = async () => {
    if (saving) return;

    const validationMessage = validateRows();
    if (validationMessage) {
      setMessage(validationMessage);
      alert(validationMessage);
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const payload = rows.map((row) => ({
        originalName: row.originalName || "",
        type: row.type,
        order: Number(row.order),
        displayName: String(row.displayName || "").trim(),
        vatApplicable: row.vatApplicable === "O" ? "O" : "",
      }));

      const body =
        "data=" +
        encodeURIComponent(JSON.stringify({ accounts: payload }));

      const response = await fetch(`${webAppUrl}?action=saveAccounts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      });

      const text = await response.text();
      console.log("saveAccounts raw response:", text);

      let result;
      try {
        result = JSON.parse(text);
      } catch (e) {
        throw new Error("서버 응답이 JSON 형식이 아닙니다: " + text);
      }

      console.log("saveAccounts parsed result:", result);

      if (result?.status === "success") {
        await fetchAccounts();
        const successMsg =
          result?.message || "계정표가 저장되었습니다.";
        setMessage(successMsg);
        alert(successMsg);
      } else {
        const failMsg =
          result?.message || "계정 저장에 실패했습니다.";
        setMessage(failMsg);
        alert(failMsg);
      }
    } catch (error) {
      console.error("계정 저장 오류:", error);
      const errMsg = "계정 저장 중 오류가 발생했습니다: " + error.message;
      setMessage(errMsg);
      alert(errMsg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: "1rem" }}>계정 목록 불러오는 중...</div>;
  }

  return (
    <div style={{ padding: "1rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <h2 style={{ margin: 0 }}>계정관리</h2>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button onClick={handleAddRow} style={secondaryButtonStyle}>
            + 새 행 추가
          </button>
          <button onClick={handleNormalizeOrders} style={secondaryButtonStyle}>
            순서 정리
          </button>
          <button onClick={onBack} style={secondaryButtonStyle}>
            ← 차트로
          </button>
        </div>
      </div>

      {message && (
        <div
          style={{
            marginBottom: "1rem",
            padding: "10px 12px",
            background: "#f5f5f5",
            border: "1px solid #ddd",
            borderRadius: "6px",
            fontSize: "14px",
            whiteSpace: "pre-wrap",
          }}
        >
          {message}
        </div>
      )}

      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            background: "#fff",
            minWidth: "920px",
          }}
        >
          <thead>
            <tr>
              <th style={thStyle}>유형</th>
              <th style={thStyle}>순서</th>
              <th style={thStyle}>계정명</th>
              <th style={thStyle}>부가세대상</th>
              <th style={thStyle}>예상 코드</th>
              <th style={thStyle}>작업</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.id}>
                <td style={tdStyle}>
                  <select
                    value={row.type}
                    onChange={(e) =>
                      handleChange(row.id, "type", e.target.value)
                    }
                    style={inputStyle}
                  >
                    {typeOptions.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </td>

                <td style={tdStyle}>
                  <input
                    type="number"
                    min="1"
                    value={row.order}
                    onChange={(e) =>
                      handleChange(row.id, "order", e.target.value)
                    }
                    style={smallInputStyle}
                  />
                </td>

                <td style={tdStyle}>
                  <input
                    value={row.displayName}
                    onChange={(e) =>
                      handleChange(row.id, "displayName", e.target.value)
                    }
                    placeholder="예: 상품매입"
                    style={inputStyle}
                  />
                </td>

                <td style={tdStyle}>
                  <select
                    value={row.vatApplicable}
                    onChange={(e) =>
                      handleChange(row.id, "vatApplicable", e.target.value)
                    }
                    style={smallInputStyle}
                  >
                    <option value="">빈칸</option>
                    <option value="O">O</option>
                  </select>
                </td>

                <td style={tdStyle}>
                  <span style={{ color: "#666" }}>
                    {previewCode(row.type, row.order)}
                  </span>
                </td>

                <td style={tdStyle}>
                  <div
                    style={{
                      display: "flex",
                      gap: "6px",
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      onClick={() => handleInsertAbove(index)}
                      style={miniButtonStyle}
                    >
                      위삽입
                    </button>
                    <button
                      onClick={() => handleInsertBelow(index)}
                      style={miniButtonStyle}
                    >
                      아래삽입
                    </button>
                    <button
                      onClick={() => handleDeleteRow(row.id)}
                      style={deleteButtonStyle}
                    >
                      삭제
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div
        style={{
          marginTop: "16px",
          display: "flex",
          justifyContent: "flex-end",
          gap: "8px",
          flexWrap: "wrap",
        }}
      >
        <button onClick={fetchAccounts} style={secondaryButtonStyle}>
          새로고침
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          style={saveButtonStyle}
        >
          {saving ? "저장 중..." : "전체 저장"}
        </button>
      </div>

      <div style={{ marginTop: "14px", fontSize: "13px", color: "#666" }}>
        저장 시 유형별로 자동 정렬되고 번호가 다시 부여됩니다. 거래내역에 사용된
        계정명은 함께 치환되고, 복식부기장부는 전체 재생성됩니다.
      </div>
    </div>
  );
}

function extractDisplayName(fullName) {
  const value = String(fullName || "");
  const dotIndex = value.indexOf(".");
  return dotIndex >= 0 ? value.slice(dotIndex + 1).trim() : value.trim();
}

function previewCode(type, order) {
  const seq = Number(order) || 1;

  if (type === "수입") {
    return String(seq).padStart(3, "0");
  }
  if (type === "비용") {
    return String(seq).padStart(2, "0");
  }
  if (type === "자본") {
    return `A${String(seq).padStart(2, "0")}`;
  }
  if (type === "자산") {
    return `B${String(seq).padStart(2, "0")}`;
  }
  if (type === "부채") {
    return `C${String(seq).padStart(2, "0")}`;
  }

  return `Z${String(seq).padStart(2, "0")}`;
}

const thStyle = {
  border: "1px solid #ddd",
  padding: "10px",
  background: "#f7f7f7",
  textAlign: "left",
  fontSize: "14px",
  whiteSpace: "nowrap",
};

const tdStyle = {
  border: "1px solid #ddd",
  padding: "10px",
  fontSize: "14px",
  verticalAlign: "middle",
};

const inputStyle = {
  width: "100%",
  padding: "8px",
  boxSizing: "border-box",
};

const smallInputStyle = {
  width: "100%",
  padding: "8px",
  boxSizing: "border-box",
  minWidth: "80px",
};

const secondaryButtonStyle = {
  background: "#fff",
  border: "1px solid #ccc",
  padding: "8px 12px",
  cursor: "pointer",
  borderRadius: "6px",
};

const miniButtonStyle = {
  background: "#f5f5f5",
  border: "1px solid #ccc",
  padding: "6px 8px",
  cursor: "pointer",
  borderRadius: "6px",
  fontSize: "12px",
};

const deleteButtonStyle = {
  background: "#fff0f0",
  border: "1px solid #e0b4b4",
  padding: "6px 8px",
  cursor: "pointer",
  borderRadius: "6px",
  fontSize: "12px",
  color: "#b00020",
};

const saveButtonStyle = {
  background: "#4caf50",
  color: "#fff",
  border: "none",
  padding: "8px 14px",
  cursor: "pointer",
  borderRadius: "6px",
};

export default AccountManageView;