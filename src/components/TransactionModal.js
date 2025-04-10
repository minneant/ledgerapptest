import React, { useState, useEffect } from 'react';
import axios from 'axios';

const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzKfD5wD0aRa6cCT71oWzHaMCZ5kRe7jiGAdq-jmzSMn8N9fK6UOsxI1OB0KLcEqRxB/exec';

function TransactionModal({ onClose, initialDate }) {
  const [step, setStep] = useState(1);
  const [accounts, setAccounts] = useState([]);
  const [formData, setFormData] = useState({
    date: initialDate,
    type: '',
    debitAccount: '',
    creditAccount: '',
    amount: 0,
    description: '',
    note: '',
  });

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

  const handleInputChange = (key, value) => {
    setFormData({ ...formData, [key]: value });
  };

  const handleNext = () => {
    setStep(step + 1);
  };

  const handleTypeSelect = (type) => {
    handleInputChange('type', type === '수입' ? '+' : '-');
    handleNext();
  };

  const saveTransaction = async () => {
    try {
      const response = await fetch(WEB_APP_URL, {
        method: 'POST',
        mode: 'cors',
        credentials: 'omit',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: {
            date: formData.date,
            type: formData.type,
            amount: formData.amount,
            debitAccount: formData.debitAccount,
            creditAccount: formData.creditAccount,
            description: formData.description,
            note: formData.note,
          },
        }),
      });
      const result = await response.json();
      if (response.ok && result.status === 'success') {
        alert('저장 완료!');
        onClose();
      } else {
        alert('저장 실패: ' + result);
      }
    } catch (error) {
      alert('저장 실패: ' + error);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <>
            <h2>거래 유형</h2>
            <p>
              날짜:{' '}
              <input
                type="text"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
              />
            </p>
            <button onClick={() => handleTypeSelect('수입')}>수입</button>
            <button onClick={() => handleTypeSelect('지출')}>지출</button>
          </>
        );
      case 2:
        if (formData.type === '+') {
          return (
            <>
              <h2>차변 계정 선택</h2>
              <select
                value={formData.debitAccount}
                onChange={(e) => handleInputChange('debitAccount', e.target.value)}
              >
                <option value="">선택</option>
                {accounts.map((account) => (
                  <option key={account.name} value={account.name}>
                    {account.name}
                  </option>
                ))}
              </select>
              <button onClick={handleNext}>다음</button>
            </>
          );
        } else {
          return (
            <>
              <h2>대변 계정 선택</h2>
              <select
                value={formData.creditAccount}
                onChange={(e) => handleInputChange('creditAccount', e.target.value)}
              >
                <option value="">선택</option>
                {accounts.map((account) => (
                  <option key={account.name} value={account.name}>
                    {account.name}
                  </option>
                ))}
              </select>
              <button onClick={handleNext}>다음</button>
            </>
          );
        }
      case 3:
        return (
          <>
            <h2>금액 입력</h2>
            <input
              type="number"
              value={formData.amount || ''}
              placeholder="55000"
              onChange={(e) => handleInputChange('amount', parseInt(e.target.value) || 0)}
            />
            <button onClick={handleNext}>다음</button>
          </>
        );
      case 4:
        if (formData.type === '+') {
          return (
            <>
              <h2>대변 계정 선택</h2>
              <select
                value={formData.creditAccount}
                onChange={(e) => handleInputChange('creditAccount', e.target.value)}
              >
                <option value="">선택</option>
                {accounts.map((account) => (
                  <option key={account.name} value={account.name}>
                    {account.name}
                  </option>
                ))}
              </select>
              <button onClick={handleNext}>다음</button>
            </>
          );
        } else {
          return (
            <>
              <h2>차변 계정 선택</h2>
              <select
                value={formData.debitAccount}
                onChange={(e) => handleInputChange('debitAccount', e.target.value)}
              >
                <option value="">선택</option>
                {accounts.map((account) => (
                  <option key={account.name} value={account.name}>
                    {account.name}
                  </option>
                ))}
              </select>
              <button onClick={handleNext}>다음</button>
            </>
          );
        }
      case 5:
        return (
          <>
            <h2>적요 및 메모 입력</h2>
            <input
              type="text"
              value={formData.description}
              placeholder="적요 (예: 사무용품구매)"
              onChange={(e) => handleInputChange('description', e.target.value)}
            />
            <input
              type="text"
              value={formData.note}
              placeholder="메모"
              onChange={(e) => handleInputChange('note', e.target.value)}
            />
            <button onClick={saveTransaction}>저장</button>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="modal">
      <div className="modal-content">
        {renderStep()}
        <button onClick={onClose}>닫기</button>
      </div>
    </div>
  );
}

export default TransactionModal;