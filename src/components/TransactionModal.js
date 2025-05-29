import React, { useState, useEffect } from "react";
import axios from "axios";

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
    <div className="modal fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="modal-content bg-white p-6 w-full max-w-md shadow-lg relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-black focus:outline-none"
          aria-label="모달 닫기"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 4h-1.5l-.5-.5h-5l-.5.5H5v1h14V4zM6 7v12c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6zm2 2h8v10H8V9z" />
          </svg>
        </button>

        <h2 className="text-lg font-bold mb-4">트랜잭션 추가</h2>
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <label className="w-24">날짜</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => handleInputChange("date", e.target.value)}
              className="flex-1 border-gray-300 rounded-none"
            />
            {errors.date && (
              <p className="text-sm text-red-600">{errors.date}</p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <span className="w-24">거래 유형</span>
            <div className="flex-1 flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="type"
                  value="지출"
                  checked={formData.type === "지출"}
                  onChange={() => handleInputChange("type", "지출")}
                  className="mr-1"
                />
                지출
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="type"
                  value="수입"
                  checked={formData.type === "수입"}
                  onChange={() => handleInputChange("type", "수입")}
                  className="mr-1"
                />
                수입
              </label>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <label className="w-24">금액</label>
            <input
              type="text"
              value={formatAmount(formData.amount)}
              onChange={(e) =>
                handleInputChange("amount", e.target.value.replace(/,/g, ""))
              }
              className="flex-1 border-gray-300 rounded-none"
            />
            {errors.amount && (
              <p className="text-sm text-red-600">{errors.amount}</p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <label className="w-24">차변 계정</label>
            <select
              value={formData.debitAccount}
              onChange={(e) =>
                handleInputChange("debitAccount", e.target.value)
              }
              className="flex-1 border-gray-300 rounded-none"
            >
              <option value="">선택</option>
              {accounts.map((account) => (
                <option key={account.name} value={account.name}>
                  {account.name}
                </option>
              ))}
            </select>
            {errors.debitAccount && (
              <p className="text-sm text-red-600">{errors.debitAccount}</p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <label className="w-24">대변 계정</label>
            <select
              value={formData.creditAccount}
              onChange={(e) =>
                handleInputChange("creditAccount", e.target.value)
              }
              className="flex-1 border-gray-300 rounded-none"
            >
              <option value="">선택</option>
              {accounts.map((account) => (
                <option key={account.name} value={account.name}>
                  {account.name}
                </option>
              ))}
            </select>
            {errors.creditAccount && (
              <p className="text-sm text-red-600">{errors.creditAccount}</p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <label className="w-24">적요</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              className="flex-1 border-gray-300 rounded-none"
            />
          </div>

          <div className="flex items-center space-x-2">
            <label className="w-24">메모</label>
            <input
              type="text"
              value={formData.note}
              onChange={(e) => handleInputChange("note", e.target.value)}
              className="flex-1 border-gray-300 rounded-none"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-1 bg-gray-200 text-black rounded-none hover:bg-gray-300"
          >
            취소
          </button>
          <button
            onClick={saveTransaction}
            className="px-4 py-1 bg-green-500 text-white rounded-none hover:bg-green-600"
          >
            {isSaving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default TransactionModal;
