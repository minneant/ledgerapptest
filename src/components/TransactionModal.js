import React, { useState, useEffect } from "react";
import axios from "axios";
import "./EditTransactionModal.css";

const WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbw0kQYuq1Zr5GN3T1yi7vBxrWamsMaB6lBzTMnubGPQMtdQEK1lgs986sun8I5mIU-c/exec";

function TransactionModal({ onClose, initialDate }) {
  const [isSaving, setIsSaving] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [formData, setFormData] = useState({
    date: initialDate,
    type: "지출",
    debitAccount: "",
    creditAccount: "",
    amount: "",
    description: "",
    note: "",
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const response = await axios.get(`${WEB_APP_URL}?action=getAccounts`);
        setAccounts(response.data);
      } catch (error) {
        console.error("계정명 조회 오류:", error);
      }
    };
    fetchAccounts();
  }, []);

  const handleInputChange = (key, value) => {
    setFormData({ ...formData, [key]: value });
    setErrors({ ...errors, [key]: "" });
  };

  const formatAmount = (value) => {
    if (!value) return "";
    const number = parseInt(value.toString().replace(/,/g, "")) || 0;
    return number.toLocaleString("ko-KR");
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.date) newErrors.date = "날짜를 입력하세요.";
    if (!formData.type) newErrors.type = "거래 유형을 선택하세요.";
    if (
      !formData.amount ||
      parseInt(formData.amount.toString().replace(/,/g, "")) <= 0
    ) {
      newErrors.amount = "유효한 금액을 입력하세요.";
    }
    if (!formData.debitAccount)
      newErrors.debitAccount = "차변 계정을 선택하세요.";
    if (!formData.creditAccount)
      newErrors.creditAccount = "대변 계정을 선택하세요.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const saveTransaction = async () => {
    if (isSaving) return;
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      // 🧠 계정 유형 기반 자동 분류
      const debit = accounts.find((a) => a.name === formData.debitAccount);
      const credit = accounts.find((a) => a.name === formData.creditAccount);

      let resolvedType = formData.type;

      if (formData.type === "수입") {
        if (credit?.type === "수입") {
          resolvedType = "수입";
        } else if (credit?.type === "자본") {
          resolvedType = "현금유입";
        }
      } else if (formData.type === "지출") {
        if (debit?.type === "비용") {
          resolvedType = "경비";
        } else if (debit?.type === "자본") {
          resolvedType = "현금유출";
        }
      }

      const formBody = `data=${encodeURIComponent(
        JSON.stringify({
          date: formData.date,
          type: resolvedType, // 🔁 자동 분기된 유형 전송
          amount: parseInt(formData.amount.toString().replace(/,/g, "")) || 0,
          debitAccount: formData.debitAccount,
          creditAccount: formData.creditAccount,
          description: formData.description,
          note: formData.note,
        })
      )}`;

      const response = await fetch(WEB_APP_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formBody,
      });

      const result = await response.json();

      if (response.ok && result.status === "success") {
        alert("저장 완료!");
        onClose();
      } else {
        alert("저장 실패: " + (result.message || "오류"));
      }
    } catch (error) {
      alert("저장 실패: " + error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>트랜잭션 추가</h2>
        <div className="form-group">
          <label>날짜:</label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => handleInputChange("date", e.target.value)}
          />
          {errors.date && <p className="form-error">{errors.date}</p>}
        </div>
        <div className="form-group">
          <label>거래 유형:</label>
          <div className="form-radio-group">
            <label className="form-radio">
              <input
                type="radio"
                name="type"
                value="지출"
                checked={formData.type === "지출"}
                onChange={() => handleInputChange("type", "지출")}
              />
              지출
            </label>
            <label className="form-radio">
              <input
                type="radio"
                name="type"
                value="수입"
                checked={formData.type === "수입"}
                onChange={() => handleInputChange("type", "수입")}
              />
              수입
            </label>
          </div>
        </div>
        <div className="form-group">
          <label>금액:</label>
          <input
            type="text"
            value={formatAmount(formData.amount)}
            onChange={(e) =>
              handleInputChange("amount", e.target.value.replace(/,/g, ""))
            }
          />
          {errors.amount && <p className="form-error">{errors.amount}</p>}
        </div>
        <div className="form-group">
          <label>차변 계정:</label>
          <select
            value={formData.debitAccount}
            onChange={(e) =>
              handleInputChange("debitAccount", e.target.value)
            }
          >
            <option value="">선택</option>
            {accounts.map((account) => (
              <option key={account.name} value={account.name}>
                {account.name}
              </option>
            ))}
          </select>
          {errors.debitAccount && (
            <p className="form-error">{errors.debitAccount}</p>
          )}
        </div>
        <div className="form-group">
          <label>대변 계정:</label>
          <select
            value={formData.creditAccount}
            onChange={(e) =>
              handleInputChange("creditAccount", e.target.value)
            }
          >
            <option value="">선택</option>
            {accounts.map((account) => (
              <option key={account.name} value={account.name}>
                {account.name}
              </option>
            ))}
          </select>
          {errors.creditAccount && (
            <p className="form-error">{errors.creditAccount}</p>
          )}
        </div>
        <div className="form-group">
          <label>적요:</label>
          <input
            type="text"
            value={formData.description}
            onChange={(e) => handleInputChange("description", e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>메모:</label>
          <input
            type="text"
            value={formData.note}
            onChange={(e) => handleInputChange("note", e.target.value)}
          />
        </div>
        <div className="button-group">
          <button onClick={saveTransaction} disabled={isSaving}>
            {isSaving ? "저장 중..." : "저장"}
          </button>
          <button onClick={onClose}>닫기</button>
        </div>
      </div>
    </div>
  );
}

export default TransactionModal;
