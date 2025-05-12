import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './EditTransactionModal.css';

const EditTransactionModal = ({ id, onClose, onUpdate, webAppUrl }) => {
  const [transaction, setTransaction] = useState(null);
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

  // 거래 상세 정보 가져오기
  useEffect(() => {
    const fetchTransaction = async () => {
      try {
        const response = await axios.get(`${webAppUrl}?action=getTransaction&id=${id}`);
        const data = response.data;
        if (data.status === 'success') {
          setTransaction(data.data);
          setFormData({
            date: data.data.date,
            type: data.data.type,
            description: data.data.description,
            amount: data.data.amount,
            debitAccount: data.data.debitAccount,
            creditAccount: data.data.creditAccount,
            note: data.data.note || '',
          });
        } else {
          setError(data.message);
        }
      } catch (err) {
        setError('데이터를 가져오는 데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };
    fetchTransaction();
  }, [id, webAppUrl]);

  // 폼 데이터 변경 처리
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // 수정 요청
  const handleUpdate = async () => {
    try {
      const response = await axios.post(webAppUrl, {
        action: 'updateTransaction',
        data: {
          id,
          date: formData.date,
          type: formData.type,
          description: formData.description,
          amount: formData.amount,
          debitAccount: formData.debitAccount,
          creditAccount: formData.creditAccount,
          note: formData.note,
        },
      });
      const data = response.data;
      if (data.status === 'success') {
        alert('거래가 성공적으로 수정되었습니다.');
        onUpdate();
        onClose();
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert('수정 중 오류가 발생했습니다.');
    }
  };

  // 삭제 요청
  const handleDelete = async () => {
    if (window.confirm('정말로 삭제하시겠습니까?')) {
      try {
        const response = await axios.post(webAppUrl, {
          action: 'deleteTransaction',
          id,
        });
        const data = response.data;
        if (data.status === 'success') {
          alert('거래가 삭제되었습니다.');
          onUpdate();
          onClose();
        } else {
          alert(data.message);
        }
      } catch (err) {
        alert('삭제 중 오류가 발생했습니다.');
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
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
          />
        </div>
        <div className="form-group">
          <label>유형:</label>
          <select name="type" value={formData.type} onChange={handleChange}>
            <option value="지출">지출</option>
            <option value="수입">수입</option>
          </select>
        </div>
        <div className="form-group">
          <label>적요:</label>
          <input
            type="text"
            name="description"
            value={formData.description}
            onChange={handleChange}
          />
        </div>
        <div className="form-group">
          <label>금액:</label>
          <input
            type="number"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
          />
        </div>
        <div className="form-group">
          <label>차변 계정:</label>
          <input
            type="text"
            name="debitAccount"
            value={formData.debitAccount}
            onChange={handleChange}
          />
        </div>
        <div className="form-group">
          <label>대변 계정:</label>
          <input
            type="text"
            name="creditAccount"
            value={formData.creditAccount}
            onChange={handleChange}
          />
        </div>
        <div className="form-group">
          <label>비고:</label>
          <input
            type="text"
            name="note"
            value={formData.note}
            onChange={handleChange}
          />
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