import React, { useState, useEffect } from 'react';
import axios from 'axios';

const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbw0kQYuq1Zr5GN3T1yi7vBxrWamsMaB6lBzTMnubGPQMtdQEK1lgs986sun8I5mIU-c/exec';

function TransactionModal({ onClose, initialDate }) {
  const [accounts, setAccounts] = useState([]);
  const [formData, setFormData] = useState({
    date: initialDate,
    type: '지출',
    debitAccount: '',
    creditAccount: '',
    amount: '',
    description: '',
    note: '',
  });
  const [errors, setErrors] = useState({});

  // 계정명 조회
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const response = await axios.get(`${WEB_APP_URL}?action=getAccounts`);
        setAccounts(response.data);
      } catch (error) {
        console.error('계정명 조회 오류:', error);
      }
    };
    fetchAccounts();
  }, []);

  // 입력값 변경 핸들러
  const handleInputChange = (key, value) => {
    setFormData({ ...formData, [key]: value });
    setErrors({ ...errors, [key]: '' });
  };

  // 금액 포맷팅 (쉼표 추가, 표시용)
  const formatAmount = (value) => {
    if (!value) return '';
    const number = parseInt(value.toString().replace(/,/g, '')) || 0;
    return number.toLocaleString('ko-KR');
  };

  // 입력 검증
  const validateForm = () => {
    const newErrors = {};
    if (!formData.date) newErrors.date = '날짜를 입력하세요.';
    if (!formData.type) newErrors.type = '거래 유형을 선택하세요.';
    if (!formData.amount || parseInt(formData.amount.toString().replace(/,/g, '')) <= 0) {
      newErrors.amount = '유효한 금액을 입력하세요.';
    }
    if (!formData.debitAccount) newErrors.debitAccount = '차변 계정을 선택하세요.';
    if (!formData.creditAccount) newErrors.creditAccount = '대변 계정을 선택하세요.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 저장 처리
  const saveTransaction = async () => {
    if (!validateForm()) return;

    try {
      const formBody = `data=${encodeURIComponent(JSON.stringify({
        date: formData.date,
        type: formData.type,
        amount: parseInt(formData.amount.toString().replace(/,/g, '')) || 0,
        debitAccount: formData.debitAccount,
        creditAccount: formData.creditAccount,
        description: formData.description,
        note: formData.note,
      }))}`;

      const response = await fetch(WEB_APP_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formBody,
      });

      const result = await response.json();

      if (response.ok && result.status === 'success') {
        alert('저장 완료!');
        onClose();
      } else {
        alert('저장 실패: ' + (result.message || '오류'));
      }
    } catch (error) {
      alert('저장 실패: ' + error);
    }
  };

  return (
    <div className="modal fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="modal-content bg-white p-6 w-full max-w-md shadow-lg relative">
        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-black focus:outline-none"
          aria-label="모달 닫기"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 4h-1.5l-.5-.5h-5l-.5.5H5v1h14V4zM6 7v12c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6zm2 2h8v10H8V9z"/>
          </svg>
        </button>

        <h2 className="text-lg font-bold mb-4">트랜잭션 추가</h2>
        <div className="space-y-3">
          {/* 날짜 */}
          <div className="flex items-center space-x-2">
            <label htmlFor="date" className="w-24">날짜</label>
            <div className="flex-1">
              <input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                className="w-full border-gray-300 rounded-none"
                aria-required="true"
              />
              {errors.date && <p className="mt-1 text-sm text-red-600">{errors.date}</p>}
            </div>
          </div>

          {/* 거래 유형 */}
          <div className="flex items-center space-x-2">
            <span className="w-24">거래 유형</span>
            <div className="flex-1 flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="type"
                  value="지출"
                  checked={formData.type === '지출'}
                  onChange={() => handleInputChange('type', '지출')}
                  className="mr-1"
                  aria-checked={formData.type === '지출'}
                />
                지출
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="type"
                  value="수입"
                  checked={formData.type === '수입'}
                  onChange={() => handleInputChange('type', '수입')}
                  className="mr-1"
                  aria-checked={formData.type === '수입'}
                />
                수입
              </label>
            </div>
            {errors.type && <p className="mt-1 text-sm text-red-600">{errors.type}</p>}
          </div>

          {/* 금액 */}
          <div className="flex items-center space-x-2">
            <label htmlFor="amount" className="w-24">금액 예:</label>
            <div className="flex-1">
              <input
                id="amount"
                type="text"
                value={formatAmount(formData.amount)}
                onChange={(e) => handleInputChange('amount', e.target.value.replace(/,/g, ''))}
                placeholder="55000"
                className="w-full border-gray-300 rounded-none"
                aria-required="true"
              />
              {errors.amount && <p className="mt-1 text-sm text-red-600">{errors.amount}</p>}
            </div>
          </div>

          {/* 차변 계정 */}
          <div className="flex items-center space-x-2">
            <label htmlFor="debitAccount" className="w-24">차변 계정 선택</label>
            <div className="flex-1">
              <select
                id="debitAccount"
                value={formData.debitAccount}
                onChange={(e) => handleInputChange('debitAccount', e.target.value)}
                className="w-full border-gray-300 rounded-none"
                aria-required="true"
              >
                <option value="">선택</option>
                {accounts.map((account) => (
                  <option key={account.name} value={account.name}>
                    {account.name}
                  </option>
                ))}
              </select>
              {errors.debitAccount && <p className="mt-1 text-sm text-red-600">{errors.debitAccount}</p>}
            </div>
          </div>

          {/* 대변 계정 */}
          <div className="flex items-center space-x-2">
            <label htmlFor="creditAccount" className="w-24">대변 계정 선택</label>
            <div className="flex-1">
              <select
                id="creditAccount"
                value={formData.creditAccount}
                onChange={(e) => handleInputChange('creditAccount', e.target.value)}
                className="w-full border-gray-300 rounded-none"
                aria-required="true"
              >
                <option value="">선택</option>
                {accounts.map((account) => (
                  <option key={account.name} value={account.name}>
                    {account.name}
                  </option>
                ))}
              </select>
              {errors.creditAccount && <p className="mt-1 text-sm text-red-600">{errors.creditAccount}</p>}
            </div>
          </div>

          {/* 적요 */}
          <div className="flex items-center space-x-2">
            <label htmlFor="description" className="w-24">적요 예:</label>
            <div className="flex-1">
              <input
                id="description"
                type="text"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="카드/계좌 내역"
                className="w-full border-gray-300 rounded-none"
              />
            </div>
          </div>

          {/* 메모 */}
          <div className="flex items-center space-x-2">
            <label htmlFor="note" className="w-24">메모 추가 메모</label>
            <div className="flex-1">
              <input
                id="note"
                type="text"
                value={formData.note}
                onChange={(e) => handleInputChange('note', e.target.value)}
                placeholder=""
                className="w-full border-gray-300 rounded-none"
              />
            </div>
          </div>
        </div>

        {/* 버튼 */}
        <div className="mt-4 flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-1 bg-gray-200 text-black rounded-none hover:bg-gray-300 focus:outline-none"
          >
            취소
          </button>
          <button
            onClick={saveTransaction}
            className="px-4 py-1 bg-green-500 text-white rounded-none hover:bg-green-600 focus:outline-none"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

export default TransactionModal;