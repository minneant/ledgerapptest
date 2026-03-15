import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";

function AccountManageView({ webAppUrl, onBack }) {
  const [accounts, setAccounts] = useState([]);
  const [editingName, setEditingName] = useState(null);
  const [editForm, setEditForm] = useState({
    oldName: "",
    newName: "",
    type: "",
    vatApplicable: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${webAppUrl}?action=getAccounts`);
      setAccounts(response.data || []);
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

  const startEdit = (account) => {
    setEditingName(account.name);
    setEditForm({
      oldName: account.name,
      newName: account.name,
      type: account.type || "",
      vatApplicable: account.vatApplicable || "",
    });
    setMessage("");
  };

  const cancelEdit = () => {
    setEditingName(null);
    setEditForm({
      oldName: "",
      newName: "",
      type: "",
      vatApplicable: "",
    });
    setMessage("");
  };

  const handleSave = async () => {
    if (saving) return;

    const trimmedNewName = editForm.newName.trim();
    if (!trimmedNewName) {
      setMessage("새 계정명을 입력하세요.");
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const response = await axios.post(
        `${webAppUrl}?action=updateAccountName`,
        {
          data: {
            oldName: editForm.oldName,
            newName: trimmedNewName,
            type: editForm.type,
            vatApplicable: editForm.vatApplicable,
          },
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data?.status === "success") {
        setMessage(
          `저장 완료: ${response.data.oldName} → ${response.data.newName}`
        );
        setEditingName(null);
        await fetchAccounts();
      } else {
        setMessage(response.data?.message || "계정명 수정에 실패했습니다.");
      }
    } catch (error) {
      console.error("계정명 수정 오류:", error);
      setMessage("계정명 수정 중 오류가 발생했습니다.");
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
        }}
      >
        <h2 style={{ margin: 0 }}>계정관리</h2>
        <button
          onClick={onBack}
          style={{
            border: "1px solid #ccc",
            background: "#fff",
            padding: "8px 12px",
            cursor: "pointer",
            borderRadius: "6px",
          }}
        >
          ← 차트로
        </button>
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
          }}
        >
          <thead>
            <tr>
              <th style={thStyle}>계정명</th>
              <th style={thStyle}>유형</th>
              <th style={thStyle}>부가세대상</th>
              <th style={thStyle}>작업</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) => {
              const isEditing = editingName === account.name;

              return (
                <tr key={account.name}>
                  <td style={tdStyle}>
                    {isEditing ? (
                      <input
                        value={editForm.newName}
                        onChange={(e) =>
                          setEditForm({ ...editForm, newName: e.target.value })
                        }
                        style={inputStyle}
                      />
                    ) : (
                      account.name
                    )}
                  </td>
                  <td style={tdStyle}>
                    {isEditing ? (
                      <select
                        value={editForm.type}
                        onChange={(e) =>
                          setEditForm({ ...editForm, type: e.target.value })
                        }
                        style={inputStyle}
                      >
                        <option value="자산">자산</option>
                        <option value="부채">부채</option>
                        <option value="자본">자본</option>
                        <option value="수익">수익</option>
                        <option value="비용">비용</option>
                        <option value="수입">수입</option>
                      </select>
                    ) : (
                      account.type
                    )}
                  </td>
                  <td style={tdStyle}>
                    {isEditing ? (
                      <select
                        value={editForm.vatApplicable}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            vatApplicable: e.target.value,
                          })
                        }
                        style={inputStyle}
                      >
                        <option value="O">O</option>
                        <option value="X">X</option>
                        <option value="N">N</option>
                      </select>
                    ) : (
                      account.vatApplicable
                    )}
                  </td>
                  <td style={tdStyle}>
                    {isEditing ? (
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          onClick={handleSave}
                          disabled={saving}
                          style={saveButtonStyle}
                        >
                          {saving ? "저장 중..." : "저장"}
                        </button>
                        <button onClick={cancelEdit} style={cancelButtonStyle}>
                          취소
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEdit(account)}
                        style={editButtonStyle}
                      >
                        수정
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: "12px", fontSize: "13px", color: "#666" }}>
        계정명 수정 시 거래내역의 차변/대변 계정명도 함께 바뀌고, 복식부기장부가
        전체 재생성됩니다.
      </div>
    </div>
  );
}

const thStyle = {
  border: "1px solid #ddd",
  padding: "10px",
  background: "#f7f7f7",
  textAlign: "left",
  fontSize: "14px",
};

const tdStyle = {
  border: "1px solid #ddd",
  padding: "10px",
  fontSize: "14px",
};

const inputStyle = {
  width: "100%",
  padding: "8px",
  boxSizing: "border-box",
};

const editButtonStyle = {
  background: "#f5f5f5",
  border: "1px solid #ccc",
  padding: "6px 10px",
  cursor: "pointer",
  borderRadius: "6px",
};

const saveButtonStyle = {
  background: "#4caf50",
  color: "#fff",
  border: "none",
  padding: "6px 10px",
  cursor: "pointer",
  borderRadius: "6px",
};

const cancelButtonStyle = {
  background: "#eee",
  border: "1px solid #ccc",
  padding: "6px 10px",
  cursor: "pointer",
  borderRadius: "6px",
};

export default AccountManageView;