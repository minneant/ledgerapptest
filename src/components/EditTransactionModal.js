import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './EditTransactionModal.css';

const EditTransactionModal = ({ id, onClose, onUpdate, webAppUrl }) => {
  const [transaction, setTransaction] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [formData, setFormData] = useState({
    date: '',
    type: '',
    description: '',
    amount: '',
    debitAccount: '',
    creditAccount: '',
    note: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 계정 목록 조회
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const response = await axios.get(`${webAppUrl}?action=getAccounts`);
        setAccounts(response.data);
      } catch (err) {
        console.error('계정 목록 조회 오류:', err);
      }
    };
    fetchAccounts();
  }, [webAppUrl]);

  // 거래 데이터 조회
  useEffect(() => {
    const fetchTransaction = async () => {
      try {
        const url = `${webAppUrl}?action=getTransaction&id=${encodeURIComponent(id)}`;
        const response = await axios.get(url);
        const data = response.data;
        if (data.status === 'success') {
          setTransaction(data.data);
          // UTC를 KST(UTC+9)로 변환
          let formattedDate = '';
          if (data.data.date) {
            const utcDate = new Date(data.data.date);
            const kstDate = new Date(utcDate.getTime() + 9 * 60 * 60 * 1000); // +9시간
            formattedDate = kstDate.toISOString().split('T')[0]; // yyyy-MM-dd
          }
          setFormData({
            date: formattedDate,
            type: data.data.type || '',
            description: data.data.description || '',
            amount: String(data.data.amount) || '',
            debitAccount: data.data.debitAccount || '',
            creditAccount: data.data.creditAccount || '',
            note: data.data.note || '',
          });
        } else {
          setError(data.message || '서버 응답 오류');
        }
      } catch (err) {
        setError(`데이터를 가져오는 데 실패했습니다: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchTransaction();
  }, [id, webAppUrl]);

  // 입력값 변경 핸들러
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // 수정 처리
  const handleUpdate = async () => {
  const debit = accounts.find((a) => a.name === formData.debitAccount);
  const credit = accounts.find((a) => a.name === formData.creditAccount);

  let resolvedType = formData.type;

  if (formData.type === '수입') {
    if (credit?.type === '수입') resolvedType = '수입';
    else if (credit?.type === '자본') resolvedType = '현금유입';
  } else if (formData.type === '지출') {
    if (debit?.type === '비용') resolvedType = '경비';
    else if (debit?.type === '자본') resolvedType = '현금유출';
  }

  const updatedData = {
    ...formData,
    type: resolvedType,
    id: Number(id)
  };

  const formBody = `action=updateTransaction&data=${encodeURIComponent(
    JSON.stringify(updatedData)
  )}`;

  try {
    const response = await fetch(webAppUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formBody,
    });
    const data = await response.json();
    if (data.status === 'success') {
      alert('거래가 성공적으로 수정되었습니다.');
      onUpdate();
      onClose();
    } else {
      alert(data.message || '수정 실패');
    }
  } catch (err) {
    alert('수정 중 오류가 발생했습니다: ' + err.message);
  }
};

  // 삭제 처리
  const handleDelete = async () => {
    if (window.confirm('정말로 삭제하시겠습니까?')) {
      try {
        const formBody = `action=deleteTransaction&id=${encodeURIComponent(String(id))}`;
        const response = await fetch(webAppUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formBody,
        });
        const data = await response.json();
        if (data.status === 'success') {
          alert('거래가 삭제되었습니다.');
          onUpdate();
          onClose();
        } else {
          alert(data.message || '삭제 실패');
        }
      } catch (err) {
        alert('삭제 중 오류가 발생했습니다: ' + err.message);
      }
    }
  };

  if (loading) return <div>로딩 중...</div>;
  if (error) return <div>{error}</div>;
  if (!transaction) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>거래 상세 정보</h2>
        <div className="form-group">
          <label>날짜:</label>
          <input type="date" name="date" value={formData.date} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>유형:</label>
          <select name="type" value={formData.type} onChange={handleChange}>
            <option value="지출">지출</option>
            <option value="수입">수입</option>
          </select>
        </div>
        <div className="form-group">
          <label>금액:</label>
          <input type="number" name="amount" value={formData.amount} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>차변 계정:</label>
          <select name="debitAccount" value={formData.debitAccount} onChange={handleChange}>
            <option value="">선택</option>
            {accounts.map((account) => (
              <option key={account.name} value={account.name}>
                {account.name}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>대변 계정:</label>
          <select name="creditAccount" value={formData.creditAccount} onChange={handleChange}>
            <option value="">선택</option>
            {accounts.map((account) => (
              <option key={account.name} value={account.name}>
                {account.name}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>적요:</label>
          <input type="text" name="description" value={formData.description} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>비고:</label>
          <input type="text" name="note" value={formData.note} onChange={handleChange} />
        </div>
        <div className="button-group">
          <button onClick={handleUpdate}>수정</button>
          <button onClick={handleDelete}>삭제</button>
          <button onClick={onClose}>닫기</button>
        </div>
      </div>
    </div>
  );
};

export default EditTransactionModal;